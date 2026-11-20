#!/usr/bin/env python3
"""Send a Telegram message about a resume build, optionally with the PDF.

Environment:
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   required (skips quietly if missing)
  STATUS        "success" (default) or "failure"
  DRIVE_URL     link to the uploaded PDF; omitted from the message when empty
  DOCUMENT      path to a PDF to attach (success only); empty = text message
  REPO, COMMIT_SHA, ACTOR, RUN_URL   context shown in the message

A delivery failure is reported but never fails the build: by the time this
runs, the resume has already been built and published.
"""

import html
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

API = "https://api.telegram.org/bot{token}/{method}"


def build_message() -> str:
    env = os.environ.get
    status = env("STATUS", "success")
    repo = html.escape(env("REPO", ""))
    sha = env("COMMIT_SHA", "")
    actor = html.escape(env("ACTOR", ""))
    run_url = env("RUN_URL", "")
    drive_url = env("DRIVE_URL", "")

    if status == "failure":
        lines = [
            "❌ <b>Resume build failed</b>",
            "",
            f"📄 <b>Repository:</b> <code>{repo}</code>",
            f"👤 <b>Triggered by:</b> <code>{actor}</code>",
        ]
        if run_url:
            lines += ["", f'🔍 <a href="{run_url}">Open the failed run</a>']
        return "\n".join(lines)

    lines = [
        "✅ <b>Resume updated</b>",
        "",
        f"📄 <b>Repository:</b> <code>{repo}</code>",
    ]
    if repo and sha:
        lines.append(f'🔗 <b>Commit:</b> <a href="https://github.com/{repo}/commit/{sha}">{sha[:7]}</a>')
    lines.append(f"👤 <b>Triggered by:</b> <code>{actor}</code>")
    if drive_url:
        lines += ["", f'📎 <a href="{drive_url}">View resume on Google Drive</a>']
    return "\n".join(lines)


def multipart(fields: dict, file_field: str, file_path: Path) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in fields.items():
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
        )
    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    parts.append(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{file_field}"; filename="{file_path.name}"\r\n'
            f"Content-Type: {mime}\r\n\r\n"
        ).encode()
        + file_path.read_bytes()
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def send(token: str, method: str, data: bytes, content_type: str) -> None:
    request = urllib.request.Request(
        API.format(token=token, method=method),
        data=data,
        headers={"Content-Type": content_type},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.loads(response.read().decode())
        if not body.get("ok"):
            raise RuntimeError(body.get("description", "unknown Telegram error"))


def main() -> int:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("⚠️  TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; skipping notification")
        return 0

    message = build_message()
    document = os.environ.get("DOCUMENT", "")
    attach = os.environ.get("STATUS", "success") != "failure" and document and Path(document).is_file()

    try:
        if attach:
            data, content_type = multipart(
                {"chat_id": chat_id, "caption": message, "parse_mode": "HTML"},
                "document",
                Path(document),
            )
            send(token, "sendDocument", data, content_type)
            print(f"✅ Telegram notification sent with {Path(document).name}")
        else:
            data = urllib.parse.urlencode({
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
                "disable_web_page_preview": "true",
            }).encode()
            send(token, "sendMessage", data, "application/x-www-form-urlencoded")
            print("✅ Telegram notification sent")
    except (urllib.error.URLError, OSError, RuntimeError, ValueError) as e:
        print(f"⚠️  Failed to send Telegram notification: {e}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
