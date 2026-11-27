import type { WorkerRequest, WorkerResponse } from './typst.worker';

type Status = 'loading' | 'ready' | 'failed';

export class TypstClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private busy = false;
  private queued: string | null = null;
  status: Status = 'loading';
  onStatus?: (s: Status, error?: string) => void;
  onPreview?: (pages: string[] | null, error: string | null) => void;

  constructor() {
    this.worker = new Worker(new URL('./typst.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.handle(ev.data);
    this.worker.onerror = (ev) => this.setStatus('failed', ev.message || 'The compiler failed to start.');
  }

  private setStatus(s: Status, error?: string) {
    this.status = s;
    this.onStatus?.(s, error);
  }

  private handle(msg: WorkerResponse) {
    if (msg.type === 'ready') return this.setStatus('ready');
    if (msg.type === 'fatal') return this.setStatus('failed', msg.message);
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    if (msg.type === 'error') p.reject(new Error(msg.message));
    else p.resolve(msg.type === 'pdf' ? msg.pdf : msg.pages);
  }

  private request<T>(type: WorkerRequest['type'], source: string): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, source } satisfies WorkerRequest);
    });
  }

  /** Latest-wins: while a compile runs, only the newest source waits behind it. */
  preview(source: string) {
    if (this.busy) {
      this.queued = source;
      return;
    }
    this.busy = true;
    this.request<string[]>('preview', source)
      .then((pages) => this.onPreview?.(pages, null))
      .catch((e: Error) => this.onPreview?.(null, e.message))
      .finally(() => {
        this.busy = false;
        const next = this.queued;
        this.queued = null;
        if (next !== null) this.preview(next);
      });
  }

  pdf(source: string): Promise<Uint8Array> {
    return this.request<Uint8Array>('pdf', source);
  }

  dispose() {
    this.worker.terminate();
  }
}
