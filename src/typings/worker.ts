
import WorkerBuilder from '../workers/worker-builder';
import Worker from '../workers/unified-worker';

const instance = new WorkerBuilder(Worker);

export class UnifiedWorker {

    addEventListener(event: 'message', method: (data: any) => void) {
        instance.onmessage = (message) => {
            method(message);
        };
    }

    postMessage(data: any) {
        instance.postMessage(data);
    }

    terminate() {
        instance.terminate();
    }
  
}