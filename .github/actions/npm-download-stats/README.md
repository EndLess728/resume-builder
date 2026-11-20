# npm-download-stats

**Stage:** pre-render · **Enabled by:** `update_npm_stats: true` (default)

Appends a live download count to any resume entry whose name links to an npm package page:

```yaml
- name: "[my-package](https://www.npmjs.com/package/my-package)"
  summary: Does something useful        # becomes: Does something useful (12.3K+ downloads)
```

It edits the CV YAML in place before RenderCV runs. An existing `(... downloads)` suffix is replaced, so it's safe to run on every build. It uses the public npm downloads API, so no key is needed. If the API is unreachable, the entry is left as it was and the build carries on.

## Inputs

| Input     | Required | Description                         |
| --------- | -------- | ----------------------------------- |
| `cv_file` | yes      | Path to the RenderCV YAML to update. |

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
