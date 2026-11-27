# Vendored assets for the web builder

The builder compiles resumes in the browser with [typst.ts](https://github.com/Myriad-Dreamin/typst.ts).
Everything it needs is served from the docs site, so it works without reaching packages.typst.org or a font CDN.

| File | Source | Licence |
| --- | --- | --- |
| `packages/rendercv-0.3.0.tar.gz` | Typst package `@preview/rendercv:0.3.0` ([typst/packages](https://github.com/typst/packages/tree/main/packages/preview/rendercv/0.3.0)), the version bundled with RenderCV 2.8 | MIT |
| `packages/fontawesome-0.6.0.tar.gz` | Typst package `@preview/fontawesome:0.6.0` ([typst/packages](https://github.com/typst/packages/tree/main/packages/preview/fontawesome/0.6.0)), imported by `rendercv` | MIT |
| `fonts/XCharter-*.otf` | XCharter 1.26, from the `rendercv-fonts` pip package | Bitstream Charter licence, see `fonts/XCharter-README.txt` |

## Updating after a RenderCV upgrade

1. Run `rendercv render example_CV.yaml` with the new version and look at the first line of the generated `.typ` file for the package version (`#import "@preview/rendercv:X.Y.Z"`).
2. Rebuild the tarball from that version's folder in typst/packages, with files at the archive root (no `./` prefix):
   ```bash
   tar -czf rendercv-X.Y.Z.tar.gz -C packages/preview/rendercv/X.Y.Z typst.toml lib.typ LICENSE README.md
   ```
   Do the same for any package its `lib.typ` imports.
3. Update the file names in `src/builder/typst.worker.ts` and `RENDERCV_TYPST_VERSION` in `src/builder/render.ts`.
4. Check the builder still matches RenderCV, and port any template changes until it does:
   ```bash
   rendercv render example_CV.yaml   # in a scratch folder
   cd website && npx tsx scripts/builder-parity.ts ../example_CV.yaml path/to/rendercv_output/Alex_Rivera_CV.typ
   ```
