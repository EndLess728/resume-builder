---
description: Generate resume PDF and upload to Google Drive with a permanent shareable link
---

# Resume Generation & Google Drive Upload Workflow

The [`Generate & Upload Resume PDF`](../.github/workflows/generate-and-upload-resume.yml) workflow renders the resume and uploads it to Google Drive with [`scripts/upload_to_drive.py`](../scripts/upload_to_drive.py). It updates the same Drive file every time, so the **link stays the same** and can be used in a portfolio.

This guide covers the one-time Google setup. For the full list of pipeline secrets (including the optional Telegram ones), see the **CI Pipeline** section of the [README](../README.md).

## Prerequisites

### 1. Create a Google Cloud Project & Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Google Drive API**:

   - Go to `APIs & Services` → `Enable APIs and Services`
   - Search for "Google Drive API" and enable it

4. Create a Service Account:

   - Go to `APIs & Services` → `Credentials`
   - Click `Create Credentials` → `Service Account`
   - Give it a name like `resume-uploader`
   - Click `Create and Continue` → `Done`

5. Create a Service Account Key:
   - Click on the service account you just created
   - Go to `Keys` tab → `Add Key` → `Create new key`
   - Choose JSON format
   - Download the JSON file (keep it safe, and never commit it)

The service account's email (the `client_email` field in the JSON, e.g. `resume-uploader@your-project.iam.gserviceaccount.com`) is what you share Drive items with below.

### 2. Upload the Resume and Share It (One-time Setup)

1. Render the PDF locally (`rendercv render Mantu_CV.yaml`) and upload `rendercv_output/Mantu_CV.pdf` to [Google Drive](https://drive.google.com/).
2. Right-click the file → `Share`:
   - Add the service account email with **Editor** permission (without this, the upload fails with `File not found`)
   - Under `General access`, choose `Anyone with the link` → `Viewer`
3. Copy the file ID from the URL: `https://drive.google.com/file/d/YOUR_FILE_ID/view`. **This ID is what keeps the link permanent.**

> **Why update an existing file instead of letting the script create one?** Service accounts have no Drive storage quota of their own, so creating a file in a personal (non-shared) Drive folder can be rejected. Updating a file you own works, and it keeps the same link.

### 3. (Optional) Folder Fallback

If `GOOGLE_DRIVE_FILE_ID` is not set, the script instead creates a new file in a folder and makes it public. It prints the new file ID, which you should then save as `GOOGLE_DRIVE_FILE_ID`. To use this path:

1. Create a folder in Drive and share it with the service account email (**Editor**)
2. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`

### 4. Add GitHub Secrets

Go to your GitHub repository → `Settings` → `Secrets and variables` → `Actions`:

| Secret Name                | Value                                                    |
| -------------------------- | -------------------------------------------------------- |
| `GOOGLE_DRIVE_CREDENTIALS` | Entire contents of the JSON key file                     |
| `GOOGLE_DRIVE_FILE_ID`     | The file ID from step 2                                  |
| `GOOGLE_DRIVE_FOLDER_ID`   | The folder ID from step 3 (only needed without a file ID) |

---

## Your Permanent Resume Links

Once set up, your resume will always be available at:

| Format       | URL                                                           |
| ------------ | ------------------------------------------------------------- |
| **View**     | `https://drive.google.com/file/d/YOUR_FILE_ID/view`           |
| **Download** | `https://drive.google.com/uc?export=download&id=YOUR_FILE_ID` |
| **Embed**    | `https://drive.google.com/file/d/YOUR_FILE_ID/preview`        |

> **💡 Tip:** Use the **View** link in your portfolio for best experience!

---

## Manual Trigger

To manually regenerate and upload:

1. Go to your repo → `Actions` tab
2. Select the "Generate & Upload Resume PDF" workflow
3. Click `Run workflow`

## Testing the Upload Locally

```bash
pip install google-api-python-client google-auth
export GOOGLE_DRIVE_CREDENTIALS="$(cat path/to/key.json)"
export GOOGLE_DRIVE_FILE_ID="YOUR_FILE_ID"
python3 scripts/upload_to_drive.py rendercv_output/Mantu_CV.pdf
```

---

## Troubleshooting

| Issue                                       | Solution                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `File not found (ID: ...)`                  | Share the file with the service account email as **Editor**, and check `GOOGLE_DRIVE_FILE_ID` |
| Permission denied                           | Ensure the service account has **Editor** access to the file (or folder)                   |
| `Service Accounts do not have storage quota` | Set `GOOGLE_DRIVE_FILE_ID` so the script updates your file instead of creating one          |
| API not enabled                             | Enable the Google Drive API in Cloud Console                                               |
| `KeyError: 'GOOGLE_DRIVE_CREDENTIALS'`      | The secret is missing or misnamed in GitHub Actions settings                               |
