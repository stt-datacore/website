import React, { PureComponent } from 'react';
import { Item, Icon, Dropdown, Label, Modal, Grid, Segment } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { CrewMember } from '../../model/crew';
import { Collection } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../CONFIG';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { crewCopy } from '../../utils/crewutils';
import { TinyStore } from '../../utils/tiny';
import { useStateWithStorage } from '../../utils/storage';
import { PlayerCollection } from '../../model/player';
import EventInfoModal from '../event_info_modal';
import { CollectionDetails } from './overview_modal';
import LazyImage from '../lazyimage';
import { formatColString } from './context';

type CollectionsPageProps = {
	onClick?: (collectionId: number) => void;
};

type SortOptions = 'date_added' | 'rarity' | 'owned_status';
type Direction = 'ascending' | 'descending';

export const CollectionsOverview = (props: CollectionsPageProps) => {
	const globalContext = React.useContext(GlobalContext);

	const [sortBy, setSortBy] = useStateWithStorage('collectionOverview/sortBy', 'date_added' as SortOptions | undefined, { rememberForever: true });
	const [sortDirection, setSortDirection] = useStateWithStorage('collectionOverview/sortDirection', 'ascending' as Direction | undefined, { rememberForever: true });
	const [modalInstance, setModalInstance] = React.useState(null as PlayerCollection | null);

	const { collections, crew: allcrew } = globalContext.core;

	const { playerData } = globalContext.player;

	React.useEffect(() => {
		if (!playerData) {
			if (sortBy === 'owned_status') {
				setSort('date_added');
			}
		}
	}, [])

	if (!collections || collections.length === 0) {
		return globalContext.core.spin ? globalContext.core.spin() : <></>;
	}

	const mul = sortDirection === 'ascending' ? 1 : -1;

	for (let col of collections) {
		let workcol = (col.crew?.map(cm => allcrew?.find(fc => fc.symbol === cm)) ?? []) as CrewMember[];

		if (sortBy === 'date_added') {
			workcol?.sort((a, b) => {
				let r = a.date_added.getTime() - b.date_added.getTime();
				if (!r) r = a.name.localeCompare(b.name);
				return r * mul;
			});
		}
		else if (sortBy === 'rarity') {
			workcol?.sort((a, b) => {
				let r = a.max_rarity - b.max_rarity;
				if (!r) r = a.name.localeCompare(b.name);
				return r * mul;
			});
		}
		else if (sortBy === 'owned_status' && playerData) {
			workcol?.sort((a, b) => {
				let acheck = playerData?.player.character.crew.find(fc => fc.symbol === a.symbol);
				let bcheck = playerData?.player.character.crew.find(fc => fc.symbol === b.symbol);
				let r = 0;
				if (!!acheck != !!bcheck) {
					if (!!acheck) r = -1;
					else r = 1;
				}
				else {
					r = a.date_added.getTime() - b.date_added.getTime();
				}
				if (!r) r = a.name.localeCompare(b.name);
				return r * mul;
			})
		}

		col.crew = workcol.map(m => m.symbol);
	}

	const directions = [
		{
			key: 'ascending',
			value: 'ascending',
			text: 'Ascending'
		},
		{
			key: 'descending',
			value: 'descending',
			text: 'Descending'
		},
	]

	const sortOptions = [
		{
			key: 'date_added',
			value: 'date_added',
			text: "Date Added"
		},
		{
			key: 'rarity',
			value: 'rarity',
			text: "Rarity"
		}
	];

	if (playerData) {
		sortOptions.push({
			key: "owned_status",
			value: "owned_status",
			text: "Owned Status"
		})
	}

	return (
		<div>
			{/* <div style={{display:"flex", flexDirection:"row", alignItems:"center"}}>
				<Label >Sort Crew: </Label>
				<Dropdown
					style={{margin:"0 1em"}}
					value={sortBy}
					onChange={(e, { value }) => setSort(value as SortOptions)}
					placeholder='Sort crew...'
					options={sortOptions} />
				<Label>Direction: </Label>
				<Dropdown
					style={{margin:"0 1em"}}
					value={sortDirection}
					onChange={(e, { value }) => setSort(undefined, value as Direction)}
					placeholder='Sort crew...'
					options={directions} />
			</div>

		<Item.Group>
			{collections.map(collection => (
				<Item key={collection.name} id={encodeURIComponent(collection.name)} style={{display: "flex", flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row", alignItems: "center"}}>
					<Item.Image size='medium' className='ui segment' style={{border: "1px solid #7f7f7f7f", width: "300px", height: "100%", borderRadius: "6px"}} src={`${process.env.GATSBY_ASSETS_URL}${collection.image}`} />

					<Item.Content>
						<Item.Header>
							<div className='text'
								style={{
									cursor: !!playerData ? 'pointer' : undefined
									}}
								onClick={(e) => props.onClick ? props.onClick(collection.id) : null}>
								{collection.name}
							</div>
							<hr/>
						</Item.Header>
						<Item.Meta>
							<div className='text'>
								{formatColString(collection.description ?? "", undefined, 'ui label')}
							</div>
						</Item.Meta>
						<Item.Description>
							<b>Crew: </b>
							{collection.crew?.map(crew => {
								const mapped = allcrew?.find(c => c.symbol === crew);
								return (
									<Link key={crew} to={`/crew/${crew}/`} style={{color: CONFIG.RARITIES[mapped?.max_rarity ?? 0].color}}>
										{mapped?.name}
									</Link>
								)
							})
								.reduce((prev, curr) => <>{prev}, {curr}</>)}
						</Item.Description>
					</Item.Content>
				</Item>
			))}
			<br/><br/><br/>
		</Item.Group> */}


			<Grid stackable columns={3}>
				{collections.map(colInfo => (
					<Grid.Column key={colInfo.type_id}>
						<div
							style={{ cursor: 'pointer' }}
							onClick={() => setModalInstance(colInfo as PlayerCollection)}
						>
							<Segment padded>
								<Label attached="top">
									{colInfo.name}
								</Label>
								<LazyImage
									src={`${process.env.GATSBY_ASSETS_URL}${colInfo.image}`}
									size="large"
									onError={e => e.target.style.visibility = 'hidden'}
								/>
								<Label attached='bottom'>
									{formatColString(colInfo.description!)}
								</Label>
							</Segment>
						</div>
					</Grid.Column>
				))}
			</Grid>

			{modalInstance !== null && (
				<Modal
					open
					size="large"
					onClose={() => setModalInstance(null)}
					closeIcon
				>
					<Modal.Header>
						{modalInstance.name}
					</Modal.Header>
					<Modal.Description>
						<div style={{ marginLeft: '1.5em', marginBottom: '1em' }}>
							{formatColString(modalInstance.description!)}
						</div>
					</Modal.Description>
					<Modal.Content scrolling>
						<CollectionDetails collection={modalInstance} />
					</Modal.Content>
				</Modal>
			)}
		</div>
	);


	function setSort(sort?: SortOptions, dir?: Direction) {
		sort ??= this.state.sortBy;
		dir ??= this.state.direction;

		// we don't want to force update
		if (this.state.direction === dir && this.state.sortBy === sort) return;

		setSortBy(sort);
		setSortDirection(dir);
	}

}


export default CollectionsOverview;
