#!/usr/bin/env python3
"""TODO: one line on what this module does.

Environment (set by action.yml):
  FILE            path of the rendered PDF
  TOKEN           secret for the service
  EXAMPLE_OPTION  optional setting

Writes `url` to the step outputs when it succeeds.

Usage: python3 run.py <file>
"""

import os
import sys
from pathlib import Path


def set_output(name: str, value: str) -> None:
    """Expose a value to later workflow steps (no-op outside GitHub Actions)."""
    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a") as f:
            f.write(f"{name}={value}\n")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 run.py <file>")
        return 1

    file = Path(sys.argv[1])
    if not file.is_file():
        print(f"❌ File not found: {file}")
        return 1

    token = os.environ.get("TOKEN", "")
    if not token:
        print("❌ TOKEN is empty")
        return 1

    # TODO: do the work here: upload the file, call an API, send a message...
    url = f"https://example.com/{file.name}"
    print(f"✅ Done: {url}")
    set_output("url", url)

    # Publish modules: return 1 on failure so the build shows it.
    # Notify modules: log the problem and return 0, the resume is already out.
    return 0


if __name__ == "__main__":
    sys.exit(main())
