# telegram-notify

**Stage:** notify · **Enabled by:** the `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets

Sends a Telegram message when the resume is built. It can attach the PDF, and it can also tell you when a build fails, so a broken weekly rebuild doesn't go unnoticed. A delivery problem is logged but never fails the build.

| Situation                         | Message                                              |
| --------------------------------- | ---------------------------------------------------- |
| Build succeeded                   | ✅ Resume updated, with commit, actor, and the Drive link if the Drive module ran |
| Build succeeded, `telegram_send_pdf: true` | Same, with the PDF attached                 |
| Build failed (`telegram_notify_on_failure: true`, default) | ❌ Resume build failed, with a link to the run |

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy its token.
2. Send your bot any message, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `message.chat.id`.
3. Save them as the `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets in your CV repo.

## Inputs

| Input       | Required | Description                                                                  |
| ----------- | -------- | ---------------------------------------------------------------------------- |
| `bot_token` | yes      | Bot token from @BotFather.                                                   |
| `chat_id`   | yes      | Chat to send the message to.                                                 |
| `status`    | no       | `success` (default) or `failure`.                                            |
| `drive_url` | no       | Link to the published PDF. Left out of the message when empty.               |
| `document`  | no       | Path to a PDF to attach (successful builds only). Empty sends text only.     |

## Use it on its own

```yaml
- uses: EndLess728/resume-builder/.github/actions/telegram-notify@v1
  if: always()
  with:
    bot_token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    chat_id: ${{ secrets.TELEGRAM_CHAT_ID }}
    status: ${{ job.status }}
    document: dist/app-release.pdf
```

## Run locally

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... REPO=me/my-cv ACTOR=me \
  python3 .github/actions/telegram-notify/notify_telegram.py
```
