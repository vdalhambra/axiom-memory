from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path

from platformdirs import user_config_dir

CONFIG_DIR = Path(user_config_dir("axiom-memory", "axiom"))
CONFIG_PATH = CONFIG_DIR / "config.json"
TOKEN_PATH = CONFIG_DIR / "token.json"

DEFAULT_API = os.environ.get("AXIOM_API", "https://axiom-memory.vercel.app")
DEFAULT_MEMORY_ROOT = Path.home() / ".claude" / "projects" / "-Users-rayomcqueen" / "memory"


@dataclass
class Config:
    api_url: str = DEFAULT_API
    memory_root: str = str(DEFAULT_MEMORY_ROOT)
    email: str | None = None

    @classmethod
    def load(cls) -> "Config":
        if CONFIG_PATH.exists():
            data = json.loads(CONFIG_PATH.read_text())
            return cls(**{k: data.get(k, getattr(cls(), k)) for k in cls().__dict__})
        return cls()

    def save(self) -> None:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        CONFIG_PATH.write_text(json.dumps(asdict(self), indent=2))


def save_token(token: str, refresh_token: str | None = None) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(json.dumps({"access_token": token, "refresh_token": refresh_token}))
    TOKEN_PATH.chmod(0o600)


def load_token() -> str | None:
    if not TOKEN_PATH.exists():
        return None
    data = json.loads(TOKEN_PATH.read_text())
    return data.get("access_token")
