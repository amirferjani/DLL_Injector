#!/usr/bin/env python3
"""Private Dutch-only speech-to-text sidecar for Registratiekassa.

Runs on localhost and is exposed only through Tailscale Serve on HTTPS 8443.
No third-party Python packages are required.
"""
from __future__ import annotations

import base64
import json
import os
import re
import secrets
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text("utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env(HERE / ".env")

HOST = "127.0.0.1"
PORT = int(os.environ.get("TRANSCRIBE_PORT", "8766"))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
MODEL = os.environ.get("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe").strip() or "gpt-4o-transcribe"
LANGUAGE = "nl"
MAX_BODY = 9 * 1024 * 1024
ALLOWED_ORIGINS = {
    value.strip()
    for value in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://amirferjani.github.io,http://127.0.0.1:8765,http://localhost:8765",
    ).split(",")
    if value.strip()
}

HOUSE_PROMPT = (
    "Transcribeer uitsluitend Nederlands (België) voor een horecakassa. "
    "Verwacht korte drankbestellingen en behoud merknamen exact. "
    "Belangrijke woorden: Eristoff, Eristoff White, Bacardi Carta Blanca, witte Bacardi, "
    "witte rum, Bacardi Carta Negra, bruine Bacardi, bruine rum, Jack Daniel's, whisky, "
    "Bombay Sapphire, gin, tonic, Pornstar Martini, star martini, Coca-Cola, Cola Zero, "
    "pintje, pils, bruiswater, plat water. Geef alleen de gesproken tekst terug."
)

_rate_lock = threading.Lock()
_rate_buckets: dict[str, deque[float]] = defaultdict(deque)


def origin_headers(handler: BaseHTTPRequestHandler) -> dict[str, str] | None:
    origin = handler.headers.get("Origin")
    if not origin:
        return {"Access-Control-Allow-Origin": "*"}
    if origin not in ALLOWED_ORIGINS:
        return None
    return {
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin",
    }


def client_key(handler: BaseHTTPRequestHandler) -> str:
    return (
        handler.headers.get("Tailscale-User-Login")
        or handler.headers.get("Tailscale-User-Name")
        or handler.client_address[0]
    )


def allowed_by_rate_limit(handler: BaseHTTPRequestHandler) -> bool:
    key = client_key(handler)
    now = time.monotonic()
    with _rate_lock:
        bucket = _rate_buckets[key]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= 45:
            return False
        bucket.append(now)
    return True


def sanitize_phrases(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    phrases: list[str] = []
    seen: set[str] = set()
    for value in raw[:500]:
        phrase = re.sub(r"\s+", " ", str(value)).strip()
        if not phrase or len(phrase) > 80:
            continue
        folded = phrase.casefold()
        if folded in seen:
            continue
        seen.add(folded)
        phrases.append(phrase)
        if len(phrases) >= 350:
            break
    return phrases


def mime_extension(mime_type: str) -> tuple[str, str]:
    mime = (mime_type or "").split(";", 1)[0].strip().lower()
    mapping = {
        "audio/mp4": ("audio.m4a", "audio/mp4"),
        "audio/x-m4a": ("audio.m4a", "audio/mp4"),
        "audio/webm": ("audio.webm", "audio/webm"),
        "audio/ogg": ("audio.ogg", "audio/ogg"),
        "audio/wav": ("audio.wav", "audio/wav"),
        "audio/mpeg": ("audio.mp3", "audio/mpeg"),
    }
    return mapping.get(mime, ("audio.m4a", mime or "application/octet-stream"))


def multipart_body(fields: dict[str, str], filename: str, content_type: str, file_bytes: bytes) -> tuple[bytes, str]:
    boundary = f"----Registratiekassa{secrets.token_hex(16)}"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )
    safe_filename = re.sub(r"[^A-Za-z0-9._-]", "_", filename)
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="file"; filename="{safe_filename}"\r\n'.encode(),
            f"Content-Type: {content_type}\r\n\r\n".encode(),
            file_bytes,
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks), boundary


