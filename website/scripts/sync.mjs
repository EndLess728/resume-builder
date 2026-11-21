// Copies files that live elsewhere in the repo into the docs site, so each has
// one source of truth:
//   docs/sample-resume.png → public/sample-resume.png (refreshed by each release)
//   CHANGELOG.md           → the Changelog page
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(site, '..');

mkdirSync(resolve(site, 'public'), { recursive: true });
copyFileSync(resolve(repo, 'docs/sample-resume.png'), resolve(site, 'public/sample-resume.png'));

const changelog = readFileSync(resolve(repo, 'CHANGELOG.md'), 'utf8')
  .replace(/^# Changelog\s*\n/, '') // the page title comes from frontmatter
  .replace(/^## \[Unreleased\]\s*\n(?=## )/m, ''); // hide an empty Unreleased section
writeFileSync(
  resolve(site, 'src/content/docs/reference/changelog.md'),
  `---
title: Changelog
description: Every resume-builder release and what changed in it.
editUrl: https://github.com/EndLess728/resume-builder/edit/main/CHANGELOG.md
---

${changelog.trim()}
`,
);
console.log('synced sample-resume.png and CHANGELOG.md');
