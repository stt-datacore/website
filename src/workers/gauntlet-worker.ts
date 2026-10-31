/* eslint-disable */
import { calculateGauntlet } from '../utils/gauntlet';

// eslint-disable-next-line no-restricted-globals
self.onmessage = (message: any) => {
    const postResult = (result: any, inProgress?: boolean) => {
        postMessage({ result, inProgress });
        if (!inProgress) self.close();
        return inProgress;
    };
    console.log('Gauntlet Worker has been started.');
    const messageHandlers = {
        'gauntlet': () => {
            const gauntlet = calculateGauntlet(message.data.config);
            postResult(gauntlet, false);
        },
    };

    //console.log(message.data.worker);
    messageHandlers[message.data.worker]();
    // postMessage(result);
};
