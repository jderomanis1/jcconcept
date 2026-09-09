"""Verify every staged public asset against the deployed release, with bounded CDN retries."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import os
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://jderomanis1.github.io/jcconcept/'
RELEASE = os.environ.get('GITHUB_SHA', 'manual')
ARTIFACTS = ROOT / 'qa-artifacts'
ARTIFACTS.mkdir(exist_ok=True)
files = [p for p in (ROOT / '_site').rglob('*') if p.is_file() and p.name != '.nojekyll']
if not files:
    raise RuntimeError('No staged files to verify. Run scripts/stage.py first.')

def check(path):
    name = path.relative_to(ROOT / '_site').as_posix()
    url = BASE + ('' if name == 'index.html' else name)
    expected = hashlib.sha256(path.read_bytes()).hexdigest()
    with urllib.request.urlopen(url + '?release=' + RELEASE, timeout=20) as response:
        actual = hashlib.sha256(response.read()).hexdigest()
    if actual != expected:
        raise RuntimeError('Deployed bytes do not yet match: ' + name)
    return {'path': name, 'sha256': actual, 'match': True}

for attempt in range(1, 13):
    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            checks = list(pool.map(check, files))
        report = {'release': RELEASE, 'url': BASE, 'verified_at': datetime.now(timezone.utc).isoformat(), 'result': 'PASS', 'files': checks}
        (ARTIFACTS / 'live-integrity.json').write_text(json.dumps(report, indent=2))
        print('PASS: exact deployed bytes for', len(checks), 'public files; release', RELEASE)
        break
    except Exception as error:
        print('Verification attempt', attempt, ':', str(error), flush=True)
        if attempt == 12:
            raise
        time.sleep(10)
