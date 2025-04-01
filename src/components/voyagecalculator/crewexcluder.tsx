import React from 'react';
import { Form, Dropdown, Segment, Message, Button, Label, Image, Icon, DropdownItemProps } from 'semantic-ui-react';

import { IVoyageCrew } from '../../model/voyage';
import { OptionsBase, OptionsModal, OptionGroup, OptionsModalProps, ModalOption } from '../../components/base/optionsmodal_base';

import { CalculatorContext } from './context';
import CrewPicker from '../../components/crewpicker';
import { IEventScoredCrew } from '../eventplanner/model';
import { computeEventBest } from '../../utils/events';
import { GlobalContext } from '../../context/globalcontext';
import { oneCrewCopy } from '../../utils/crewutils';
import CONFIG from '../CONFIG';
import { QuipmentPopover } from './quipment/quipmentpopover';

interface ISelectOption {
	key: string;
	value: string;
	text: string;
};

type CrewExcluderProps = {
	rosterCrew: IVoyageCrew[];
	preExcludedCrew: IVoyageCrew[];
	excludedCrewIds: number[];
	considerFrozen?: boolean;
	updateExclusions: (crewIds: number[]) => void;
};

type SelectedBonusType = '' | 'all' | 'featured' | 'matrix';

export const CrewExcluder = (props: CrewExcluderProps) => {
	const calculatorContext = React.useContext(CalculatorContext);
	const globalContext = React.useContext(GlobalContext);
	const { voyageConfig, events } = calculatorContext;
	const { excludedCrewIds, updateExclusions, considerFrozen } = props;

	const [selectedEvent, setSelectedEvent] = React.useState<string>('');
	const [phase, setPhase] = React.useState<string>('');
	const [selectedBonus, setSelectedBonus] = React.useState<SelectedBonusType>('all');
	const [bestCombos, setBestCombos] = React.useState([] as number[]);

	const excludeQuipped = () => {
		const quipped = props.rosterCrew.filter(f => !excludedCrewIds?.includes(f.id) && f.kwipment?.some(k => typeof k === 'number' ? !!k : !!k[1]))?.map(c => c.id);
		updateExclusions([ ... new Set([...excludedCrewIds, ...quipped])] );
	}

	React.useEffect(() => {
		let activeEvent: string = '';
		let activeBonus: SelectedBonusType = 'all';
		let phase: string = '';
		events.forEach(gameEvent => {
			if (gameEvent && gameEvent.seconds_to_end > 0 && gameEvent.seconds_to_start < 86400) {
				if (gameEvent.content_types.includes('shuttles') || gameEvent.content_types.includes('galaxy') || gameEvent.content_types.includes('gather') || (gameEvent.content_types.includes('voyage') && voyageConfig.voyage_type !== 'encounter')) {
					activeEvent = gameEvent.symbol;

					let date = (new Date((new Date()).toLocaleString('en-US', { timeZone: 'America/New_York' })));
					if (Array.isArray(gameEvent.content_types) && gameEvent.content_types.length === 2) {
						if ((date.getDay() === 6 && date.getHours() >= 12) || date.getDay() <= 1) {
							phase = gameEvent.content_types[1];
						}
						else {
							phase = gameEvent.content_types[0];
						}
					}
					else {
						phase = (gameEvent.content_types as any) as string;
					}
					if (phase === 'gather') {
						activeBonus = 'matrix';
					}
					else if (phase === 'shuttles' || phase === 'galaxy') {
						activeBonus = 'all';
					}
					else if (phase === 'voyage') {
						// Don't auto-exclude event crew if seeking recommendations for active voyage event
						if (voyageConfig.voyage_type === 'encounter') {
							activeEvent = '';
							activeBonus = '';
						}
						else {
							activeBonus = 'all';
						}
					}
					// if (!gameEvent.content_types.includes('shuttles')) activeBonus = 'featured';
				}
			}
		});
		setPhase(phase);
		setSelectedEvent(activeEvent);
		setSelectedBonus(activeBonus);
	}, [events]);

	React.useEffect(() => {
		if (selectedEvent) {
			const activeEvent = events.find(gameEvent => gameEvent.symbol === selectedEvent);
			if (activeEvent) {
				const crewIds = props.rosterCrew.filter(c =>
					(selectedBonus === 'all' && activeEvent.bonus.includes(c.symbol))
					|| (selectedBonus === 'featured' && activeEvent.featured.includes(c.symbol))
					|| (selectedBonus === 'matrix' && bestCombos.includes(c.id))
				).sort((a, b) => a.name.localeCompare(b.name)).map(c => c.id);
				updateExclusions([...new Set([...crewIds])]);
			}
		}
		else {
			updateExclusions([]);
		}
	}, [selectedEvent, selectedBonus, bestCombos]);

	React.useEffect(() => {
		if (selectedEvent && phase) {
			const activeEvent = events.find(gameEvent => gameEvent.symbol === selectedEvent);
			if (activeEvent) {
				const rosterCrew = props.rosterCrew
					.filter(f => !!considerFrozen || (f.id && f.id > 0))
					.filter((c) => activeEvent.bonus.indexOf(c.symbol) >= 0)
					.map(m => (oneCrewCopy(m) as IEventScoredCrew));
				const combos = computeEventBest(rosterCrew, activeEvent, phase, globalContext.player.buffConfig, true, false);
				const crewIds = Object.values(combos).map(cb => cb.id);
				let ftest = globalContext.player.playerData?.player.character.crew.filter(f => crewIds.includes(f.id));
				setBestCombos([...new Set(crewIds)]);
			}
		}
	}, [selectedEvent, selectedBonus, phase, considerFrozen])

	const eventOptions = [] as ISelectOption[];
	events.forEach(gameEvent => {
		if (gameEvent.content_types.includes('shuttles') || gameEvent.content_types.includes('galaxy') || gameEvent.content_types.includes('gather') || gameEvent.content_types.includes('voyage')) {
			if (gameEvent.bonus.length > 0) {
				eventOptions.push({
					key: gameEvent.symbol,
					value: gameEvent.symbol,
					text: gameEvent.name
				});
			}
		}
	});
	if (eventOptions.length > 0) eventOptions.push({ key: 'none', value: '', text: 'Do not exclude event crew' });

	const bonusOptions: ISelectOption[] = [
		{ key: 'all', value: 'all', text: 'All event crew' },
		{ key: 'featured', value: 'featured', text: 'Featured event crew' },

		// { key: 'best', value: 'best', text: 'My best crew for event' }
	];

	const phaseOptions = [
		{ key: 'gather', value: 'gather', text: 'Galaxy' },
		{ key: 'shuttles', value: 'shuttles', text: 'Faction' },
		{ key: 'voyage', value: 'voyage', text: 'Voyage' },
	] as DropdownItemProps[];

	if (selectedEvent) {
		const activeEvent = events.find(gameEvent => gameEvent.symbol === selectedEvent);
		if (activeEvent?.content_types?.includes('gather')) {
			bonusOptions.push({ key: 'matrix', value: 'matrix', text: 'Event skill matrix crew' });
		}
	}

	return (
		<React.Fragment>
			<Message attached onDismiss={excludedCrewIds.length > 0 ? () => { updateExclusions([]); setSelectedEvent(''); } : undefined}>
				<Message.Content>
					<Message.Header>
						Crew to Exclude
					</Message.Header>
					<Form.Group grouped>
						{eventOptions.length > 0 && (
							<Form.Group inline>
								<Form.Field
									label='Exclude crew from the event'
									placeholder='Select event'
									control={Dropdown}
									fluid
									clearable
									selection
									options={eventOptions}
									value={selectedEvent}
									onChange={(e, { value }) => setSelectedEvent(value as string)}
								/>
								{selectedEvent !== '' && (
									<Form.Field
										label='Filter by bonus'
										control={Dropdown}
										fluid
										selection
										options={bonusOptions}
										value={selectedBonus}
										onChange={(e, { value }) => setSelectedBonus(value as SelectedBonusType)}
									/>
								)}
								{selectedEvent !== '' && selectedBonus === 'matrix' && (
									<Form.Field
										label='Phase type'
										control={Dropdown}
										fluid
										selection
										options={phaseOptions}
										value={phase}
										onChange={(e, { value }) => setPhase(value as string)}
									/>
								)}
							</Form.Group>
						)}
						<Form.Field>
							<Button color='blue' onClick={(e) => excludeQuipped()}>Exclude Quipped Crew</Button>
						</Form.Field>
					</Form.Group>
				</Message.Content>
			</Message>
			<Segment attached='bottom'>
				{renderExcludedCrew()}
			</Segment>
		</React.Fragment>
	);

	function renderExcludedCrew(): JSX.Element {
		const visibleExcludedCrew = [] as IVoyageCrew[];
		excludedCrewIds.forEach(crewId => {
			const crew = props.preExcludedCrew.find(crew => crew.id === crewId);
			if (crew) visibleExcludedCrew.push(crew);
		});
		return (
			<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
				{visibleExcludedCrew.map(crew => renderCrewLabel(crew))}
				<CrewExcluderModal
					rosterCrew={props.preExcludedCrew}
					excludedCrewIds={excludedCrewIds}
					updateExclusions={updateExclusions}
				/>
			</div>
		);
	}

	function renderCrewLabel(crew: IVoyageCrew): JSX.Element {
		return (
			<Label key={crew.id} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center' }}>
				<Image spaced='right' src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
				{crew.kwipment?.some(q => q || q[1]) &&
					<QuipmentPopover ignoreProspects={true} crew={crew} showQuipment={true} />
				}
				{crew.name}
				<Icon name='delete' onClick={() => deExcludeCrewId(crew.id)} />
			</Label>
		);
	}

	function deExcludeCrewId(crewId: number): void {
		const index = excludedCrewIds.indexOf(crewId);
		excludedCrewIds.splice(index, 1);
		updateExclusions([...excludedCrewIds]);
	}
};

