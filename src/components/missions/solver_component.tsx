import React from "react";

import '../../typings/worker';
import { UnifiedWorker } from '../../typings/worker';
import { GlobalContext } from "../../context/globalcontext";
import { QuestSolverConfig, QuestSolverResult } from "../../model/worker";
import { MissionChallenge, MissionTraitBonus, Quest, QuestFilterConfig } from "../../model/missions";
import { Button } from "semantic-ui-react";




export interface QuestSolverProps {
    setResults: (value: QuestSolverResult) => void;    
    clearResults?: () => void;
    config: QuestFilterConfig;
    setConfig?: (value: QuestFilterConfig) => void;
    disabled?: boolean;
    clearDisabled?: boolean;
    style?: React.CSSProperties;
    buttonCaption?: string;
    clearCaption?: string;
    setRunning?: (value: boolean) => void;
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
        const { setResults } = this.props;

		worker.addEventListener('message', (message: { data: { result: QuestSolverResult } }) => {            
            if (this.props.setRunning) this.props.setRunning(false);
            if (setResults) {
                setResults(message.data.result);
            }

            this.setState({ results: message.data.result });            
		});

        if (this.props.setRunning) this.props.setRunning(true);

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
				... this.props.config
            } as QuestSolverConfig
		});
	}
   
    render() {
        const caption = this.props.buttonCaption ?? 'Click to Find Crew';
        const clear = this.props.clearCaption ?? 'Clear Results';

        return <div style={this.props.style}>
            <Button disabled={this.props.disabled} color="blue" onClick={(e) => this.runWorker()}>{caption}</Button>
            {!!this.props.clearResults && 
                <Button disabled={this.props.clearDisabled} onClick={(e) => this.props.clearResults ? this.props.clearResults() : null}>{clear}</Button>
            }
        </div>
    }
}