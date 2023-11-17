import React from "react";

import '../typings/worker';
import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';
import { GlobalContext } from "../../context/globalcontext";
import { QuestSolverConfig, QuestSolverResult } from "../../model/worker";
import { Quest } from "../../model/missions";


export interface QuestSolverProps {
    quest: Quest;
    paths: number[][];
    setResults: (value: QuestSolverResult) => void;    
}

interface QuestSolverState {

}

export class QuestSolverComponent extends React.Component<QuestSolverProps, QuestSolverState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;

    constructor(props: QuestSolverProps) {
        super(props);
        this.state = {

        } as QuestSolverState;
    }

    private runWorker() {
		const worker = new UnifiedWorker();
		const { quest, setResults, paths } = this.props;

		worker.addEventListener('message', (message: { data: { result: QuestSolverResult } }) => {
            setResults(message.data.result);
		});

		worker.postMessage({
			worker: 'questSolver',
			config: { 
				context: this.context,
				quest,
                paths
            } as QuestSolverConfig
		});
	}

    componentDidMount(): void {
        this.runWorker();
    }

    render() {
        return <></>
    }
}