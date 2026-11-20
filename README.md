# resume-builder

Write your resume as YAML, and let GitHub Actions turn it into a PDF, keep it up to date on Google Drive behind one permanent link, and ping you on Telegram when it's done. Built on [RenderCV](https://github.com/rendercv/rendercv).

The pipeline is a **reusable workflow**. Your actual CV lives in a separate (private) repo that calls it. That keeps your phone number, email and generated PDFs out of public view: logs, artifacts and commits all happen in your private repo, while the code lives here in one place.

```
┌───────────────────────────┐   uses   ┌─────────────────────────────────────┐
│ your private resume repo  │ ───────▶ │ EndLess728/resume-builder           │
│  Your_CV.yaml             │          │  .github/workflows/build-resume.yml │
│  .github/workflows/...    │          │  scripts/                           │
│  secrets: Drive, Telegram │          │  example_CV.yaml                    │
└───────────────────────────┘          └─────────────────────────────────────┘
```

## What it does

1. Adds live npm download counts to any entry that links to an npm package ([`scripts/update_npm_stats.py`](./scripts/update_npm_stats.py)).
2. Renders the PDF (and PNG previews) with RenderCV.
3. Uploads the PDF to Google Drive, updating the same file so the link never changes ([`scripts/upload_to_drive.py`](./scripts/upload_to_drive.py)). Optional.
4. Saves the PDF as a workflow artifact and commits `rendercv_output/` back to your repo.
5. Sends a Telegram notification ([`scripts/notify_telegram.py`](./scripts/notify_telegram.py)). Optional.

## Use it for your own resume

**1. Create a private repo** with your CV YAML. Start from [`example_CV.yaml`](./example_CV.yaml) and rename it, e.g. `Jane_Doe_CV.yaml`.

**2. Add this workflow** to it as `.github/workflows/resume.yml`:

```yaml
name: Resume

on:
  push:
    branches: [main]
    paths: ["Jane_Doe_CV.yaml"]
  schedule:
    - cron: "0 18 * * 0" # weekly, refreshes npm download counts
  workflow_dispatch:

permissions:
  contents: write # lets the workflow commit rendercv_output/

jobs:
  build:
    uses: EndLess728/resume-builder/.github/workflows/build-resume.yml@main
    with:
      cv_file: Jane_Doe_CV.yaml
    secrets: inherit
```

**3. Add secrets** (optional) under **Settings → Secrets and variables → Actions** in your private repo. See below.

Push, and the resume builds. For a stable setup, pin `@main` to a tag or commit SHA.

### Inputs

| Input                | Default               | Description                                                         |
| -------------------- | --------------------- | ------------------------------------------------------------------- |
| `cv_file`            | required              | Path to your RenderCV YAML.                                         |
| `update_npm_stats`   | `true`                | Append live npm download counts to entries linking to npm packages. |
| `commit_output`      | `true`                | Commit `rendercv_output/` back to your repo.                        |
| `upload_artifact`    | `true`                | Save the PDF as a `resume-pdf` artifact.                            |
| `rendercv_version`   | `>=2.6`               | pip version specifier for RenderCV.                                 |
| `toolkit_repository` | `EndLess728/resume-builder` | Where the scripts come from. Set this if you fork the toolkit.      |
| `toolkit_ref`        | `main`                | Branch, tag or SHA of the toolkit to use.                           |

### Secrets

All optional. Steps whose secrets are missing are skipped.

| Secret                     | Value                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_DRIVE_CREDENTIALS` | The entire contents of a Google Cloud service-account JSON key. Enables the Drive upload.                                      |
| `GOOGLE_DRIVE_FILE_ID`     | ID of the existing PDF in Drive (`https://drive.google.com/file/d/<FILE_ID>/view`). Updated in place, so the link stays fixed. |
| `GOOGLE_DRIVE_FOLDER_ID`   | Drive folder to create the file in. Only used when `GOOGLE_DRIVE_FILE_ID` is not set.                                          |
| `TELEGRAM_BOT_TOKEN`       | Bot token from [@BotFather](https://t.me/BotFather).                                                                          |
| `TELEGRAM_CHAT_ID`         | Chat to notify. Message your bot, then read `chat.id` from `https://api.telegram.org/bot<TOKEN>/getUpdates`.                  |

The one-time Google setup (service account, sharing the file with it) is walked through in [`docs/GOOGLE_DRIVE_SETUP.md`](./docs/GOOGLE_DRIVE_SETUP.md).

> **Keep the CV repo private.** If you call this from a public repo, set `upload_artifact: false` and `commit_output: false`, since anyone can download artifacts and read commits there.

## Render locally

```bash
brew install pipx && pipx ensurepath
pipx install "rendercv[full]>=2.6"
rendercv render example_CV.yaml          # one-off
rendercv render --watch example_CV.yaml  # re-render on save
```

Output goes to `rendercv_output/`. If `rendercv --version` shows something older than 2.6, check `which -a rendercv` for a stale pip install shadowing the pipx one.

## Development

[`ci.yml`](./.github/workflows/ci.yml) runs the reusable workflow against `example_CV.yaml` on every push and pull request, using the scripts from that same commit, so changes are tested end to end.

## License

[MIT](./LICENSE)
