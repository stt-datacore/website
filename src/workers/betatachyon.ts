import { CrewMember } from "../model/crew";
import { PlayerData } from "../model/player";
import { BuffStatTable } from "../utils/voyageutils";

const BetaTachyon = {        

    scanCrew: (playerData: PlayerData, allCrew: CrewMember[], buffs: BuffStatTable) => {
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
                .filter((crew) => playerData.citeMode?.rarities?.includes(crew.max_rarity));
            }
            resolve({
                crewToCite: playerData.player.character.crew,
                crewToTrain: []
            });
        });
    },

    

    
}

export default BetaTachyon;