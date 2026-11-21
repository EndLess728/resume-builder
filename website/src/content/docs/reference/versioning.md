---
title: Versioning
description: How resume-builder is versioned, which ref to pin, and how the workflow keeps its modules in sync with the version you pinned.
---

Releases follow [Semantic Versioning](https://semver.org/) and are listed in the [changelog](../changelog/).

| Pin | You get |
| --- | --- |
| `@v1` (recommended) | The latest 1.x release: fixes and new features, nothing breaking. |
| `@v1.0.0` | Exactly that release, never changes. |
| `@<commit-sha>` | Exactly that commit. The safest choice for strict supply-chain rules. |
| `@main` | Unreleased changes. May break. |

## Modules always match the workflow

The workflow checks out this repo at **its own commit** (`job.workflow_sha`) and runs the modules from that checkout. So if you pin `@v1.2.0`, you run v1.2.0's modules too, and the two can't drift apart.

## What counts as breaking

- A new optional module or input is a **minor** version (`1.x`). You get it with `@v1`, and it stays off until you turn it on.
- A fix is a **patch** version.
- Anything that would make an existing caller fail or behave differently needs a new **major** version (`v2`). `@v1` never moves to it.
