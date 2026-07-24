#!/usr/bin/env python3
"""Self-healing watchdog for the local Registratiekassa services.

The watchdog:
- checks the central SQLite API and Dutch transcription sidecar on localhost;
- restarts a service only after repeated failures;
- uses a restart cooldown to avoid crash loops;
- periodically re-applies the private Tailscale Serve routes.

No third-party Python packages are required.
"""
from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
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
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env(HERE / ".env")

PORT = int(os.environ.get("PORT", "8765"))
TRANSCRIBE_PORT = int(os.environ.get("TRANSCRIBE_PORT", "8766"))
CHECK_INTERVAL = max(3, int(os.environ.get("WATCHDOG_INTERVAL", "10")))
FAIL_THRESHOLD = max(2, int(os.environ.get("WATCHDOG_FAIL_THRESHOLD", "3")))
RESTART_COOLDOWN = max(15, int(os.environ.get("WATCHDOG_RESTART_COOLDOWN", "45")))
TAILSCALE_REFRESH_INTERVAL = max(
    60, int(os.environ.get("WATCHDOG_TAILSCALE_REFRESH", "300"))
)
HEALTH_TIMEOUT = max(1.0, float(os.environ.get("WATCHDOG_HEALTH_TIMEOUT", "3.5")))

SERVICES = {
    "kassa": {
        "script": HERE / "kassa_server.py",
        "pidfile": HERE / ".server.pid",
        "logfile": HERE / "server.log",
        "health": f"http://127.0.0.1:{PORT}/health",
    },
    "transcriptie": {
        "script": HERE / "dutch_transcriber.py",
        "pidfile": HERE / ".transcriber.pid",
        "logfile": HERE / "transcriber.log",
        "health": f"http://127.0.0.1:{TRANSCRIBE_PORT}/health",
    },
}

STOP = False


def log(message: str) -> None:
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} [watchdog] {message}", flush=True)


def read_pid(path: Path) -> int | None:
    try:
        pid = int(path.read_text("utf-8").strip())
        return pid if pid > 1 else None
    except (OSError, ValueError):
        return None


def process_alive(pid: int | None) -> bool:
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def health_ok(url: str) -> bool:
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "Cache-Control": "no-store"},
    )
    try:
        with urllib.request.urlopen(request, timeout=HEALTH_TIMEOUT) as response:
            return 200 <= response.status < 300
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def terminate(pid: int | None) -> None:
    if not process_alive(pid):
        return
    assert pid is not None
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        return
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if not process_alive(pid):
            return
        time.sleep(0.2)
    try:
        os.kill(pid, signal.SIGKILL)
    except OSError:
        pass


def start_service(name: str, service: dict[str, object]) -> bool:
    script = Path(service["script"])
    pidfile = Path(service["pidfile"])
    logfile = Path(service["logfile"])
    if not script.exists():
        log(f"{name}: script ontbreekt: {script.name}")
        return False
    try:
        log_handle = logfile.open("ab", buffering=0)
        process = subprocess.Popen(
            [sys.executable, str(script)],
            cwd=HERE,
            stdin=subprocess.DEVNULL,
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            close_fds=True,
        )
        log_handle.close()
        pidfile.write_text(f"{process.pid}\n", encoding="utf-8")
        log(f"{name}: herstart met PID {process.pid}")
        return True
    except OSError as error:
        log(f"{name}: herstart mislukt: {error}")
        return False


def find_tailscale() -> str | None:
    from shutil import which

    found = which("tailscale")
    if found:
        return found
    app_binary = Path("/Applications/Tailscale.app/Contents/MacOS/Tailscale")
    return str(app_binary) if app_binary.exists() else None


def apply_tailscale_routes() -> None:
    tailscale = find_tailscale()
    if not tailscale:
        log("Tailscale CLI niet gevonden; routes niet gecontroleerd.")
        return
    routes = ((443, PORT), (8443, TRANSCRIBE_PORT))
    for https_port, local_port in routes:
        command = [
            tailscale,
            "serve",
            "--bg",
            f"--https={https_port}",
            f"127.0.0.1:{local_port}",
        ]
        try:
            result = subprocess.run(
                command,
                cwd=HERE,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                timeout=20,
                check=False,
            )
            if result.returncode:
                error = (result.stderr or "").strip().replace("\n", " ")
                log(f"Tailscale HTTPS {https_port}: herstel mislukt ({error or result.returncode}).")
        except (OSError, subprocess.TimeoutExpired) as error:
            log(f"Tailscale HTTPS {https_port}: controlefout: {error}")


def handle_signal(signum: int, _frame: object) -> None:
    global STOP
    STOP = True
    log(f"stop gevraagd via signaal {signum}")


def run_once(
    failures: dict[str, int],
    last_restart: dict[str, float],
) -> None:
    now = time.monotonic()
    for name, service in SERVICES.items():
        pidfile = Path(service["pidfile"])
        pid = read_pid(pidfile)
        alive = process_alive(pid)
        healthy = alive and health_ok(str(service["health"]))
        if healthy:
            failures[name] = 0
            continue

        failures[name] = failures.get(name, 0) + 1
        if not alive:
            failures[name] = max(failures[name], FAIL_THRESHOLD)

        if failures[name] < FAIL_THRESHOLD:
            log(f"{name}: healthcheck {failures[name]}/{FAIL_THRESHOLD} mislukt")
            continue

        since_restart = now - last_restart.get(name, 0.0)
        if since_restart < RESTART_COOLDOWN:
            continue

        log(f"{name}: onbereikbaar; gecontroleerde herstart")
        terminate(pid)
        try:
            pidfile.unlink(missing_ok=True)
        except OSError:
            pass
        if start_service(name, service):
            last_restart[name] = time.monotonic()
            failures[name] = 0


def main() -> int:
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    failures = {name: 0 for name in SERVICES}
    last_restart = {name: 0.0 for name in SERVICES}
    last_tailscale_refresh = 0.0
    once = "--once" in sys.argv

    log(
        "gestart "
        f"(interval={CHECK_INTERVAL}s, drempel={FAIL_THRESHOLD}, "
        f"cooldown={RESTART_COOLDOWN}s)"
    )

    while not STOP:
        run_once(failures, last_restart)
        now = time.monotonic()
        if now - last_tailscale_refresh >= TAILSCALE_REFRESH_INTERVAL:
            apply_tailscale_routes()
            last_tailscale_refresh = now
        if once:
            break
        deadline = time.monotonic() + CHECK_INTERVAL
        while not STOP and time.monotonic() < deadline:
            time.sleep(min(0.5, deadline - time.monotonic()))

    log("gestopt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
