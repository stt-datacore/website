import React from "react";

import '../../typings/worker';
import UnifiedWorker from 'worker-loader!../../workers/unifiedWorker';

import { GlobalContext } from "../../context/globalcontext";
import { QuestSolverConfig, QuestSolverResult } from "../../model/worker";
import { MissionChallenge, MissionTraitBonus, Quest, QuestFilterConfig } from "../../model/missions";
import { Button } from "semantic-ui-react";




export interface QuestSolverProps {
    setResults: (value: QuestSolverResult) => void;    
    config: QuestFilterConfig;
    setConfig?: (value: QuestFilterConfig) => void;
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
        } as QuestSolverState;
    }

    private runWorker() {
		const worker = new UnifiedWorker();
		const { includeCurrentQp, qpOnly, ignoreQpConstraint, considerFrozen, idleOnly, mastery, challenges, quest, paths, traits } = this.props.config;
        const { setResults } = this.props;

		worker.addEventListener('message', (message: { data: { result: QuestSolverResult } }) => {            
            if (setResults) {
                setResults(message.data.result);
            }

            this.setState({ results: message.data.result });            
		});

		worker.postMessage({
			worker: 'questSolver',
			config: { 
                buffs: this.context.player.buffConfig,
				context: {
                    core: {
                        items: this.context.core.items
                    },
                    player: {
                        playerData: this.context.player.playerData,
                        ephemeral: this.context.player.ephemeral
                    }
                },
				quest,
                challenges,
                paths,
                traits,
                mastery,
                considerFrozen,
                idleOnly,
                qpOnly,
                ignoreQpConstraint,
                includeCurrentQp
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