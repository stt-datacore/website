import React from 'react';
import { InView } from 'react-intersection-observer';
import {
	Dropdown,
	DropdownItemProps,
	Grid,
	Icon,
	Label,
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
	critChances: number[];
	contestant: IContestant;
	wins: string | JSX.Element;
	editContestant: (contestant: IContestant) => void;
	dismissContestant?: () => void;
	compact?: boolean;
	onWinsViewChange?: (inView: boolean) => void;
};

export const Contestant = (props: ContestantProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { skills, critChances, contestant, wins, editContestant, dismissContestant, compact } = props;

	const expectedRoll: IExpectedScore = getExpectedScore(contestant.skills);

	const critChanceOptions = React.useMemo<DropdownItemProps[]>(() => {
		const options: DropdownItemProps[] = critChances.map(critChance => {
			return {
				key: `${critChance}%`,
				value: critChance,
				text: `${critChance}%`
			};
		});
		options.push({ key: '0%', value: 0, text: '0%' });
		if (!options.map(option => option.value).includes(contestant.critChance)) {
			options.push({
				key: `${contestant.critChance}%`,
				value: contestant.critChance,
				text: `${contestant.critChance}%`
			});
		}
		options.sort((a, b) => (a.value as number) - (b.value as number));
		return options;
	}, [critChances, contestant.critChance]);

	return (
		<React.Fragment>
			<Message attached onDismiss={dismissContestant}>
				{!compact && renderFullHeader()}
				{compact && renderCompactHeader()}
			</Message>
			{!compact && (
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
			)}
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
						{props.onWinsViewChange && (
							<InView
								onChange={(inView, _entry) => props.onWinsViewChange!(inView)}
							/>
						)}
						<Statistic.Value>{wins}</Statistic.Value>
						<Statistic.Label>{t('voyage.contests.wins')}</Statistic.Label>
					</Statistic>
				</Statistic.Group>
			</Message>
		</React.Fragment>
	);

	function renderFullHeader(): JSX.Element {
		return (
			<React.Fragment>
				<Message.Header style={{ textAlign: 'center' }}>
					{contestant.crew?.name ?? t('voyage.contests.contestant')}
				</Message.Header>
				{renderAvatar()}
			</React.Fragment>
		);
	}

	function renderCompactHeader(): JSX.Element {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', columnGap: '1em' }}>
				<div>
					{renderAvatar()}
				</div>
				<div style={{ textAlign: 'center' }}>
					<Label.Group>
						{skills.map(skill => renderContestantSkillLabel(skill))}
						<Label>
							<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
								<span>
									<img
										src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`}
										style={{ height: '1.1em', verticalAlign: 'middle' }}
										className='invertibleIcon'
									/>
								</span>
								<span>{contestant.critChance}%</span>
							</div>
						</Label>
					</Label.Group>
				</div>
			</div>
		);
	}

	function renderAvatar(): JSX.Element {
		return (
			<div style={{ display: 'flex', justifyContent: 'center' }}>
				{contestant.crew && (
					<AvatarView
						mode='crew'
						size={compact ? 64 : 96}
						item={contestant.crew}
						partialItem={true}
					/>
				)}
				{!contestant.crew && (
					<div style={{ display: 'flex', alignItems: 'center', height: `${compact ? '64' : '96'}px` }}>
						<Icon name='user' size='huge' />
					</div>
				)}
			</div>
		);
	}

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

	function renderContestantSkillLabel(skill: string): JSX.Element {
		const contestantSkill: IContestSkill | undefined = contestant.skills.find(cs => cs.skill === skill);
		return (
			<Label key={skill}>
				<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
					<span>
						<img
							src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
							style={{ height: '1.1em', verticalAlign: 'middle' }}
							className='invertibleIcon'
						/>
					</span>
					<span>
						{contestantSkill && (
							<>{contestantSkill.range_min}-{contestantSkill.range_max}</>
						)}
						{!contestantSkill && (
							<>{t('voyage.contests.no_skill')}</>
						)}
					</span>
				</div>
			</Label>
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
