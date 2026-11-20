# resume-builder

[![Latest release](https://img.shields.io/github/v/release/EndLess728/resume-builder?sort=semver)](https://github.com/EndLess728/resume-builder/releases/latest)
[![CI](https://github.com/EndLess728/resume-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/EndLess728/resume-builder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

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

## Sample output

This is [`example_CV.yaml`](./example_CV.yaml) rendered by the latest release. **[Download the sample PDF](https://github.com/EndLess728/resume-builder/releases/latest/download/sample-resume.pdf)**

<a href="https://github.com/EndLess728/resume-builder/releases/latest/download/sample-resume.pdf"><img src="https://github.com/EndLess728/resume-builder/releases/latest/download/sample-resume-page-1.png" alt="Sample resume, page 1" width="600"></a>

## What it does

1. Adds live npm download counts to any entry that links to an npm package ([`scripts/update_npm_stats.py`](./scripts/update_npm_stats.py)).
2. Renders the PDF (and PNG previews) with RenderCV.
3. Uploads the PDF to Google Drive, updating the same file so the link never changes ([`scripts/upload_to_drive.py`](./scripts/upload_to_drive.py)). Optional.
4. Saves the PDF and PNG previews as a workflow artifact and commits `rendercv_output/` back to your repo.
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
    uses: EndLess728/resume-builder/.github/workflows/build-resume.yml@v1
    with:
      cv_file: Jane_Doe_CV.yaml
    secrets: inherit
```

**3. Add secrets** (optional) under **Settings → Secrets and variables → Actions** in your private repo. See below.

Push, and the resume builds.

### Inputs

| Input                | Default  | Description                                                                         |
| -------------------- | -------- | ----------------------------------------------------------------------------------- |
| `cv_file`            | required | Path to your RenderCV YAML.                                                         |
| `update_npm_stats`   | `true`   | Append live npm download counts to entries linking to npm packages.                 |
| `commit_output`      | `true`   | Commit `rendercv_output/` back to your repo.                                        |
| `upload_artifact`    | `true`   | Save the PDF and PNG previews as a workflow artifact.                               |
| `artifact_name`      | `resume` | Name of that artifact.                                                              |
| `rendercv_version`   | `>=2.6`  | pip version specifier for RenderCV.                                                 |
| `toolkit_repository` | auto     | Where the scripts come from. Defaults to the repo you called the workflow from.     |
| `toolkit_ref`        | auto     | Version of the scripts. Defaults to the exact commit of the workflow you pinned.    |

### Versioning

Releases follow [Semantic Versioning](https://semver.org/) and are listed in the [changelog](./CHANGELOG.md).

| Pin                      | You get                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `@v1` (recommended)      | The latest 1.x release: fixes and new features, nothing breaking. |
| `@v1.0.0`                | Exactly that release, never changes.                              |
| `@<commit-sha>`          | Exactly that commit. The safest choice for strict supply-chain rules. |
| `@main`                  | Unreleased changes. May break.                                    |

The workflow always loads its scripts from the same commit as the workflow file you pinned, so the workflow and scripts can't drift apart.

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

[`ci.yml`](./.github/workflows/ci.yml) runs the reusable workflow against `example_CV.yaml` on every push and pull request, so changes are tested end to end.

To release, add the changes to [`CHANGELOG.md`](./CHANGELOG.md), then either run **Actions → Release → Run workflow** with a version like `v1.1.0`, or push the tag yourself:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

[`release.yml`](./.github/workflows/release.yml) renders the sample with that exact version, publishes a GitHub release with `sample-resume.pdf` and PNG previews attached, and moves the `v1` tag to it. Tags with a suffix, like `v1.1.0-rc.1`, become pre-releases and don't move `v1`.

## License

[MIT](./LICENSE)
