#!/usr/bin/env python3
"""Café De Zoo Registratiekassa server.

Stdlib-only server for macOS: SQLite WAL, signed sessions, append-only
operation log, per-table optimistic concurrency, device registration,
audit/payment replication, backups, and optional OpenAI voice fallback.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
ENV_FILE = HERE / ".env"
DB_FILE = HERE / "registratiekassa.sqlite3"
SECRET_FILE = HERE / ".server-secret"
BACKUP_DIR = HERE / "backups"


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text("utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env(ENV_FILE)
HOST = "127.0.0.1"
PORT = int(os.getenv("PORT", "8765"))
BOSS_PIN = os.getenv("BOSS_PIN", "0607")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "disabled")
ALLOWED_ORIGINS = {
    value.strip()
    for value in os.getenv(
        "ALLOWED_ORIGINS",
        "https://amirferjani.github.io,http://127.0.0.1:8765,http://localhost:8765",
    ).split(",")
    if value.strip()
}
SESSION_TTL_SECONDS = 12 * 60 * 60
MAX_BODY = 2_000_000


def now_ms() -> int:
    return int(time.time() * 1000)


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def get_secret() -> bytes:
    if SECRET_FILE.exists():
        return SECRET_FILE.read_bytes()
    secret = secrets.token_bytes(32)
    SECRET_FILE.write_bytes(secret)
    try:
        os.chmod(SECRET_FILE, 0o600)
    except OSError:
        pass
    return secret


SECRET = get_secret()


def issue_token(*, staff_id: str, staff_name: str, role: str, device_id: str) -> str:
    payload = {
        "sub": staff_id[:100],
        "name": staff_name[:120],
        "role": role,
        "deviceId": device_id[:160],
        "iat": int(time.time()),
        "exp": int(time.time()) + SESSION_TTL_SECONDS,
        "nonce": secrets.token_hex(8),
    }
    encoded = b64url(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signature = b64url(hmac.new(SECRET, encoded.encode("ascii"), hashlib.sha256).digest())
    return f"{encoded}.{signature}"


def verify_token(token: str) -> dict[str, Any]:
    try:
        encoded, signature = token.split(".", 1)
        expected = b64url(hmac.new(SECRET, encoded.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        payload = json.loads(b64url_decode(encoded))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        return payload
    except Exception as exc:
        raise PermissionError("Ongeldige of verlopen sessie.") from exc


def connect_db() -> sqlite3.Connection:
    db = sqlite3.connect(DB_FILE, timeout=20, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=NORMAL")
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=10000")
    return db


def init_db() -> None:
    with connect_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS devices (
              device_id TEXT PRIMARY KEY,
              device_name TEXT NOT NULL,
              tailscale_user TEXT,
              last_seen INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS table_state (
              table_id TEXT PRIMARY KEY,
              revision INTEGER NOT NULL,
              updated_at INTEGER NOT NULL,
              updated_by_device TEXT NOT NULL,
              order_json TEXT
            );
            CREATE TABLE IF NOT EXISTS operation_log (
              seq INTEGER PRIMARY KEY AUTOINCREMENT,
              op_id TEXT NOT NULL UNIQUE,
              op_type TEXT NOT NULL,
              table_id TEXT,
              revision INTEGER,
              actor_id TEXT,
              actor_name TEXT,
              device_id TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              payload_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_operation_seq ON operation_log(seq);
            CREATE INDEX IF NOT EXISTS idx_operation_table ON operation_log(table_id, seq);
            CREATE TABLE IF NOT EXISTS audit_log (
              audit_id TEXT PRIMARY KEY,
              occurred_at INTEGER NOT NULL,
              actor_id TEXT,
              actor_name TEXT,
              device_id TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(occurred_at);
            CREATE TABLE IF NOT EXISTS payments (
              payment_id TEXT PRIMARY KEY,
              paid_at INTEGER NOT NULL,
              table_id TEXT,
              device_id TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            """
        )


def backup_database() -> None:
    if not DB_FILE.exists():
        return
    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    destination = BACKUP_DIR / f"registratiekassa-{stamp}.sqlite3"
    source = connect_db()
    target = sqlite3.connect(destination)
    try:
        source.backup(target)
    finally:
        source.close()
        target.close()
    backups = sorted(BACKUP_DIR.glob("registratiekassa-*.sqlite3"), reverse=True)
    for old in backups[30:]:
        old.unlink(missing_ok=True)


