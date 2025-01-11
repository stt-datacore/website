import React from 'react';
import { CollectionsContext } from './context';
import { Pagination, Table, Grid, Dropdown, Checkbox } from 'semantic-ui-react';
import { PlayerCrew, PlayerCollection } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { useStateWithStorage } from '../../utils/storage';
import { appelate } from '../../utils/misc';
import CollectionsCrewCard from './crewcard';
import { CollectionGroup, ComboCostMap, CollectionMatchMode } from '../../model/collectionfilter';
import { findColGroupsCrew, getOptCols, getOwnedCites, neededStars, starCost } from '../../utils/collectionutils';
import { CollectionCard } from './collectioncard';
import { RewardFilter } from './rewardfilter';

export interface CollectionOptimizerProps {
    colOptimized: CollectionGroup[];
	playerCollections: PlayerCollection[];
	workerRunning: boolean;
	costMap:  ComboCostMap[];
}

interface ComboConfig {
	collection: string;
	name: string;
}

export const CollectionOptimizerTable = (props: CollectionOptimizerProps) => {
    const colContext = React.useContext(CollectionsContext);
    const context = React.useContext(GlobalContext);
	const { t } = context.localized;
    const { workerRunning } = props;
    const { matchMode, setMatchMode, costMode, searchFilter, setSearchFilter, mapFilter, setMapFilter } = colContext;

    const { costMap, colOptimized } = props;

	const [pageSize, setPageSize] = useStateWithStorage("colOptimizer/itemsPerPage", 1, { rememberForever: true });
	const [combos, setCombos] = React.useState([] as ComboConfig[]);
	const [optPage, setOptPage] = React.useState(1);
	const [optPageCount, setOptPageCount] = React.useState(1);
	const [crewPos, setCrewPos] = useStateWithStorage<'top' | 'bottom'>("colOptimizer/crewPos", 'top', { rememberForever: true });
	const [allCrew, setAllCrew] = React.useState<PlayerCrew[]>([]);

	const ownedCites = getOwnedCites(context.player.playerData?.player.character.items ?? [], costMode === 'sale');

	const setCombo = (col: CollectionGroup, combo: string | undefined) => {
		let f = combos.find(cf => cf.collection === col.collection.name);
		if (!f) {
			if (!combo) return;
			combos.push({
				collection: col.collection.name,
				name: combo
			})
		}
		else {
			if (!combo) {
				let newCol = combos.filter(cf => cf.collection !== col.collection.name) ?? [];
				setCombos(newCol);
				return;
			}
			else {
				f.name = combo;
			}
		}
		setCombos([... combos]);
	}

	const getCombo = (col: CollectionGroup) => {
		let f = combos.find(cf => cf.collection === col.collection.name);
		return f?.name ?? (col.combos?.length ? col.combos[0].names.join(" / ") : undefined);
	}

    const addToSearchFilter = (value: string) => {
		if (searchFilter?.length) {
			setSearchFilter(searchFilter + "; " + value);
		}
		else {
			setSearchFilter(value);
		}
	}

	React.useEffect(() => {
		let crewprep = colOptimized.map((col) => col.combinedUnique).flat();
		crewprep = crewprep.filter((fc, idx) => crewprep.findIndex(fi => fi.symbol === fc.symbol) === idx)
							.sort((a, b) => a.name.localeCompare(b.name));

		setAllCrew(crewprep);
	}, [colOptimized]);

	React.useEffect(() => {
		const optCount = Math.ceil(colOptimized.length / pageSize);

		if (optCount !== optPageCount || optPage > optCount) {
			setOptPageCount(optCount);
			setOptPage(Math.min(optCount, 1));
		}

	}, [colOptimized, pageSize])

	//const rewards =
	return (<div style={{
		display: "flex",
		flexDirection: "column",
		justifyContent: "stretch"
	}}>
		{!workerRunning &&
		<>
		{!!colOptimized?.length &&
			<div style={{display:"flex",
				flexDirection:
					window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
				alignItems: "center"
				}}>
			<Pagination style={{margin: "0.25em 0 2em 0"}} totalPages={optPageCount} activePage={optPage} onPageChange={(e, { activePage }) => setOptPage(activePage as number) } />
			<div style={{margin:"0 0.5em", padding: 0, marginTop:"-2em"}}>
				{t('global.rows_per_page')}:
				<Dropdown
					style={{margin: "0.5em"}}
					placeholder={t('global.rows_per_page')}
					value={pageSize}
					onChange={(e, { value }) => setPageSize(value as number)}
					options={[1,2,5,10].map(x => {
						return {
							value: x,
							key: x,
							text: "" + x
						}
					})}
					/>
			</div>
			<div style={{margin:"0.5em", padding: 0, marginTop: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "-1.5em"}}>
				{t('collections.options.show_crew.title')}:
				<Dropdown
					style={{margin: "0.5em"}}
					placeholder={"Show Crew"}
					value={crewPos}
					onChange={(e, { value }) => setCrewPos(value as ('top' | 'bottom'))}
					options={['top', 'bottom'].map(x => {
						return {
							value: x,
							key: x,
							text: t(`collections.options.show_crew.${x}`)
						}
					})}
					/>
			</div>
			<div style={{margin:"0.5em", padding: 0, marginTop: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "-1.5em"}}>
				{t('collections.options.mode.title')}:
				<Dropdown
					style={{margin: "0.5em"}}
					placeholder={"Mode"}
					value={matchMode}
					onChange={(e, { value }) => setMatchMode(value as CollectionMatchMode)}
					options={['normal', 'exact-only', 'extended', 'inexact-only'].map(x => {
						return {
							value: x,
							key: x,
							text: t(`collections.options.mode.${x}`)
						}
					})}
					/>
			</div>
		</div>}
		<Table striped>
			<Table.Body>
				{colOptimized.slice(pageSize * (optPage - 1), (pageSize * (optPage - 1)) + pageSize).map((col, idx) => {

					const optCombo = getCombo(col);
					const comboCrew = findColGroupsCrew(costMap, col, optCombo);
					if (!comboCrew?.length && optCombo !== undefined && optCombo !== '') {
						window.setTimeout(() => {
							setCombo(col, col.combos ? col.combos[0].names.join(" / ") : undefined);
						});
						return <> </>
					}
					const collection = JSON.parse(JSON.stringify(col.collection)) as PlayerCollection;
					collection.neededCost = starCost(comboCrew, undefined, costMode === 'sale');
					//collection.needed = comboCrew.length;
					col.neededStars = neededStars(comboCrew);
					if (!collection?.totalRewards || !collection.milestone) return <></>;

					return (<Table.Row key={"colgroup" + idx} >
						<Table.Cell width={4} style={{verticalAlign:"top"}}>
						<CollectionCard
							ownedCites={ownedCites}
							mapFilter={mapFilter}
							setMapFilter={setMapFilter}
							searchFilter={searchFilter}
							setSearchFilter={setSearchFilter}
							collection={{ ...col, collection }} />

						</Table.Cell>
						<Table.Cell style={{verticalAlign:"top"}}>
							<h3 style={{margin:"0.5em", textAlign: 'center'}}>{t('collections.additional_milestones')}:<br /></h3>
							{!!col.combos?.length && (col.combos?.length ?? 0) === 1 &&
							<div style={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
							{col.combos[0].names.join(" / ")}
							</div>}
							{!!col.combos?.length && (col.combos?.length ?? 0) > 1 &&
							<div style={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
							<div style={{margin: "0.25em"}}>Variations: </div>
							<Dropdown
								fluid={typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH}
								direction={typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'left' : undefined}
								scrolling
								placeholder={"Select Options"}
								value={optCombo}
								onChange={(e, { value }) => setCombo(col, value as string)}
								options={col.combos.map(opt => {
								return {
									key: opt.names.join(" / "),
									value: opt.names.join(" / "),
									text: opt.names.join(" / ")
								}
							})}/>
							<br />
							</div>}

							<div style={{display: 'flex', flexDirection: crewPos === 'top' ? 'column-reverse' : 'column'}}>
							<div style={{display:'flex', flexDirection:'column'}}>
								<Grid doubling columns={3} textAlign='center'>
									{getOptCols(col, optCombo).map((c) => {
										const collection = c.collection;
										if (!collection?.totalRewards || !collection.milestone) return <></>;

										return (
											<CollectionCard
												ownedCites={ownedCites}
												style={{width: "350px"}}
												brief={true}
												mapFilter={mapFilter}
												setMapFilter={setMapFilter}
												searchFilter={searchFilter}
												setSearchFilter={setSearchFilter}
												collection={c} />)
									})}
							</Grid>
						</div>
						<Grid doubling columns={3} textAlign='center'>
								{comboCrew.map((crew, ccidx) => (
									<CollectionsCrewCard
										crew={crew}
										collection={collection}
										index={ccidx}
										onClick={(e, data) => addToSearchFilter(data.name)} />
								))}
							</Grid>
							</div>
						</Table.Cell>
					</Table.Row>)}
				)}
			</Table.Body>
		</Table>
		{true &&
			<div style={{display:"flex",
					flexDirection:
						window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
					alignItems: "center"
					}}>

			<Pagination style={{margin: "0.25em 0 2em 0"}} totalPages={optPageCount} activePage={optPage} onPageChange={(e, { activePage }) => setOptPage(activePage as number) } />
			<div style={{margin:"0 0.5em", padding: 0, marginTop:"-2em"}}>
				{t('global.rows_per_page')}:
				<Dropdown
					style={{margin: "0.5em"}}
					placeholder={t('global.rows_per_page')}
					value={pageSize}
					onChange={(e, { value }) => setPageSize(value as number)}
					options={[1,2,5,10].map(x => {
						return {
							value: x,
							key: x,
							text: "" + x
						}
					})}
					/>
			</div>
			<div style={{margin:"0.5em", padding: 0, marginTop: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "-1.5em"}}>
				{t('collections.options.show_crew.title')}:
				<Dropdown
					style={{margin: "0.5em"}}
					placeholder={"Show Crew"}
					value={crewPos}
					onChange={(e, { value }) => setCrewPos(value as ('top' | 'bottom'))}
					options={['top', 'bottom'].map(x => {
						return {
							value: x,
							key: x,
							text: t(`collections.options.show_crew.${x}`)
						}
					})}
					/>
			</div>
			<div style={{margin:"0.5em", padding: 0, marginTop: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "-1.5em"}}>
				{t('collections.options.mode.title')}:
				<Dropdown
					style={{margin: "0.5em"}}
					placeholder={"Mode"}
					value={matchMode}
					onChange={(e, { value }) => setMatchMode(value as CollectionMatchMode)}
					options={['normal', 'exact-only', 'extended', 'inexact-only'].map(x => {
						return {
							value: x,
							key: x,
							text: t(`collections.options.mode.${x}`)
						}
					})}
					/>
			</div>
		</div>}
		</>}
		{workerRunning && <div style={{height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start"}}>{context.core.spin("Calculating Crew...")}</div>}
		{!colOptimized?.length && <div className='ui segment'>No results.</div>}
		<br /><br /><br />
	</div>)

}