export type WorkerName = 'lots-worker.ts' | 'gauntlet-worker.ts' | 'equipment-worker.ts';

export class UnifiedWorker {

    private instance: Worker | undefined = undefined;
    private worker: string | undefined = undefined;

    constructor(worker?: WorkerName) {
        if (worker) this.worker = `${worker}`;
    }

    private ensureWorker() {
        if (!this.instance && typeof window !== 'undefined') {
            if (this.worker === 'gauntlet-worker.ts') {
                this.instance = new Worker(new URL('../workers/gauntlet-worker.ts', import.meta.url), { type: 'module' });
            }
            else if (this.worker === 'lots-worker.ts') {
                this.instance = new Worker(new URL('../workers/lots-worker.ts', import.meta.url), { type: 'module' });
            }
            else if (this.worker === 'equipment-worker.ts') {
                this.instance = new Worker(new URL('../workers/equipment-worker.ts', import.meta.url), { type: 'module' });
            }
            else {
                this.instance = new Worker(new URL('../workers/unified-worker.ts', import.meta.url), { type: 'module' });
            }
            //this.instance = new Worker(new URL('../workers/unified-worker.js', document.location.origin));

            // Error logging.
            // this.instance.onerror = (e) => {
            //     console.error(e);
            // }
            // this.instance.onmessageerror = (e) => {
            //     console.error(e);
            // };
            // this.instance.onmessage = (msg) => {
            //     console.log(msg);
            // };
        }
    }

    addEventListener(event: keyof WorkerEventMap, method: (data: any) => void) {
        this.ensureWorker();
        this.instance?.addEventListener(event, method);
    }

    removeEventListener(event: keyof WorkerEventMap, method: (data: any) => void) {
        this.ensureWorker();
        this.instance?.removeEventListener(event, method);
    }

    postMessage(data: any) {
        this.ensureWorker();
        this.instance?.postMessage(data);
    }

    terminate() {
        this.instance?.terminate();
    }

}