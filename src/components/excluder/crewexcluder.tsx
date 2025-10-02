import React from 'react';
import { Form, Dropdown, Segment, Message, Button, Label, Image, Icon, DropdownItemProps, Popup } from 'semantic-ui-react';

import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';
import { OptionsBase, OptionsModal, OptionGroup, OptionsModalProps, ModalOption } from '../base/optionsmodal_base';

import CrewPicker from '../crewpicker';
import { IEventData, IEventScoredCrew } from '../eventplanner/model';
import { computeEventBest, getEventData, getRecentEvents } from '../../utils/events';
import { GlobalContext, IDefaultGlobal } from '../../context/globalcontext';
import { crewCopy, isQuipped, oneCrewCopy } from '../../utils/crewutils';
import CONFIG from '../CONFIG';
import { QuipmentPopover } from '../voyagecalculator/quipment/quipmentpopover';
import { PlayerCrew } from '../../model/player';
import { useStateWithStorage } from '../../utils/storage';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { AvatarView } from '../item_presenters/avatarview';
import { PromptContext } from '../../context/promptcontext';
import { CrewMember } from '../../model/crew';
import { CrewQuipment } from '../crewpage/crewquipment';
import { CrewItemsView } from '../item_presenters/crew_items';
import { NoteEditor } from './noteeditor';

interface ISelectOption {
	key: string;
	value: string;
	text: string;
};

type CrewExcluderProps = {
	pageId?: string
	rosterCrew: PlayerCrew[];
	preExcludedCrew: PlayerCrew[];
	excludedCrewIds: number[];
	considerFrozen?: boolean;
	voyageConfig?: IVoyageInputConfig;
	events?: IEventData[];
	updateExclusions: (crewIds: number[]) => void;
};

type SelectedBonusType = '' | 'all' | 'featured' | 'matrix';