def transcribe(audio: bytes, mime_type: str, phrases: list[str]) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY ontbreekt op de Mac-server.")
    filename, content_type = mime_extension(mime_type)
    prompt = HOUSE_PROMPT
    if phrases:
        prompt += " Verwachte kaartwoorden: " + ", ".join(phrases)
    prompt = prompt[:12000]
    fields = {
        "model": MODEL,
        "language": LANGUAGE,
        "prompt": prompt,
        "response_format": "json",
    }
    body, boundary = multipart_body(fields, filename, content_type, audio)
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/transcriptions",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
            "User-Agent": "Registratiekassa-Dutch-Transcriber/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", "replace")[:1200]
        raise RuntimeError(f"OpenAI transcriptiefout HTTP {error.code}: {details}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"OpenAI is niet bereikbaar: {error.reason}") from error
    text = str(payload.get("text", "")).strip()
    return re.sub(r"\s+", " ", text)


class Handler(BaseHTTPRequestHandler):
    server_version = "RegistratiekassaNL/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {client_key(self)} {fmt % args}", flush=True)

    def send_json(self, status: int, payload: dict[str, object], cors: dict[str, str] | None = None) -> None:
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        for key, value in (cors or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:
        cors = origin_headers(self)
        if cors is None:
            self.send_json(403, {"error": "Origin niet toegestaan."})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Accept")
        self.send_header("Access-Control-Max-Age", "86400")
        for key, value in cors.items():
            self.send_header(key, value)
        self.end_headers()

    def do_GET(self) -> None:
        cors = origin_headers(self)
        if cors is None:
            self.send_json(403, {"error": "Origin niet toegestaan."})
            return
        if self.path.rstrip("/") == "/health":
            self.send_json(
                200,
                {
                    "ok": True,
                    "service": "Registratiekassa Nederlandse transcriptie",
                    "configured": bool(OPENAI_API_KEY),
                    "model": MODEL,
                    "language": LANGUAGE,
                    "tailscaleUser": self.headers.get("Tailscale-User-Login"),
                },
                cors,
            )
            return
        self.send_json(404, {"error": "Niet gevonden."}, cors)

    def do_POST(self) -> None:
        cors = origin_headers(self)
        if cors is None:
            self.send_json(403, {"error": "Origin niet toegestaan."})
            return
        if self.path.rstrip("/") != "/transcribe":
            self.send_json(404, {"error": "Niet gevonden."}, cors)
            return
        if not allowed_by_rate_limit(self):
            self.send_json(429, {"error": "Te veel transcripties; probeer zo meteen opnieuw."}, cors)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                raise ValueError("Audio-aanvraag ontbreekt of is te groot.")
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode("utf-8"))
            encoded = str(payload.get("audio", ""))
            if not encoded:
                raise ValueError("Audiogegevens ontbreken.")
            try:
                audio = base64.b64decode(encoded, validate=True)
            except Exception as error:
                raise ValueError("Audiogegevens zijn ongeldig.") from error
            if len(audio) < 500:
                raise ValueError("Audiofragment is te kort.")
            if len(audio) > 7 * 1024 * 1024:
                raise ValueError("Audiofragment is te groot.")
            phrases = sanitize_phrases(payload.get("phrases"))
            text = transcribe(audio, str(payload.get("mimeType", "audio/mp4")), phrases)
            self.send_json(200, {"text": text, "model": MODEL, "language": LANGUAGE}, cors)
        except ValueError as error:
            self.send_json(400, {"error": str(error)}, cors)
        except Exception as error:
            print(f"Transcriptiefout: {error!r}", flush=True)
            self.send_json(502, {"error": str(error)}, cors)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(
        f"Registratiekassa Nederlandse transcriptie op http://{HOST}:{PORT} "
        f"· model={MODEL} · taal={LANGUAGE} · sleutel={'ja' if OPENAI_API_KEY else 'nee'}",
        flush=True,
    )
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
