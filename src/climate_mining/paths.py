from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = DATA / "raw"
LOGS = DATA / "logs"
DIST = ROOT / "web" / "dist"
