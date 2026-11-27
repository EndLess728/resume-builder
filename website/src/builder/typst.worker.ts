/// <reference lib="webworker" />
// Compiles Typst in a Web Worker so typing never stutters.
// Everything it needs ships with the site: the typst.ts compiler/renderer
// (WASM), the XCharter fonts, and the @preview/rendercv + fontawesome packages,
// served from local tarballs instead of packages.typst.org.

import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';
import { MemoryAccessModel } from '@myriaddreamin/typst.ts/fs/memory';
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/wasm?url';
import rendererWasm from '@myriaddreamin/typst-ts-renderer/wasm?url';
import fontRegular from './vendor/fonts/XCharter-Regular.otf?url';
import fontBold from './vendor/fonts/XCharter-Bold.otf?url';
import fontItalic from './vendor/fonts/XCharter-Italic.otf?url';
import fontBoldItalic from './vendor/fonts/XCharter-BoldItalic.otf?url';
import rendercvPkg from './vendor/packages/rendercv-0.3.0.tar.gz?url';
import fontawesomePkg from './vendor/packages/fontawesome-0.6.0.tar.gz?url';

export type WorkerRequest = { id: number; type: 'preview' | 'pdf'; source: string };
export type WorkerResponse =
  | { type: 'ready' }
  | { id: number; type: 'preview'; pages: string[] }
  | { id: number; type: 'pdf'; pdf: Uint8Array }
  | { id: number; type: 'error'; message: string }
  | { type: 'fatal'; message: string };

const post = (msg: WorkerResponse, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

const bytes = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
};

/**
 * typst.ts wants package tarballs gzipped. Some servers send `.gz` files with
 * `Content-Encoding: gzip`, so fetch() hands back the already-unzipped tar.
 * Re-compress in that case.
 */
async function tarGz(url: string): Promise<Uint8Array> {
  const data = await bytes(url);
  if (data[0] === 0x1f && data[1] === 0x8b) return data;
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const ready = (async () => {
  const [fonts, rendercv, fontawesome] = await Promise.all([
    Promise.all([fontRegular, fontBold, fontItalic, fontBoldItalic].map(bytes)),
    tarGz(rendercvPkg),
    tarGz(fontawesomePkg),
  ]);
  const packages: Record<string, Uint8Array> = {
    'preview/rendercv/0.3.0': rendercv,
    'preview/fontawesome/0.6.0': fontawesome,
  };
  const accessModel = new MemoryAccessModel();

  $typst.setCompilerInitOptions({ getModule: () => fetch(compilerWasm) });
  $typst.setRendererInitOptions({ getModule: () => fetch(rendererWasm) });
  $typst.use(
    TypstSnippet.disableDefaultFontAssets(),
    TypstSnippet.preloadFonts(fonts),
    TypstSnippet.withAccessModel(accessModel),
    TypstSnippet.fetchPackageBy(accessModel, (spec) => packages[`${spec.namespace}/${spec.name}/${spec.version}`]),
  );
  // Warm up both WASM modules with a tiny document.
  await $typst.svg({ mainContent: '#set page(width: 1cm, height: 1cm)' });
})();

ready.then(
  () => post({ type: 'ready' }),
  (e) => post({ type: 'fatal', message: String(e?.message ?? e) }),
);

/** typst.ts draws every page into one tall SVG; cut it into one SVG per page. */
function splitPages(svg: string): string[] {
  const pages = [...svg.matchAll(/<g class="typst-page" transform="translate\(([\d.]+),\s*([\d.]+)\)"[^>]*data-page-width="([\d.]+)" data-page-height="([\d.]+)"/g)];
  const clean = svg.replace(/<script[\s\S]*?<\/script>/g, '');
  if (!pages.length) return [clean];
  return pages.map(([, x, y, w, h]) =>
    clean.replace(/^<svg([^>]*?)viewBox="[^"]*" width="[^"]*" height="[^"]*"/, `<svg$1viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"`),
  );
}

function message(e: unknown): string {
  const text = String((e as any)?.message ?? e);
  const m = /message: "([^"]+)"/.exec(text);
  return m ? m[1] : text;
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const { id, type, source } = ev.data;
  try {
    await ready;
    if (type === 'preview') {
      const svg = await $typst.svg({ mainContent: source });
      post({ id, type, pages: splitPages(svg) });
    } else {
      const pdf = await $typst.pdf({ mainContent: source });
      if (!pdf) throw new Error('The compiler returned no PDF.');
      post({ id, type, pdf }, [pdf.buffer]);
    }
  } catch (e) {
    post({ id, type: 'error', message: message(e) });
  }
};
