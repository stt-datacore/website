/* eslint-disable */

import voymod from './voymod.js';
import chewable from './chewable.js';
import voyagers from './voyagers.js';
import Optimizer from './optimizer.js';

self.addEventListener('message', message => {
  const postResult = (result, inProgress) => {
    self.postMessage({ result, inProgress });
    if (!inProgress) self.close();
  };

  if (message.data.worker === 'chewable') {
    chewableEstimate(message.data.config, est => postResult(est, true)).then(estimate =>
      postResult(estimate, false)
    );
  } else if (message.data.worker == 'citeOptimizer') {
    citeOptimizer(message.data.playerData, message.data.allCrew).then(data => postResult(data, false));
  }
  else if (message.data.worker === 'iampicard') {
    voymod().then(mod => {
      let result = mod.calculate(JSON.stringify(message.data), res => {
        postResult(res, true);
      });
      postResult(result, false);
    });
  }
  else if (message.data.worker === 'ussjohnjay') {
    voyagers.forDataCore(message.data, postResult, chewable.getEstimate);
  }
});

// This worker can estimate a single lineup from input config
const chewableEstimate = (config, progress) => {
  return new Promise((resolve, reject) => {
    let estimate = chewable.getEstimate(config, progress);
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