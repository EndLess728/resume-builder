---
title: Writing your CV
description: The RenderCV YAML format resume-builder uses, where to find the field reference, and how to get editor autocomplete.
---

resume-builder renders whatever [RenderCV](https://docs.rendercv.com/) can render. Your CV is a single YAML file with your details under `cv:` and your sections under `cv.sections`.

The quickest start is to copy [`example_CV.yaml`](https://github.com/EndLess728/resume-builder/blob/main/example_CV.yaml) and replace its content. A trimmed version:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/rendercv/rendercv/refs/tags/v2.6/schema.json
cv:
  name: Alex Rivera
  headline: Senior Mobile Engineer
  location: London, UK
  email: alex.rivera@example.com
  social_networks:
    - network: GitHub
      username: example
  sections:
    profile_summary:
      - Mobile engineer with 7 years building cross-platform apps.
    experience:
      - company: Example Corp
        position: Senior Mobile Engineer
        start_date: 2022-03
        end_date: present
        highlights:
          - Lead a team of 5 engineers shipping a banking app to 200K+ users
```

## Autocomplete in your editor

The first line points the YAML language server at RenderCV's JSON schema. In VS Code with the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml), you get autocomplete and errors as you type.

## Field reference

Sections, entry types, themes and design options are all RenderCV features, documented at [docs.rendercv.com](https://docs.rendercv.com/).

## npm packages

If an entry's name links to an npm package page, the [npm download stats](../../modules/npm-download-stats/) module appends a live download count to its summary:

```yaml
- name: "[my-package](https://www.npmjs.com/package/my-package)"
  summary: Does something useful        # becomes: Does something useful (12.3K+ downloads)
```

## File name

Name the file anything you like and point `cv_file` at it. This repo's `.gitignore` blocks `*_CV.yaml` so nobody commits a real CV here by accident; that rule doesn't affect your own repo.
