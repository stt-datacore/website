import React from "react";

import '../../typings/worker';
import UnifiedWorker from 'worker-loader!../../workers/unifiedWorker';

import { GlobalContext } from "../../context/globalcontext";
import { QuestSolverConfig, QuestSolverResult } from "../../model/worker";
import { MissionChallenge, MissionTraitBonus, Quest } from "../../model/missions";
import { Button } from "semantic-ui-react";




export interface QuestSolverProps {
    traits?: MissionTraitBonus[];
    quest?: Quest;
    challenges?: MissionChallenge[];
    paths?: number[][];        
    setResults: (value: QuestSolverResult) => void;
    runCount?: number;
    mastery: number;
    setIdleOnly: (value: boolean) => void;
    idleOnly: boolean;
    setConsiderFrozen: (value: boolean) => void;
    considerFrozen: boolean;
}

interface QuestSolverState {
    runCount: number;
    results?: QuestSolverResult;
}

export class QuestSolverComponent extends React.Component<QuestSolverProps, QuestSolverState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;

    private _irun = -1;

    constructor(props: QuestSolverProps) {
        super(props);

        this.state = {
            runCount: props.runCount ?? 0
        } as QuestSolverState;
    }

    private runWorker() {
		const worker = new UnifiedWorker();
		const { considerFrozen, idleOnly, mastery, challenges, quest, setResults, paths, traits } = this.props;

		worker.addEventListener('message', (message: { data: { result: QuestSolverResult } }) => {            
            if (setResults) {
                setResults(message.data.result);
            }

            this.setState({ results: message.data.result });            
		});

		worker.postMessage({
			worker: 'questSolver',
			config: { 
				context: {
                    core: {
                        items: this.context.core.items
                    },
                    player: {
                        playerData: this.context.player.playerData
                    }
                },
				quest,
                challenges,
                paths,
                traits,
                mastery,
                considerFrozen,
                idleOnly
            } as QuestSolverConfig
		});
	}

    // componentDidMount(): void {
    //     this.initData();
    // }

    // componentDidUpdate(prevProps: Readonly<QuestSolverProps>, prevState: Readonly<QuestSolverState>, snapshot?: any): void {
    //     this.initData();
    // }

    // private initData() {
    //     if (this._irun !== this.state.runCount) {
    //         this._irun = this.state.runCount;
    //         this.runWorker();
    //     }
    // }

    render() {
        return <div>
            <Button color="blue" onClick={(e) => this.runWorker()}>Click to Find Crew</Button>
        </div>
    }
}