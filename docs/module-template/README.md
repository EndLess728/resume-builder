# TODO-module-name

**Stage:** TODO pre-render | publish | notify · **Enabled by:** TODO the `TODO_SECRET` secret

TODO: two or three sentences on what the module does and why someone would turn it on.

## Setup

1. TODO: how to get the token or key.
2. Save it as the `TODO_SECRET` secret in your CV repo.

## Inputs

| Input            | Required | Description                     |
| ---------------- | -------- | ------------------------------- |
| `file`           | yes      | Path of the rendered PDF.       |
| `token`          | yes      | TODO                            |
| `example_option` | no       | TODO                            |

## Outputs

| Output | Description |
| ------ | ----------- |
| `url`  | TODO        |

## Use it on its own

```yaml
- uses: EndLess728/resume-builder/.github/actions/TODO-module-name@v1
  with:
    file: path/to/file.pdf
    token: ${{ secrets.TODO_SECRET }}
```

## Run locally

```bash
TOKEN=... python3 .github/actions/TODO-module-name/run.py path/to/file.pdf
```
