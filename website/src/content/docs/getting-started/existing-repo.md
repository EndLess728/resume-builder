---
title: Add to an existing repo
description: Call the resume-builder reusable workflow from a repo you already have, without using the template.
---

Already keep your CV in a repo? Add the workflow by hand instead of using the template.

Save this as `.github/workflows/resume.yml`, with `cv_file` pointing at your YAML:

```yaml
name: Resume

on:
  push:
    branches: [main]
    paths: ["My_CV.yaml"]
  schedule:
    - cron: "0 18 * * 0" # weekly, refreshes npm download counts
  workflow_dispatch:

permissions:
  contents: write # lets the workflow commit rendercv_output/

jobs:
  build:
    uses: EndLess728/resume-builder/.github/workflows/build-resume.yml@v1
    with:
      cv_file: My_CV.yaml
    secrets: inherit
```

The template's [`resume.yml`](https://github.com/EndLess728/resume-builder-template/blob/main/.github/workflows/resume.yml) is the same file with every option commented.

## What each part does

- **`permissions: contents: write`** lets the workflow commit `rendercv_output/` back. If you set `commit_output: false`, `contents: read` is enough.
- **`secrets: inherit`** passes your repo's secrets to the workflow, so the modules can find them. You can list them one by one instead if you prefer.
- **`@v1`** pins the latest 1.x release. See [Versioning](../../reference/versioning/) for other choices.

All the other options are listed in [Inputs & outputs](../../reference/inputs-outputs/).

:::caution[Keep the CV repo private]
If the repo is public, set `upload_artifact: false` and `commit_output: false`. See [Privacy & public repos](../../guides/privacy/).
:::
