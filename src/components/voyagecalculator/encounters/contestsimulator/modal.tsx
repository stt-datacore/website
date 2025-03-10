import React from 'react';
import {
	Button,
	Modal
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import { GlobalContext } from '../../../../context/globalcontext';
import { IContestant } from '../model';
import { Contest } from './contest';

type ContestSimulatorModalProps = {
	id: string;
	skills: string[];
	traits?: string[];
	traitPool?: string[];
	a?: IContestant;
	aPool?: PlayerCrew[];
	b?: IContestant;
	bPool?: PlayerCrew[];
	dismissSimulator: () => void;
};

export const ContestSimulatorModal = (props: ContestSimulatorModalProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { dismissSimulator } = props;
	return (
		<Modal
			open={true}
			onClose={dismissSimulator}
			size='small'
		>
			<Modal.Header	/* Contest Simulator */>
				{t('voyage.contests.contest_simulator')}
			</Modal.Header>
			<Modal.Content scrolling>
				<Contest
					id={`${props.id}/contest`}
					skills={props.skills}
					traits={props.traits}
					traitPool={props.traitPool}
					a={props.a}
					aPool={props.aPool}
					b={props.b}
					bPool={props.bPool}
				/>
			</Modal.Content>
			<Modal.Actions>
				<Button	/* Close */
					content={t('global.close')}
					onClick={dismissSimulator}
				/>
			</Modal.Actions>
		</Modal>
	);
};