type CrewExcluderModalProps = {
	rosterCrew: IVoyageCrew[];
	excludedCrewIds: number[];
	updateExclusions: (crewIds: number[]) => void;
};

const CrewExcluderModal = (props: CrewExcluderModalProps) => {
	const { excludedCrewIds } = props;

	const [options, setOptions] = React.useState<IExcluderModalOptions>(DEFAULT_EXCLUDER_OPTIONS);

	const pickerCrewList = props.rosterCrew.sort((a, b) => a.name.localeCompare(b.name));

	return (
		<CrewPicker crewList={pickerCrewList}
			handleSelect={(crew) => onCrewPick(crew as IVoyageCrew)}
			options={options} setOptions={setOptions} defaultOptions={DEFAULT_EXCLUDER_OPTIONS}
			pickerModal={ExcluderOptionsModal} renderTrigger={renderTrigger}
			filterCrew={(data, searchFilter) => filterCrew(data as IVoyageCrew[], searchFilter)}
		/>
	);

	function renderTrigger(): JSX.Element {
		return (
			<Button color='blue'>
				<Icon name='zoom-in' />
				Search for crew to exclude
			</Button>
		);
	}

	function filterCrew(data: IVoyageCrew[], searchFilter: string = ''): IVoyageCrew[]{
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(searchFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
		data = data.filter(crew =>
			true
				&& (options.rarities.length === 0 || options.rarities.includes(crew.max_rarity))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
		);
		return data;
	}

	function onCrewPick(crew: IVoyageCrew): void {
		if (!excludedCrewIds.includes(crew.id)) {
			excludedCrewIds.push(crew.id);
			props.updateExclusions([...excludedCrewIds]);
		}
	}
};

interface IExcluderModalOptions extends OptionsBase {
	rarities: number[];
};

const DEFAULT_EXCLUDER_OPTIONS = {
	rarities: []
} as IExcluderModalOptions;

class ExcluderOptionsModal extends OptionsModal<IExcluderModalOptions> {
	state: { isDefault: boolean; isDirty: boolean; options: any; modalIsOpen: boolean; };
	declare props: any;

	protected getOptionGroups(): OptionGroup[] {
		return [
			{
				title: 'Filter by rarity:',
				key: 'rarities',
				multi: true,
				options: ExcluderOptionsModal.rarityOptions,
				initialValue: [] as number[]
			}]
	}
	protected getDefaultOptions(): IExcluderModalOptions {
		return DEFAULT_EXCLUDER_OPTIONS;
	}

	static readonly rarityOptions = [] as ModalOption[];

	constructor(props: OptionsModalProps<IExcluderModalOptions>) {
		super(props);

		CONFIG.RARITIES.forEach((r, i) => {
			if (i === 0) return;
			ExcluderOptionsModal.rarityOptions.length = 0;
			ExcluderOptionsModal.rarityOptions.push(
				{ key: `${i}*`, value: i, text: `${i}* ${r.name}` }
			)
		});


		this.state = {
			isDefault: false,
			isDirty: false,
			options: props.options,
			modalIsOpen: false
		}
	}

	protected checkState(): boolean {
		const { options } = this.state;

		const isDefault = options.rarities.length === 0;
		const isDirty = options.rarities.length !== this.props.options.rarities.length || !this.props.options.rarities.every(r => options.rarities.includes(r));

		if (this.state.isDefault !== isDefault || this.state.isDirty !== isDirty) {
			this.setState({ ...this.state, isDefault, isDirty });
			return true;
		}

		return false;
	}
};
