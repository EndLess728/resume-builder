#!/usr/bin/env python3
"""
Adds live npm download counts to a RenderCV YAML file.

Any entry whose `name` links to an npm package page, e.g.

    - name: "[my-package](https://www.npmjs.com/package/my-package)"
      summary: Does something useful

gets its `summary` line rewritten to end with "(12.3K+ downloads)". An existing
"(... downloads)" suffix is replaced, so the script is safe to run repeatedly.
No configuration or API key is needed; it uses the public npm downloads API.

Usage: python3 scripts/update_npm_stats.py <cv.yaml>
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

NAME_RE = re.compile(r"^\s*-\s*name:.*npmjs\.com/package/((?:@[\w.-]+/)?[\w.-]+)")
ENTRY_START_RE = re.compile(r"^\s*-\s+\w+:")
SUMMARY_RE = re.compile(r"^(\s*summary:\s*)(.*?)\s*$")
DOWNLOADS_SUFFIX_RE = re.compile(r"\.?\s*\([^)]*downloads[^)]*\)$")


def fetch_total_downloads(package: str) -> int:
    """Total downloads since 2015 (the npm API's earliest date)."""
    url = (
        "https://api.npmjs.org/downloads/point/2015-01-01:2099-12-31/"
        + urllib.parse.quote(package, safe="@/")
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return int(json.loads(response.read().decode()).get("downloads", 0))
    except Exception as e:  # network errors must never break the build
        print(f"⚠️  Failed to fetch downloads for {package}: {e}")
        return 0


def format_number(num: int) -> str:
    if num >= 1_000_000:
        return f"{num / 1_000_000:.1f}M"
    if num >= 1_000:
        return f"{num / 1_000:.1f}K"
    return str(num)


def update_yaml(path: Path) -> int:
    lines = path.read_text().splitlines(keepends=True)
    current_pkg = None
    updated = 0

    for i, line in enumerate(lines):
        name_match = NAME_RE.match(line)
        if name_match:
            current_pkg = name_match.group(1)
            continue
        if ENTRY_START_RE.match(line):
            current_pkg = None  # a new entry without an npm link
            continue

        summary_match = SUMMARY_RE.match(line)
        if not (current_pkg and summary_match and summary_match.group(2)):
            continue

        total = fetch_total_downloads(current_pkg)
        if total > 0:
            prefix, text = summary_match.groups()
            text = DOWNLOADS_SUFFIX_RE.sub("", text)
            newline = "\n" if line.endswith("\n") else ""
            lines[i] = f"{prefix}{text} ({format_number(total)}+ downloads){newline}"
            print(f"📦 {current_pkg}: {format_number(total)} total downloads")
            updated += 1
        current_pkg = None

    path.write_text("".join(lines))
    print(f"✅ Updated {updated} npm package(s) in {path}")
    return updated


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/update_npm_stats.py <cv.yaml>")
        return 1
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"❌ YAML file not found: {path}")
        return 1
    print("🔄 Fetching npm download stats...\n")
    update_yaml(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
