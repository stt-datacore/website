import React from 'react';
import {
	Button,
	Form,
	Icon,
	Image,
	Label,
	Rating
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';

import { RarityFilter } from '../../crewtables/commonoptions';
import { IDataGridSetup, IDataPickerState, IEssentialData } from '../../dataset_presenters/model';
import { DataPicker, DataPickerLoading } from '../../dataset_presenters/datapicker';
import { AvailabilityCrewFilter } from '../../dataset_presenters/options/availabilitycrewfilter';
import { EventCrewFilter } from '../../dataset_presenters/options/eventcrewfilter';
import { QuippedCrewFilter } from '../../dataset_presenters/options/quippedcrewfilter';
import { SkillToggler } from '../../dataset_presenters/options/skilltoggler';

import { TailorContext } from '../context';

import { IPickerFilters, IPreset } from './model';

export const defaultFilters: IPickerFilters = {
	availability: '',
	event: '',
	quipped: '',
	rarity: [],
	skills: []
};

type CrewExcluderPickerProps = {
	filters: IPickerFilters;
	setFilters: (filters: IPickerFilters) => void;
	presets: IPreset[];
	crewMatchesFilters: (crew: PlayerCrew, filters: IPickerFilters) => boolean;
	dismissModal: () => void;
};

export const CrewExcluderPicker = (props: CrewExcluderPickerProps) => {
	const tailorContext = React.useContext(TailorContext);
	const { rosterCrew, excludedCrewIds, setExcludedCrewIds } = tailorContext;
	const { filters, setFilters, presets, crewMatchesFilters, dismissModal } = props;

	const [data, setData] = React.useState<PlayerCrew[] | undefined>(undefined);

	React.useEffect(() => {
		const data: PlayerCrew[] = JSON.parse(JSON.stringify(rosterCrew));
		setData([...data]);
	}, [rosterCrew]);

	const filteredIds = React.useMemo<Set<number>>(() => {
		const filteredIds: Set<number> = new Set<number>();
		data?.forEach(crew => {
			const canShowCrew: boolean = crewMatchesFilters(crew, filters);
			if (!canShowCrew) filteredIds.add(crew.id);
		});
		return filteredIds;
	}, [data, filters]);

	if (!data) return <DataPickerLoading />;

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData, isExcluded: boolean) => renderGridCrew(datum as PlayerCrew, isExcluded)
	};

	return (
		<DataPicker	/* Search for crew to exclude by name */
			id='crewexcluder'
			data={data}
			closePicker={handleSelectedIds}
			selection
			preFilteredIds={filteredIds}
			preSelectedIds={excludedCrewIds}
			search
			searchPlaceholder='Search for crew to exclude by name'
			renderOptions={renderOptions}
			renderPreface={renderPreface}
			renderActions={renderActions}
			gridSetup={gridSetup}
		/>
	);

	function handleSelectedIds(selectedIds: Set<number>): void {
		setExcludedCrewIds(selectedIds);
		dismissModal();
	}

	function renderOptions(): JSX.Element {
		return (
			<CrewExcluderOptions
				filters={filters}
				setFilters={setFilters}
			/>
		);
	}

	function renderPreface(state: IDataPickerState): JSX.Element {
		if (state.data.length === 0) return <></>;
		return (
			<React.Fragment>
				Crew who will be excluded from consideration are marked <Icon name='ban' fitted />. Tap a crew to toggle. You can select multiple crew.
				{` `}
				{state.data.length > 1 && <>Double-tap to exclude an individual crew more quickly.</>}
				{state.data.length === 1 && <>Double-tap or press enter to exclude an individual crew more quickly.</>}
			</React.Fragment>
		);
	}

	function renderActions(state: IDataPickerState): JSX.Element {
		return (
			<React.Fragment>
				{data && state.data.length === data.length && state.pendingSelectedIds.size > 0 && (
					<Button	/* Clear all exclusions */
						content='Clear all exclusions'
						onClick={() => state.setPendingSelectedIds(new Set<number>())}
					/>
				)}
				{state.data.length > 0 && (
					<Button	/* Toggle all shown */
						content='Toggle all shown'
						onClick={() => toggleVisible(state)}
					/>
				)}
				<Button onClick={() => handleSelectedIds(state.pendingSelectedIds)}>
					Close
				</Button>
			</React.Fragment>
		);
	}

	function renderGridCrew(crew: PlayerCrew, isExcluded: boolean): JSX.Element {
		return (
			<React.Fragment>
				<Image>
					<div style={{ opacity: isExcluded ? .5 : 1 }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} width='72px' height='72px' />
					</div>
					{isExcluded && (
						<Label corner='right' color='red' icon='ban' />
					)}
				</Image>
				<div>{crew.name}</div>
				<div><Rating defaultRating={crew.rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled /></div>
				<div>
					{presets.filter(preset => preset.crewIds.has(crew.id)).map(preset => (
						<Label key={preset.id}>
							<Icon name={preset.icon} /> {preset.short}
						</Label>
					))}
				</div>
			</React.Fragment>
		);
	}

	function toggleVisible(state: IDataPickerState): void {
		const shownIds: Set<number> = new Set<number>(state.data.map(datum => datum.id));
		const allSelected: boolean = [...shownIds].every(crewId => state.pendingSelectedIds.has(crewId));
		const updatedIds: Set<number> = allSelected
			? state.pendingSelectedIds.difference(shownIds)
			: state.pendingSelectedIds.union(shownIds);
		state.setPendingSelectedIds(updatedIds);
	}
};

type CrewExcluderOptionsProps = {
	filters: IPickerFilters;
	setFilters: (filters: IPickerFilters) => void;
};

const CrewExcluderOptions = (props: CrewExcluderOptionsProps) => {
	const tailorContext = React.useContext(TailorContext);
	const { filters, setFilters } = props;

	return (
		<Form>
			<Form.Group widths='equal'>
				<AvailabilityCrewFilter
					value={filters.availability}
					setValue={(value: string) => setFilters({...filters, availability: value})}
					rosterCrew={tailorContext.rosterCrew}
				/>
				<EventCrewFilter
					value={filters.event}
					setValue={(value: string) => setFilters({...filters, event: value})}
					events={tailorContext.events}
				/>
				<QuippedCrewFilter
					value={filters.quipped}
					setValue={(value: string) => setFilters({...filters, quipped: value})}
				/>
			</Form.Group>
			<Form.Group widths='equal'>
				<RarityFilter
					rarityFilter={filters.rarity}
					setRarityFilter={(value: number[]) => setFilters({...filters, rarity: value})}
				/>
				<SkillToggler
					value={filters.skills}
					setValue={(value: string[]) => setFilters({...filters, skills: value})}
				/>
			</Form.Group>
			<Form.Group style={{ justifyContent: 'flex-end', marginBottom: '0' }}>
				<Form.Field>
					<Button	/* Reset */
						content='Reset'
						onClick={() => setFilters({...defaultFilters})}
					/>
				</Form.Field>
			</Form.Group>
		</Form>
	);
};
