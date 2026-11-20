# Mantu's Resume

This repository contains the source code for my resume, built using [RenderCV](https://github.com/rendercv/rendercv).

RenderCV takes a YAML input file (`Mantu_CV.yaml`) and generates a professional, Typst-formatted PDF.

## 📄 Resume PDF

- **[View/Download Resume](https://drive.google.com/file/d/YOUR_FILE_ID/view)**: Latest version of my resume (Google Drive)

## 🚀 Quick Start

### Installation

**Using Homebrew (Recommended for macOS):**

1. Install Python:

   ```bash
   brew install python
   ```

2. Install `pipx`:

   ```bash
   brew install pipx
   pipx ensurepath
   ```

3. Install RenderCV:
   ```bash
   pipx install "rendercv[full]>=2.6"
   ```

4. Check the version:
   ```bash
   rendercv --version
   ```

> **⚠️ RenderCV version:** `Mantu_CV.yaml` requires **RenderCV v2.6 or newer**. If `rendercv --version` shows something older, check `which -a rendercv` for a stale copy installed with plain `pip` that shadows the pipx one, remove it, and run `pipx upgrade rendercv`.

### Rendering the Resume

To generate the PDF from the YAML file:

```bash
rendercv render Mantu_CV.yaml
```

This will create a `rendercv_output` directory containing:

- `Mantu_CV.pdf`: The final resume.
- `Mantu_CV.typ`: The generated Typst source.
- `Mantu_CV_1.png`, `Mantu_CV_2.png`: A PNG preview of each page.

### Live Editing

To automatically re-render the PDF whenever you save changes to the YAML file:

```bash
rendercv render --watch Mantu_CV.yaml
```

## ⚙️ CI Pipeline

[`.github/workflows/generate-and-upload-resume.yml`](./.github/workflows/generate-and-upload-resume.yml) rebuilds the resume and publishes it.

**Triggers:** a push to `main` that changes `Mantu_CV.yaml`, every Sunday at 11:30 PM IST (to refresh the npm download counts), or a manual run from the **Actions** tab (`Run workflow`).

**Steps:**

1. Installs `rendercv[full]` (v2.6 or newer) and the Google API client.
2. Updates npm download counts in the YAML ([`scripts/update_npm_stats.py`](./scripts/update_npm_stats.py)). This uses the public npm API, so no key is needed.
3. Renders the PDF.
4. Uploads it to Google Drive ([`scripts/upload_to_drive.py`](./scripts/upload_to_drive.py)).
5. Saves the PDF as a workflow artifact (`resume-pdf`).
6. Commits the regenerated `rendercv_output/` back to `main`.
7. Sends a Telegram notification ([`scripts/notify_telegram.py`](./scripts/notify_telegram.py)). Optional: the step is skipped unless both Telegram secrets are set.

### Required secrets

Add these under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                     | Required    | Value                                                                                                                                  |
| -------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_DRIVE_CREDENTIALS` | Yes         | The entire contents of the Google Cloud service-account JSON key file.                                                                 |
| `GOOGLE_DRIVE_FILE_ID`     | Recommended | ID of the existing PDF in Drive (from `https://drive.google.com/file/d/<FILE_ID>/view`). The file is updated in place, so the link stays the same. |
| `GOOGLE_DRIVE_FOLDER_ID`   | Only if no file ID | ID of the Drive folder (from `https://drive.google.com/drive/folders/<FOLDER_ID>`). Used only when `GOOGLE_DRIVE_FILE_ID` is not set. |
| `TELEGRAM_BOT_TOKEN`       | Optional    | Bot token from [@BotFather](https://t.me/BotFather). If it or the chat ID is missing, the notification is skipped.                    |
| `TELEGRAM_CHAT_ID`         | Optional    | The chat to notify. Send your bot a message, then read `chat.id` from `https://api.telegram.org/bot<TOKEN>/getUpdates`.               |

### One-time Google Drive setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Drive API**.
2. Create a **service account** (`APIs & Services → Credentials → Create Credentials → Service Account`), then add a **JSON key** for it (`Keys → Add Key → Create new key`). Paste that file's contents into `GOOGLE_DRIVE_CREDENTIALS`.
3. Upload `Mantu_CV.pdf` to your Drive manually, set **Share → Anyone with the link → Viewer**, and copy its file ID into `GOOGLE_DRIVE_FILE_ID`.
4. **Share that file with the service account's email** (`...@<project>.iam.gserviceaccount.com`, the `client_email` in the JSON key) with **Editor** access. If you skip this, the upload fails with `File not found`.

> **Tip:** Prefer setting `GOOGLE_DRIVE_FILE_ID`. Without it, the script creates a new file on every run, so the shareable link changes each time. Also, service accounts have no storage quota of their own, so creating a file in a personal (non-shared) Drive folder may be rejected. Updating a file you own does not have this problem.

A longer walkthrough is in [`docs/GOOGLE_DRIVE_SETUP.md`](./docs/GOOGLE_DRIVE_SETUP.md).

### Repository settings

The workflow declares `permissions: contents: write` so it can push the regenerated files. If the **Commit generated files** step fails with a `403`, go to **Settings → Actions → General → Workflow permissions** and allow **Read and write permissions**.

## 📄 Source File

- **[Mantu_CV.yaml](./Mantu_CV.yaml)**: The main data file containing all resume content (Experience, Projects, Education, etc.).

## 🛠️ Built With

- [RenderCV](https://docs.rendercv.com/) - CV generator from YAML
