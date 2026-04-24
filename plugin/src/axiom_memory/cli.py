from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table

from . import __version__
from .config import Config
from . import auth as auth_mod
from . import sync as sync_mod

app = typer.Typer(
    help="Axiom Memory — Claude Code memory that syncs across machines and survives /compact.",
    no_args_is_help=True,
)
console = Console()


@app.command()
def version():
    """Print the CLI version."""
    console.print(f"axiom-memory [bold cyan]{__version__}[/bold cyan]")


@app.command()
def login(email: str = typer.Option(None, help="Email to pre-fill on the browser login.")):
    """Authorize this machine. Opens a browser; polls until you complete the flow."""
    cfg = Config.load()
    who = auth_mod.login(cfg, email=email)
    console.print(f"[green]✔ Logged in as {who}[/green]")


@app.command()
def status():
    """Show sync status and config."""
    cfg = Config.load()
    info = sync_mod.status(cfg)
    table = Table(show_header=False)
    for k, v in info.items():
        table.add_row(k, str(v))
    console.print(table)


@app.command()
def push():
    """Push local memory to axiom-memory cloud."""
    cfg = Config.load()
    result = sync_mod.push(cfg)
    console.print(f"[green]✔ Pushed {result['pushed']}/{result['total']} files[/green]")


@app.command()
def pull():
    """Pull cloud memory into local filesystem."""
    cfg = Config.load()
    result = sync_mod.pull(cfg)
    console.print(f"[green]✔ Pulled {result['pulled']}/{result['total']} files[/green]")


@app.command()
def sync():
    """Push then pull: full two-way sync."""
    cfg = Config.load()
    push_result = sync_mod.push(cfg)
    pull_result = sync_mod.pull(cfg)
    console.print(
        f"[green]✔ pushed {push_result['pushed']} · pulled {pull_result['pulled']}[/green]"
    )


@app.command()
def config_set(
    api_url: str = typer.Option(None, help="Override the API endpoint."),
    memory_root: str = typer.Option(None, help="Override the local memory root."),
):
    """Update CLI configuration."""
    cfg = Config.load()
    if api_url:
        cfg.api_url = api_url
    if memory_root:
        cfg.memory_root = memory_root
    cfg.save()
    console.print("[green]✔ Config updated[/green]")


if __name__ == "__main__":
    app()
