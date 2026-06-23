import os
import sys
from pathlib import Path


PROJECT_DIR = Path(os.getenv("CLIENT_MANAGER_PROJECT_DIR", Path(__file__).resolve().parent.parent))
ENV_FILE = Path(os.getenv("CLIENT_MANAGER_ENV_FILE", PROJECT_DIR / "Server" / "pythonanywhere.env"))


def load_env_file(path):
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(ENV_FILE)

if str(PROJECT_DIR / "Server") not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR / "Server"))

from app import app as application
