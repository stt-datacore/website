import React from 'react';
import {
	Button,
	Dropdown,
	DropdownItemProps,
	Grid,
	Icon,
	Label,
	Message,
	Popup,
	Segment,
	Statistic,
	Table
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import { GlobalContext } from '../../../../context/globalcontext';
import { AvatarView } from '../../../item_presenters/avatarview';
import CONFIG from '../../../CONFIG';
import { IContestant, IContestSkill, IExpectedScore, ISkillBoost } from '../model';
import { getExpectedScore, makeContestant, MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from '../utils';
import { ProficiencyRangeInput } from '../common/rangeinput';

type ContestantProps = {
	skills: string[];
	contestant: IContestant;
	boost: ISkillBoost | undefined;
	wins: string | JSX.Element;
	editContestant: (contestant: IContestant) => void;
	editBoost: (boost: ISkillBoost | undefined) => void;
	dismissContestant?: () => void;
};

export const Contestant = (props: ContestantProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { skills, contestant, boost, wins, editContestant, editBoost, dismissContestant } = props;

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
				{contestant.crew && (
					<UnusedSkills
						crew={contestant.crew}
						skills={Object.keys(contestant.crew.skills).filter(skill => !skills.includes(skill))}
						boost={boost}
						editBoost={editBoost}
					/>
				)}
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
						{contestant.crew && (
							<Grid.Column textAlign='center'>
								<BoostPicker
									skill={skill}
									boost={boost}
									editBoost={editBoost}
									impact='now'
								/>
							</Grid.Column>
						)}
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

type UnusedSkillsProps = {
	crew: PlayerCrew;
	skills: string[];
	boost: ISkillBoost | undefined;
	editBoost: (boost: ISkillBoost | undefined) => void;
};

const UnusedSkills = (props: UnusedSkillsProps) => {
	const { crew, skills, boost, editBoost } = props;

	const contestant = React.useMemo<IContestant>(() => {
		return makeContestant(skills, [], crew, boost);
	}, [crew, boost]);

	return (
		<div style={{ marginTop: '1em', textAlign: 'center' }}>
			<Label.Group style={{ marginBottom: '0' }}>
				{contestant.skills.map(contestSkill => renderUnusedSkill(contestSkill))}
			</Label.Group>
		</div>
	);

	function renderUnusedSkill(contestSkill: IContestSkill): JSX.Element {
		const min: number = Math.floor(contestSkill.range_min / 2);
		const max: number = Math.floor(contestSkill.range_max / 2);
		const average: number = min + Math.floor((max - min) / 2);
		const title: string = `${crew.name}'s unused ${CONFIG.SKILLS[contestSkill.skill]} skill will boost later contests by +(${min}-${max}) per ${CONFIG.SKILLS[contestSkill.skill]} roll for an average total boost of +${average*3} per contest`;
		return (
			<Label key={contestSkill.skill} title={title}>
				<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
					<span>
						<img
							src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${contestSkill.skill}.png`}
							style={{ height: '1.1em', verticalAlign: 'middle' }}
							className='invertibleIcon'
						/>
					</span>
					<span>
						+{average*3}
					</span>
					<span>
						<BoostPicker
							skill={contestSkill.skill}
							boost={boost}
							editBoost={editBoost}
							impact='future'
						/>
					</span>
				</div>
			</Label>
		);
	}
};

type BoostPickerProps = {
	skill: string;
	boost: ISkillBoost | undefined;
	editBoost: (boost: ISkillBoost | undefined) => void;
	impact: 'now' | 'future';
};

const BoostPicker = (props: BoostPickerProps) => {
	const { skill, boost, editBoost, impact } = props;

	const [showPopup, setShowPopup] = React.useState<boolean>(false);

	const options: DropdownItemProps[] = [];
	for (let i = 0; i <= 5; i++) {
		options.push({
			key: `rarity-${i}`,
			value: i,
			text: `+(${MIN_RANGE_BOOSTS[i]}-${MAX_RANGE_BOOSTS[i]}) per roll`
		});
	}

	return (
		<Popup
			trigger={(
				<Button
					title='Boost this skill'
					color={boost?.skill === skill ? 'blue' : undefined}
					size='small'
				>
					{boost?.skill !== skill && <Icon name='angle double up' fitted />}
					{boost?.skill === skill && <>{boost.rarity}*</>}
				</Button>
			)}
			on='click'
			open={showPopup}
			onOpen={() => setShowPopup(true)}
			onClose={() => setShowPopup(false)}
			position='top center'
		>
			<Popup.Header>
				Select a boost level
				<img
					src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
					style={{ height: '2em', float: 'right' }}
					className='invertibleIcon'
				/>
				<div style={{ marginTop: '.5em', fontSize: '1rem', fontWeight: 'normal' }}>
					{impact === 'now' && <>Using a boost here will improve the odds of winning this contest.</>}
					{impact === 'future' && <>Using a boost here will improve the odds of winning later contests with this skill.</>}
				</div>
			</Popup.Header>
			<Popup.Content>
				<Button.Group>
					<Button
						title='No boost'
						icon='ban'
						onClick={() => {
							if (boost?.skill === skill) editBoost(undefined);
							setShowPopup(false);
						}}
					/>
					{options.map(option => (
						<Button
							key={option.key}
							title={option.text}
							onClick={() => editBoost({ skill, rarity: option.value as number })}
							color={boost?.skill === skill && boost?.rarity === option.value ? 'blue' : undefined}
						>
							{option.value}*
						</Button>
					))}
				</Button.Group>
			</Popup.Content>
		</Popup>
	);
};
