//worker-builder.js
// Create two versions; one for server-side rendering, the other for browser-based execution.
let worker_class = undefined;
if (typeof window !== 'undefined') {
    class WorkerBuilder extends Worker {
        constructor(worker) {
            const code = worker.toString();
            const blob = new Blob([`(${code})()`]);
            return new Worker(URL.createObjectURL(blob));
        }
    }
    worker_class = WorkerBuilder;
}
else {
    class WorkerBuilder {
        constructor(worker) {
        }
        addEventListener(event, method) {
        }
        postMessage(data) {
        }
        terminate() {
        }
    }
    worker_class = WorkerBuilder;
}

export const WorkerBuilder = worker_class;
