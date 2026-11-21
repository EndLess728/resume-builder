---
title: Render locally
description: Install RenderCV with pipx and preview your resume on your machine before pushing, including watch mode.
---

Preview changes on your machine before pushing. Run this in your CV repo:

```bash
brew install pipx && pipx ensurepath
pipx install "rendercv[full]>=2.6"
rendercv render My_CV.yaml          # one-off
rendercv render --watch My_CV.yaml  # re-render on save
```

Output goes to `rendercv_output/`, the same place the workflow writes to.

On Linux, install pipx with your package manager (`apt install pipx`, `dnf install pipx`) or `python3 -m pip install --user pipx`.

## Match the workflow's version

The workflow installs `rendercv[full]>=2.6` by default. If you pin a different [`rendercv_version`](../../reference/inputs-outputs/), install the same one locally so what you see matches the build.

If `rendercv --version` shows something older than 2.6, check `which -a rendercv` for a stale pip install shadowing the pipx one.

## Preview npm counts

To see the download counts the [npm download stats](../../modules/npm-download-stats/) module would add, clone this repo next to yours and run:

```bash
python3 ../resume-builder/.github/actions/npm-download-stats/update_npm_stats.py My_CV.yaml
```

It edits the YAML in place, so don't commit the result unless you want to.
