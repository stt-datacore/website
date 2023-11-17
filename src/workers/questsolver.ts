import { PlayerSkill } from "../model/crew";
import { MissionChallenge } from "../model/missions";
import { PlayerCrew } from "../model/player";
import { IQuestCrew, QuestSolverConfig, QuestSolverResult } from "../model/worker";

interface SkillCrit {
    skill: PlayerSkill | string;
    crit: number;
    
}

const QuestSolver = {        

    solveQuest: (config: QuestSolverConfig) => {

        function solveChallenge(roster: PlayerCrew[], challenge: MissionChallenge, traits?: string[]) {
            let useTraits = traits ?? challenge.trait_bonuses?.map(t => t.trait) ?? [];

            for (let crew of roster) {

            }
            
        }

        return new Promise<QuestSolverResult>((resolve, reject) => {            
            const { items } = config.context.core;
			const { playerData } = config.context.player;

            if (!config.challenges?.length && !config.quest?.challenges?.length) {
                resolve({
                    status: false,
                    crew: [],
                    error: "No quest or challenges provided"
                });
                return;
            }

			const crew = [] as IQuestCrew[];

            resolve({
                status: true,
                crew
            });
        });
    },
    
}

export default QuestSolver;