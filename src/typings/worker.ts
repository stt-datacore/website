
import WorkerBuilder from '../workers/worker-builder';
import Worker from '../workers/unified-worker';

const instance = new WorkerBuilder(Worker);

export class UnifiedWorker {
    
    addEventListener(event: keyof WorkerEventMap, method: (data: any) => void) {
        instance.addEventListener(event, method);
    }

    postMessage(data: any) {
        instance.postMessage(data);
    }

    terminate() {
        instance.terminate();
    }
  
}