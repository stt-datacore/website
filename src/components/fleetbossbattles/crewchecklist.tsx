import React from 'react';
import {
	Button,
	Dropdown,
	DropdownItemProps,
	Form,
	Icon,
	Image,
	Input,
	Label,
	Message,
	Popup,
	Rating,
	Segment
} from 'semantic-ui-react';

import { BossCrew, Optimizer, ViableCombo } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';

import { IDataGridSetup, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import { SolverContext, UserContext } from './context'

interface IPickerFilters {
	availability: string;
	potential: string;
};

const defaultFilters: IPickerFilters = {
	availability: '',
	potential: 'solution'
};

type CrewChecklistProps = {
	optimizer: Optimizer;
	attemptedCrew: string[];
	updateAttempts: (crewSymbols: string[]) => void;
};

const CrewChecklist = (props: CrewChecklistProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { bossCrew } = React.useContext(UserContext);
	const { bossBattle } = React.useContext(SolverContext);
	const { optimizer, attemptedCrew, updateAttempts } = props;

	const [filters, setFilters] = React.useState<IPickerFilters>(defaultFilters);
	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	const selectedIds = React.useMemo<Set<number>>(() => {
		const attemptedIds: number[] = bossCrew.filter(crew => attemptedCrew.includes(crew.symbol)).map(crew => crew.id);
		return new Set<number>([...attemptedIds]);
	}, [attemptedCrew]);

	const filteredIds = React.useMemo<Set<number>>(() => {
		const filteredIds: Set<number> = new Set<number>();
		bossCrew.forEach(crew => {
			const canShowCrew: boolean =
				crewMatchesPotentialFilter(crew, filters.potential)
					&& crewMatchesAvailabilityFilter(crew, filters.availability);
			if (!canShowCrew) filteredIds.add(crew.id);
		});
		return filteredIds;
	}, [bossCrew, optimizer, filters]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: renderGridCrew
	};

	return (
		<React.Fragment>
			<Message	/* Keep track of crew who have been tried for this combo chain. */
				onDismiss={() => updateAttempts([])}
				attached
			>
				{t('fbb.attempted.title')}
			</Message>
			<Segment attached='bottom'>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
					{renderAttempts()}
					<Input	/* Search for crew by name */
						iconPosition='left'
						placeholder={t('crew_picker.search_by_name')}
						onClick={() => setModalIsOpen(true)}
					>
						<input />
						<Icon name='search' />
					</Input>
				</div>
			</Segment>
			{attemptedCrew.length > 0 && (
				<Popup
					content={t('clipboard.copied_exclaim')}
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content={t('fbb.attempted.clipboard')} onClick={() => copyFull()} />
					}
				/>
			)}
			{modalIsOpen && (
				<DataPicker	/* Search for crew by name */
					id={`fbb/${bossBattle.id}/crewchecklist/datapicker`}
					data={bossCrew}
					closePicker={handleSelectedIds}
					preSelectedIds={selectedIds}
					selection
					preFilteredIds={filteredIds}
					search
					searchPlaceholder={t('crew_picker.search_by_name')}
					renderOptions={renderOptions}
					gridSetup={gridSetup}
				/>
			)}
		</React.Fragment>
	);

	function renderAttempts(): JSX.Element {
		return (
			<React.Fragment>
				{Array.from(selectedIds).map(selectedId => {
					const crew: BossCrew | undefined = bossCrew.find(crew => crew.id === selectedId);
					if (!crew) return <></>;
					return (
						<Label key={crew.id} style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center' }}>
							<Image spaced='right' src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							{crew.name}
							<Icon name='delete' onClick={() => cancelAttempt(crew.symbol)} />
						</Label>
					);
				})}
			</React.Fragment>
		);
	}

	function crewMatchesPotentialFilter(crew: BossCrew, filter: string): boolean {
		if (filter === '') return true;
		const resolvedCrew: BossCrew | undefined = optimizer.crew.find(oc => oc.id === crew.id);
		if (!resolvedCrew) return false;
		return (filter === 'solution' || isCrewOptimal(resolvedCrew, optimizer.optimalCombos));
	}

	function isCrewOptimal(crew: BossCrew, optimalCombos: ViableCombo[]): boolean {
		let isOptimal: boolean = false;
		Object.values(crew.node_matches).forEach(node => {
			if (optimalCombos.find(optimal =>
					optimal.nodes.includes(node.index) &&
					node.traits.length === optimal.traits.length &&
					optimal.traits.every(trait => node.traits.includes(trait))
				))
				isOptimal = true;
		});
		return isOptimal;
	}

	function crewMatchesAvailabilityFilter(crew: BossCrew, filter: string): boolean {
		return (filter === '' || (crew.highest_owned_rarity > 0 && (filter === 'owned' || !crew.only_frozen)));
	}

	function renderOptions(): JSX.Element {
		return (
			<CrewPickerOptions
				filters={filters}
				setFilters={setFilters}
			/>
		);
	}

	function renderGridCrew(datum: IEssentialData, isSelected: boolean): JSX.Element {
		const crew: BossCrew = datum as BossCrew;
		return (
			<React.Fragment>
				<Image>
					<div style={{ opacity: isSelected ? .5 : 1 }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} width='72px' height='72px' />
					</div>
					{isSelected && (
						<Label corner='right' color='red' icon='x' />
					)}
				</Image>
				<div>
					{crew.only_frozen && <Icon name='snowflake' />}
					{crew.name}
				</div>
				<div><Rating defaultRating={crew.highest_owned_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled /></div>
			</React.Fragment>
		);
	}

	function handleSelectedIds(selectedIds: Set<number>): void {
		const attemptedCrew: string[] = [];
		[...selectedIds].forEach(selectedId => {
			const crew: BossCrew | undefined = bossCrew.find(crew => crew.id === selectedId);
			if (crew) attemptedCrew.push(crew.symbol);
		});
		updateAttempts(attemptedCrew);
		setModalIsOpen(false);
	}

	function cancelAttempt(crewSymbol: string): void {
		updateAttempts([...attemptedCrew.filter(crew => crew !== crewSymbol)]);
	}

	function copyFull(): void {
		const str = "Attempted: " + attemptedCrew.map(symbol => bossCrew.find(c => c.symbol === symbol)?.name ?? '').join(', ');
		if (navigator.clipboard) {
			navigator.clipboard.writeText(str);
		}
	}
};

type CrewPickerOptionsProps = {
	filters: IPickerFilters;
	setFilters: (filters: IPickerFilters) => void;
};

const CrewPickerOptions = (props: CrewPickerOptionsProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { userType } = React.useContext(UserContext);
	const { filters, setFilters } = props;

	const potentialOptions: DropdownItemProps[] = [
		{	/* Show all crew */
			key: 'all',
			text: t('base.all_crew'),
			value: ''
		},
		{	/* Only show potential solutions */
			key: 'solution',
			text: 'Only show potential solutions',
			value: 'solution'
		},
		{	/* Only show optimal crew */
			key: 'optimal',
			text: 'Only show optimal crew',
			value: 'optimal'
		}
	];

	const availabilityOptions: DropdownItemProps[] = [
		{	/* Show all crew */
			key: 'all',
			text: t('base.all_crew'),
			value: ''
		},
		{	/* Only show owned crew */
			key: 'owned',
			text: t('crew_ownership.owned'),
			value: 'owned'
		},
		{	/* Only show unfrozen crew */
			key: 'thawed',
			text: t('options.crew_status.thawed'),
			value: 'thawed'
		}
	];

	return (
		<Form>
			<Form.Group widths='equal'>
				<Form.Field	/* Filter by potential */
					placeholder='Filter by potential'
					control={Dropdown}
					clearable
					selection
					options={potentialOptions}
					value={filters.potential}
					onChange={(e, { value }) => setFilters({...filters, potential: value})}
				/>
				{userType === 'player' && (
					<Form.Field
						placeholder={t('hints.filter_by_availability')}
						control={Dropdown}
						clearable
						selection
						options={availabilityOptions}
						value={filters.availability}
						onChange={(e, { value }) => setFilters({...filters, availability: value})}
					/>
				)}
			</Form.Group>
		</Form>
	);
};

export default CrewChecklist;
