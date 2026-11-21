---
title: Using the outputs
description: Use the pdf_path and drive_url outputs of the resume-builder workflow in a follow-up job, for example to post the link elsewhere.
---

The workflow returns two outputs:

| Output | Description |
| --- | --- |
| `pdf_path` | Path of the rendered PDF in your repo, e.g. `rendercv_output/Alex_Rivera_CV.pdf`. |
| `drive_url` | Google Drive link to the PDF. Empty when the Drive module is off. |

Read them from a job that `needs:` the build job:

```yaml
jobs:
  build:
    uses: EndLess728/resume-builder/.github/workflows/build-resume.yml@v1
    with:
      cv_file: My_CV.yaml
    secrets: inherit

  announce:
    needs: build
    if: needs.build.outputs.drive_url != ''
    runs-on: ubuntu-latest
    steps:
      - run: echo "Latest resume is at ${{ needs.build.outputs.drive_url }}"
```

## Getting the PDF itself

The later job runs on a fresh machine, so the file at `pdf_path` isn't there. Download the artifact (named `resume` by default, see `artifact_name`) first:

```yaml
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: resume
      - run: ls -l *.pdf
```
