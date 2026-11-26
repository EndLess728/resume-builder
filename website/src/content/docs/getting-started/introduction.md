---
title: Introduction
description: What resume-builder is, how the reusable workflow and your private CV repo fit together, and what each part does.
---

resume-builder is a **reusable GitHub Actions workflow** that builds your resume from a YAML file. You write your CV in [RenderCV](https://docs.rendercv.com/)'s YAML format, push it, and the workflow:

1. Renders it to a PDF and PNG previews with RenderCV.
2. Saves them as a workflow artifact and commits `rendercv_output/` back to your repo.
3. Runs any optional **modules** you've turned on: live npm download counts, a Google Drive upload behind one permanent link, a Telegram message.

## Two repos

The pipeline lives here, in a public repo. Your CV lives in **your own private repo**, which calls the pipeline:

```
┌───────────────────────────┐   uses   ┌─────────────────────────────────────┐
│ your private resume repo  │ ───────▶ │ EndLess728/resume-builder           │
│  Your_CV.yaml             │          │  .github/workflows/build-resume.yml │
│  .github/workflows/...    │          │  .github/actions/  (modules)        │
│  secrets: Drive, Telegram │          │  example_CV.yaml                    │
└───────────────────────────┘          └─────────────────────────────────────┘
```

A reusable workflow runs in the **caller's** repo. So the logs, artifacts and commits that contain your phone number and email all happen in your private repo, never here. You get fixes and new modules by bumping one version tag, without copying any code.

## Modules

Everything beyond rendering is a module that turns itself on when you set its secret or input:

| Module | What it does | Turns on when |
| --- | --- | --- |
| [npm download stats](../../modules/npm-download-stats/) | Adds live npm download counts to entries that link to an npm package. | On by default |
| [Google Drive upload](../../modules/google-drive-upload/) | Keeps the PDF on Drive behind one link that never changes. | `GOOGLE_DRIVE_CREDENTIALS` is set |
| [Telegram notify](../../modules/telegram-notify/) | Messages you when the resume is built, or when a build fails. | `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set |

Modules are plain composite actions, so you can use them in other workflows too.

## Support

`resume-builder` is free and open source. If it saves you time, you can [buy me a coffee](https://www.buymeacoffee.com/mantu.728) or [donate via PayPal](https://paypal.me/Monty728). See [Support the project](../../support/) for other ways to help.

## Next

[Quick start](../quick-start/) walks you through creating your repo from the template.
