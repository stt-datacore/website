import React from 'react';
import { CollectionFilterContext } from './filtercontext';
import { Pagination, Table, Grid, Image, Dropdown, Button, Checkbox, Icon, Input, Progress } from 'semantic-ui-react';
import { Reward, BuffBase, PlayerCrew, PlayerCollection } from '../../model/player';
import { RewardPicker, RewardsGrid } from '../crewtables/rewards';
import { CrewItemsView } from '../item_presenters/crew_items';
import { formatColString } from './overview';
import ItemDisplay from '../itemdisplay';
import { GlobalContext } from '../../context/globalcontext';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { useStateWithStorage } from '../../utils/storage';
import { appelate } from '../../utils/misc';
import CollectionsCrewCard from './crewcard';
import { ColComboMap, CollectionGroup, CollectionMap, ComboCostMap, CollectionMatchMode } from '../../model/collectionfilter';
import { findColGroupsCrew, getOptCols, getOptCrew, makeCiteNeeds, neededStars, starCost } from '../../utils/collectionutils';

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
    const colContext = React.useContext(CollectionFilterContext);
    const context = React.useContext(GlobalContext);
    const { workerRunning, playerCollections } = props;
    const { byCost, setByCost, matchMode, setMatchMode, costMode, setCostMode, setShort: internalSetShort, short, searchFilter, setSearchFilter, mapFilter, setMapFilter } = colContext;

    const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    
    const { costMap, colOptimized } = props;
    
	const [pageSize, setPageSize] = useStateWithStorage("colOptimizer/itemsPerPage", 1, { rememberForever: true });
	const [combos, setCombos] = React.useState([] as ComboConfig[]);
	const [optPage, setOptPage] = React.useState(1);
	const [optPageCount, setOptPageCount] = React.useState(1);	
	const [crewPos, setCrewPos] = useStateWithStorage<'top' | 'bottom'>("colOptimizer/crewPos", 'top', { rememberForever: true });
	const [allCrew, setAllCrew] = React.useState<PlayerCrew[]>([]);

	const setShort = (value: boolean) => {
		if (value !== short) {
			internalSetShort(value);
			setMapFilter({ ... mapFilter ?? {}, rewardFilter: [] });
		}		
	}

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
		let crewprep = colOptimized.map((col) => col.uniqueCrew).flat();
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
		<i className='ui segment' style={{color:"goldenrod", fontWeight: 'bold', margin: "0.5em 0"}}>
			The collection optimizer view shows only owned crew.
		</i>
		
		<div style={{
			display: "flex",
			flexDirection: 
				window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',

			alignItems:
				window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'flex-start' : 'center',

			justifyContent: "flex-start"			
		}}>
			<Dropdown
				multiple
				style={{ width: narrow ? '100%' : '30%', margin: "0.5em 0" }}
				iconPosition="left"
				scrolling		
				options={allCrew?.map(ca => {
					return {
						key: ca.name,
						value: ca.name,
						text: 
							<div key={"dropdown_opt_"+ca.symbol} style={{display:"inline-flex", alignItems:"center", flexDirection:"row"}}>
								<img 
									src={`${process.env.GATSBY_ASSETS_URL}${ca.imageUrlPortrait}`} 
									style={{height:'2em', marginRight:"0.5em"}} />
								{ca.name}
							</div>
					}
				}) ?? []}
				placeholder="Click crew name to filter..."
				value={searchFilter.split(";").map(s => s.trim())}
				onChange={(e, { value }) => setSearchFilter((value as string[])?.join("; "))} />

			<RewardPicker 
				short={short}
				setShort={setShort}
				source={playerCollections} 
				icons
				//disabled={byCost}
				value={mapFilter?.rewardFilter} 
				onChange={(value) => setMapFilter({ ...mapFilter ?? {}, rewardFilter: value as string[] | undefined })}
					/>
			<Checkbox 
				// disabled={byCost} 
				style={{margin: "0 1em"}} 
				label={"Group rewards"} 
				checked={short} 
				onChange={(e, { checked }) => setShort(checked ?? false)} 
				/>
			<Checkbox style={{margin: "0.5em 1em"}} label={"Sort by cost"} checked={byCost} onChange={(e, { checked }) => setByCost(checked ?? false)} />
			<Checkbox style={{margin: "0.5em 1em"}} label={"Honor Sale Pricing"} checked={costMode === 'sale'} onChange={(e, { checked }) => setCostMode(checked ? 'sale' : 'normal')} />
		</div>

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
				Items Per Page:
				<Dropdown 
					style={{margin: "0.5em"}}
					placeholder={"Items Per Page"}
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
				Show Crew:
				<Dropdown 
					style={{margin: "0.5em"}}
					placeholder={"Show Crew"}
					value={crewPos}
					onChange={(e, { value }) => setCrewPos(value as ('top' | 'bottom'))}
					options={['top', 'bottom'].map(x => {
						return {
							value: x,
							key: x,
							text: "" + appelate(x)
						}
					})}
					/>
			</div>
			<div style={{margin:"0.5em", padding: 0, marginTop: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "-1.5em"}}>
				Mode:
				<Dropdown 
					style={{margin: "0.5em"}}
					placeholder={"Mode"}
					value={matchMode}
					onChange={(e, { value }) => setMatchMode(value as CollectionMatchMode)}
					options={['normal', 'exact-only', 'extended', 'inexact-only'].map(x => {
						return {
							value: x,
							key: x,
							text: "" + appelate(x)
						}
					})}
					/>
			</div>
		</div>}
		<Table striped>
			{colOptimized.slice(pageSize * (optPage - 1), (pageSize * (optPage - 1)) + pageSize).map((col, idx) => {
				
				const optCombo = getCombo(col);					
				const comboCrew = findColGroupsCrew(costMap, col, optCombo);
				if (!comboCrew?.length && optCombo !== undefined && optCombo !== '') {
					window.setTimeout(() => {
						setCombo(col, col.combos ? col.combos[0].names.join(" / ") : undefined);
					});						
					return <></>
				}
				const collection = JSON.parse(JSON.stringify(col.collection)) as PlayerCollection;
				collection.neededCost = starCost(comboCrew, undefined, costMode === 'sale');
				col.neededStars = neededStars(comboCrew);
				if (!collection?.totalRewards || !collection.milestone) return <></>;
				const rewards = collection.totalRewards > 0 ? collection.milestone.buffs?.map(b => b as BuffBase).concat(collection.milestone.rewards ?? []) as Reward[] : [];
				
				const crewneed = (collection?.milestone?.goal === 'n/a' ? 0 : collection?.milestone?.goal ?? 0);
				const crewhave = (collection?.owned ?? 0);

				return (<Table.Row key={"colgroup" + idx} >
					<Table.Cell width={4} style={{verticalAlign:"top"}}>
						<div style={{								
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							alignItems: "center",
							height: "100%",
							margin: "1em"
						}}>
						
						<Image size='medium' src={`${process.env.GATSBY_ASSETS_URL}${collection.image?.replace("/collection_vault/", 'collection_vault_')}.png`}
							style={{ margin: "0.5em 0", border: '1px solid #7f7f7f7f', borderRadius: '6px'}}
							title={collection.name}
						/>
						<h2 
							onClick={(e) => { setSearchFilter(''); setMapFilter({ ...mapFilter ?? {}, collectionsFilter: [collection.id]})}}
							style={{textDecoration: "underline",marginBottom: 0, textAlign: "center", margin: '0.5em 0', cursor: "pointer"}}>{collection.name}</h2>
						<i>{formatColString(collection.description ?? "", { textAlign: 'center' })}</i>
						<hr style={{width: "16em"}}></hr>
						<i style={{fontSize: "0.9em"}}>{collection.needed} needed for rewards:</i>
						<div style={{margin: "0.5em 0 0.5em 0"}}>
							<RewardsGrid wrap={true} rewards={rewards} />
						</div>
						<i style={{fontSize: "0.9em"}}>{collection.owned} / {collection.crew?.length} Owned</i>
						<i style={{fontSize: "0.9em"}}>Progress to next: {(typeof collection?.milestone?.goal === 'number' && collection?.milestone?.goal > 0) ? `${collection.progress} / ${collection.milestone.goal}` : 'MAX'}</i>
						
						{(crewhave >= crewneed && !!collection.neededCost) && 
							(<div style={{marginTop:"0.5em"}}>
							<i style={{fontSize: "0.9em"}}>
								Citation cost to next: 
								<img
								src={`${process.env.GATSBY_ASSETS_URL}currency_honor_currency_0.png`}
								style={{width : '16px', verticalAlign: 'text-bottom'}}
								/> 
								{collection.neededCost.toLocaleString()}
							</i>
							<div style={{marginTop:"0.5em"}}>
							<RewardsGrid kind={'need'} needs={makeCiteNeeds(col)} />
							<Progress 
								value={context.player.playerData?.player.honor} total={collection.neededCost} 
								label={
									<div style={{display:"flex", flexDirection:"row", alignItems:"center", justifyContent: "center"}}>
										<img
											src={`${process.env.GATSBY_ASSETS_URL}currency_honor_currency_0.png`}
											style={{width : '16px', verticalAlign: 'text-bottom', margin:"0 0.5em"}}
											/>
										{context.player.playerData?.player.honor.toLocaleString()} / {collection.neededCost.toLocaleString()}
										{(context.player.playerData?.player.honor ?? 0) > (collection.neededCost ?? 0) && <Icon name='check' size='small' color='green' style={{margin:"0 0.5em"}} />}
									</div>}
						
								/>
							</div>
							</div>)}
							{(crewhave >= crewneed && !collection.neededCost && <i style={{ fontSize: "0.9em", textAlign: "center", color: 'lightgreen'}}>
								All crew required to reach the next milestone are already fully fused.
								</i>)}
							
						{crewhave < crewneed && 
							<i className='ui segment' style={{color:'salmon', textAlign: 'center', margin: "0.5em"}}>
								You need to recruit {crewneed - crewhave} more crew to reach the next goal.
							</i>}
						</div>
					</Table.Cell>
					<Table.Cell style={{verticalAlign:"top"}}>
						<h3 style={{margin:"0.5em", textAlign: 'center'}}>Additional Collection Milestones:<br /></h3>						
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
										const rewards = collection.totalRewards > 0 ? collection.milestone.buffs?.map(b => b as BuffBase).concat(collection.milestone.rewards ?? []) as Reward[] : [];
										
										const crewneed = (collection?.milestone?.goal === 'n/a' ? 0 : collection?.milestone?.goal ?? 0);
										const crewhave = (collection?.owned ?? 0);

									return <div style={{								
										display: "flex",
										flexDirection: "column",
										justifyContent: "center",
										alignItems: "center",
										height: "100%",
										margin: "1em",
										maxWidth: "325px"
									}}>
									
									<Image size='medium' src={`${process.env.GATSBY_ASSETS_URL}${collection.image?.replace("/collection_vault/", 'collection_vault_')}.png`}
										style={{ margin: "0.5em 0", border: '1px solid #7f7f7f7f', borderRadius: '6px'}}
										title={collection.name}
									/>
									<h2 
										onClick={(e) => { setSearchFilter(''); setMapFilter({ ...mapFilter ?? {}, collectionsFilter: [collection.id]})}}
										style={{textDecoration: "underline",marginBottom: 0, textAlign: "center", margin: '0.5em 0', cursor: "pointer"}}>{collection.name}</h2>
									<i>{formatColString(collection.description ?? "", { textAlign: 'center' })}</i>
									<hr style={{width: "16em"}}></hr>
									<i style={{fontSize: "0.9em"}}>{collection.needed} needed for rewards:</i>
									<div style={{margin: "0.5em 0 0.5em 0"}}>
										<RewardsGrid wrap={true} rewards={rewards} />
									</div></div>
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
				</Table.Row>)
				}
			)}

		</Table>
		{!!colOptimized?.length && 			
			<div style={{display:"flex",
					flexDirection: 
						window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row', 
					alignItems: "center"						
					}}>

			<Pagination style={{margin: "0.25em 0 2em 0"}} totalPages={optPageCount} activePage={optPage} onPageChange={(e, { activePage }) => setOptPage(activePage as number) } />
			<div style={{margin:"0 0.5em", padding: 0, marginTop:"-2em"}}>
				Items Per Page:
				<Dropdown 
					style={{margin: "0.5em"}}
					placeholder={"Items Per Page"}
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
				Show Crew:
				<Dropdown 
					style={{margin: "0.5em"}}
					placeholder={"Show Crew"}
					value={crewPos}
					onChange={(e, { value }) => setCrewPos(value as ('top' | 'bottom'))}
					options={['top', 'bottom'].map(x => {
						return {
							value: x,
							key: x,
							text: "" + appelate(x)
						}
					})}
					/>
			</div>
			<div style={{margin:"0.5em", padding: 0, marginTop: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "-1.5em"}}>
				Mode:
				<Dropdown 
					style={{margin: "0.5em"}}
					placeholder={"Mode"}
					value={matchMode}
					onChange={(e, { value }) => setMatchMode(value as CollectionMatchMode)}
					options={['normal', 'exact-only', 'extended', 'inexact-only'].map(x => {
						return {
							value: x,
							key: x,
							text: "" + appelate(x)
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