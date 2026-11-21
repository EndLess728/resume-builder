---
title: How it fits together
description: How resume-builder's reusable workflow, modules, CI and release workflow are laid out, and the module contract.
---

Fixes, docs and new modules are all welcome. This page covers how the pipeline is put together.

```
your CV repo                          this repo (resume-builder)
────────────                          ──────────────────────────
.github/workflows/resume.yml  ──uses──▶ .github/workflows/build-resume.yml   the pipeline
Your_CV.yaml                            .github/actions/<module>/             optional modules
secrets                                 example_CV.yaml                       sample used by CI and releases
```

- **[`build-resume.yml`](https://github.com/EndLess728/resume-builder/blob/main/.github/workflows/build-resume.yml)** is the reusable workflow people call. It runs in stages: setup → pre-render → render → publish → save → notify. The comment at the top of the file maps each stage to its modules.
- **[`.github/actions/`](https://github.com/EndLess728/resume-builder/tree/main/.github/actions)** holds the modules. Each one is a self-contained composite action.
- The workflow checks out this repo at **its own commit** (`job.workflow_sha`) and uses modules from that checkout as `./.resume-toolkit/.github/actions/<name>`. That's why someone pinned to `@v1.2.0` always runs v1.2.0's modules. Keep using that path inside `build-resume.yml`, not `EndLess728/resume-builder/.github/actions/...@ref`.
- **[`ci.yml`](https://github.com/EndLess728/resume-builder/blob/main/.github/workflows/ci.yml)** lints everything and renders `example_CV.yaml` through the real pipeline on every pull request.
- **[`release.yml`](https://github.com/EndLess728/resume-builder/blob/main/.github/workflows/release.yml)** publishes versions. See [Releasing](../releasing/).
- **[`docs.yml`](https://github.com/EndLess728/resume-builder/blob/main/.github/workflows/docs.yml)** builds this site from `website/` and deploys it to GitHub Pages.

## The module contract

A module is easy to review when it follows these rules:

1. **One folder, self-contained.** `.github/actions/<name>/` holds `action.yml`, a `README.md`, and any script it runs. Nothing outside the folder is needed.
2. **Composite action.** `runs.using: composite`. Scripts are called through `$GITHUB_ACTION_PATH`, never by a path relative to the repo.
3. **Inputs in, outputs out.** Secrets and settings come in as inputs. Anything a later step might use (a URL, an ID) goes out as an output. Modules don't read each other's files or environment.
4. **Optional by default.** `build-resume.yml` only runs the module when its secret or input is set, so existing users see no change.
5. **Pick the right stage.** Pre-render modules may edit the CV YAML. Publish and notify modules must not change it.
6. **Fail honestly.** A publish module should fail the build if it can't publish. A notify module should log the problem and exit 0, because the resume is already out.
7. **Standard library first.** If you need packages, install them inside the module, as `google-drive-upload` does, so users who don't enable it don't pay for it.

## Pull requests

- Keep each pull request to one change. A new module and an unrelated fix should be two pull requests.
- New features should be **optional and off by default**, so existing users notice nothing until they opt in.
- Don't commit real CVs, keys or personal data. `.gitignore` blocks `*_CV.yaml` (except the example) and `rendercv_output/`.
- Fill in the pull request checklist.
