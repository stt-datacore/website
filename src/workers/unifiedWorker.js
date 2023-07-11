/* eslint-disable */

import voymod from './voymod.js';
import transwarp from './transwarp.js';
import voyagers from './voyagers.js';
import Optimizer from './optimizer.js';

self.addEventListener('message', message => {
  const postResult = (result, inProgress) => {
    self.postMessage({ result, inProgress });
    if (!inProgress) self.close();
  };
  const messageHandlers = {
    'voyageEstimate': () => voyageEstimate(message.data.config, est => postResult(est, true)).then(estimate =>
      postResult(estimate, false)
    ),
    'citeOptimizer': () => citeOptimizer(message.data.playerData, message.data.allCrew).then(data => postResult(data, false)),
    'iampicard': () => voymod().then(mod => {
        let result = mod.calculate(JSON.stringify(message.data), res => {
          postResult(res, true);
        });
        postResult(result, false);
      }),
    'ussjohnjay': () =>  voyagers.forDataCore(message.data, postResult, transwarp.getEstimate)
  };

  //console.log(message.data.worker);
  
  messageHandlers[message.data.worker]();
});

// This worker can estimate a single lineup from input config
const voyageEstimate = (config, progress) => {
  return new Promise((resolve, reject) => {
    let estimate = transwarp.getEstimate(config, progress);
    resolve(estimate);
  });
};

const citeOptimizer = (playerData, allCrew) => {
  return new Promise((resolve, reject) => {
    Optimizer.assessCrewRoster(playerData, allCrew);
    Optimizer.sortVoyageRankings();
    Optimizer.findCurrentBestCrew();
    Optimizer.findBestForRarity();
    Optimizer.findCrewToTrain();
    Optimizer.findEVContributionOfCrewToTrain();
    Optimizer.sortCrewToTrain();
    Optimizer.findBestCitedCrew();
    Optimizer.findCrewToCite();
    Optimizer.findEVContributionOfCrewToCite();
    Optimizer.sortCrewToCite();
    resolve({
      crewToCite: Optimizer.rankedCrewToCite,
      crewToTrain: Optimizer.rankedCrewToTrain
    });
  });
};
