import React from 'react';
import {
	Button,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import { IVoyageCalcConfig, IVoyageCrew } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';

import CONFIG from '../../../CONFIG';

import { IProspectiveConfig } from '../../lineupeditor/model';
import { ContestSimulatorModal } from '../../encounters/contestsimulator/modal';
import { DEFAULT_CRIT_CHANCES, makeContestant } from '../utils';

import { IProficiencyContext, ProficiencyContext } from './context';
import { getSkillPairData, ISkillPairData } from './data';
import { ProficiencyMatrix } from './matrix';
import { ProficiencyTable } from './table';

export interface ISimulatorTrigger {
	skills: string[];
	crew: PlayerCrew;
};

type ProficiencyCheckProps = {
	id: string;
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
	roster: IVoyageCrew[];
};

export const ProficiencyCheck = (props: ProficiencyCheckProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { id, voyageConfig, roster } = props;

	const [layout, setLayout] = React.useState<string>('halfmatrix');
	const [simulatorTrigger, setSimulatorTrigger] = React.useState<ISimulatorTrigger | undefined>(undefined);

	const sortedSkills: string[] = [
		voyageConfig.skills.primary_skill,
		voyageConfig.skills.secondary_skill
	];
	Object.keys(CONFIG.SKILLS).filter(skill =>
		skill !== voyageConfig.skills.primary_skill
			&& skill !== voyageConfig.skills.secondary_skill
	).forEach(otherSkill => {
		sortedSkills.push(otherSkill);
	});

	const data = React.useMemo<ISkillPairData[]>(() => {
		return getSkillPairData(voyageConfig, sortedSkills);
	}, [voyageConfig]);

	const proficiencyContext: IProficiencyContext = {
		voyageConfig,
		roster,
		sortedSkills,
		data,
		simulateContest: (contest: ISimulatorTrigger) => setSimulatorTrigger(contest)
	};

	return (
		<ProficiencyContext.Provider value={proficiencyContext}>
			<React.Fragment>
				<div>
					{t('voyage.contests.notes.scores')}{` `}
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />{` `}{t('voyage.contests.notes.crit_icon')}
				</div>
				<div style={{ margin: '1em 0' }}>
					<Form>
						<Form.Field inline>
							<label>{t('global.toggle_layout')}{t('global.colon')}</label>
							<Button.Group>
								<Button icon='expand' color={layout === 'matrix' ? 'blue' : undefined} onClick={() => setLayout('matrix')} />
								<Button icon='compress' color={layout === 'halfmatrix' ? 'blue' : undefined} onClick={() => setLayout('halfmatrix')} />
								<Button icon='table' color={layout === 'table' ? 'blue' : undefined} onClick={() => setLayout('table')} />
							</Button.Group>
						</Form.Field>
					</Form>
				</div>
				{(layout === 'matrix' || layout === 'halfmatrix') && (
					<ProficiencyMatrix
						id={`${id}/matrix`}
						halfMatrix={layout === 'halfmatrix'}
					/>
				)}
				{layout === 'table' && (
					<ProficiencyTable
						id={`${id}/table`}
					/>
				)}
				{simulatorTrigger && (
					<ProficiencyContestSimulator
						trigger={simulatorTrigger}
						cancelTrigger={() => setSimulatorTrigger(undefined)}
					/>
				)}
			</React.Fragment>
		</ProficiencyContext.Provider>
	);
};

type ProficiencyContestSimulatorProps = {
	trigger: ISimulatorTrigger;
	cancelTrigger: () => void;
};

const ProficiencyContestSimulator = (props: ProficiencyContestSimulatorProps) => {
	const { voyageConfig, roster } = React.useContext(ProficiencyContext);
	const { trigger, cancelTrigger } = props;

	const skills: string[] = [];
	trigger.skills.forEach(skill => {
		if (!skills.includes(skill)) skills.push(skill);
	});

	const voyagers: PlayerCrew[] = [];
	voyageConfig.crew_slots.forEach(cs => {
		if (cs.crew) voyagers.push(cs.crew);
	});

	return (
		<ContestSimulatorModal
			id='proficiency/contestsimulator'
			skills={skills}
			traitPool={voyageConfig.event_content?.encounter_traits ?? []}
			a={makeContestant(skills, [], trigger.crew, DEFAULT_CRIT_CHANCES)}
			aPool={voyagers}
			bPool={roster}
			dismissSimulator={cancelTrigger}
		/>
	);
};
