import React from 'react';
import {
	Button,
	Checkbox,
	Divider,
	Dropdown,
	DropdownItemProps,
	Form,
	Icon,
	Image,
	Label,
	Message,
	Rating
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { downloadData } from '../../utils/crewutils';
import { iOS } from '../../utils/misc';

import { RarityFilter } from '../crewtables/commonoptions';
import { IDataGridSetup, IDataPickerState, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import { IRosterCrew, RetrievableState } from './model';
import { RetrievalContext } from './context';

interface IPickerFilters {
	retrievable: string;
	owned: string;
	hideFullyFused: boolean;
	rarity: number[];
	skillCount: '' | number;
};

const defaultFilters: IPickerFilters = {
	retrievable: '',
	owned: '',
	hideFullyFused: false,
	rarity: [],
	skillCount: ''
};

type WishlistManagerProps = {
	showModal: boolean;
	closePicker: () => void;
	/** Show filters in options (false by default) */
	powerFiltering?: boolean;
};

export const WishlistManager = (props: WishlistManagerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { rosterCrew, wishlist, setWishlist } = React.useContext(RetrievalContext);
	const { showModal } = props;

	const [filters, setFilters] = React.useState<IPickerFilters>(defaultFilters);

	const filteredIds = React.useMemo<Set<number>>(() => {
		const filteredIds: Set<number> = new Set<number>();
		rosterCrew.forEach(crew => {
			const canShowCrew: boolean =
				true
					&& crewMatchesOwnedFilter(crew)
					&& crewMatchesRetrievableFilter(crew)
					&& (filters.owned === 'unowned' || !filters.hideFullyFused || crew.highest_owned_rarity < crew.max_rarity)
					&& (filters.rarity.length === 0 || filters.rarity.includes(crew.max_rarity))
					&& (filters.skillCount === '' || crew.skill_order.length === filters.skillCount)
			if (!canShowCrew) filteredIds.add(crew.id);
		});
		return filteredIds;
	}, [rosterCrew, filters]);

	const selectedIds = React.useMemo<Set<number>>(() => {
		const selectedIds = new Set<number>();
		wishlist.forEach(crewSymbol => {
			const crew: IRosterCrew | undefined = rosterCrew.find(crew => crew.symbol === crewSymbol);
			if (crew) selectedIds.add(crew.id);
		});
		return selectedIds;
	}, [rosterCrew, wishlist]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData, isSelected: boolean) => <GridCrew crew={datum as IRosterCrew} isSelected={isSelected} />,
		defaultSort: {
			id: '_wishlisted',
			customSort: (a: IEssentialData, b: IEssentialData) => sortCrew(a as IRosterCrew, b as IRosterCrew)
		}
	};

	return (
		<React.Fragment>
			{showModal && (
				<DataPicker	/* Search for crew by name */
					id='/retrieval/wishlist'
					data={rosterCrew}
					closePicker={handleSelectedIds}
					selection
					preFilteredIds={filteredIds}
					preSelectedIds={selectedIds}
					search
					searchPlaceholder={t('crew_picker.search_by_name')}
					renderOptions={renderOptions}
					renderPreface={renderPreface}
					renderActions={renderActions}
					gridSetup={gridSetup}
				/>
			)}
		</React.Fragment>
	);

	function handleSelectedIds(selectedIds: Set<number>): void {
		const wishlist: string[] = [];
		selectedIds.forEach(selectedId => {
			const selectedCrew: IRosterCrew | undefined = rosterCrew.find(datum =>
				datum.id === selectedId
			);
			if (selectedCrew) wishlist.push(selectedCrew.symbol);
		});
		setWishlist(wishlist);
		props.closePicker();
	}

	function renderOptions(state: IDataPickerState): JSX.Element {
		return (
			<React.Fragment>
				{props.powerFiltering && (
					<React.Fragment>
						<FilterOptions
							filters={filters}
							setFilters={setFilters}
						/>
						<Divider />
					</React.Fragment>
				)}
				<ManageOptions
					selectedIds={state.pendingSelectedIds}
				/>
			</React.Fragment>
		);
	}

	function renderPreface(state: IDataPickerState): JSX.Element {
		if (state.data.length === 0) return <></>;
		return (
			<React.Fragment>
				Crew on your wishlist are marked <Icon name='heart' fitted />. Tap a crew to toggle. You can select multiple crew.
				{` `}
				{state.data.length > 1 && <>Double-tap to add an individual crew more quickly.</>}
				{state.data.length === 1 && <>Double-tap or press enter to add an individual crew more quickly.</>}
			</React.Fragment>
		);
	}

	function renderActions(state: IDataPickerState): JSX.Element {
		return (
			<React.Fragment>
				{props.powerFiltering && state.data.length > 0 && (
					<Button	/* Toggle all */
						content='Toggle all'
						onClick={() => toggleAllMatches(state)}
					/>
				)}
				<Button /* Close */
					content={t('global.close')}
					onClick={() => handleSelectedIds(state.pendingSelectedIds)}
				/>
			</React.Fragment>
		);
	}

	function sortCrew(a: IRosterCrew, b: IRosterCrew): number {
		const isWishlisted = (crew: IRosterCrew) => {
			return wishlist.includes(crew.symbol);
		}
		const aFavorited: boolean = isWishlisted(a);
		const bFavorited: boolean = isWishlisted(b);
		if (aFavorited === bFavorited)
			return a.name.localeCompare(b.name);
		if (aFavorited && !bFavorited)
			return -1;
		return 1;
	}

	function crewMatchesRetrievableFilter(crew: IRosterCrew): boolean {
		if (filters.retrievable === 'retrievable') return crew.retrievable === RetrievableState.Viable;
		if (filters.retrievable === 'expiring') return crew.retrievable === RetrievableState.Expiring;
		return true;
	}

	function crewMatchesOwnedFilter(crew: IRosterCrew): boolean {
		if (filters.owned === 'unowned') return crew.highest_owned_rarity === 0;
		if (filters.owned === 'owned') return crew.highest_owned_rarity > 0;
		return true;
	}

	function toggleAllMatches(state: IDataPickerState): void {
		const shownIds: Set<number> = new Set<number>(state.data.map(datum => datum.id));
		const allSelected: boolean = [...shownIds].every(crewId => state.pendingSelectedIds.has(crewId));
		const updatedIds: Set<number> = allSelected
			? state.pendingSelectedIds.difference(shownIds)
			: state.pendingSelectedIds.union(shownIds);
		state.setPendingSelectedIds(updatedIds);
	}
};

type GridCrewProps = {
	crew: IRosterCrew;
	isSelected: boolean;
};

const GridCrew = (props: GridCrewProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crew, isSelected } = props;

	return (
		<React.Fragment>
			<Image>
				<div>
					<img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} style={{ maxHeight: '72px' }} />
				</div>
				{isSelected && (
					<Label corner='right' color='pink' icon='heart' />
				)}
			</Image>
			<div>
				{crew.name}
			</div>
			<div>
				<Rating defaultRating={crew.highest_owned_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled />
			</div>
			{renderRetrieval(crew)}
		</React.Fragment>
	);

	function renderRetrieval(crew: IRosterCrew): JSX.Element {
		if (crew.retrievable === RetrievableState.Never)
			return <Label color='red'>{crew.alt_source}</Label>;
		else if (crew.retrievable === RetrievableState.InFuture)
			return <Label color='red'>{t('base.not_yet_in_portal')}</Label>;
		else if (crew.retrievable === RetrievableState.NonUnique)
			return <Label color='red'>{t('base.not_uniquely_retrievable')}</Label>;
		else if (crew.retrievable === RetrievableState.Expiring)
			return <Label color='black'>Expiring</Label>;
		return <></>;
	}
};

