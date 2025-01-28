/* eslint-disable */
//polestar-worker.js
import MutualPolestarWorker from './mutualpolestarworker.ts';

// eslint-disable-next-line no-restricted-globals
self.onmessage = (message) => {
    const id = message.data.id;
    const postResult = (result, inProgress) => {
        postMessage({ result, inProgress, id });
        if (!inProgress) self.close();
    };
    MutualPolestarWorker.calc(message.data.config, progress => postResult(progress, true)).then(data => postResult(data, false))
};
