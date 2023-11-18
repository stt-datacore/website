import { PlayerSkill } from "../model/crew";
import { MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew } from "../model/player";
import { IQuestCrew, QuestSolverConfig, QuestSolverResult } from "../model/worker";
import { getItemBonuses } from "../utils/itemutils";

interface SkillCrit {
    skill: PlayerSkill | string;
    crit: number;    
}

const QuestSolver = {        

    solveQuest: (config: QuestSolverConfig) => {
        

        function solveChallenge(roster: PlayerCrew[], challenge: MissionChallenge, mastery: number, traits?: MissionTraitBonus[]) {
            const quipment = config.context.core.items.filter(i => i.type === 14 && Object.keys(getItemBonuses(i).bonuses).includes(challenge.skill));
            const useTraits = traits ?? challenge.trait_bonuses ?? [];
            
            let questcrew = roster.filter(c => 
                    challenge.skill in c.skills && 
                    c.skills[challenge.skill].core >= challenge.difficulty_by_mastery[mastery])
                    .sort((a, b) => {
                        let maxa = a.skills[challenge.skill].core + ((a.skills[challenge.skill].range_max + a.skills[challenge.skill].range_min) / 2);
                        let maxb = b.skills[challenge.skill].core + ((b.skills[challenge.skill].range_max + b.skills[challenge.skill].range_min) / 2);

                        for (let trait of useTraits) {
                            if (a.traits.includes(trait.trait) || a.traits_hidden.includes(trait.trait)) {
                                maxa += trait.bonuses[mastery];
                            }
                            if (b.traits.includes(trait.trait) || b.traits_hidden.includes(trait.trait)) {
                                maxb += trait.bonuses[mastery];
                            }
                        }
                        return maxb - maxa;
                    })
                    .map(c => c as IQuestCrew);

            const crews = {} as { [key: string]: SkillCrit[] };

            for (let crew of questcrew) {
                crews[crew.symbol] ??= [];
            }
            
            return questcrew;
        }

        return new Promise<QuestSolverResult>((resolve, reject) => {            
            const { items } = config.context.core;
			const { playerData } = config.context.player;
            const { considerFrozen, idleOnly } = config;
            if (!playerData?.player?.character?.crew?.length) {
                resolve({
                    status: false,
                    crew: [],
                    error: "No player crew roster"
                });
                return;
            }
            
            const roster = playerData.player.character.crew.filter(f => f.immortal !== 0 && (f.immortal === -1 || considerFrozen) && (f.active_status === 0 || !idleOnly));

            if (!config.challenges?.length && !config.quest?.challenges?.length) {
                resolve({
                    status: false,
                    crew: [],
                    error: "No quest or challenges provided"
                });
                return;
            }
            
            const challenges = config.challenges ?? config.quest?.challenges ?? [];
            let crew = [] as IQuestCrew[];

            for (let ch of challenges) {
                let chcrew = solveChallenge(roster, ch, config.mastery);
                if (chcrew?.length) crew = crew.concat(chcrew);
            }

            crew = crew.filter((c, i) => crew.findIndex(c2 => c2.symbol === c.symbol) === i);

            resolve({
                status: true,
                crew
            });
        });
    },
    
}

export default QuestSolver;