export const CrewExcluder = (props: CrewExcluderProps) => {
	const globalContext = React.useContext(GlobalContext);
	const promptContext = React.useContext(PromptContext);
	const { confirm } = promptContext;
	const { t, tfmt, useT } = globalContext.localized;
	const { t: excluder } = useT('consider_crew.excluder');

	const [notesOpen, setNotesOpen] = React.useState(false);
	const [quipOpen, setQuipOpen] = React.useState(false);
	const [quipValues, setQuipValues] = React.useState([] as number[]);

	const { events: inputEvents, voyageConfig, pageId } = props;
	const { ephemeral, playerData } = globalContext.player;

	const [eventData, setEventData] = React.useState<IEventData[] | undefined>(undefined);

	const dataPrefix = React.useMemo(() => {
		const pg = pageId ?? 'excluder';
		if (playerData) {
			return `${playerData.player.dbid}/${pg}`;
		}
		return pg;
	}, [playerData, pageId]);

	const [notedExclusions, setNotedExclusions] = useStateWithStorage<number[]>(`${dataPrefix}/noted_exclusions`, [], { rememberForever: true });

	const events = React.useMemo(() => {
		return inputEvents?.length ? inputEvents : (eventData ?? []);
	}, [inputEvents, eventData]);

	React.useEffect(() => {
		if (!inputEvents?.length) getEvents();
	}, [inputEvents]);

	const { excludedCrewIds, updateExclusions, considerFrozen } = props;

	const [selectedEvent, setSelectedEvent] = React.useState<string>('');
	const [phase, setPhase] = React.useState<string>('');
	const [selectedBonus, setSelectedBonus] = React.useState<SelectedBonusType>('all');
	const [bestCombos, setBestCombos] = React.useState([] as number[]);

	React.useEffect(() => {
		let activeEvent: string = '';
		let activeBonus: SelectedBonusType = 'all';
		let phase: string = '';
		events.forEach(gameEvent => {
			if (gameEvent && gameEvent.seconds_to_end > 0 && gameEvent.seconds_to_start < 86400) {
				if (gameEvent.content_types.includes('shuttles') || gameEvent.content_types.includes('galaxy') || gameEvent.content_types.includes('gather') || (gameEvent.content_types.includes('voyage') && voyageConfig?.voyage_type !== 'encounter')) {
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
						if (typeof gameEvent.content_types === 'string') {
							phase = (gameEvent.content_types as any) as string;
						}
						else if (gameEvent.content_types.length) {
							phase = gameEvent.content_types[0];
						}
					}

					// Event-type dependent exclusion modes
					if (phase === 'galaxy' || phase === 'skirmish') {
						activeEvent = '';
						activeBonus = '';
					}
					else if (phase === 'gather') {
						activeBonus = 'matrix';
					}
					else if (phase === 'shuttles') {
						activeBonus = 'all';
					}
					else if (phase === 'voyage') {
						// Don't auto-exclude event crew if seeking recommendations for active voyage event
						if (voyageConfig?.voyage_type === 'encounter') {
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

	const quippedSelection = React.useMemo(() => {
		return getQuippedSelection();
	}, [excludedCrewIds]);

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
	if (eventOptions.length > 0) eventOptions.push({ key: 'none', value: '', text: excluder('do_not_exclude_event_crew') });

	const bonusOptions: ISelectOption[] = [
		{ key: 'all', value: 'all', text: excluder('all_event_crew') },
		{ key: 'featured', value: 'featured', text: excluder('featured_event_crew') },

		// { key: 'best', value: 'best', text: 'My best crew for event' }
	];

	const phaseOptions = [
		{ key: 'gather', value: 'gather', text: t('event_type.gather')},
		{ key: 'shuttles', value: 'shuttles', text: t('event_type.shuttles') },
		{ key: 'voyage', value: 'voyage', text: t('event_type.voyage') },
	] as DropdownItemProps[];

	if (selectedEvent) {
		const activeEvent = events.find(gameEvent => gameEvent.symbol === selectedEvent);
		if (activeEvent?.content_types?.includes('gather')) {
			bonusOptions.push({ key: 'matrix', value: 'matrix', text: excluder('event_skill_matrix_crew') });
		}
	}

	return (
		<React.Fragment>
			<Message attached onDismiss={excludedCrewIds.length > 0 ? () => { updateExclusions([]); setSelectedEvent(''); } : undefined}>
				<Message.Content>
					<Message.Header>
						{excluder('title')}
					</Message.Header>
					<Form.Group grouped>
						{eventOptions.length > 0 && (
							<Form.Group inline>
								<Form.Field
									label={excluder('by_event')}
									placeholder={excluder('select_event')}
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
										label={t('hints.filter_by_bonus')}
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
										label={excluder('phase_type')}
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
							<Button color='blue' onClick={(e) => excludeQuipped()}>{t('consider_crew.exclude_quipped')}</Button>
							<Button color='blue' icon='pencil' onClick={openQuipEditor}

								/>
							<Popup
								content={excluder('denote_current')}
								trigger={
									<Button
										disabled={notedExclusions.length === 0}
										onClick={deNoteExclusions}
										icon='trash'
										style={{float: 'right'}}
										/>
									}
								/>
							<Popup
								content={renderNotedCrew()}
								trigger={
									<Button
										disabled={notedExclusions.length === 0}
										color={notedExclusions?.length ? 'green' : undefined}
										onClick={restoreNotedExclusions}
										icon='external'
										style={{float: 'right'}}
										/>
									}
								/>
							<Popup
								content={excluder('note_current')}
								trigger={
									<Button
										disabled={excludedCrewIds.length === 0}
										onClick={noteExclusions}
										icon='bookmark'
										style={{float: 'right'}}
										/>
									}
								/>

							<Button
								disabled={!notedExclusions?.length}
								style={{float: 'right'}}
								icon='pencil'
								onClick={() => setNotesOpen(!notesOpen)}
							/>

							<NoteEditor
								mode='add'
								title={t('consider_crew.exclude_quipped')}
								isOpen={quipOpen}
								currentSelection={quippedSelection}
								onClose={(result) => {
									if (result) {
										if (quippedSelection?.length) {
											let osel = excludedCrewIds.filter(id => !quippedSelection.includes(id));
											updateExclusions([...osel, ...result]);
										}
										else {
											excludeQuipped(result);
										}
									}
									setQuipOpen(false);
								}}
								crewIds={quipValues}
								/>

							<NoteEditor
								mode='remove'
								title={t('consider_crew.excluder.noted_exclusions')}
								isOpen={notesOpen}
								onClose={(result) => {
									if (result) {
										setNotedExclusions(result);
									}
									setNotesOpen(false);
								}}
								crewIds={notedExclusions}
								/>
						</Form.Field>

					</Form.Group>
				</Message.Content>
			</Message>
			<Segment attached='bottom'>
				{renderExcludedCrew()}
			</Segment>
		</React.Fragment>
	);

	function openQuipEditor() {
		const quipped = props.rosterCrew.filter(f => isQuipped(f)).map(c => c.id);
		setQuipValues(quipped);
		setQuipOpen(true);
	}

	function getQuippedSelection() {
		const quipped = props.rosterCrew.filter(f => isQuipped(f)).map(c => c.id);
		return excludedCrewIds.filter(f => quipped.includes(f));
	}

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

	function renderNotedCrew() {
		const flexCol = OptionsPanelFlexColumn;
		const flexRow = OptionsPanelFlexRow;

		let work = notedExclusions.map(id => props.preExcludedCrew.find(c => c.id === id)).filter(f => {
			if (f) delete f.pickerId;
			return f !== undefined;
		});

		work.sort((a, b) => {
			a.pickerId ??= a.kwipment.filter(q => typeof q === 'number' ? !!q : !!q[1]).length;
			b.pickerId ??= b.kwipment.filter(q => typeof q === 'number' ? !!q : !!q[1]).length;
			let aq = a.pickerId;
			let bq = b.pickerId;
			let r = bq - aq;
			if (!r) r = a.name.localeCompare(b.name);
			return r;
		});

		work = work.slice(0, 10);
		let overflow = notedExclusions.length - work.length;

		return (
			<div style={{...flexCol, alignItems: 'flex-start', gap: '0.5em'}}>
				{excluder('restore_notes{{:}}')}
				{work?.map((c, idx) => {
					return (
						<div key={`popup_noted_${c.id}_${c.symbol}_${idx}`}
							style={{...flexRow, justifyContent: 'flex-start', gap: '1em'}}>
							<AvatarView
								mode='crew'
								size={32}
								item={c}
								/>
							{!!c.pickerId && <QuipmentPopover crew={c} />}
							{c.name}
						</div>
					)
				})}
				{!!overflow && t('global.and_n_more_ellipses', { n: overflow })}
			</div>
		)
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

	function excludeQuipped(list?: number[]) {
		const quipped = list || props.rosterCrew.filter(f => isQuipped(f)).map(c => c.id);
		updateExclusions([ ... new Set([...excludedCrewIds, ...quipped])] );
	}

	function restoreNotedExclusions() {
		if (notedExclusions?.length) {
			const current = [...new Set(excludedCrewIds)].sort();
			const noted = [...new Set(notedExclusions)].sort();
			const diff = noted.filter(id => !current.includes(id));
			if (diff.length) {
				updateExclusions([...current, ...diff]);
			}
		}
	}

	function noteExclusions() {
		setNotedExclusions([...new Set(excludedCrewIds.concat(notedExclusions))]);
	}

	function deNoteExclusions() {
		confirm({
			title: t('global.delete'),
			message: t('global.delete_confirm'),
			onClose: (result) => {
				if (result) {
					setNotedExclusions([]);
				}
			}
		})

	}

	function getEvents(): void {
		// Get event data from recently uploaded playerData
		if (ephemeral?.events) {
			const currentEvents: IEventData[] = ephemeral.events.map(ev => getEventData(ev, globalContext.core.crew))
				.filter(ev => ev !== undefined).map(ev => ev as IEventData)
				.filter(ev => ev.seconds_to_end > 0)
				.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
			setEventData([...currentEvents]);
		}
		// Otherwise guess event from autosynced events
		else {
			getRecentEvents(globalContext.core.crew, globalContext.core.event_instances, globalContext.core.all_ships.map(m => ({...m, id: m.archetype_id, levels: undefined }))).then(recentEvents => {
				setEventData([...recentEvents]);
			});
		}
	}

};

type CrewExcluderModalProps = {
	rosterCrew: IVoyageCrew[];
	excludedCrewIds: number[];
	updateExclusions: (crewIds: number[]) => void;
};

const CrewExcluderModal = (props: CrewExcluderModalProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { excludedCrewIds } = props;
	const { t } = globalContext.localized;
	const [options, setOptions] = React.useState<IExcluderModalOptions>(DEFAULT_EXCLUDER_OPTIONS);

	const pickerCrewList = props.rosterCrew.sort((a, b) => a.name.localeCompare(b.name));

	return (
		<CrewPicker crewList={pickerCrewList}
			handleSelect={(crew) => onCrewPick(crew as IVoyageCrew)}
			options={options} setOptions={setOptions} defaultOptions={DEFAULT_EXCLUDER_OPTIONS}
			pickerModal={ExcluderOptionsModal} renderTrigger={renderTrigger}
			renderCrewCaption={renderCaption}
			filterCrew={(data, searchFilter) => filterCrew(data as IVoyageCrew[], searchFilter)}
		/>
	);

	function renderCaption(crew: CrewMember | PlayerCrew): JSX.Element {
		return <div style={{...OptionsPanelFlexColumn, gap: '0.5em'}}>
			<CrewItemsView itemSize={24} crew={crew} quipment={true} />
			<span>{crew.name}</span>
		</div>
	}

	function renderTrigger(): JSX.Element {
		return (
			<Button color='blue'>
				<Icon name='zoom-in' />
				{t('consider_crew.excluder.search')}
			</Button>
		);
	}

	function filterCrew(data: IVoyageCrew[], searchFilter: string = ''): IVoyageCrew[]{
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(searchFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
		data = data.filter(crew =>
			true
				&& (options.rarities.length === 0 || options.rarities.includes(crew.max_rarity))
				&& ((options.quippedStatus === 1 && isQuipped(crew)) || (options.quippedStatus === 2 && !isQuipped(crew)) || (!options.quippedStatus))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
				&& (!options.skill?.length || options.skill.includes(crew.skill_order[0]))
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
	quippedStatus: number | undefined;
	skill: string[];
};

const DEFAULT_EXCLUDER_OPTIONS = {
	rarities: [],
	quippedStatus: undefined,
	skill: []
} as IExcluderModalOptions;

class ExcluderOptionsModal extends OptionsModal<IExcluderModalOptions> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;
	state: { isDefault: boolean; isDirty: boolean; options: any; modalIsOpen: boolean; };
	//declare props: any;

	protected getOptionGroups(): OptionGroup[] {
		const { t } = this.context.localized;
		ExcluderOptionsModal.quippedStatusOptions.length = 0;
		ExcluderOptionsModal.quippedStatusOptions.push(
			{
				key: `quipped`,
				value: 1,
				text: t('options.roster_maintenance.quipped')
			},
			{
				key: `quipped_hide`,
				value: 2,
				text: t('options.roster_maintenance.quipped_hide')
			},
		);

		return [
			{
				title: t('hints.filter_by_rarity{{:}}'),
				key: 'rarities',
				multi: true,
				options: ExcluderOptionsModal.rarityOptions,
				initialValue: [] as number[],
				containerStyle: {
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
					gap:'0.5em'
				}
			},
			{
				title: t('hints.filter_by_quipped_status{{:}}'),
				key: 'quippedStatus',
				multi: false,
				options: ExcluderOptionsModal.quippedStatusOptions,
				initialValue: undefined,
				placeholder: t('options.crew_status.none'),
				containerStyle: {
					marginTop: '0.5em',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
					gap:'0.5em'
				}
			},
			{
				title: t('hints.filter_by_skill{{:}}'),
				key: 'skill',
				multi: true,
				options: ExcluderOptionsModal.skillOptions,
				initialValue: [] as string[],
				placeholder: t('options.crew_status.none'),
				containerStyle: {
					marginTop: '0.5em',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
					gap:'0.5em'
				}
			}];
	}
	protected getDefaultOptions(): IExcluderModalOptions {
		return DEFAULT_EXCLUDER_OPTIONS;
	}

	static readonly rarityOptions = [] as ModalOption[];
	static readonly quippedStatusOptions = [] as ModalOption[];
	static readonly skillOptions = [] as ModalOption[];

	constructor(props: OptionsModalProps<IExcluderModalOptions>) {
		super(props);

		ExcluderOptionsModal.rarityOptions.length = 0;
		ExcluderOptionsModal.skillOptions.length = 0;

		CONFIG.RARITIES.forEach((r, i) => {
			if (i === 0) return;
			ExcluderOptionsModal.rarityOptions.push(
				{ key: `${i}*`, value: i, text: `${i}* ${r.name}` }
			)
		});

		CONFIG.SKILLS_SHORT.forEach((data) => {
			ExcluderOptionsModal.skillOptions.push(
				{ key: `${data.name}`, value: data.name, text: `${data.short}` }
			)
		});

		this.state = {
			isDefault: false,
			isDirty: false,
			options: props.options,
			modalIsOpen: false
		}
	}

	resetOptions(): void {
		this.setState({ ... this.state, options: structuredClone(DEFAULT_EXCLUDER_OPTIONS) });
	}

	protected checkState(): boolean {
		const { options } = this.state;

		options.quippedStatus ??= 0;

		const isDefault = options.rarities.length === 0 && options.quippedStatus === 0;
		const isDirty = options.quippedStatus !== this.props.options.quippedStatus || options.rarities.join() !== this.props.options.rarities.join() || options.skill.join() !== this.props.options.skill.join()

		if (this.state.isDefault !== isDefault || this.state.isDirty !== isDirty) {
			this.setState({ ...this.state, isDefault, isDirty });
			return true;
		}

		return false;
	}
};
