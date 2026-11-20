# google-drive-upload

**Stage:** publish · **Enabled by:** the `GOOGLE_DRIVE_CREDENTIALS` secret

Uploads the rendered PDF to Google Drive with a service account. With a file ID set, it updates the same Drive file every time, so the share link you put on your portfolio or LinkedIn never changes.

First-time Google setup (service account, sharing the file with it): **[SETUP.md](./SETUP.md)**.

## Inputs

| Input         | Required | Description                                                                                  |
| ------------- | -------- | -------------------------------------------------------------------------------------------- |
| `file`        | yes      | Path of the file to upload.                                                                  |
| `credentials` | yes      | Full contents of a Google Cloud service-account JSON key.                                    |
| `file_id`     | no       | Existing Drive file to update in place. Recommended: keeps the link stable.                  |
| `folder_id`   | no       | Folder to create a new, publicly readable file in. Used only when `file_id` is empty.        |

## Outputs

| Output | Description                     |
| ------ | ------------------------------- |
| `url`  | View URL of the uploaded file.  |

Inside `build-resume.yml` this becomes the workflow's `drive_url` output, and `telegram-notify` links to it.

## Use it on its own

Works for any file, not just resumes:

```yaml
- uses: EndLess728/resume-builder/.github/actions/google-drive-upload@v1
  id: drive
  with:
    file: dist/report.pdf
    credentials: ${{ secrets.GOOGLE_DRIVE_CREDENTIALS }}
    file_id: ${{ secrets.GOOGLE_DRIVE_FILE_ID }}
- run: echo "Uploaded to ${{ steps.drive.outputs.url }}"
```

## Run locally

```bash
pip install google-api-python-client google-auth
export GOOGLE_DRIVE_CREDENTIALS="$(cat key.json)" GOOGLE_DRIVE_FILE_ID="<file id>"
python3 .github/actions/google-drive-upload/upload_to_drive.py rendercv_output/My_CV.pdf
```
