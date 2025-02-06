import React from 'react';
import {
	Button,
	Dropdown,
	DropdownItemProps,
	Form,
	Modal,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';

import CONFIG from '../../../CONFIG';

import { IContest, IContestSkill, IEncounter } from '../model';
import { ProficiencyRangeInput } from '../common/rangeinput';

import { getLevelRangeBySkill, getMaxRange, guessEncounterLevel, IEncounterLevel, IRangeParameters } from './leveldata';

const defaultTraitPool: string[] = [
	'casual', 'explorer', 'hero', 'inspiring',
	'investigator', 'marksman', 'playful', 'scoundrel'
];

type EncounterEditorProps = {
	traitPool?: string[];
	encounter?: IEncounter;
};

export const EncounterEditor = (props: EncounterEditorProps) => {
	const { traitPool } = props;

	const [critTraits, setCritTraits] = React.useState<string[]>(props.encounter?.critTraits ?? []);
	const [contests, setContests] = React.useState<IContest[]>(JSON.parse(JSON.stringify(props.encounter?.contests ?? [])));

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	return (
		<Modal
			open={modalIsOpen}
			onOpen={() => setModalIsOpen(true)}
			onClose={() => setModalIsOpen(false)}
			trigger={renderTrigger()}
		>
			<Modal.Header	/* Encounter Editor */>
				Encounter Editor
			</Modal.Header>
			<Modal.Content scrolling>
				{modalIsOpen && renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={() => setModalIsOpen(false)}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		return (
			<Button	/* Edit encounter */
				content='Edit encounter'
				icon='pencil'
			/>
		);
	}

	function renderContent(): JSX.Element {
		return (
			<React.Fragment>
				<Form>
					<Form.Group>
						<ContestCount
							count={contests.length}
							setCount={(count: number) => setCount(count)}
						/>
						<CritTraitsInput
							traitPool={traitPool ?? defaultTraitPool}
							traits={critTraits}
							setTraits={(traits: string[]) => setCritTraits(traits)}
						/>
					</Form.Group>
				</Form>
				{contests.length > 0 && (
					<ContestsTable
						contests={contests}
						setContests={setContests}
					/>
				)}
			</React.Fragment>
		);
	}

	function setCount(updatedCount: number): void {
		const level: IEncounterLevel = guessEncounterLevel(updatedCount);
		const updatedContests: IContest[] = [];
		// Reuse existing contest skills, if already defined; otherwise default to command_skill
		for (let contestIndex = 0; contestIndex < Math.min(contests.length, updatedCount); contestIndex++) {
			const updatedSkills: IContestSkill[] = [];
			contests[contestIndex].skills.forEach((cs, skillIndex) => {
				const range: IRangeParameters = getLevelRangeBySkill(level, cs.skill);
				updatedSkills.push({
					skill: cs.skill,
					range_min: range.min,
					range_max: getMaxRange(range, contestIndex, skillIndex)
				});
			});
			updatedContests.push({
				skills: updatedSkills
			});
		}
		const range: IRangeParameters = getLevelRangeBySkill(level, 'command_skill');
		for (let contestIndex = contests.length; contestIndex < updatedCount; contestIndex++) {
			updatedContests.push({
				skills: [{
					skill: 'command_skill',
					range_min: range.min,
					range_max: getMaxRange(range, contestIndex, 0)
				}]
			});
		}
		setContests(updatedContests);
	}
};

type ContestCountProps = {
	count: number;
	setCount: (count: number) => void;
};

const ContestCount = (props: ContestCountProps) => {
	const { count, setCount } = props;

	const countOptions: DropdownItemProps[] = [];
	for (let i = 3; i <= 6; i++) {
		countOptions.push({ key: i, value: i, text: i });
	}

	return (
		<Form.Field	/* Number of contests: */
			label='Number of contests:'
			control={Dropdown}
			placeholder='Select number of contests'	/* Select number of contests */
			selection
			options={countOptions}
			value={count}
			onChange={(e, { value }) => setCount(value as number)}
		/>
	);
};


type CritTraitsInputProps = {
	traitPool: string[];
	traits: string[];
	setTraits: (traits: string[]) => void;
};

const CritTraitsInput = (props: CritTraitsInputProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { traitPool, traits, setTraits } = props;

	const traitOptions: DropdownItemProps[] = traitPool.map(trait => {
		return {
			key: trait,
			value: trait,
			text: TRAIT_NAMES[trait]
		};
	}).sort((a, b) => a.text.localeCompare(b.text));

	return (
		<Form.Field	/* Crit traits: */
			label='Crit traits:'
			control={Dropdown}
			placeholder='Select up to 3 traits'	/* Select up to 3 traits */
			clearable
			multiple
			selection
			options={traitOptions}
			value={traits}
			onChange={(e, { value }) => validateTraits(value as string[])}
			closeOnChange={traits.length === 2}
		/>
	);

	function validateTraits(traits: string[]): void {
		if (traits.length > 3) return;
		setTraits(traits);
	}
};

type ContestsTableProps = {
	contests: IContest[];
	setContests: (contests: IContest[]) => void;
};

const ContestsTable = (props: ContestsTableProps) => {
	const { contests, setContests } = props;

	const encounterLevel = React.useMemo<IEncounterLevel>(() => {
		return guessEncounterLevel(contests.length, contests[0].skills[0]);
	}, [contests]);

	return (
		<Table selectable striped>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell	/* Contest */
						width={2}
						textAlign='center'
					>
						Contest
					</Table.HeaderCell>
					<Table.HeaderCell	/* Skill 1 */
						width={3}
						textAlign='center'
					>
						Skill 1
					</Table.HeaderCell>
					<Table.HeaderCell	/* Range */
						width={4}
						textAlign='center'
					>
						Range
					</Table.HeaderCell>
					<Table.HeaderCell	/* Skill 2 */
						width={3}
						textAlign='center'
					>
						Skill 2
					</Table.HeaderCell>
					<Table.HeaderCell	/* Range */
						width={4}
						textAlign='center'
					>
						Range
					</Table.HeaderCell>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{contests.map((contest, idx) => (
					<Table.Row key={idx}>
						<Table.Cell textAlign='center'>
							{idx+1}/{contests.length}
						</Table.Cell>
						<ContestSkills
							encounterLevel={encounterLevel}
							contestIndex={idx}
							contestSkills={contest.skills}
							onChange={(contestSkills: IContestSkill[]) => editSkills(idx, contestSkills)}
						/>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);

	function editSkills(contestIndex: number, contestSkills: IContestSkill[]): void {
		contests[contestIndex] = { skills: contestSkills };
		if (contestIndex === 0) {
			const updatedLevel: IEncounterLevel = guessEncounterLevel(contests.length, contests[0].skills[0]);
			if (updatedLevel.level !== encounterLevel.level) {
				contests.forEach((contest, contestIndex) => {
					contest.skills.forEach((skill, skillIndex) => {
						const range: IRangeParameters = getLevelRangeBySkill(updatedLevel, skill.skill);
						skill.range_min = range.min;
						skill.range_max = getMaxRange(range, contestIndex, skillIndex);
					});
				});
			}
		}
		setContests([...contests]);
	}
};

type ContestSkillsProps = {
	encounterLevel: IEncounterLevel;
	contestIndex: number;
	contestSkills: IContestSkill[];
	onChange: (contestSkills: IContestSkill[]) => void;
};

const ContestSkills = (props: ContestSkillsProps) => {
	const { encounterLevel, contestIndex, contestSkills, onChange } = props;

	const [skillA, setSkillA] = React.useState<IContestSkill>(contestSkills[0]);
	const [skillB, setSkillB] = React.useState<IContestSkill | undefined>(contestSkills.length > 1 ? contestSkills[1] : undefined);

	React.useEffect(() => {
		setSkillA(contestSkills[0]);
		if (contestSkills.length > 1) setSkillB(contestSkills[1]);
	}, [contestSkills]);

	React.useEffect(() => {
		const updatedSkills: IContestSkill[] = [skillA];
		if (skillB) updatedSkills.push(skillB);
		onChange(updatedSkills);
	}, [skillA, skillB]);

	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
				<SkillInput
					skill={skillA.skill}
					onChange={(skill: string) => editSkill(0, skill)}
					required
				/>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<ProficiencyRangeInput
					contestSkill={skillA}
					onChange={(contestSkill: IContestSkill) => setSkillA({...contestSkill})}
				/>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<SkillInput
					skill={skillB?.skill ?? ''}
					onChange={(skill: string) => editSkill(1, skill)}
				/>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{skillB && (
					<ProficiencyRangeInput
						contestSkill={skillB}
						onChange={(contestSkill: IContestSkill) => setSkillB({...contestSkill})}
					/>
				)}
			</Table.Cell>
		</React.Fragment>
	);

	function editSkill(skillIndex: number, skill: string): void {
		if (skillIndex === 1 && skill === '') {
			setSkillB(undefined);
			return;
		}
		const range: IRangeParameters = getLevelRangeBySkill(encounterLevel, skill);
		const setSkill = skillIndex === 0 ? setSkillA : setSkillB;
		setSkill({
			skill,
			range_min: range.min,
			range_max: getMaxRange(range, contestIndex, skillIndex)
		});
	}
};

type SkillInputProps = {
	skill: string;
	onChange: (skill: string) => void;
	required?: boolean;
};

const SkillInput = (props: SkillInputProps) => {
	const { skill, onChange, required } = props;

	const skillOptions: DropdownItemProps[] = CONFIG.SKILLS_SHORT.map(short => {
		return ({
			key: short.name,
			value: short.name,
			text: short.short
		});
	}).sort((a, b) => a.text.localeCompare(b.text));

	if (!required) {
		skillOptions.unshift(
			{	/* (No skill) */
				key: 'none',
				value: '',
				text: '(No skill)'
			}
		);
	}

	return (
		<Dropdown	/* Select a skill */
			placeholder='Select a skill'
			options={skillOptions}
			value={skill}
			onChange={(e, { value }) => onChange(value as string)}
			selection
			clearable={!required}
			fluid
		/>
	);
};
