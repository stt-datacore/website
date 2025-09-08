import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Grid,
	Icon,
	Message,
	Segment,
	Statistic,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
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
	const { t } = React.useContext(GlobalContext).localized;
	const { skills, contestant, wins, editContestant, dismissContestant } = props;

	const expectedRoll: IExpectedScore = getExpectedScore(contestant.skills);

	const critChanceOptions = React.useMemo<DropdownItemProps[]>(() => {
		const options: DropdownItemProps[] = [
			{ key: '0%', value: 0, text: '0%' },
			{ key: '5%', value: 5, text: '5%' },
			{ key: '25%', value: 25, text: '25%' },
			{ key: '50%', value: 50, text: '50%' },
			{ key: '75%', value: 75, text: '75%' }
		];
		if (!options.map(option => option.value).includes(contestant.critChance)) {
			options.push({
				key: `${contestant.critChance}%`,
				value: contestant.critChance,
				text: `${contestant.critChance}%`
			});
		}
		options.sort((a, b) => (a.value as number) - (b.value as number));
		return options;
	}, [contestant.critChance]);

	return (
		<React.Fragment>
			<Message attached onDismiss={dismissContestant}>
				<Message.Header style={{ textAlign: 'center' }}>
					{contestant.crew?.name ?? t('voyage.contests.contestant')}
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
							<Table.Cell	/* Crit Chance */>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
									<div>
										{t('voyage.contests.crit_chance')}
									</div>
									<div>
										<Dropdown	/* Select crit chance */
											placeholder={t('voyage.contests.select_crit_chance')}
											selection
											options={critChanceOptions}
											value={contestant.critChance}
											onChange={(e, { value }) => editContestant({...contestant, critChance: value as number})}
										/>
									</div>
								</div>
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table>
			</Segment>
			<Message attached='bottom'>
				<Statistic.Group size='mini' widths={4}>
					<Statistic	/* Avg */>
						<Statistic.Value>{expectedRoll.average}</Statistic.Value>
						<Statistic.Label>{t('voyage.contests.avg')}</Statistic.Label>
					</Statistic>
					<Statistic	/* Min */>
						<Statistic.Value>{expectedRoll.min}</Statistic.Value>
						<Statistic.Label>{t('voyage.contests.min')}</Statistic.Label>
					</Statistic>
					<Statistic	/* Max */>
						<Statistic.Value>{expectedRoll.max}</Statistic.Value>
						<Statistic.Label>{t('voyage.contests.max')}</Statistic.Label>
					</Statistic>
					<Statistic	/* Wins */>
						<Statistic.Value>{wins}</Statistic.Value>
						<Statistic.Label>{t('voyage.contests.wins')}</Statistic.Label>
					</Statistic>
				</Statistic.Group>
			</Message>
		</React.Fragment>
	);

	function renderContestantSkill(skill: string): JSX.Element {
		const contestantSkill: IContestSkill | undefined = contestant.skills.find(cs => cs.skill === skill);

		return (
			<Table.Row key={skill}>
				<Table.Cell>
					<Grid columns='equal' verticalAlign='middle'>
						<Grid.Column textAlign='center'>
							<img
								src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
								style={{ height: '1.5em' }}
								className='invertibleIcon'
							/>
						</Grid.Column>
						<Grid.Column width={9} textAlign='center'>
							{contestantSkill && (
								<ProficiencyRangeInput
									contestSkill={contestantSkill}
									onChange={editProficiency}
								/>
							)}
							{!contestantSkill && (
								<>{t('voyage.contests.no_skill')}</>
							)}
						</Grid.Column>
						<Grid.Column width={1} /* Hack to prevent grid from exceeding table width */ />
					</Grid>
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
