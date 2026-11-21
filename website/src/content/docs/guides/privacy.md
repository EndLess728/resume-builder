---
title: Privacy & public repos
description: Why your CV repo should be private, what is exposed in a public repo, and the settings to use if it must be public.
---

A resume has your phone number, email and work history on it. Because a reusable workflow runs in the **caller's** repo, everything it produces lands in your CV repo:

| What | Where | Visible to |
| --- | --- | --- |
| Build logs | Your repo's Actions tab | Anyone who can see the repo |
| PDF and PNG artifact | Your repo's workflow runs | Anyone who can see the repo |
| `rendercv_output/` commit | Your repo's history | Anyone who can see the repo |
| Secrets | Your repo's settings | Only you; masked in logs |

**In a private repo, all of it stays private.** That's the recommended setup, and why the template asks you to choose Private.

## If the repo must be public

Turn off the two outputs anyone could download:

```yaml
with:
  cv_file: My_CV.yaml
  upload_artifact: false
  commit_output: false
```

Remember the YAML itself is also public then. Use the [Google Drive module](../../modules/google-drive-upload/) to share the PDF on your terms instead.

## Git history

Once a phone number is committed to a public repo, making the repo private later doesn't remove it from forks or clones. Start private.
