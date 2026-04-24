from __future__ import annotations

import hashlib
import json
from pathlib import Path

import httpx

from .config import Config, load_token

MEMORY_DIRS = ["identity", "feedback", "projects", "skills", "daily", "incidents", "refs"]
SKIPPED = {".git", "__pycache__", ".DS_Store"}


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _walk_memory(root: Path) -> list[tuple[str, bytes]]:
    files: list[tuple[str, bytes]] = []
    if not root.exists():
        return files
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIPPED for part in path.parts):
            continue
        rel = path.relative_to(root).as_posix()
        files.append((rel, path.read_bytes()))
    return files


def _auth_headers(cfg: Config) -> dict[str, str]:
    token = load_token()
    if not token:
        raise RuntimeError("Not logged in. Run: axiom-memory login")
    return {"Authorization": f"Bearer {token}"}


def push(cfg: Config) -> dict:
    files = _walk_memory(Path(cfg.memory_root))
    manifest = [{"path": rel, "sha256": _sha256(data), "bytes": len(data)} for rel, data in files]

    with httpx.Client(base_url=cfg.api_url, timeout=60, headers=_auth_headers(cfg)) as client:
        resp = client.post("/api/sync/plan", json={"manifest": manifest})
        resp.raise_for_status()
        plan = resp.json()
        to_upload: list[str] = plan.get("upload", [])

        for rel, data in files:
            if rel not in to_upload:
                continue
            up = client.post(
                "/api/sync/upload",
                json={"path": rel, "content": data.decode("utf-8", errors="replace")},
            )
            up.raise_for_status()

    return {"pushed": len(to_upload), "total": len(files)}


def pull(cfg: Config) -> dict:
    root = Path(cfg.memory_root)
    root.mkdir(parents=True, exist_ok=True)

    with httpx.Client(base_url=cfg.api_url, timeout=60, headers=_auth_headers(cfg)) as client:
        resp = client.get("/api/sync/manifest")
        resp.raise_for_status()
        remote = resp.json().get("files", [])

        written = 0
        for f in remote:
            rel = f["path"]
            local = root / rel
            if local.exists() and _sha256(local.read_bytes()) == f["sha256"]:
                continue
            content = client.get("/api/sync/fetch", params={"path": rel}).json().get("content", "")
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_text(content)
            written += 1

    return {"pulled": written, "total": len(remote)}


def status(cfg: Config) -> dict:
    root = Path(cfg.memory_root)
    files = _walk_memory(root)
    return {
        "memory_root": str(root),
        "local_files": len(files),
        "logged_in": bool(load_token()),
        "api_url": cfg.api_url,
    }
