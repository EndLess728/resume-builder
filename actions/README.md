# Modules

Every optional feature of resume-builder is a **module**: a [composite action](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action) in its own folder here. [`build-resume.yml`](../.github/workflows/build-resume.yml) wires them into the pipeline, and each one also works on its own in any workflow.

| Module                                          | Stage      | Turns on when                                   | What it does                                   |
| ----------------------------------------------- | ---------- | ----------------------------------------------- | ---------------------------------------------- |
| [npm-download-stats](./npm-download-stats/)     | pre-render | `update_npm_stats: true` (default)              | Adds live npm download counts to the CV.       |
| [google-drive-upload](./google-drive-upload/)   | publish    | `GOOGLE_DRIVE_CREDENTIALS` secret is set        | Keeps the PDF on Drive behind one fixed link.  |
| [telegram-notify](./telegram-notify/)           | notify     | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set   | Messages you on success or failure.            |

## How the pipeline runs

```
 1. Setup        checkout CV repo + this toolkit (same commit as the workflow) → detect enabled modules
 2. Pre-render   modules that edit the CV YAML before rendering                → npm-download-stats
 3. Render       rendercv render  → rendercv_output/*.pdf, *.png
 4. Publish      modules that ship the PDF somewhere                           → google-drive-upload
 5. Save         workflow artifact + commit rendercv_output/
 6. Notify       modules that report the result (also runs on failure)         → telegram-notify
```

## The module contract

A module is easy to review when it follows these rules:

1. **One folder, self-contained.** `actions/<name>/` holds `action.yml`, a `README.md`, and any script it runs. Nothing outside the folder is needed.
2. **Composite action.** `runs.using: composite`. Scripts are called through `$GITHUB_ACTION_PATH`, never by a path relative to the repo.
3. **Inputs in, outputs out.** Secrets and settings come in as inputs. Anything a later step might use (a URL, an ID) goes out as an output. Modules don't read each other's files or environment.
4. **Optional by default.** `build-resume.yml` only runs the module when its secret or input is set, so existing users see no change.
5. **Pick the right stage.** Pre-render modules may edit the CV YAML. Publish and notify modules must not change it.
6. **Fail honestly.** A publish module should fail the build if it can't publish. A notify module should log the problem and exit 0, because the resume is already out.
7. **Standard library first.** If you need packages, install them inside the module, as `google-drive-upload` does, so users who don't enable it don't pay for it.

## Adding a module

Copy [`docs/module-template/`](../docs/module-template/) and follow the step-by-step guide in [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-module).
