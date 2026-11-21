---
title: Troubleshooting
description: Fixes for common resume-builder problems, from skipped modules and push failures to Google Drive and Telegram errors.
---

Start with the run log. The **Detect enabled modules** step prints a ✅ or ⏭️ for each module, with the reason it was skipped.

## The build

| Problem | Fix |
| --- | --- |
| A module was skipped | Its secret isn't reaching the workflow. Check the name matches exactly, and that the caller has `secrets: inherit`. |
| `Commit generated files` fails with `403` or `Permission denied` | Add `permissions: contents: write` to the caller workflow, or set `commit_output: false`. |
| Nothing ran after a push | The template only triggers on changes to `My_CV.yaml`. If you renamed the file, update `paths:` in `resume.yml`. |
| RenderCV reports a YAML error | Render locally to see it faster, and use the [schema line](../../getting-started/writing-your-cv/#autocomplete-in-your-editor) for editor checks. |
| Local output differs from CI | Install the same RenderCV version as `rendercv_version`. Check `which -a rendercv` for a stale install. |

## Google Drive

| Problem | Fix |
| --- | --- |
| `File not found (ID: ...)` | Share the file with the service account email as **Editor**, and check `GOOGLE_DRIVE_FILE_ID`. |
| Permission denied | Make sure the service account has **Editor** access to the file (or folder). |
| `Service Accounts do not have storage quota` | Set `GOOGLE_DRIVE_FILE_ID` so the module updates your file instead of creating one. |
| API not enabled | Enable the Google Drive API in the Cloud Console. |
| `KeyError: 'GOOGLE_DRIVE_CREDENTIALS'` | The secret is missing or misnamed. |

## Telegram

| Problem | Fix |
| --- | --- |
| No message, build is green | Delivery problems never fail the build. Check the Telegram step's log for the API error. |
| `chat not found` | Send your bot a message first, then read `chat.id` from `getUpdates` again. |
| Telegram is not mentioned in the log | Both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` must be set. |

Still stuck? [Open an issue](https://github.com/EndLess728/resume-builder/issues) with the run log (remove anything personal first).