init_db()
backup_database()


class RateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, *, limit: int, window: int) -> bool:
        cutoff = time.time() - window
        with self._lock:
            events = self._events[key]
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= limit:
                return False
            events.append(time.time())
            return True


RATE_LIMITER = RateLimiter()


def safe_json(value: Any, max_chars: int = 500_000) -> str:
    text = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    if len(text) > max_chars:
        raise ValueError("Gegevens zijn te groot.")
    return text


def normalize_order(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("Ongeldige rekening.")
    raw = safe_json(value)
    parsed = json.loads(raw)
    items = parsed.get("items", [])
    if not isinstance(items, list) or len(items) > 500:
        raise ValueError("Te veel productlijnen.")
    return parsed


def normalize_products(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    products: list[dict[str, Any]] = []
    for product in raw[:300]:
        if not isinstance(product, dict):
            continue
        product_id = str(product.get("id", ""))[:80]
        name = str(product.get("name", ""))[:120]
        aliases = [str(x)[:80] for x in product.get("aliases", [])[:20]] if isinstance(product.get("aliases"), list) else []
        if product_id and name:
            products.append({"id": product_id, "name": name, "aliases": aliases})
    return products


def openai_voice_parse(transcript: str, products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not OPENAI_API_KEY or OPENAI_MODEL in {"", "disabled"}:
        raise RuntimeError("Optionele AI is niet geconfigureerd.")
    catalog = "\n".join(f"{p['id']}: {p['name']} [{', '.join(p['aliases'])}]" for p in products)
    instructions = (
        "Je bent een veilige orderparser voor een Belgische horecakassa. "
        "Gebruik alleen productId-waarden uit de catalogus. Herken Nederlandse aantallen en correcties. "
        "Geef uitsluitend JSON terug als {\"actions\":[{\"type\":\"add\",\"productId\":\"p1\",\"qty\":2}]}. "
        "Gebruik type remove bij verwijder/haal weg/wis/geen. Verzin nooit producten.\n\nCATALOGUS:\n" + catalog
    )
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps({"model": OPENAI_MODEL, "instructions": instructions, "input": transcript, "max_output_tokens": 500}).encode("utf-8"),
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"OpenAI HTTP {exc.code}: {detail}") from exc
    output_text = payload.get("output_text")
    if not isinstance(output_text, str):
        chunks: list[str] = []
        for item in payload.get("output", []):
            for content in item.get("content", []):
                if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                    chunks.append(content["text"])
        output_text = "\n".join(chunks)
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", output_text or "", flags=re.I)
    parsed = json.loads(cleaned)
    valid_ids = {p["id"] for p in products}
    actions = []
    for action in parsed.get("actions", [])[:40]:
        if not isinstance(action, dict):
            continue
        kind = action.get("type")
        product_id = str(action.get("productId", ""))
        if kind not in {"add", "remove"} or product_id not in valid_ids:
            continue
        qty = max(1, min(25, int(action.get("qty", 1) or 1)))
        actions.append({"type": kind, "productId": product_id, "qty": qty})
    return actions


@dataclass
class ApiError(Exception):
    status: int
    message: str


class Handler(BaseHTTPRequestHandler):
    server_version = "Registratiekassa/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"{datetime.now().isoformat(timespec='seconds')} {self.address_string()} {fmt % args}")

    def origin_headers(self) -> dict[str, str]:
        origin = self.headers.get("Origin")
        if not origin:
            return {"Access-Control-Allow-Origin": "*"}
        if origin not in ALLOWED_ORIGINS:
            raise ApiError(403, "Deze website-origin is niet toegestaan.")
        return {"Access-Control-Allow-Origin": origin, "Vary": "Origin"}

    def security_headers(self) -> dict[str, str]:
        return {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Permissions-Policy": "camera=(), geolocation=()",
            **self.origin_headers(),
        }

    def send_json(self, status: int, body: Any) -> None:
        data = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        for key, value in self.security_headers().items():
            self.send_header(key, value)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ApiError(400, "Ongeldige Content-Length.") from exc
        if length < 0 or length > MAX_BODY:
            raise ApiError(413, "Aanvraag is te groot.")
        raw = self.rfile.read(length)
        try:
            value = json.loads(raw.decode("utf-8") or "{}")
        except Exception as exc:
            raise ApiError(400, "Ongeldige JSON.") from exc
        if not isinstance(value, dict):
            raise ApiError(400, "JSON-object verwacht.")
        return value

    def current_user(self) -> dict[str, Any]:
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            raise ApiError(401, "Sessietoken ontbreekt.")
        try:
            return verify_token(auth[7:].strip())
        except PermissionError as exc:
            raise ApiError(401, str(exc)) from exc

    def tailscale_user(self) -> str | None:
        return self.headers.get("Tailscale-User-Login") or self.headers.get("tailscale-user-login")

    def do_OPTIONS(self) -> None:
        try:
            self.send_response(204)
            for key, value in self.security_headers().items():
                self.send_header(key, value)
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept")
            self.send_header("Access-Control-Max-Age", "86400")
            self.end_headers()
        except ApiError as exc:
            self.send_json(exc.status, {"error": exc.message})

    def do_GET(self) -> None:
        try:
            path = urlparse(self.path).path
            if path == "/health":
                with connect_db() as db:
                    tables = db.execute("SELECT COUNT(*) FROM table_state WHERE order_json IS NOT NULL").fetchone()[0]
                    cursor = db.execute("SELECT COALESCE(MAX(seq),0) FROM operation_log").fetchone()[0]
                self.send_json(200, {
                    "ok": True,
                    "service": "Registratiekassa",
                    "database": "sqlite-wal",
                    "openTables": tables,
                    "cursor": cursor,
                    "extraAiConfigured": bool(OPENAI_API_KEY and OPENAI_MODEL not in {"", "disabled"}),
                    "model": OPENAI_MODEL if OPENAI_MODEL not in {"", "disabled"} else None,
                    "tailscaleUser": self.tailscale_user(),
                })
                return
            if path == "/api/snapshot":
                self.current_user()
                with connect_db() as db:
                    rows = db.execute("SELECT table_id,revision,updated_at,updated_by_device,order_json FROM table_state").fetchall()
                    cursor = db.execute("SELECT COALESCE(MAX(seq),0) FROM operation_log").fetchone()[0]
                tables = [{
                    "tableId": row["table_id"],
                    "revision": row["revision"],
                    "updatedAt": row["updated_at"],
                    "deviceId": row["updated_by_device"],
                    "order": json.loads(row["order_json"]) if row["order_json"] else None,
                } for row in rows]
                self.send_json(200, {"tables": tables, "cursor": cursor})
                return
            raise ApiError(404, "Niet gevonden.")
        except ApiError as exc:
            self.send_json(exc.status, {"error": exc.message})
        except Exception as exc:
            print("GET error", repr(exc))
            self.send_json(500, {"error": "Interne serverfout."})

    def do_POST(self) -> None:
        try:
            path = urlparse(self.path).path
            body = self.read_json()
            rate_key = self.tailscale_user() or self.client_address[0]

            if path == "/api/session/team":
                if not RATE_LIMITER.allow(f"session:{rate_key}", limit=30, window=60):
                    raise ApiError(429, "Te veel aanmeldpogingen.")
                staff_id = str(body.get("staffId", "team"))[:100]
                staff_name = str(body.get("staffName", "Team"))[:120]
                device_id = str(body.get("deviceId", ""))[:160]
                device_name = str(body.get("deviceName", "Onbekend apparaat"))[:160]
                if not device_id:
                    raise ApiError(400, "Apparaat-ID ontbreekt.")
                token = issue_token(staff_id=staff_id, staff_name=staff_name, role="team", device_id=device_id)
                with connect_db() as db:
                    db.execute(
                        "INSERT INTO devices(device_id,device_name,tailscale_user,last_seen) VALUES(?,?,?,?) "
                        "ON CONFLICT(device_id) DO UPDATE SET device_name=excluded.device_name,tailscale_user=excluded.tailscale_user,last_seen=excluded.last_seen",
                        (device_id, device_name, self.tailscale_user(), now_ms()),
                    )
                self.send_json(200, {"token": token, "expiresIn": SESSION_TTL_SECONDS})
                return

            if path == "/api/session/boss":
                if not RATE_LIMITER.allow(f"boss:{rate_key}", limit=8, window=300):
                    raise ApiError(429, "Te veel PIN-pogingen.")
                if not hmac.compare_digest(str(body.get("pin", "")), BOSS_PIN):
                    raise ApiError(401, "Verkeerde PIN.")
                device_id = str(body.get("deviceId", ""))[:160]
                device_name = str(body.get("deviceName", "Onbekend apparaat"))[:160]
                token = issue_token(staff_id="boss", staff_name="Baas", role="boss", device_id=device_id)
                with connect_db() as db:
                    db.execute(
                        "INSERT INTO devices(device_id,device_name,tailscale_user,last_seen) VALUES(?,?,?,?) "
                        "ON CONFLICT(device_id) DO UPDATE SET device_name=excluded.device_name,tailscale_user=excluded.tailscale_user,last_seen=excluded.last_seen",
                        (device_id, device_name, self.tailscale_user(), now_ms()),
                    )
                self.send_json(200, {"token": token, "expiresIn": SESSION_TTL_SECONDS})
                return

            user = self.current_user()

            if path == "/api/sync":
                if not RATE_LIMITER.allow(f"sync:{user['deviceId']}", limit=120, window=60):
                    raise ApiError(429, "Te veel synchronisatieaanvragen.")
                cursor = max(0, int(body.get("cursor", 0) or 0))
                device_id = str(body.get("deviceId", user["deviceId"]))[:160]
                device_name = str(body.get("deviceName", "Kassa"))[:160]
                mutations = body.get("mutations", [])
                audits = body.get("audits", [])
                payments = body.get("payments", [])
                if not isinstance(mutations, list) or len(mutations) > 200:
                    raise ApiError(400, "Ongeldige mutatielijst.")
                accepted: list[dict[str, Any]] = []
                conflicts: list[dict[str, Any]] = []
                accepted_audits: list[str] = []
                accepted_payments: list[str] = []
                with connect_db() as db:
                    db.execute("BEGIN IMMEDIATE")
                    try:
                        db.execute(
                            "INSERT INTO devices(device_id,device_name,tailscale_user,last_seen) VALUES(?,?,?,?) "
                            "ON CONFLICT(device_id) DO UPDATE SET device_name=excluded.device_name,tailscale_user=excluded.tailscale_user,last_seen=excluded.last_seen",
                            (device_id, device_name, self.tailscale_user(), now_ms()),
                        )
                        for mutation in mutations:
                            if not isinstance(mutation, dict):
                                continue
                            op_id = str(mutation.get("id", ""))[:160]
                            table_id = str(mutation.get("tableId", ""))[:80]
                            base_revision = max(0, int(mutation.get("baseRevision", 0) or 0))
                            if not op_id or not table_id:
                                continue
                            existing = db.execute("SELECT table_id,revision FROM operation_log WHERE op_id=?", (op_id,)).fetchone()
                            if existing:
                                accepted.append({"id": op_id, "tableId": existing["table_id"], "revision": existing["revision"]})
                                continue
                            row = db.execute("SELECT revision,order_json,updated_at,updated_by_device FROM table_state WHERE table_id=?", (table_id,)).fetchone()
                            current_revision = int(row["revision"]) if row else 0
                            if current_revision != base_revision:
                                conflicts.append({
                                    "id": f"conflict-{op_id}", "operationId": op_id, "tableId": table_id,
                                    "localBaseRevision": base_revision, "serverRevision": current_revision,
                                    "serverOrder": json.loads(row["order_json"]) if row and row["order_json"] else None,
                                    "serverUpdatedAt": row["updated_at"] if row else None,
                                    "serverDeviceId": row["updated_by_device"] if row else None,
                                })
                                continue
                            order = normalize_order(mutation.get("order"))
                            revision = current_revision + 1
                            updated_at = max(0, int(mutation.get("updatedAt", now_ms()) or now_ms()))
                            order_json = safe_json(order) if order is not None else None
                            db.execute(
                                "INSERT INTO table_state(table_id,revision,updated_at,updated_by_device,order_json) VALUES(?,?,?,?,?) "
                                "ON CONFLICT(table_id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at,updated_by_device=excluded.updated_by_device,order_json=excluded.order_json",
                                (table_id, revision, updated_at, device_id, order_json),
                            )
                            payload = {"order": order, "baseRevision": base_revision, "revision": revision}
                            db.execute(
                                "INSERT INTO operation_log(op_id,op_type,table_id,revision,actor_id,actor_name,device_id,created_at,payload_json) VALUES(?,?,?,?,?,?,?,?,?)",
                                (op_id, "TABLE_REPLACE", table_id, revision, user.get("sub"), user.get("name"), device_id, now_ms(), safe_json(payload)),
                            )
                            accepted.append({"id": op_id, "tableId": table_id, "revision": revision})

                        for audit in audits[:500] if isinstance(audits, list) else []:
                            if not isinstance(audit, dict):
                                continue
                            audit_id = str(audit.get("id", ""))[:160]
                            if not audit_id:
                                continue
                            db.execute(
                                "INSERT OR IGNORE INTO audit_log(audit_id,occurred_at,actor_id,actor_name,device_id,payload_json) VALUES(?,?,?,?,?,?)",
                                (audit_id, int(audit.get("at", now_ms()) or now_ms()), str(audit.get("staffId", ""))[:100], str(audit.get("staffName", ""))[:120], device_id, safe_json(audit, 200_000)),
                            )
                            accepted_audits.append(audit_id)

                        for payment in payments[:200] if isinstance(payments, list) else []:
                            if not isinstance(payment, dict):
                                continue
                            payment_id = str(payment.get("id", ""))[:160]
                            if not payment_id:
                                continue
                            db.execute(
                                "INSERT OR IGNORE INTO payments(payment_id,paid_at,table_id,device_id,payload_json) VALUES(?,?,?,?,?)",
                                (payment_id, int(payment.get("paidAt", now_ms()) or now_ms()), str(payment.get("tableId", ""))[:80], device_id, safe_json(payment, 300_000)),
                            )
                            accepted_payments.append(payment_id)
                        db.execute("COMMIT")
                    except Exception:
                        db.execute("ROLLBACK")
                        raise

                    rows = db.execute(
                        "SELECT seq,op_id,table_id,revision,device_id,created_at,payload_json FROM operation_log WHERE seq>? ORDER BY seq ASC LIMIT 1500",
                        (cursor,),
                    ).fetchall()
                    max_cursor = db.execute("SELECT COALESCE(MAX(seq),0) FROM operation_log").fetchone()[0]
                operations = []
                for row in rows:
                    payload = json.loads(row["payload_json"])
                    operations.append({
                        "seq": row["seq"], "id": row["op_id"], "tableId": row["table_id"],
                        "revision": row["revision"], "deviceId": row["device_id"],
                        "createdAt": row["created_at"], "order": payload.get("order"),
                    })
                self.send_json(200, {
                    "accepted": accepted,
                    "acceptedAudits": accepted_audits,
                    "acceptedPayments": accepted_payments,
                    "conflicts": conflicts,
                    "operations": operations,
                    "cursor": max_cursor,
                })
                return

            if path == "/api/voice/parse":
                transcript = str(body.get("transcript", "")).strip()[:2000]
                products = normalize_products(body.get("products"))
                if not transcript or not products:
                    raise ApiError(400, "Transcript of productcatalogus ontbreekt.")
                try:
                    actions = openai_voice_parse(transcript, products)
                except RuntimeError as exc:
                    raise ApiError(503, str(exc)) from exc
                self.send_json(200, {"actions": actions, "model": OPENAI_MODEL})
                return

            if path == "/api/backup":
                if user.get("role") != "boss":
                    raise ApiError(403, "Alleen de baas kan een back-up starten.")
                backup_database()
                self.send_json(200, {"ok": True})
                return

            raise ApiError(404, "Niet gevonden.")
        except ApiError as exc:
            self.send_json(exc.status, {"error": exc.message})
        except (ValueError, TypeError) as exc:
            self.send_json(400, {"error": str(exc)})
        except Exception as exc:
            print("POST error", repr(exc))
            self.send_json(500, {"error": "Interne serverfout."})


if __name__ == "__main__":
    print(f"Registratiekassa luistert op http://{HOST}:{PORT}")
    print(f"SQLite: {DB_FILE} · WAL actief")
    print(f"Optionele AI: {'aan (' + OPENAI_MODEL + ')' if OPENAI_API_KEY and OPENAI_MODEL not in {'', 'disabled'} else 'uit'}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
