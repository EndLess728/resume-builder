# Contributing

Thanks for helping out. Fixes, docs and new modules are all welcome. This guide covers how the pipeline is put together, how to add a module, and how to test a change before opening a pull request.

## How it fits together

```
your CV repo                          this repo (resume-builder)
────────────                          ──────────────────────────
.github/workflows/resume.yml  ──uses──▶ .github/workflows/build-resume.yml   the pipeline
Your_CV.yaml                            actions/<module>/                     optional modules
secrets                                 example_CV.yaml                       sample used by CI and releases
```

- **[`build-resume.yml`](.github/workflows/build-resume.yml)** is the reusable workflow people call. It runs in stages: setup → pre-render → render → publish → save → notify. The comment at the top of the file maps each stage to its modules.
- **[`actions/`](actions/)** holds the modules. Each one is a self-contained composite action. [actions/README.md](actions/README.md) lists them and sets out the **module contract**; please read it before writing one.
- The workflow checks out this repo at **its own commit** (`job.workflow_sha`) and uses modules from that checkout as `./.resume-toolkit/actions/<name>`. That's why someone pinned to `@v1.2.0` always runs v1.2.0's modules. Keep using that path inside `build-resume.yml`, not `EndLess728/resume-builder/actions/...@ref`.
- **[`ci.yml`](.github/workflows/ci.yml)** lints everything and renders `example_CV.yaml` through the real pipeline on every pull request.
- **[`release.yml`](.github/workflows/release.yml)** publishes versions (maintainers only, see below).

## Adding a module

Say you want a `slack-notify` module.

**1. Copy the template**

```bash
cp -r docs/module-template actions/slack-notify
```

You get `action.yml`, `run.py` and `README.md`, each with `TODO`s to fill in.

**2. Write the module**

- Fill in `action.yml`: name, description, inputs, outputs.
- Put the logic in `run.py` (rename it if you like). Use the standard library where you can.
- Follow the [module contract](actions/README.md#the-module-contract): self-contained folder, inputs in and outputs out, notify modules never fail the build.

**3. Wire it into `build-resume.yml`**

Four small edits, all in [`build-resume.yml`](.github/workflows/build-resume.yml):

```yaml
# a) Declare the secret, tagged with the module name
    secrets:
      SLACK_WEBHOOK_URL:
        description: "[slack-notify] Incoming webhook URL. Enables the module."
        required: false

# b) Add any settings as inputs, tagged the same way (optional)
      slack_mention:
        description: "[slack-notify] User or group to @mention"
        type: string
        default: ""

# c) Detect whether it's on, in the "Detect enabled modules" step
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: |
          ...
          if [ -n "$SLACK_WEBHOOK_URL" ]; then enable slack
          else skip slack "SLACK_WEBHOOK_URL not set"; fi

# d) Add the step under the right stage heading
      - name: "[module] Slack notify"
        if: success() && steps.modules.outputs.slack == 'true'
        uses: ./.resume-toolkit/actions/slack-notify
        with:
          file: ${{ steps.render.outputs.pdf_path }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          drive_url: ${{ steps.drive.outputs.url }}
```

If your module produces something useful (a URL, say), add it to the job's `outputs` and to `on.workflow_call.outputs` so callers can use it too.

**4. Document it**

- Finish the module's `README.md`.
- Add a row to the table in [actions/README.md](actions/README.md).
- Add its secret and inputs to the tables in the main [README.md](README.md).
- Add a line under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md).

## Testing your change

**Lint and syntax**, the same checks CI runs:

```bash
pipx run actionlint -ignore 'property "workflow_(repository|sha)" is not defined'
python3 -m py_compile actions/*/*.py
```

(Older actionlint versions don't know `job.workflow_sha` yet, hence the ignore.)

**Render locally:**

```bash
pipx install "rendercv[full]>=2.6"
python3 actions/npm-download-stats/update_npm_stats.py example_CV.yaml
rendercv render example_CV.yaml
```

Most module scripts can also run on their own; each module README has a "Run locally" section.

**End to end, with real secrets.** CI can't test modules that need secrets, so try them from your fork:

1. Push your branch to your fork, e.g. `you/resume-builder@slack-notify`.
2. In a private test repo holding a CV YAML, point the caller at your branch and add the module's secrets there:
   ```yaml
   uses: you/resume-builder/.github/workflows/build-resume.yml@slack-notify
   ```
3. Run it from the Actions tab. The workflow loads modules from your branch automatically.

Mention in your pull request that you tested it this way.

## Pull requests

- Keep each pull request to one change. A new module and an unrelated fix should be two pull requests.
- New features should be **optional and off by default**, so existing users notice nothing until they opt in.
- Don't commit real CVs, keys or personal data. `.gitignore` blocks `*_CV.yaml` (except the example) and `rendercv_output/`.
- Fill in the pull request checklist.

## Releasing (maintainers)

1. Move the `## [Unreleased]` notes in `CHANGELOG.md` under a new version heading and merge to `main`.
2. **Actions → Release → Run workflow**, version `vX.Y.Z`.

The release workflow tags the commit, renders the sample with that version, publishes the release with `sample-resume.pdf`, refreshes `docs/sample-resume.png`, and moves the major tag (`v1`). Versions follow [SemVer](https://semver.org/): a new optional module is a minor version, and anything that breaks existing callers needs a new major version.
