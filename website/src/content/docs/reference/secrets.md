---
title: Secrets
description: The optional secrets that turn on resume-builder's Google Drive and Telegram modules, and where to get each value.
---

All secrets are optional. A module whose secrets are missing is skipped. Add them in your CV repo under **Settings → Secrets and variables → Actions**, and pass them with `secrets: inherit`.

| Secret | Value |
| --- | --- |
| `GOOGLE_DRIVE_CREDENTIALS` | The entire contents of a Google Cloud service-account JSON key. Turns on **Google Drive upload**. |
| `GOOGLE_DRIVE_FILE_ID` | ID of the existing PDF in Drive (`https://drive.google.com/file/d/<FILE_ID>/view`). Updated in place, so the link stays fixed. |
| `GOOGLE_DRIVE_FOLDER_ID` | Drive folder to create the file in. Only used when `GOOGLE_DRIVE_FILE_ID` is not set. |
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather). With the chat ID, turns on **Telegram notify**. |
| `TELEGRAM_CHAT_ID` | Chat to notify. Message your bot, then read `chat.id` from `https://api.telegram.org/bot<TOKEN>/getUpdates`. |

Setup walkthroughs: [Google Drive upload](../../modules/google-drive-upload/#one-time-setup) · [Telegram notify](../../modules/telegram-notify/#setup).

## Passing secrets explicitly

`secrets: inherit` passes all of your repo's secrets. To pass only the ones the workflow needs, list them instead:

```yaml
jobs:
  build:
    uses: EndLess728/resume-builder/.github/workflows/build-resume.yml@v1
    with:
      cv_file: My_CV.yaml
    secrets:
      TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
      TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```
