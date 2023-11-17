import { IQuestCrew, QuestSolverConfig, QuestSolverResult } from "../model/worker";

const QuestSolver = {        
    solveQuest: (config: QuestSolverConfig) => {
        return new Promise<QuestSolverResult>((resolve, reject) => {
            
            const { items } = config.context.core;
			const { playerData } = config.context.player;

			const crew = [] as IQuestCrew[];

            resolve({
                crew
            });
        });
    },
    
}

export default QuestSolver;