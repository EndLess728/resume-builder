#!/usr/bin/env python3
"""Build GitHub release notes for one version from CHANGELOG.md.

The notes contain that version's changelog section, a ready-to-paste usage
snippet, and a compare link to the previous version.

Usage: python3 release_notes.py <tag> [changelog] > notes.md
  tag        e.g. v1.2.0 (the leading "v" is optional)
  changelog  defaults to CHANGELOG.md

Exits with status 2 when the changelog has no section for the version, so the
caller can fall back to GitHub's generated notes.
"""

import os
import re
import sys
from pathlib import Path

HEADING = re.compile(r"^## \[(?P<version>[^\]]+)\]")


def sections(changelog: str) -> list[tuple[str, str]]:
    """(version, body) pairs in file order, newest first. Skips [Unreleased]."""
    found = []
    version, body = None, []
    for line in changelog.splitlines():
        match = HEADING.match(line)
        if match:
            if version:
                found.append((version, "\n".join(body).strip()))
            version, body = match.group("version"), []
        elif version:
            if re.match(r"^\[[^\]]+\]:\s", line):  # link reference definitions at the bottom
                continue
            body.append(line)
    if version:
        found.append((version, "\n".join(body).strip()))
    return [(v, b) for v, b in found if v.lower() != "unreleased"]


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        return 1
    tag = sys.argv[1]
    version = tag.removeprefix("v")
    changelog = Path(sys.argv[2] if len(sys.argv) > 2 else "CHANGELOG.md").read_text()
    repo = os.environ.get("GITHUB_REPOSITORY", "EndLess728/resume-builder")
    major = tag.split(".")[0] if tag.startswith("v") else "v" + version.split(".")[0]

    all_sections = sections(changelog)
    versions = [v for v, _ in all_sections]
    if version not in versions:
        print(f"No CHANGELOG.md section for {version}", file=sys.stderr)
        return 2

    index = versions.index(version)
    body = all_sections[index][1]
    previous = versions[index + 1] if index + 1 < len(versions) else None

    out = ["## What's changed", "", body or "_No notes._", ""]
    out += [
        "## Use this version",
        "",
        "```yaml",
        "jobs:",
        "  build:",
        f"    uses: {repo}/.github/workflows/build-resume.yml@{tag}",
        "    with:",
        "      cv_file: Your_CV.yaml",
        "    secrets: inherit",
        "```",
        "",
        f"Pin `@{tag}` for this exact version, or `@{major}` to get fixes and features without breaking changes.",
        "",
        f"The attached `sample-resume.pdf` was rendered from [`example_CV.yaml`](https://github.com/{repo}/blob/{tag}/example_CV.yaml) by this release.",
    ]
    if previous:
        out += ["", f"**Full diff:** https://github.com/{repo}/compare/v{previous}...{tag}"]

    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
