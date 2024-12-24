
export class UnifiedWorker {

    private instance: Worker | undefined = undefined;

    private ensureWorker() {
        if (!this.instance && typeof window !== 'undefined') {
            this.instance = new Worker(new URL('../workers/unified-worker.js', import.meta.url));
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