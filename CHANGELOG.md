# Changelog

All notable changes to this project are documented here. The project follows
[Semantic Versioning](https://semver.org/): pin `@v1` for compatible updates,
or an exact tag such as `@v1.0.0` for a fixed version.

## [Unreleased]

### Fixed

- Removed the "Node.js 20 is deprecated" warnings by updating to `actions/checkout@v7`, `actions/setup-python@v7`, `actions/upload-artifact@v7` and `actions/download-artifact@v8`, which run on Node.js 24.

### Added

- [resume-builder-template](https://github.com/EndLess728/resume-builder-template), a ready-made repo to start from with **Use this template**. The README's setup steps now use it, with the manual workflow kept as a fallback.

## [1.2.0] - 2026-11-20

### Changed

- Modules moved from `actions/` to `.github/actions/`, next to the workflows that use them. If you use a module on its own, update the path, e.g. `EndLess728/resume-builder/.github/actions/telegram-notify@v1`. Callers of `build-resume.yml` need no changes.
- Release notes now come from this changelog instead of a list of commits.

### Added

- **Sync release notes** workflow, which rewrites existing releases' notes from `CHANGELOG.md` after you edit it.

## [1.1.0] - 2026-11-20

### Added

- Optional features are now **modules**: composite actions in `actions/` (`npm-download-stats`, `google-drive-upload`, `telegram-notify`), each with its own README. They also work on their own in any workflow.
- `drive_url` workflow output with the Drive link to the PDF.
- `telegram_send_pdf` input to attach the PDF to the Telegram message.
- `telegram_notify_on_failure` input (default `true`): Telegram tells you when a build fails, with a link to the run.
- `CONTRIBUTING.md`, a module template in `docs/module-template/`, and a pull request template.
- CI lints workflows, checks each module has `action.yml` and `README.md`, and compiles the Python.

### Fixed

- The Telegram message only links to Google Drive when the upload actually ran, using the real file URL. Before, it linked to `GOOGLE_DRIVE_FILE_ID` even when the upload was skipped or created a new file.

### Changed

- `scripts/` moved into the module folders, and the Drive setup guide moved to `actions/google-drive-upload/SETUP.md`.
- Callers need no changes.

## [1.0.1] - 2026-11-20

### Changed

- Releases attach only `sample-resume.pdf`. The README preview now lives in `docs/sample-resume.png` and is refreshed by each release.
- `example_CV.yaml` now fills a full page, so the sample shows a realistic resume.

## [1.0.0] - 2026-11-20

First public release.

### Added

- Reusable workflow `build-resume.yml` that renders a RenderCV YAML resume to PDF and PNG.
- Optional Google Drive upload that updates one file in place, so its link never changes.
- Optional Telegram notification after each build.
- Live npm download counts for any entry that links to an npm package.
- The workflow loads its scripts from its own commit, so a pinned version always runs matching scripts.
- `example_CV.yaml`, rendered and attached to every release as a sample.

[1.2.0]: https://github.com/EndLess728/resume-builder/releases/tag/v1.2.0
[1.1.0]: https://github.com/EndLess728/resume-builder/releases/tag/v1.1.0
[1.0.1]: https://github.com/EndLess728/resume-builder/releases/tag/v1.0.1
[1.0.0]: https://github.com/EndLess728/resume-builder/releases/tag/v1.0.0
