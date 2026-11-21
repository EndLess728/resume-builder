---
title: npm download stats
description: The npm-download-stats module appends live npm download counts to resume entries that link to an npm package.
---

**Stage:** pre-render · **Enabled by:** `update_npm_stats: true` (default)

Appends a live download count to any resume entry whose name links to an npm package page:

```yaml
- name: "[my-package](https://www.npmjs.com/package/my-package)"
  summary: Does something useful        # becomes: Does something useful (12.3K+ downloads)
```

It edits the CV YAML in place before RenderCV runs. An existing `(... downloads)` suffix is replaced, so it's safe to run on every build. It uses the public npm downloads API, so no key is needed. If the API is unreachable, the entry is left as it was and the build carries on.

The template's workflow runs once a week on a schedule, so the counts stay fresh even when you don't edit your CV.

## Turn it off

```yaml
with:
  cv_file: My_CV.yaml
  update_npm_stats: false
```

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `cv_file` | yes | Path to the RenderCV YAML to update. |

## Use it on its own

```yaml
- uses: actions/checkout@v7
- uses: EndLess728/resume-builder/.github/actions/npm-download-stats@v1
  with:
    cv_file: My_CV.yaml
```

## Run locally

```bash
python3 .github/actions/npm-download-stats/update_npm_stats.py My_CV.yaml
```
