import React from 'react';
import {
	Button,
	Dropdown,
	DropdownItemProps,
	Form,
	Icon
} from 'semantic-ui-react';

import { Skill } from '../../../model/crew';
import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { useStateWithStorage } from '../../../utils/storage';

import CONFIG from '../../CONFIG';
import { RarityFilter } from '../../crewtables/commonoptions';
import { IDataGridSetup, IDataTableColumn, IDataTableSetup, IEssentialData } from '../../dataset_presenters/model';
import { DataPicker, DataPickerLoading } from '../../dataset_presenters/datapicker';
import { CrewLabel } from '../../dataset_presenters/elements/crewlabel';
import { CrewPortrait } from '../../dataset_presenters/elements/crewportrait';
import { crewMatchesEventFilter, EventCrewFilter } from '../../dataset_presenters/options/eventcrewfilter';
import { crewMatchesQuippedFilter, QuippedCrewFilter } from '../../dataset_presenters/options/quippedcrewfilter';
import { crewMatchesSkillFilter, SkillToggler } from '../../dataset_presenters/options/skilltoggler';

import { CalculatorContext } from '../context';

import { EditorContext } from './context';

interface IAlternateCrewData extends PlayerCrew {
	assigned_slot: number;
	status: number;
	voyage_total: number;
	scored_command_skill: number;
	scored_diplomacy_skill: number;
	scored_engineering_skill: number;
	scored_medicine_skill: number;
	scored_science_skill: number;
	scored_security_skill: number;
};

interface IPickerFilters {
	availability: string;
	event: string;
	quipped: string;
	rarity: number[];
	skills: string[];
};

const defaultFilters: IPickerFilters = {
	availability: '',
	event: '',
	quipped: '',
	rarity: [],
	skills: []
};

type AlternateCrewPickerProps = {
	setAlternate: (alternateCrew: PlayerCrew) => void;
};

