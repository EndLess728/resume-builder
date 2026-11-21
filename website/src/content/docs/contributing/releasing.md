---
title: Releasing
description: How maintainers publish a resume-builder release, refresh the sample resume, move the major tag, and fix release notes.
---

Maintainers only.

1. Move the `## [Unreleased]` notes in `CHANGELOG.md` under a new version heading and merge to `main`.
2. **Actions → Release → Run workflow**, version `vX.Y.Z`.

The release workflow:

- tags the commit,
- renders the sample with that version,
- publishes the release with that version's `CHANGELOG.md` section as its notes and `sample-resume.pdf` attached,
- refreshes `docs/sample-resume.png`,
- moves the major tag (`v1`).

Pre-release versions (`v1.3.0-rc.1`) are published as pre-releases and leave the major tag and preview image alone.

When a release finishes, the docs site redeploys so its changelog and sample image are current.

## Fixing release notes

Spotted a mistake in a released version's notes? Fix `CHANGELOG.md`, merge, then run **Actions → Sync release notes** (one version, or leave it empty for all).

## Choosing a version

Versions follow [SemVer](https://semver.org/): a new optional module is a minor version, and anything that breaks existing callers needs a new major version. See [Versioning](../../reference/versioning/).
