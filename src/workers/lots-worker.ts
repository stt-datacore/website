/* eslint-disable */
import { calcQLots } from '../utils/equipment';
self.onmessage = (message: any) => {
    const postResult = (result: any, inProgress?: boolean) => {
        postMessage({ result, inProgress });
        if (!inProgress) self.close();
        return inProgress;
    };
    console.log('QLots Worker has been started.');
    const messageHandlers = {
        'qpower': () => {
            const { crew, quipment, buffs, max_qbits, slots, mode } = message.data.config;
            crew.forEach((crew) => {
                calcQLots(crew, quipment, buffs, max_qbits, slots, mode);
            });
            postResult(crew, false);
        },
    };

    //console.log(message.data.worker);

    messageHandlers[message.data.worker]();
    // postMessage(result);
};