type FilterOptionsProps = {
	filters: IPickerFilters;
	setFilters: (filters: IPickerFilters) => void;
};

const FilterOptions = (props: FilterOptionsProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { filters, setFilters } = props;

	const retrievableFilterOptions: DropdownItemProps[] = [
		{ key: 'none', value: '', text: t('retrieval.crew.show_all_crew') },
		{ key: 'retrievable', value: 'retrievable', text: t('retrieval.crew.show_all_uniquely_retrievable') },
		{ key: 'expiring', value: 'expiring', text: t('retrieval.crew.show_expiring_crew') }
	];

	const ownedFilterOptions: DropdownItemProps[] = [
		{ key: 'none', value: '', text: t('options.crew_status.none') },
		{ key: 'owned', value: 'owned', text: t('crew_ownership.owned') },
		{ key: 'unowned', value: 'unowned', text: t('crew_ownership.unowned') }
	];

	return (
		<Form>
			<Form.Group inline>
				<Form.Field	/* Filter by retrieval options */
					placeholder={t('hints.filter_by_retrieval_options')}
					control={Dropdown}
					selection
					clearable
					options={retrievableFilterOptions}
					value={filters.retrievable}
					onChange={(e, { value }) => setFilters({...filters, retrievable: value})}
				/>
				<Form.Field	/* Filter by ownership */
					placeholder='Filter by ownership'
					control={Dropdown}
					selection
					clearable
					options={ownedFilterOptions}
					value={filters.owned}
					onChange={(e, { value }) => setFilters({...filters, owned: value})}
				/>
				{filters.owned !== 'unowned' && (
					<Form.Field
						control={Checkbox}
						label={t('retrieval.hide_fully_fused_crew')}
						checked={filters.hideFullyFused}
						onChange={(e, { checked }) => setFilters({...filters, hideFullyFused: checked})}
					/>
				)}
			</Form.Group>
			<Form.Group inline>
				<RarityFilter
					rarityFilter={filters.rarity}
					setRarityFilter={(value: number[]) => setFilters({...filters, rarity: value})}
				/>
				<Form.Field>
					<Button	/* Reset */
						onClick={() => setFilters(defaultFilters)}
					>
						{t('global.reset')}
					</Button>
				</Form.Field>
			</Form.Group>
		</Form>
	);
};