export const AlternateCrewPicker = (props: AlternateCrewPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const calculatorContext = React.useContext(CalculatorContext);
	const { id, prospectiveConfig, sortedSkills, renderActions, dismissEditor } = React.useContext(EditorContext);
	const { setAlternate } = props;

	const [filters, setFilters] = useStateWithStorage<IPickerFilters>(`${id}/alternatepicker/filters`, {...defaultFilters});
	const [skillMode, setSkillMode] = useStateWithStorage<'voyage' | 'proficiency'>(`${id}/alternatepicker/skillMode`, 'voyage');

	const [data, setData] = React.useState<IAlternateCrewData[] | undefined>(undefined);

	React.useEffect(() => {
		const assignedCrewIds: number[] = prospectiveConfig.crew_slots.filter(cs => cs.crew).map(cs => cs.crew!.id);
		const data: IAlternateCrewData[] = JSON.parse(JSON.stringify(calculatorContext.crew));
		data.forEach(crew => {
			const assignedSlot: number = assignedCrewIds.indexOf(crew.id);
			crew.assigned_slot = assignedSlot >= 0 ? assignedSlot : 100; // Unassigned crew get a high slot # for sorting purposes

			crew.status = crew.active_status;
			if (crew.immortal > 0) crew.status = 100; // Frozen crew get a high status # for sorting purposes

			let primaryScore: number = 0, secondaryScore: number = 0, otherScore: number = 0;
			Object.keys(CONFIG.SKILLS).forEach(skill => {
				let scoredSkill: number = 0;
				const crewSkill: Skill | undefined = crew.skills[skill];
				if (crewSkill) {
					const proficiency: number = (crewSkill.range_min + crewSkill.range_max) / 2;
					const voyageScore: number = crewSkill.core + proficiency;
					if (skill === calculatorContext.voyageConfig.skills.primary_skill)
						primaryScore = voyageScore;
					else if (skill === calculatorContext.voyageConfig.skills.secondary_skill)
						secondaryScore = voyageScore;
					else
						otherScore += voyageScore;
					if (skillMode === 'voyage')
						scoredSkill = voyageScore;
					else if (skillMode === 'proficiency')
						scoredSkill = crewSkill.range_max;
				}
				crew[`scored_${skill}`] = scoredSkill;
			});
			crew.voyage_total = primaryScore + secondaryScore + otherScore;
		});
		setData([...data]);
	}, [calculatorContext, prospectiveConfig.crew_slots, skillMode]);

	const filteredIds = React.useMemo<Set<number>>(() => {
		const filteredIds: Set<number> = new Set<number>();
		data?.forEach(crew => {
			const canShowCrew: boolean =
				(filters.rarity.length === 0 || filters.rarity.includes(crew.max_rarity))
					&& (crewMatchesSkillFilter(crew, filters.skills))
					&& (crewMatchesAvailabilityFilter(crew, filters.availability))
					&& (crewMatchesEventFilter(crew, filters.event, calculatorContext.events))
					&& (crewMatchesQuippedFilter(crew, filters.quipped));
			if (!canShowCrew) filteredIds.add(crew.id);
		});
		return filteredIds;
	}, [data, filters]);

	if (!data) return <DataPickerLoading />;

	const gridSetup: IDataGridSetup = {
		renderGridColumn: renderGridCrew
	};

	const columns: IDataTableColumn[] = [
		{	/* Prospective voyage seat */
			id: 'slot',
			title: <Icon name='vcard' title='Prospective voyage seat' />,
			align: 'center',
			sortField: { id: 'assigned_slot' },
			renderCell: (datum: IEssentialData) => renderCrewAssignment(datum as IAlternateCrewData)
		},
		{
			id: 'name',
			title: 'Crew',
			sortField: { id: 'name', stringValue: true },
			renderCell: (datum: IEssentialData) => <CrewLabel crew={datum as IAlternateCrewData} />
		},
		{
			id: 'status',
			title: 'Status',
			align: 'center',
			sortField: { id: 'status' },
			renderCell: (datum: IEssentialData) => renderCrewStatus(datum as IAlternateCrewData)
		},
		{
			id: 'voyage',
			title: 'Voyage',
			align: 'center',
			sortField: { id: 'voyage_total', firstSort: 'descending' },
			renderCell: (datum: IEssentialData) => <>{Math.floor((datum as IAlternateCrewData).voyage_total)}</>
		}
	];

	sortedSkills.forEach(skill => {
		columns.push({
			id: skill,
			title: renderSkillHeader(skill),
			align: 'center',
			sortField: {
				id: `scored_${skill}`,
				firstSort: 'descending'
			},
			renderCell: (datum: IEssentialData) => (
				<React.Fragment>
					{datum[`scored_${skill}`] > 0 ? Math.floor(datum[`scored_${skill}`]): ''}
				</React.Fragment>
			)
		});
	});

	const tableSetup: IDataTableSetup = {
		columns,
		rowsPerPage: 12
	};

	return (
		<DataPicker	/* Search for alternate voyage crew by name */
			id={`${id}/alternatepicker/datapicker`}
			data={data}
			closePicker={handleSelectedIds}
			selection
			closeOnChange
			preFilteredIds={filteredIds}
			search
			searchPlaceholder='Search for alternate voyage crew by name'
			renderOptions={renderOptions}
			renderActions={renderActions}
			gridSetup={gridSetup}
			tableSetup={tableSetup}
		/>
	);

	function handleSelectedIds(selectedIds: Set<number>, affirmative: boolean): void {
		if (!affirmative) dismissEditor();
		if (selectedIds.size > 0) {
			const alternateId: number = [...selectedIds][0];
			const alternateCrew: PlayerCrew | undefined = data?.find(datum =>
				datum.id === alternateId
			);
			if (alternateCrew)
				setAlternate(alternateCrew);
		}
	}

	function renderOptions(): JSX.Element {
		return (
			<AlternatePickerOptions
				filters={filters} setFilters={setFilters}
				skillMode={skillMode} setSkillMode={setSkillMode}
			/>
		);
	}

	function renderGridCrew(datum: IEssentialData): JSX.Element {
		return <CrewPortrait crew={datum as IAlternateCrewData} />;
	}

	function renderSkillHeader(skill: string): JSX.Element {
		return (
			<React.Fragment>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
				{calculatorContext.voyageConfig.skills.primary_skill === skill && <Icon name='star' color='yellow' />}
				{calculatorContext.voyageConfig.skills.secondary_skill === skill && <Icon name='star' color='grey' />}
			</React.Fragment>
		);
	}

	function renderCrewAssignment(crew: IAlternateCrewData): JSX.Element {
		if (crew.assigned_slot < 0 || crew.assigned_slot >= 12) return <></>;
		const slottedSkills: string[] = [
			'command_skill', 'diplomacy_skill', 'security_skill',
			'engineering_skill', 'science_skill', 'medicine_skill'
		];
		const skillSlot: number = Math.floor(crew.assigned_slot/2);
		return <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${slottedSkills[skillSlot]}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
	}

	function renderCrewStatus(crew: IAlternateCrewData): JSX.Element {
		if (crew.immortal > 0) {
			return (
				<Icon	/* Unfreeze crew */
					name='snowflake'
					title={t('voyage.crew_finder_hints.unfreeze_crew')}
				/>
			);
		}
		else if (crew.active_status === 2) {
			return (
				<Icon	/* On shuttle */
					name='space shuttle'
					title={t('voyage.crew_finder_hints.on_shuttle')}
				/>
			);
		}
		else if (crew.active_status === 3) {
			return (
				<Icon	/* On voyage */
					name='rocket'
					title={t('voyage.crew_finder_hints.on_voyage')}
				 />
			);
		}
		return <></>;
	}

	function crewMatchesAvailabilityFilter(crew: IAlternateCrewData, availabilityFilter: string): boolean {
		if (availabilityFilter === '') return true;
		if (availabilityFilter === 'not:frozen' && crew.immortal <= 0) return true;
		if (availabilityFilter === 'not:active' && crew.active_status === 0) return true;
		if (availabilityFilter === 'is:idle' && crew.immortal <= 0 && crew.active_status === 0) return true;
		if (availabilityFilter === 'is:prospective' && crew.assigned_slot >= 0 && crew.assigned_slot < 12) return true;
		return false;
	}
};

