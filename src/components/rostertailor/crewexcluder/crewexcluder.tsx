import React from 'react';
import {
	Button,
	Checkbox,
	Dropdown,
	Form,
	Grid,
	Icon,
	Image,
	Input,
	Label,
	Message,
	Segment
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';

import { crewMatchesAvailabilityFilter } from '../../dataset_presenters/options/availabilitycrewfilter';
import { crewMatchesEventFilter } from '../../dataset_presenters/options/eventcrewfilter';
import { crewMatchesQuippedFilter } from '../../dataset_presenters/options/quippedcrewfilter';
import { QuipmentPopover } from '../../voyagecalculator/quipment/quipmentpopover';

import { TailorContext } from '../context';

import { IPickerFilters, IPreset } from './model';
import { CrewExcluderPicker, defaultFilters } from './crewpicker';

export const CrewExcluder = () => {
	const tailorContext = React.useContext(TailorContext);
	const { rosterCrew, events, excludedCrewIds, setExcludedCrewIds } = tailorContext;

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	const [presetsEnabled, setPresetsEnabled] = React.useState<string[]>([]);
	const [manualCrewIds, setManualCrewIds] = React.useState<Set<number>>(new Set<number>());

	const [filters, setFilters] = React.useState<IPickerFilters>(defaultFilters);

	const defaultPresets = React.useMemo<IPreset[]>(() => {
		const presets: IPreset[] = [
			{	/* Frozen crew */
				id: 'frozen',
				title: 'Frozen crew',
				short: 'Frozen',
				icon: 'snowflake',
				filters: {...defaultFilters, availability: 'is:frozen'},
				crewIds: new Set<number>()
			},
			{	/* Crew on running shuttles */
				id: 'shuttlers',
				title: 'Crew on running shuttles',
				short: 'Shuttle',
				icon: 'space shuttle',
				filters: {...defaultFilters, availability: 'is:shuttler'},
				crewIds: new Set<number>(),
			},
			{	/* Crew on running voyages */
				id: 'voyagers',
				title: 'Crew on running voyages',
				short: 'Voyage',
				icon: 'space shuttle',
				filters: {...defaultFilters, availability: 'is:voyager'},
				crewIds: new Set<number>(),
			},
			{	/* Quipped crew */
				id: 'quipped',
				title: 'Quipped crew',
				short: 'Quipped',
				icon: 'boxes',
				filters: {...defaultFilters, quipped: 'is:quipped'},
				crewIds: new Set<number>()
			}
		];
		events.forEach(eventData => {
			console.log(eventData);
			presets.push(
				{	/* "EVENT_NAME" event crew */
					id: eventData.symbol,
					title: `"${eventData.name}" event crew`,
					short: eventData.name,
					icon: 'trophy',
					filters: {...defaultFilters, event: `${eventData.symbol},is:bonus`},
					crewIds: new Set<number>(),
					subsets: [
						{	/* Event crew */
							id: `${eventData.symbol},is:bonus`,
							title: 'Event crew',
							filters: {...defaultFilters, event: `${eventData.symbol},is:bonus`}
						},
						{	/* Featured crew */
							id: `${eventData.symbol},is:featured`,
							title: 'Featured crew',
							filters: {...defaultFilters, event: `${eventData.symbol},is:featured`}
						},
						{	/* My best crew for event */
							id: `${eventData.symbol},is:best`,
							title: 'My best crew for event',
							filters: {...defaultFilters, event: `${eventData.symbol},is:best`}
						}
					]
				}
			);
		});
		return presets;
	}, [events]);

	const presets = React.useMemo<IPreset[]>(() => {
		const presets: IPreset[] = JSON.parse(JSON.stringify(defaultPresets));
		// Populate preset crewIds
		presets.forEach(preset => {
			preset.crewIds = new Set<number>([
				...rosterCrew.filter(crew =>
					crewMatchesFilters(crew, preset.filters)
				).map(crew => crew.id)
			])
		});
		return presets;
	}, [defaultPresets, rosterCrew]);

	React.useEffect(() => {
		const presetsEnabled: string[] = getEnabledPresets(presets, excludedCrewIds);
		setPresetsEnabled([...presetsEnabled]);

		let presetCrewIds: Set<number> = new Set<number>();
		presetsEnabled.forEach(presetId => {
			const preset: IPreset | undefined = presets.find(preset => preset.id === presetId);
			if (preset) presetCrewIds = presetCrewIds.union(preset.crewIds);
		});
		const updatedManualCrewIds: Set<number> = excludedCrewIds.difference(presetCrewIds);
		setManualCrewIds(updatedManualCrewIds);
	}, [presets, excludedCrewIds]);

	return (
		<React.Fragment>
			<Message attached>
				The following will be excluded from consideration:
			</Message>
			<Segment attached='bottom'>
				<Grid columns={2} stackable>
					<Grid.Column>
						{renderPresetToggles()}
					</Grid.Column>
					<Grid.Column>
						{manualCrewIds.size > 0 && (
							<React.Fragment>
								<Segment attached='bottom' style={{ maxHeight: '15em', overflowX: 'hidden', overflowY: 'auto' }}>
									<Label as='a' corner='right' onClick={() => deExcludeAll()}>
										<Icon name='x' style={{ cursor: 'pointer' }} />
									</Label>
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
										{renderManualCancels()}
									</div>
								</Segment>
							</React.Fragment>
						)}
						{renderPickerTrigger()}
					</Grid.Column>
				</Grid>
			</Segment>
			{modalIsOpen && (
				<CrewExcluderPicker
					filters={filters}
					setFilters={setFilters}
					presets={presets}
					crewMatchesFilters={crewMatchesFilters}
					dismissModal={() => setModalIsOpen(false)}
				/>
			)}
		</React.Fragment>
	);

	function renderPickerTrigger(): JSX.Element {
		return (
			<Input	/* Search for crew to exclude */
				iconPosition='left'
				placeholder='Search for crew to exclude'
				onClick={() => openPicker(defaultFilters)}
				fluid
			>
				<input />
				<Icon name='search' />
			</Input>
		);
	}

	function renderPresetToggles(): JSX.Element {
		return (
			<Form>
				<Form.Group grouped>
					{presets.filter(preset => preset.crewIds.size > 0).map(preset => (
						<Form.Field key={preset.id}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', columnGap: '1em' }}>
								<Checkbox
									label={preset.title}
									checked={presetsEnabled.includes(preset.id)}
									onChange={() => togglePreset(preset.id)}
								/>
								{preset.subsets && (
									<Dropdown button compact text='View'>
										<Dropdown.Menu>
											{preset.subsets.map(subset => (
												<Dropdown.Item key={subset.id}
													text={subset.title}
													onClick={() => openPicker(subset.filters)}
												/>
											))}
										</Dropdown.Menu>
									</Dropdown>
								)}
								{!preset.subsets && (
									<Button
										content='View all'
										onClick={() => openPicker(preset.filters)}
										compact
									/>
								)}
							</div>
						</Form.Field>
					))}
				</Form.Group>
			</Form>
		);
	}

	function openPicker(filters: IPickerFilters): void {
		if (filters.availability === '' && presetsEnabled.includes('frozen'))
			filters = {...filters, availability: 'not:frozen'};
		setFilters(filters);
		setModalIsOpen(true);
	}

	function renderManualCancels(): JSX.Element {
		return (
			<React.Fragment>
				{Array.from(manualCrewIds).map(crewId => {
					const crew: PlayerCrew | undefined = tailorContext.rosterCrew.find(crew => crew.id === crewId);
					if (!crew) return <></>;
					return (
						<Label key={crew.id} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center' }}>
							<Image spaced='right' src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							{crew.kwipment?.some(q => q || q[1]) &&
								<QuipmentPopover ignoreProspects={true} crew={crew} showQuipment={true} />
							}
							{crew.name}
							<Icon name='delete' onClick={() => deExcludeCrew(crew.id)} />
						</Label>
					);
				})}
			</React.Fragment>
		);
	}

	function getEnabledPresets(presets: IPreset[], excludedCrewIds: Set<number>): string[] {
		const presetsEnabled: string[] = [];
		presets.forEach(preset => {
			if (preset.crewIds.size > 0 && [...preset.crewIds].every(crewId => excludedCrewIds.has(crewId)))
				presetsEnabled.push(preset.id);
		});
		return presetsEnabled;
	}

	function togglePreset(toggledPresetId: string): void {
		let newPresetsEnabled: string[] = [];
		let newCrewIdsToExclude: Set<number> = new Set<number>(excludedCrewIds);
		// Toggle OFF: de-exclude preset crew from current exclusions
		if (presetsEnabled.includes(toggledPresetId)) {
			newPresetsEnabled = presetsEnabled.filter(preset => preset !== toggledPresetId);
			const preset: IPreset | undefined = presets.find(preset => preset.id === toggledPresetId);
			newCrewIdsToExclude = newCrewIdsToExclude.difference(preset?.crewIds ?? new Set<number>());
		}
		// Toggle ON: queue preset for exclusion
		else {
			newPresetsEnabled = [...presetsEnabled, toggledPresetId];
		}
		newPresetsEnabled.forEach(presetId => {
			const preset: IPreset | undefined = presets.find(preset => preset.id === presetId);
			if (preset) newCrewIdsToExclude = newCrewIdsToExclude.union(preset.crewIds);
		});
		setExcludedCrewIds(newCrewIdsToExclude);
	}

	function deExcludeAll(): void {
		Array.from(manualCrewIds).forEach(crewId => {
			excludedCrewIds.delete(crewId);
		});
		setExcludedCrewIds(new Set<number>(excludedCrewIds));
	}

	function deExcludeCrew(crewId: number): void {
		excludedCrewIds.delete(crewId);
		setExcludedCrewIds(new Set<number>(excludedCrewIds));
	}

	function crewMatchesFilters(crew: PlayerCrew, filters: IPickerFilters): boolean {
		return (filters.rarity.length === 0 || filters.rarity.includes(crew.max_rarity))
			&& (filters.skills.length === 0 || filters.skills.every(skill => Object.keys(crew.skills).includes(skill)))
			&& (crewMatchesAvailabilityFilter(crew, filters.availability))
			&& (crewMatchesEventFilter(crew, filters.event, tailorContext.events))
			&& (crewMatchesQuippedFilter(crew, filters.quipped));
	}
};
