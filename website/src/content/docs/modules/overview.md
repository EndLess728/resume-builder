---
title: Modules overview
description: The optional modules in resume-builder, which stage of the pipeline each runs in, and what turns it on.
sidebar:
  label: Overview
---

Every optional feature is a **module**: a [composite action](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action) in its own folder under [`.github/actions/`](https://github.com/EndLess728/resume-builder/tree/main/.github/actions). The workflow only runs a module when its secret or input is set, so you turn things on just by adding secrets.

| Module | Stage | Turns on when | What it does |
| --- | --- | --- | --- |
| [npm download stats](../npm-download-stats/) | pre-render | `update_npm_stats: true` (default) | Adds live npm download counts to the CV. |
| [Google Drive upload](../google-drive-upload/) | publish | `GOOGLE_DRIVE_CREDENTIALS` secret is set | Keeps the PDF on Drive behind one fixed link. |
| [Telegram notify](../telegram-notify/) | notify | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set | Messages you on success or failure. |

## How the pipeline runs

```
 1. Setup        checkout CV repo + this toolkit (same commit as the workflow) → detect enabled modules
 2. Pre-render   modules that edit the CV YAML before rendering                → npm-download-stats
 3. Render       rendercv render  → rendercv_output/*.pdf, *.png
 4. Publish      modules that ship the PDF somewhere                           → google-drive-upload
 5. Save         workflow artifact + commit rendercv_output/
 6. Notify       modules that report the result (also runs on failure)         → telegram-notify
```

The **Detect enabled modules** step prints which modules are on and why the others were skipped, so the run log tells you at a glance whether a secret was picked up.

## Using a module on its own

Modules don't depend on the rest of the pipeline. Each page shows how to call it from any workflow, for example:

```yaml
- uses: EndLess728/resume-builder/.github/actions/telegram-notify@v1
```

## Want another one?

Slack, email, a portfolio deploy? [Adding a module](../../contributing/adding-a-module/) takes a template and four small edits.
