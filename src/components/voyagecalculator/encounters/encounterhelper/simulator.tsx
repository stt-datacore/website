import React from 'react';
import {
	Button,
	Divider,
	Modal
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { PlayerCrew } from '../../../../model/player';

import { IEncounter } from '../model';
import { Contest } from '../contestsimulator/contest';
import { assignCrewToContest, IChampionContest, IContestAssignments } from './championdata';
import { ContributorsTable } from './contributors';

type ChampionSimulatorProps = {
	voyageCrew: PlayerCrew[];
	encounter: IEncounter;
	assignments: IContestAssignments;
	activeContest: IChampionContest;
	cancelTrigger: () => void;
};

export const ChampionSimulator = (props: ChampionSimulatorProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, activeContest, cancelTrigger } = props;

	const [pendingAssignments, setPendingAssignments] = React.useState<IContestAssignments | undefined>(undefined);

	React.useEffect(() => {
		const assignments: IContestAssignments = {};
		Object.keys(props.assignments).forEach(contestId => {
			assignments[contestId] = props.assignments[contestId];
		});
		assignCrewToContest(encounter, assignments, activeContest, activeContest.champion.crew);
		setPendingAssignments(assignments);
	}, [props.assignments]);

	if (!pendingAssignments) return <></>;

	return (
		<Modal
			open={true}
			onClose={cancelTrigger}
			size='small'
		>
			<Modal.Header	/* Contest Simulator */>
				{t('voyage.contests.contest_simulator')}
			</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button	/* Close */
					content={t('global.close')}
					onClick={cancelTrigger}
				/>
			</Modal.Actions>
		</Modal>
	);

	function renderContent(): JSX.Element {
		return (
			<React.Fragment>
				<Contest
					id='contestodds/contest'
					skills={activeContest.skills.map(cs => cs.skill)}
					a={activeContest.champion}
					b={activeContest.challenger}
					compact={true}
				/>
				<Divider />
				{pendingAssignments && (
					<ContributorsTable
						encounter={encounter}
						activeContest={activeContest}
						assignments={pendingAssignments}
						setAssignments={setPendingAssignments}
					/>
				)}
			</React.Fragment>
		);
	}
};
