/* eslint-disable */
//unified-worker.js
import voymod from './voymod.js';
import transwarp from './transwarp.js';
import sporedrive from './sporedrive.js';
import VoyagersWorker from './voyagers.ts';
import Optimizer from './optimizer.js';
import BetaTachyon from './betatachyon.ts';
import CollectionOptimizer from './collectionworker.ts';
import ItemsWorker from './itemsworker.ts';
import QuestSolver from './questsolver.ts';
import { calcQLots } from '../utils/equipment.ts';
import ShipCrewWorker from './shipcrewworker.ts';
import { calculateGauntlet } from '../utils/gauntlet.ts';

// This worker can estimate a single lineup from input config
const voyageEstimate = (config, progress) => {
    return new Promise((resolve, reject) => {
        let estimate = transwarp.getEstimate(config, progress);
        resolve(estimate);
    });
};

// This worker can estimate a single lineup from input config
const voyageEstimateExtended = (config, progress) => {
    return new Promise((resolve, reject) => {
        let estimate = sporedrive.getEstimate(config, progress);
        resolve(estimate);
    });
};

/**
 *
 * @param {import('../model/player.js').PlayerData} playerData
 * @param {import('../model/crew.js').CrewMember[]} allCrew
 * @returns
 */
const citeOptimizer = (playerData, allCrew) => {
    /**
     * @param {import('../model/player.js').PlayerCrew} c
     */
    const isImmortal = (c) => {
        return c.level === 100 && c.equipment?.length === 4 && c.rarity === c.max_rarity;
    }
    return new Promise((resolve, reject) => {
        if (playerData.citeMode && playerData.citeMode.rarities?.length) {
            playerData = JSON.parse(JSON.stringify(playerData));
            playerData.player.character.crew = playerData.player.character.crew
                .filter((crew) => playerData.citeMode.rarities.includes(crew.max_rarity));
        }
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



// eslint-disable-next-line no-restricted-globals
self.onmessage = (message) => {
    const postResult = (result, inProgress) => {
        postMessage({ result, inProgress });
        if (!inProgress) self.close();
    };
    const messageHandlers = {
        'voyageEstimate': () => voyageEstimate(message.data.config, est => postResult(est, true)).then(estimate =>
            postResult(estimate, false)
        ),
        'voyageEstimateExtended': () => voyageEstimateExtended(message.data.config, est => postResult(est, true)).then(estimate =>
            postResult(estimate, false)
        ),
        'citeOptimizer': () => citeOptimizer(message.data.config.playerData, message.data.config.allCrew).then(data => postResult(data, false)),
        'questSolver': () => QuestSolver.solveQuest(message.data.config).then(data => postResult(data, false)),
        'ironywrit': () => BetaTachyon.scanCrew(message.data.config).then(data => postResult(data, false)),
        'colOptimizer2': () => CollectionOptimizer.scanAll2(message.data.config).then(data => postResult(data, false)),
        'equipmentWorker': () => ItemsWorker.processItems(message.data.config).then(data => postResult(data, false)),
        'iampicard': () => voymod().then(mod => {
            let result = mod.calculate(JSON.stringify(message.data), res => {
                postResult(res, true);
            });
            postResult(result, false);
        }),
        'gauntlet': () => {
            const gauntlet = calculateGauntlet(message.data.config);
            postResult(gauntlet, false);
        },
        'ussjohnjay': () => VoyagersWorker(message.data, postResult, transwarp.getEstimate),
        'qpower': () => {
            const { crew, quipment, buffs, max_qbits, slots, mode } = message.data.config;
            crew.forEach((crew) => {
                calcQLots(crew, quipment, buffs, max_qbits, slots, mode);
            });
            postResult(crew, false);
        },
        'shipworker': () => ShipCrewWorker.calc(message.data.config, progress => postResult(progress, true)).then(data => postResult(data, false)),
        'bestshipworker': () => ShipCrewWorker.bestFinder(message.data.config).then(data => postResult(data, false)),
    };

    //console.log(message.data.worker);

    messageHandlers[message.data.worker]();
    // postMessage(result);
};
