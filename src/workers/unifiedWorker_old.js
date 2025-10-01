// /* eslint-disable */

// import voymod from './voymod.js';
// import transwarp from './transwarp.js';
// import sporedrive from './sporedrive.js';
// import voyagers from './voyagers.js';
// import Optimizer from './optimizer.js';
// import BetaTachyon from './betatachyon.ts';
// import CollectionOptimizer from './collectionworker.ts';
// import ItemsWorker from './itemsworker.ts';
// import QuestSolver from './questsolver.ts';

// self.addEventListener('message', message => {
//   const postResult = (result, inProgress) => {
//     self.postMessage({ result, inProgress });
//     if (!inProgress) self.close();
//   };
//   const messageHandlers = {
//     'voyageEstimate': () => voyageEstimate(message.data.config, est => postResult(est, true)).then(estimate =>
//       postResult(estimate, false)
//     ),
//     'voyageEstimateExtended': () => voyageEstimateExtended(message.data.config, est => postResult(est, true)).then(estimate =>
//       postResult(estimate, false)
//     ),
//     'citeOptimizer': () => citeOptimizer(message.data.playerData, message.data.allCrew).then(data => postResult(data, false)),
//     'questSolver': () => QuestSolver.solveQuest(message.data.config).then(data => postResult(data, false)),
//     'ironywrit': () => BetaTachyon.scanCrew(message.data.config).then(data => postResult(data, false)),
//     'colOptimizer': () => CollectionOptimizer.scanAll(message.data.config).then(data => postResult(data, false)),
//     'equipmentWorker': () => ItemsWorker.processItems(message.data.config).then(data => postResult(data, false)),
//     'iampicard': () => voymod().then(mod => {
//         let result = mod.calculate(JSON.stringify(message.data), res => {
//           postResult(res, true);
//         });
//         postResult(result, false);
//       }),
//     'ussjohnjay': () =>  voyagers.forDataCore(message.data, postResult, transwarp.getEstimate)
//   };

//   //console.log(message.data.worker);

//   messageHandlers[message.data.worker]();
// });

// // This worker can estimate a single lineup from input config
// const voyageEstimate = (config, progress) => {
//   return new Promise((resolve, reject) => {
//     let estimate = transwarp.getEstimate(config, progress);
//     resolve(estimate);
//   });
// };

// // This worker can estimate a single lineup from input config
// const voyageEstimateExtended = (config, progress) => {
//   return new Promise((resolve, reject) => {
//     let estimate = sporedrive.getEstimate(config, progress);
//     resolve(estimate);
//   });
// };

// /**
//  *
//  * @param {import('../model/player.js').PlayerData} playerData
//  * @param {import('../model/crew.js').CrewMember[]} allCrew
//  * @returns
//  */
// const citeOptimizer = (playerData, allCrew) => {
//   /**
//    * @param {import('../model/player.js').PlayerCrew} c
//    */
//   const isImmortal = (c) => {
//     return c.level === 100 && c.equipment?.length === 4 && c.rarity === c.max_rarity;
//   }
//   return new Promise((resolve, reject) => {
//     if (playerData.citeMode && playerData.citeMode.rarities?.length) {
//       playerData = structuredClone(playerData);
//       playerData.player.character.crew = playerData.player.character.crew
//         .filter((crew) => playerData.citeMode.rarities.includes(crew.max_rarity));
//     }
//     Optimizer.assessCrewRoster(playerData, allCrew);
//     Optimizer.sortVoyageRankings();
//     Optimizer.findCurrentBestCrew();
//     Optimizer.findBestForRarity();
//     Optimizer.findCrewToTrain();
//     Optimizer.findEVContributionOfCrewToTrain();
//     Optimizer.sortCrewToTrain();
//     Optimizer.findBestCitedCrew();
//     Optimizer.findCrewToCite();
//     Optimizer.findEVContributionOfCrewToCite();
//     Optimizer.sortCrewToCite();
//     resolve({
//       crewToCite: Optimizer.rankedCrewToCite,
//       crewToTrain: Optimizer.rankedCrewToTrain
//     });
//   });
// };


