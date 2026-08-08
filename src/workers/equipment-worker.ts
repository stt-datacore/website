import ItemsWorker from './itemsworker';

self.onmessage = (message: any) => {
    const postResult = (result: any, inProgress?: boolean) => {
        postMessage({ result, inProgress });
        if (!inProgress) self.close();
        return inProgress;
    };
    console.log('Equipment Worker has been started.');
    const messageHandlers = {
        'equipmentWorker': () => ItemsWorker.processItems(message.data.config).then(data => postResult(data, false)),
    };
    messageHandlers[message.data.worker]();
};
