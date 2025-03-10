import React from 'react';
import { GlobalContext } from '../../../context/globalcontext';
import { PlayerCollection } from '../../../model/player';
import { CollectionsContext } from '../context';
import { Checkbox, Pagination, Table, Grid, Dropdown } from 'semantic-ui-react';
import { DEFAULT_MOBILE_WIDTH } from '../../hovering/hoverstat';
import { useStateWithStorage } from '../../../utils/storage';
import CollectionsCrewCard from '../cards/crewcard';
import { CollectionInfo } from '../../../model/collectionfilter';
import { getOwnedCites } from '../../../utils/collectionutils';
import { CollectionCard } from '../cards/collectioncard';
import { RewardFilter } from '../rewardfilter';

export interface GroupTableProps {
	playerCollections: PlayerCollection[];
	colData: CollectionInfo[];
	workerRunning: boolean;
};

export const CollectionResearchView = (props: GroupTableProps) => {
	const colContext = React.useContext(CollectionsContext);
	const context = React.useContext(GlobalContext);
	const { t } = context.localized;
	const { workerRunning, colData } = props;
	const { costMode, searchFilter, setSearchFilter, mapFilter, setMapFilter } = colContext;

	// const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
	const [pageSize, setPageSize] = useStateWithStorage("colData/itemsPerPage", 1, { rememberForever: true });

	const ownedCites = getOwnedCites(context.player.playerData?.player.character.items ?? [], costMode === 'sale');

	const [groupPage, setGroupPage] = React.useState(1);
	const [groupPageCount, setGroupPageCount] = React.useState(1);

	const pageCount = React.useMemo(() => {
		return Math.ceil(colData.length / pageSize);
	}, [colData, pageSize]);

	if (pageCount !== groupPageCount || groupPage > pageCount) {
		setGroupPageCount(pageCount);
		setGroupPage(Math.min(pageCount, 1));
		return <></>;
	}

	return (<div style={{
		display: "flex",
		flexDirection: "column",
		justifyContent: "stretch"
	}}>
		{!workerRunning &&
			<>
				{!!colData?.length &&
					<div style={{
						display: "flex",
						flexDirection:
							window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
						alignItems: "center"
					}}>
						<Pagination style={{
							margin: "1em 0 1em 0"
						}} totalPages={pageCount} activePage={groupPage} onPageChange={(e, { activePage }) => setGroupPage(activePage as number)} />
						<div style={{ margin: "0 0.5em", padding: 0 }}>
							{t('global.rows_per_page')}:
							<Dropdown
								style={{ margin: "0.5em" }}
								placeholder={t('global.rows_per_page')}
								value={pageSize}
								onChange={(e, { value }) => setPageSize(value as number)}
								options={[1, 2, 5, 10].map(x => {
									return {
										value: x,
										key: x,
										text: "" + x
									}
								})}
							/>
						</div>
					</div>}

				<Table striped>
					<Table.Body>
						{colData.slice(pageSize * (groupPage - 1), (pageSize * (groupPage - 1)) + pageSize).map((col, idx) => {

							const collection = col.collection;
							if (!collection?.totalRewards || !collection.milestone) return <></>;

							return (<Table.Row key={"colgroup" + idx}>
								<Table.Cell width={4} style={{ verticalAlign: "top" }}>

									<CollectionCard
										ownedCites={ownedCites}
										mapFilter={mapFilter}
										setMapFilter={setMapFilter}
										searchFilter={searchFilter}
										setSearchFilter={setSearchFilter}
										collection={col} />

								</Table.Cell>
								<Table.Cell style={{ verticalAlign: "top" }}>

									<Grid doubling columns={3} textAlign='center' >
										{col.crew.map((crew, ccidx) => (
											<CollectionsCrewCard
												highlightIfNeeded
												crew={crew}
												collection={collection}
												index={ccidx}
												onClick={(e, item) => addToSearchFilter(item.name)} />
										))}
									</Grid>
								</Table.Cell>
							</Table.Row>)
						}
						)}
					</Table.Body>
				</Table>
				{!!colData?.length &&
					<div style={{
						display: "flex",
						flexDirection:
							window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
						alignItems: "center"
					}}>
						<Pagination style={{ margin: "1em 0 1em 0" }} totalPages={pageCount} activePage={groupPage} onPageChange={(e, { activePage }) => setGroupPage(activePage as number)} />
						<div style={{ margin: "0 0.5em", padding: 0 }}>
							{t('global.rows_per_page')}:
							<Dropdown
								style={{ margin: "0.5em" }}
								placeholder={t('global.rows_per_page')}
								value={pageSize}
								onChange={(e, { value }) => setPageSize(value as number)}
								options={[1, 2, 5, 10].map(x => {
									return {
										value: x,
										key: x,
										text: "" + x
									}
								})}
							/>
						</div>
					</div>}
			</>}
		{workerRunning && <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>{context.core.spin("Calculating Crew...")}</div>}
		{!colData?.length && <div className='ui segment'>No results.</div>}
		<br /><br /><br />
	</div>)

	function addToSearchFilter(value: string) {
		if (searchFilter?.length) {
			setSearchFilter(searchFilter + "; " + value);
		}
		else {
			setSearchFilter(value);
		}
	}
}