type AlternatePickerOptionsProps = {
	filters: IPickerFilters;
	setFilters: (filters: IPickerFilters) => void;
	skillMode: 'voyage' | 'proficiency';
	setSkillMode: (skillMode: 'voyage' | 'proficiency') => void;
};

const AlternatePickerOptions = (props: AlternatePickerOptionsProps) => {
	const calculatorContext = React.useContext(CalculatorContext);
	const { filters, setFilters, skillMode, setSkillMode } = props;

	const availabilityOptions: DropdownItemProps = [
		{ key: 'all', value: '', text: 'Show all crew' },	/* Show all crew */
		{ key: 'not:frozen', value: 'not:frozen', text: 'Hide frozen crew' },	/* Hide frozen crew */
		{ key: 'not:active', value: 'not:active', text: 'Hide active crew' },	/* Hide active crew */
		{ key: 'is:idle', value: 'is:idle', text: 'Only show idle crew' },	/* Only show idle crew */
		{ key: 'is:prospective', value: 'is:prospective', text: 'Only show prospective voyagers' }	/* Only show prospective voyagers */
	];

	return (
		<Form>
			<Form.Group widths='equal'>
				<Form.Field	/* Filter by availability */
					placeholder='Filter by availability'
					control={Dropdown}
					selection
					clearable
					options={availabilityOptions}
					value={filters.availability}
					onChange={(e, { value }) => setFilters({...filters, availability: value as string})}
				/>
				<RarityFilter
					rarityFilter={filters.rarity}
					setRarityFilter={(rarityFilter: number[]) => setFilters({...filters, rarity: rarityFilter})}
				/>
				<EventCrewFilter
					value={filters.event}
					setValue={(eventFilter: string) => setFilters({...filters, event: eventFilter})}
					events={calculatorContext.events}
				/>
				<QuippedCrewFilter
					value={filters.quipped}
					setValue={(quippedFilter: string) => setFilters({...filters, quipped: quippedFilter})}
				/>
			</Form.Group>
			<Form.Group widths='equal'>
				<SkillToggler
					value={filters.skills}
					setValue={(skills: string[]) => setFilters({...filters, skills})}
				/>
				<Form.Field	/* Show skill values in table: */
					inline
				>
					<label>Show skill values in table:</label>
					<Button.Group>
						<Button	/* Voyage score */
							content='Voyage score'
							color={skillMode === 'voyage' ? 'blue' : undefined}
							onClick={() => setSkillMode('voyage')}
						/>
						<Button	/* Max proficiency */
							content='Max proficiency'
							color={skillMode === 'proficiency' ? 'blue' : undefined}
							onClick={() => setSkillMode('proficiency')}
						/>
					</Button.Group>
				</Form.Field>
			</Form.Group>
		</Form>
	);
};
