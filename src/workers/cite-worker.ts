import Optimizer from './optimizer';
import BetaTachyon from './betatachyon';
import { PlayerData } from '../model/player';
import { CrewMember } from '../model/crew';

const citeOptimizer = (playerData: PlayerData, allCrew: CrewMember[]) => {
    return new Promise((resolve, reject) => {
        if (playerData.citeMode && playerData.citeMode.rarities?.length) {
            playerData.player.character.crew = playerData.player.character.crew
                .filter((crew) => playerData!.citeMode!.rarities!.includes(crew.max_rarity));
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
self.onmessage = (message: any) => {
    const postResult = (result: any, inProgress?: boolean) => {
        postMessage({ result, inProgress });
        if (!inProgress) self.close();
        return inProgress;
    };
    console.log('Citation Optimizer Worker has been started.');
    const messageHandlers = {
        'citeOptimizer': () => citeOptimizer(message.data.config.playerData, message.data.config.allCrew).then(data => postResult(data, false)),
        'ironywrit': () => BetaTachyon.scanCrew(message.data.config).then(data => postResult(data, false)),
    };
    messageHandlers[message.data.worker]();
};
