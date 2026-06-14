import voymod from './voymod';
import transwarp from './transwarp';
import sporedrive from './sporedrive';
import VoyagersWorker from './voyagers';
import CollectionOptimizer from './collectionworker';
import QuestSolver from './questsolver2';
import ShipFinder from './shipfinder';
import ShipCrewWorker from './shipcrewworker';
import VoyPADD from './voypadd';

// This worker can estimate a single lineup from input config
const voyageEstimate = (config, progress) => {
    return new Promise((resolve, reject) => {
        let estimate = transwarp.getEstimate(config, progress);
        resolve(estimate);
    });
};

// This worker can estimate a single lineup from input config
const sporeDrive = (config, progress) => {
    return new Promise((resolve, reject) => {
        let estimate = sporedrive(config, progress);
        resolve(estimate);
    });
};

self.onmessage = (message: any) => {
    const postResult = (result: any, inProgress?: boolean) => {
        postMessage({ result, inProgress });
        if (!inProgress) self.close();
        return inProgress;
    };
    console.log('Unified Worker has been started.');
    const messageHandlers = {
        'voyageEstimate': () => sporeDrive(message.data.config, est => postResult(est, true)).then(estimate =>
            postResult(estimate, false)
        ),
        'sporeDrive': () => sporeDrive(message.data.config, est => postResult(est, true)).then(estimate =>
            postResult(estimate, false)
        ),
        'questSolver': () => QuestSolver.solveQuest(message.data.config).then(data => postResult(data, false)),
        'colOptimizer2': () => CollectionOptimizer.scanAll2(message.data.config).then(data => postResult(data, false)),
        'iampicard': () => voymod().then(mod => {
            let result = mod.calculate(JSON.stringify(message.data), res => {
                postResult(res, true);
            });
            postResult(result, false);
        }),
        'voypadd': () => VoyPADD.start(message.data, postResult),
        'ussjohnjay': () => VoyagersWorker(message.data, postResult, transwarp.getEstimate),
        'shipworker': () => ShipCrewWorker.calc(message.data.config, progress => postResult(progress, true) || false).then(data => postResult(data, false)),
        'bestshipworker': () => ShipCrewWorker.bestFinder(message.data.config).then(data => postResult(data, false)),
        'ship_finder': () => ShipFinder.findShips(message.data.config).then(data => postResult(data, false))
    };

    //console.log(message.data.worker);

    messageHandlers[message.data.worker]();
    // postMessage(result);
};
