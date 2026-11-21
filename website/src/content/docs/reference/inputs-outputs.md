---
title: Inputs & outputs
description: Every input the build-resume.yml reusable workflow accepts, with defaults, and the outputs it returns.
---

Set inputs under `with:` in your caller workflow:

```yaml
jobs:
  build:
    uses: EndLess728/resume-builder/.github/workflows/build-resume.yml@v1
    with:
      cv_file: My_CV.yaml
      telegram_send_pdf: true
    secrets: inherit
```

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `cv_file` | required | Path to your RenderCV YAML. |
| `commit_output` | `true` | Commit `rendercv_output/` back to your repo. Needs `contents: write`. |
| `upload_artifact` | `true` | Save the PDF and PNG previews as a workflow artifact. |
| `artifact_name` | `resume` | Name of that artifact. |
| `rendercv_version` | `>=2.6` | pip version specifier for RenderCV. |
| `update_npm_stats` | `true` | **npm download stats:** add live download counts. |
| `telegram_send_pdf` | `false` | **Telegram notify:** attach the PDF to the success message. |
| `telegram_notify_on_failure` | `true` | **Telegram notify:** also send a message when the build fails. |
| `toolkit_repository` | auto | Where the modules come from. Defaults to the repo you called the workflow from. |
| `toolkit_ref` | auto | Version of the modules. Defaults to the exact commit of the workflow you pinned. |

You'll rarely need `toolkit_repository` or `toolkit_ref`. They exist for testing modules from a fork, see [Testing a change](../../contributing/testing/).

## Outputs

| Output | Description |
| --- | --- |
| `pdf_path` | Path of the rendered PDF. |
| `drive_url` | Google Drive link to the PDF. Empty when the Drive module is off. |

[Using the outputs](../../guides/outputs/) shows how to read them from another job.

## Secrets

The workflow reads five optional secrets. They're listed in [Secrets](../secrets/).
