# Changelog

All notable changes to this project are documented here. The project follows
[Semantic Versioning](https://semver.org/): pin `@v1` for compatible updates,
or an exact tag such as `@v1.0.0` for a fixed version.

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

[1.0.1]: https://github.com/EndLess728/resume-builder/releases/tag/v1.0.1
[1.0.0]: https://github.com/EndLess728/resume-builder/releases/tag/v1.0.0
