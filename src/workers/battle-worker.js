/* eslint-disable */
//unified-worker.js
import ShipCrewWorker from './shipcrewworker.ts';

// eslint-disable-next-line no-restricted-globals
self.onmessage = (message) => {
    const id = message.data.workerId;
    const postResult = (result, inProgress) => {
        postMessage({ result, inProgress, id });
        if (!inProgress) self.close();
    };
    ShipCrewWorker.calc(message.data.config, progress => postResult(progress, true)).then(data => postResult(data, false))
};
