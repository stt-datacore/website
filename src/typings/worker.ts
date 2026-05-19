
export class UnifiedWorker {

    private instance: Worker | undefined = undefined;
    private worker: string = '../workers/unified-worker';

    constructor(worker?: string) {
        if (worker) this.worker = `../workers/${worker}`;
    }

    private ensureWorker() {
        if (!this.instance && typeof window !== 'undefined') {
            this.instance = new Worker(new URL(this.worker, import.meta.url), { type: 'module' });
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