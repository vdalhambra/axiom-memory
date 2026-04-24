from __future__ import annotations

import secrets
import time
import webbrowser
from urllib.parse import urlencode

import httpx
from rich.console import Console

from .config import Config, save_token

console = Console()


def login(cfg: Config, email: str | None = None) -> str:
    """Device-code style login. Browser opens axiom-memory.vercel.app/cli-auth?code=XXX.
    CLI polls /api/cli-auth/poll until the user confirms. Token saved locally."""
    device_code = secrets.token_urlsafe(16)
    params = {"code": device_code}
    if email:
        params["email"] = email
    url = f"{cfg.api_url}/cli-auth?{urlencode(params)}"

    console.print(f"[bold]Open this URL to authorize the CLI:[/bold]\n\n  {url}\n")
    console.print("[dim]Opening browser...[/dim]")
    webbrowser.open(url)

    deadline = time.time() + 300
    with httpx.Client(base_url=cfg.api_url, timeout=30) as client:
        while time.time() < deadline:
            r = client.get("/api/cli-auth/poll", params={"code": device_code})
            if r.status_code == 200:
                data = r.json()
                token = data.get("access_token")
                if token:
                    save_token(token, data.get("refresh_token"))
                    cfg.email = data.get("email")
                    cfg.save()
                    return cfg.email or "unknown"
            time.sleep(2)

    raise TimeoutError("Login timed out after 5 minutes.")