type ManageOptionsProps = {
	selectedIds: Set<number>;
};

const ManageOptions = (props: ManageOptionsProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { rosterCrew, setWishlist } = React.useContext(RetrievalContext);
	const { selectedIds } = props;

	const [message, setMessage] = React.useState<string | undefined>(undefined);

	// Use current selections for importing/exporting instead of stored wishlist
	const wishlist = React.useMemo<string[]>(() => {
		const wishlist: string[] = [];
		selectedIds.forEach(selectedId => {
			const crew: IRosterCrew | undefined = rosterCrew.find(crew => crew.id === selectedId);
			if (crew && !wishlist.includes(crew.symbol))
				wishlist.push(crew.symbol);
		});
		return wishlist;
	}, [selectedIds]);

	let inputUploadFile: HTMLInputElement | null = null;

	return (
		<React.Fragment>
			{message && (
				<Message
					color='blue'
					onDismiss={() => setMessage(undefined)}
				>
					<Icon name='info circle' />
					{message}
				</Message>
			)}
			<Form>
				<Form.Group inline style={{ marginBottom: '0' }}>
					<Button	/* Save wishlist to device */
						content='Save wishlist to device'
						icon='download'
						onClick={() => exportWishlist()}
					/>
					<Button	/* Import wishlist */
						content='Import wishlist'
						icon='upload'
						onClick={() => inputUploadFile?.click()}
					/>
					<Button	/* Delete wishlist */
						content='Delete wishlist'
						icon='trash'
						onClick={() => deleteWishlist()}
					/>
					<input
						accept={iOS() ? undefined : '.json,application/json,text/json'}
						type='file'
						onChange={e => handleFileUpload(e)}
						style={{ display: 'none' }}
						ref={e => inputUploadFile = e}
					/>
				</Form.Group>
			</Form>
		</React.Fragment>
	);

	function exportWishlist(): void {
		const text: string = JSON.stringify(wishlist);
		downloadData(`data:text/json;charset=utf-8,${encodeURIComponent(text)}`, 'wishlist.json');
	}

	function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): void {
		// use FileReader to read file content in browser
		const fReader = new FileReader();
		fReader.onload = (e) => {
			const existing: number = wishlist.length;
			let imported: number = 0;
			let data = e.target?.result?.toString() ?? '';
			try {
				const json = JSON.parse(data);
				if (json.length > 0) {
					json.forEach(row => {
						const crew: IRosterCrew | undefined = rosterCrew.find(crew => crew.symbol === row);
						if (crew && !wishlist.includes(crew.symbol))
							wishlist.push(crew.symbol);
					});
				}
				imported = wishlist.length - existing;
				setWishlist(wishlist);
			}
			catch (e) {
				console.error(e);
			}
			finally {
				setMessage(`${imported} crew added to wishlist!`);
			}
		};
		if (event.target.files) {
			fReader.readAsText(event.target.files[0]);
			if (inputUploadFile) inputUploadFile.files = null;
		}
	}

	function deleteWishlist(): void {
		setWishlist([]);
		setMessage('Wishlist deleted!');
	}
};
