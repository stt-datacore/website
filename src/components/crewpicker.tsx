import React from 'react';
import { InView } from 'react-intersection-observer';
import { Modal, Input, Button, Icon, Grid, Rating, Message, Dropdown, SemanticCOLORS } from 'semantic-ui-react';
import { PlayerCrew } from '../model/player';
import { CrewMember } from '../model/crew';
import { DataContext } from '../context/datacontext';
import { PlayerContext } from '../context/playercontext';
import { MergedContext } from '../context/mergedcontext';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
import { OptionsModal, OptionsModalProps, OptionsModalState, OptionGroup, OptionsBase } from './base/optionsmodal_base';

interface BeholdModalOptions extends OptionsBase {
	portal: string;
	series: string[];
	rarities: number[];
}

const DEFAULT_OPTIONS = {
	portal: '',
	series: [],
	rarities: []
} as BeholdModalOptions;

type CrewPickerProps = {
	crewList: (PlayerCrew | CrewMember)[];
	handleSelect: (value: PlayerCrew | CrewMember) => void;
	options: any;
	renderTrigger?: () => JSX.Element;
};

const CrewPicker = (props: CrewPickerProps) => {
	const { handleSelect } = props;
	
	const context = React.useContext(MergedContext);

	const [crewList, setCrewList] = React.useState<(PlayerCrew | CrewMember)[]>([]);
	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [options, setOptions] = React.useState({...DEFAULT_OPTIONS, ...props.options});
	const [searchFilter, setSearchFilter] = React.useState('');
	const [paginationPage, setPaginationPage] = React.useState(1);
	const [selectedCrew, setSelectedCrew] = React.useState<PlayerCrew | CrewMember | undefined>(undefined);
	const [hoverCrew, setHoverCrew] = React.useState<PlayerCrew | CrewMember | undefined>(undefined);

	const inputRef = React.createRef<Input>();

	React.useEffect(() => {
		const crewList = props.crewList.slice()
			.map((crew, idx) => { return {...crew, pickerId: idx} });
		setCrewList([...crewList]);
	}, [props.crewList]);

	React.useEffect(() => {
		if (modalIsOpen) inputRef.current?.focus();
	}, [modalIsOpen]);

	React.useEffect(() => {
		setPaginationPage(1);
		setSelectedCrew(undefined);
	}, [options, searchFilter]);

	return (
		<div>
		<CrewHoverStat useBoundingClient={true} targetGroup='crew_picker' crew={hoverCrew} />

		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={props.renderTrigger ? props.renderTrigger() : renderDefaultTrigger()}
			size='tiny'
			centered={false}
			closeIcon
		>
			<Modal.Header>
				<Input ref={inputRef}
					size='mini' fluid
					iconPosition='left'
					placeholder='Search for crew by name'
					value={searchFilter}
					onChange={(e, { value }) => { setSearchFilter(value); }}>
						<input />
						<Icon name='search' />
						<Button icon onClick={() => { setSearchFilter(''); inputRef.current?.focus(); }}>
							<Icon name='delete' />
						</Button>
				</Input>
			</Modal.Header>
			<Modal.Content scrolling>
				{renderGrid()}
			</Modal.Content>
			<Modal.Actions>
				<BeholdOptionsModal modalTitle='Optional filters' options={options} setOptions={setOptions} />
				{selectedCrew && (
					<Button color='blue'
						content={`Select ${selectedCrew.name}`}
						onClick={() => confirmSelection(selectedCrew)} />
				)}
				{!selectedCrew && (
					<Button content='Close' onClick={() => setModalIsOpen(false)} />
				)}
			</Modal.Actions>
		</Modal>
		</div>
	);

	function renderDefaultTrigger(): JSX.Element {
		return (
			<Button fluid size='big' color='blue'>
				<Icon name='zoom-in' />
				Search for crew
			</Button>
		);
	}

	function renderGrid(): JSX.Element {
		if (!modalIsOpen) return (<></>);

		let data = crewList.slice();

		// Filtering
		const portalFilter = (crew: PlayerCrew | CrewMember) => {
			if (options.portal.substr(0, 6) === 'portal' && !crew.in_portal) return false;
			if (options.portal === 'portal-unique' && (crew.unique_polestar_combos?.length ?? 0) === 0) return false;
			if (options.portal === 'portal-nonunique' && (crew.unique_polestar_combos?.length ?? 0) > 0) return false;
			if (options.portal === 'nonportal' && crew.in_portal) return false;
			return true;
		};
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(searchFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
		data = data.filter(crew =>
			true
				&& (options.portal === '' || portalFilter(crew))
				&& (options.series.length === 0 || options.series.includes(crew.series))
				&& (options.rarities.length === 0 || options.rarities.includes(crew.max_rarity))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
		);

		if (data.length === 0) return (
			<Message>
				0 results found. Please try different search options.
			</Message>
		);

		// Pagination
		const itemsPerPage = 24, itemsToShow = itemsPerPage*paginationPage;

		return (<>
			<div>
				<Grid doubling columns={3} textAlign='center'>
					{data.slice(0, itemsToShow).map(crew => {
						if (!crew) return <></>	
						return <Grid.Column key={crew.pickerId} style={{ cursor: 'pointer' }}
							onClick={() => setSelectedCrew(crew)}
							onDoubleClick={() => confirmSelection(crew)}
							color={(selectedCrew?.pickerId === crew.pickerId ? 'blue' : null) as SemanticCOLORS}
						>
							<CrewTarget inputItem={crew} targetGroup='crew_picker' setDisplayItem={(crew) => setHoverCrew(crew ?? undefined)}>
								<img width={60} height={60} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
							<div>{crew.name}</div>
							<div><Rating defaultRating={"rarity"in crew ? crew.rarity : crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled /></div>
						</Grid.Column>
					})}
				</Grid>
				{itemsToShow < data.length && (
					<InView as='div' style={{ margin: '2em 0', textAlign: 'center' }}
						onChange={(inView, entry) => { if (inView) setPaginationPage(prevState => prevState + 1); }}
					>
						<Icon loading name='spinner' /> Loading...
					</InView>
				)}
				{itemsToShow >= data.length && (
					<Message style={{ marginTop: '2em' }}>Tip: Double-tap to select a crew more quickly.</Message>
				)}
			</div>			
			</>

		);
	}

	function confirmSelection(crew: any): void {
		handleSelect(crew);
		setModalIsOpen(false);
		setSelectedCrew(undefined);
	}
};

// interface OptionsModalProps {
// 	options: any;
// 	setOptions: (value: any) => void;
// };

// interface OptionsModalState {
// 	options: any;
// 	modalIsOpen: boolean;
// 	isDefault: boolean;
// 	isDirty: boolean;
// }

// export class BeholdOptionsModal extends React.Component<OptionsModalProps, OptionsModalState> {

// 	static readonly portalOptions = [
// 		{ key: 'none', value: '', text: 'Show all crew' },
// 		{ key: 'portal', value: 'portal', text: 'Only show retrievable crew' },
// 		{ key: 'portal-unique', value: 'portal-unique', text: 'Only show uniquely retrievable crew' },
// 		{ key: 'portal-nonunique', value: 'portal-nonunique', text: 'Only show non-uniquely retrievable crew' },
// 		{ key: 'nonportal', value: 'nonportal', text: 'Only show non-retrievable crew' }
// 	];

// 	static readonly seriesOptions = [
// 		{ key: 'tos', value: 'tos', text: 'The Original Series' },
// 		{ key: 'tas', value: 'tas', text: 'The Animated Series' },
// 		{ key: 'tng', value: 'tng', text: 'The Next Generation' },
// 		{ key: 'ds9', value: 'ds9', text: 'Deep Space Nine' },
// 		{ key: 'voy', value: 'voy', text: 'Voyager' },
// 		{ key: 'ent', value: 'ent', text: 'Enterprise' },
// 		{ key: 'dsc', value: 'dsc', text: 'Discovery' },
// 		{ key: 'pic', value: 'pic', text: 'Picard' },
// 		{ key: 'low', value: 'low', text: 'Lower Decks' },
// 		{ key: 'snw', value: 'snw', text: 'Strange New Worlds' },
// 		{ key: 'original', value: 'original', text: 'Timelines Originals' }
// 	];

// 	static readonly rarityOptions = [
// 		{ key: '1*', value: 1, text: '1* Common' },
// 		{ key: '2*', value: 2, text: '2* Uncommon' },
// 		{ key: '3*', value: 3, text: '3* Rare' },
// 		{ key: '4*', value: 4, text: '4* Super Rare' },
// 		{ key: '5*', value: 5, text: '5* Legendary' }
// 	];

// 	constructor(props: OptionsModalProps) {
// 		super(props);

// 		this.state = {
// 			isDefault: false,
// 			isDirty: false,
// 			options: props.options,
// 			modalIsOpen: false
// 		}
// 	}

// 	protected checkState() {
// 		const { options } = this.state;

// 		const isDefault = options.portal === '' && options.series.length === 0 && options.rarities.length === 0;
// 		const isDirty = options.portal !== ''
// 			|| options.series.length !== this.props.options.series.length || !this.props.options.series.every(s => options.series.includes(s))
// 			|| options.rarities.length !== this.props.options.rarities.length || !this.props.options.rarities.every(r => options.rarities.includes(r));

// 		if (this.state.isDefault != isDefault || this.state.isDirty != isDirty) {
// 			this.setState({ ... this.state, isDefault, isDirty });
// 		}
// 	}

// 	componentDidMount(): void {
// 		this.checkState();
// 	}

// 	componentDidUpdate(prevProps: Readonly<OptionsModalProps>, prevState: Readonly<OptionsModalState>, snapshot?: any): void {
// 		this.checkState();
// 	}

// 	render() {
// 		const { modalIsOpen, isDefault, isDirty, options } = this.state;
// 		return (
// 			<Modal
// 				open={modalIsOpen}
// 				onClose={() => { this.revertOptions(); this.setModalIsOpen(false); }}
// 				onOpen={() => this.setModalIsOpen(true)}
// 				trigger={this.renderTrigger()}
// 				size='tiny'
// 			>
// 				<Modal.Header>
// 					Optional filters
// 				</Modal.Header>
// 				<Modal.Content>
// 					<div>
// 						Filter by retrieval option:
// 						<Dropdown selection clearable fluid
// 							placeholder='Show all crew'
// 							options={BeholdOptionsModal.portalOptions}
// 							value={options.portal}
// 							onChange={(e, { value }) => this.setOptions({...options, portal: value})}
// 						/>
// 					</div>
// 					<div style={{ marginTop: '1em' }}>
// 						Filter by series:
// 						<Dropdown selection multiple fluid clearable closeOnChange
// 							placeholder='Select at least 1 series'
// 							options={BeholdOptionsModal.seriesOptions}
// 							value={options.series}
// 							onChange={(e, { value }) => this.setOptions({...options, series: value})}
// 						/>
// 					</div>
// 					<div style={{ marginTop: '1em' }}>
// 						Filter by rarity:
// 						<Dropdown selection multiple fluid clearable closeOnChange
// 							placeholder='Select at least 1 rarity'
// 							options={BeholdOptionsModal.rarityOptions}
// 							value={options.rarities}
// 							onChange={(e, { value }) => this.setOptions({...options, rarities: value})}
// 						/>
// 					</div>
// 				</Modal.Content>
// 				<Modal.Actions>
// 					{!isDefault && <Button content='Reset' onClick={() => this.resetOptions()} />}
// 					{isDirty && <Button positive={true} content='Apply filters' onClick={() => this.applyOptions()} />}
// 					{!isDirty && <Button content='Close' onClick={() => this.setModalIsOpen(false)} />}
// 				</Modal.Actions>
// 			</Modal>
// 		);
// 	}

// 	protected renderTrigger(): JSX.Element {
// 		const { isDefault } = this.state;

// 		return (
// 			<Button>
// 				<Icon name='filter' color={!isDefault ? 'green' : undefined} />
// 				Filters
// 			</Button>
// 		);
// 	}

// 	protected revertOptions(): void {
// 		this.setOptions({...this.props.options});
// 	}

// 	protected resetOptions(): void {
// 		this.setOptions({...DEFAULT_OPTIONS});
// 	}

// 	protected applyOptions(): void {
// 		this.props.setOptions({...this.state.options});
// 		this.setModalIsOpen(false);
// 	}

// 	protected setOptions(value: any) {
// 		this.setState({ ... this.state, options: value });
// 	}

// 	protected setModalIsOpen(value: boolean) {
// 		this.setState({ ... this.state, modalIsOpen: value });
// 	}
// };


class BeholdOptionsModal extends OptionsModal<BeholdModalOptions, OptionsModalProps<BeholdModalOptions>, OptionsModalState<BeholdModalOptions>> {
    
    protected getOptionGroups(): OptionGroup[] {
        return [
            {
                title: "Filter by retrieval option:",
                key: 'portal',
                options: BeholdOptionsModal.portalOptions,
                multi: false,
				initialValue: ''
            },
            {
                title: "Filter by series:",
                key: 'series',
                multi: true,
                options: BeholdOptionsModal.seriesOptions,
				initialValue: [] as string[]
            },
            {
                title: "Filter by rarity:",
                key: "rarities",
                multi: true,
                options: BeholdOptionsModal.rarityOptions,
				initialValue: [] as number[]
            }]
    }
    protected getDefaultOptions(): BeholdModalOptions {
        return DEFAULT_OPTIONS;
    }

	static readonly portalOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'portal', value: 'portal', text: 'Only show retrievable crew' },
		{ key: 'portal-unique', value: 'portal-unique', text: 'Only show uniquely retrievable crew' },
		{ key: 'portal-nonunique', value: 'portal-nonunique', text: 'Only show non-uniquely retrievable crew' },
		{ key: 'nonportal', value: 'nonportal', text: 'Only show non-retrievable crew' }
	];

	static readonly seriesOptions = [
		{ key: 'tos', value: 'tos', text: 'The Original Series' },
		{ key: 'tas', value: 'tas', text: 'The Animated Series' },
		{ key: 'tng', value: 'tng', text: 'The Next Generation' },
		{ key: 'ds9', value: 'ds9', text: 'Deep Space Nine' },
		{ key: 'voy', value: 'voy', text: 'Voyager' },
		{ key: 'ent', value: 'ent', text: 'Enterprise' },
		{ key: 'dsc', value: 'dsc', text: 'Discovery' },
		{ key: 'pic', value: 'pic', text: 'Picard' },
		{ key: 'low', value: 'low', text: 'Lower Decks' },
		{ key: 'snw', value: 'snw', text: 'Strange New Worlds' },
		{ key: 'original', value: 'original', text: 'Timelines Originals' }
	];

	static readonly rarityOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

	constructor(props: OptionsModalProps<BeholdModalOptions>) {
		super(props);

		this.state = {
			isDefault: false,
			isDirty: false,
			options: props.options,
			modalIsOpen: false
		}
	}

	protected checkState() {
		const { options } = this.state;

		const isDefault = options.portal === '' && options.series.length === 0 && options.rarities.length === 0;
		const isDirty = options.portal !== ''
			|| options.series.length !== this.props.options.series.length || !this.props.options.series.every(s => options.series.includes(s))
			|| options.rarities.length !== this.props.options.rarities.length || !this.props.options.rarities.every(r => options.rarities.includes(r));

		if (this.state.isDefault != isDefault || this.state.isDirty != isDirty) {
			this.setState({ ... this.state, isDefault, isDirty });
		}
	}


};


export default CrewPicker;
