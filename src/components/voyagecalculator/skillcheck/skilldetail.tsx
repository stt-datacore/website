import React from 'react';
import {
	Icon,
	Image,
	Message,
	Segment,
	Table
} from 'semantic-ui-react';

import { IVoyageCalcConfig } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import CONFIG from '../../CONFIG';
import { NumericDiff } from '../../dataset_presenters/elements/numericdiff';

import { IProspectiveConfig } from '../lineupeditor/model';
import { ISkillData } from './skilldata';

type SkillDetailProps = {
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
	currentData: ISkillData;
	baselineData?: ISkillData;
};

export const SkillDetail = (props: SkillDetailProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageConfig, currentData, baselineData } = props;

	const renderAsTime = (value: number) => <>{formatTime(value, t)}</>;

	interface ISkillDetailRow {
		field: string;
		title: string;
		adjustValue?: (value: number) => number;
		renderValue?: (value: number) => JSX.Element;
	};

	const rows: ISkillDetailRow[] = [
		{	/* Voyage score */
			field: 'score',
			title: 'Voyage score',
			adjustValue: (value: number) => Math.floor(value)
		},
		{	/* Skill check fail point */
			field: 'fail_point',
			title: 'Skill check fail point',
			renderValue: renderAsTime
		},
		{	/* Crew with skill */
			field: 'crew_count',
			title: 'Crew with skill'
		}
	];

	return (
		<React.Fragment>
			<Message attached>
				<Message.Header>
					{currentData.name}
					{voyageConfig.skills.primary_skill === currentData.skill && <Icon name='star' color='yellow' style={{ marginLeft: '.5em' }} />}
					{voyageConfig.skills.secondary_skill === currentData.skill && <Icon name='star' color='grey' style={{ marginLeft: '.5em' }} />}
					<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${currentData.skill}.png`} style={{ height: '1.5em' }} />
				</Message.Header>
			</Message>
			<Segment attached>
				<Table striped compact unstackable>
					<Table.Body>
						{rows.map(row => (
							<Table.Row key={row.field}>
								<Table.Cell>
									{row.title}:
								</Table.Cell>
								<Table.Cell textAlign='right'>
									{!baselineData && renderRowValue(row)}
									{baselineData && (
										<NumericDiff
											compare={{
												currentValue: row.adjustValue ? row.adjustValue(currentData[row.field]) : currentData[row.field],
												baselineValue: row.adjustValue ? row.adjustValue(baselineData[row.field]) : baselineData[row.field],
												showCurrentValue: true
											}}
											customRender={row.renderValue ?? undefined}
											justifyContent='flex-end'
										/>
									)}
								</Table.Cell>
							</Table.Row>
						))}
						<Table.Row>
							<Table.Cell>
								Best proficiency:
							</Table.Cell>
							<Table.Cell textAlign='right'>
								{renderProficiency()}
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table>
			</Segment>
			<Message attached='bottom'>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
					<div>Paired skills:</div>
					<div>
						{renderPairedSkills()}
					</div>
				</div>
			</Message>
		</React.Fragment>
	);

	function renderRowValue(row: ISkillDetailRow): JSX.Element {
		let currentValue: number = currentData[row.field];
		if (row.adjustValue) currentValue = row.adjustValue(currentValue);
		if (row.renderValue) return <b>{row.renderValue(currentValue)}</b>;
		return <b>{currentValue}</b>;
	}

	function renderProficiency(): JSX.Element {
		// Voyage history does not have reliable proficiency values for individual crew
		if (currentData.best_proficiency === 0) return <>N/A</>;
		if (!baselineData) return <b>{currentData.best_proficiency}</b>;
		return (
			<NumericDiff
				compare={{
					currentValue: currentData.best_proficiency,
					baselineValue: baselineData.best_proficiency,
					showCurrentValue: true
				}}
				justifyContent='flex-end'
			/>
		);
	}

	function renderPairedSkills(): JSX.Element {
		interface IPairedSkill {
			skill: string;
			change?: 'gained' | 'lost';
		};
		const pairedSkills: IPairedSkill[] = [];
		Object.keys(CONFIG.SKILLS).filter(skill => skill !== currentData.skill).forEach(skill => {
			const hasSkill: boolean = currentData.paired_skills.includes(skill);
			if (!baselineData) {
				if (hasSkill) pairedSkills.push({ skill });
			}
			else if (baselineData) {
				const hadSkill: boolean = baselineData.paired_skills.includes(skill);
				if (hasSkill && hadSkill)
					pairedSkills.push({ skill });
				else if (hasSkill && !hadSkill)
					pairedSkills.push({ skill, change: 'gained' });
				else if (!hasSkill && hadSkill)
					pairedSkills.push({ skill, change: 'lost' });
			}
		});
		return (
			<div style={{ display: 'flex', alignItems: 'center', columnGap: '.5em' }}>
				{pairedSkills.map(pairedSkill => (
					<span key={pairedSkill.skill}>
						{pairedSkill.change === 'gained' && <Icon name='plus' color='green' />}
						{pairedSkill.change === 'lost' && <Icon name='minus' color='red' />}
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pairedSkill.skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
					</span>
				))}
			</div>
		);
	}
};
