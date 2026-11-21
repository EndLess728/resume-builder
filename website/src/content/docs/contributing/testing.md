---
title: Testing a change
description: Lint, compile and render resume-builder changes locally, then test modules end to end with real secrets from your fork.
---

## Lint and syntax

The same checks CI runs:

```bash
pipx run actionlint -ignore 'property "workflow_(repository|sha)" is not defined'
python3 -m py_compile .github/actions/*/*.py
```

Older actionlint versions don't know `job.workflow_sha` yet, hence the ignore.

## Render locally

```bash
pipx install "rendercv[full]>=2.6"
python3 .github/actions/npm-download-stats/update_npm_stats.py example_CV.yaml
rendercv render example_CV.yaml
```

Most module scripts can also run on their own; each module page has a "Run locally" section.

## End to end, with real secrets

CI can't test modules that need secrets, so try them from your fork:

1. Push your branch to your fork, e.g. `you/resume-builder@slack-notify`.
2. Create a private test repo from [resume-builder-template](https://github.com/EndLess728/resume-builder-template) (**Use this template**). In its `.github/workflows/resume.yml`, point the caller at your branch, then add the module's secrets to that repo:
   ```yaml
   uses: you/resume-builder/.github/workflows/build-resume.yml@slack-notify
   ```
3. Run it from the Actions tab. The workflow loads modules from your branch automatically.

Mention in your pull request that you tested it this way.

## The docs site

This site lives in `website/` and is built with [Starlight](https://starlight.astro.build/):

```bash
cd website
npm install
npm run dev     # http://localhost:4321/resume-builder/
npm run build   # what CI runs
```

`npm run dev` and `npm run build` first copy `CHANGELOG.md` and `docs/sample-resume.png` into the site, so edit those at the repo root, not in `website/`.
