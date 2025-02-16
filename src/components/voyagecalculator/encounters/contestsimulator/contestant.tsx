import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Icon,
	Message,
	Segment,
	Statistic,
	Table
} from 'semantic-ui-react';

import { AvatarView } from '../../../item_presenters/avatarview';
import { IContestant, IContestSkill, IExpectedScore } from '../model';
import { getExpectedScore } from '../utils';
import { ProficiencyRangeInput } from '../common/rangeinput';

type ContestantProps = {
	skills: string[];
	contestant: IContestant;
	wins: string | JSX.Element;
	editContestant: (contestant: IContestant) => void;
	dismissContestant?: () => void;
};

export const Contestant = (props: ContestantProps) => {
	const { skills, contestant, wins, editContestant, dismissContestant } = props;

	const expectedRoll: IExpectedScore = getExpectedScore(contestant.skills);

	const critChanceOptions: DropdownItemProps[] = [
		{ key: '0%', value: 0, text: '0%' },
		{ key: '5%', value: 5, text: '5%' },
		{ key: '10%', value: 10, text: '10%' },
		{ key: '15%', value: 15, text: '15%' },
		{ key: '25%', value: 25, text: '25%' },
		{ key: '45%', value: 45, text: '45%' },
		{ key: '65%', value: 65, text: '65%' }
	];

	return (
		<React.Fragment>
			<Message attached onDismiss={dismissContestant}>
				<Message.Header style={{ textAlign: 'center' }}>
					{contestant.crew?.name ?? 'Contestant'}
				</Message.Header>
				<div style={{ display: 'flex', justifyContent: 'center' }}>
					{contestant.crew && (
						<AvatarView
							mode='crew'
							size={96}
							item={contestant.crew}
							partialItem={true}
						/>
					)}
					{!contestant.crew && (
						<div style={{ display: 'flex', alignItems: 'center', height: '96px' }}>
							<Icon name='user' size='huge' />
						</div>
					)}
				</div>
			</Message>
			<Segment attached>
				<Table striped compact>
					<Table.Body>
						{skills.map(skill => renderContestantSkill(skill))}
						<Table.Row>
							<Table.Cell textAlign='center'>
								Crit Chance
							</Table.Cell>
							<Table.Cell textAlign='center'>
								<Dropdown	/* Select crit chance */
									placeholder='Select crit chance'
									selection
									options={critChanceOptions}
									value={contestant.critChance}
									onChange={(e, { value }) => editContestant({...contestant, critChance: value as number})}
								/>
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table>
			</Segment>
			<Message attached='bottom'>
				<Statistic.Group size='mini' widths='four'>
					<Statistic>
						<Statistic.Value>{expectedRoll.average}</Statistic.Value>
						<Statistic.Label>Avg</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{expectedRoll.min}</Statistic.Value>
						<Statistic.Label>Min</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{expectedRoll.max}</Statistic.Value>
						<Statistic.Label>Max</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>
							{wins}
						</Statistic.Value>
						<Statistic.Label>Wins</Statistic.Label>
					</Statistic>
				</Statistic.Group>
			</Message>
		</React.Fragment>
	);

	function renderContestantSkill(skill: string): JSX.Element {
		const contestantSkill: IContestSkill | undefined = contestant.skills.find(cs => cs.skill === skill);

		return (
			<Table.Row key={skill}>
				<Table.Cell textAlign='center'>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.5em', verticalAlign: 'middle' }} className='invertibleIcon' />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{contestantSkill && (
						<ProficiencyRangeInput
							contestSkill={contestantSkill}
							onChange={editProficiency}
						/>
					)}
					{!contestantSkill && (
						<>No skill</>
					)}
				</Table.Cell>
			</Table.Row>
		);
	}

	function editProficiency(contestSkill: IContestSkill): void {
		const skillIndex: number = contestant.skills.findIndex(cs => cs.skill === contestSkill.skill);
		if (skillIndex >= 0) {
			contestant.skills[skillIndex] = contestSkill;
			editContestant({...contestant});
		}
	}
};

