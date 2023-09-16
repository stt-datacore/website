import React from 'react';
import { GlobalContext } from '../../context/globalcontext';
import { CrewMember } from '../../model/crew';
import { PlayerCrew, PlayerCollection, PlayerData, CompletionState, BuffBase, Reward } from '../../model/player';
import { neededStars, starCost } from '../../utils/crewutils';
import { getCollectionRewards } from '../../utils/itemutils';
import { CollectionFilterContext, CollectionGroup, CollectionMap, MapFilterOptions, makeCiteNeeds } from './utils';
import { Image, Input, Icon, Button, Checkbox, Pagination, Table, Grid, Dropdown } from 'semantic-ui-react';
import { RewardsGridNeed, RewardPicker, RewardsGrid } from '../crewtables/rewards';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { CrewItemsView } from '../item_presenters/crew_items';
import { formatColString } from '../item_presenters/crew_preparer';
import ItemDisplay from '../itemdisplay';
import { useStateWithStorage } from '../../utils/storage';

export interface GroupTableProps {
	playerCollections: PlayerCollection[];
    colGroups: CollectionMap[];
};


export const CollectionGroupTable = (props: GroupTableProps) => {
    const colContext = React.useContext(CollectionFilterContext);
    const context = React.useContext(GlobalContext);
    const { playerCollections, colGroups } = props;
    const { setShort: internalSetShort, short, searchFilter, setSearchFilter, mapFilter, setMapFilter } = colContext;

    const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
	const [pageSize, setPageSize] = useStateWithStorage("colGroups/itemsPerPage", 1, { rememberForever: true });

	const setShort = (value: boolean) => {
		if (value !== short) {
			internalSetShort(value);
			setMapFilter({ ... mapFilter ?? {}, rewardFilter: [] });
		}		
	}

	const [groupPage, setGroupPage] = React.useState(1);
	const [groupPageCount, setGroupPageCount] = React.useState(1);
	
    const addToSearchFilter = (value: string) => {
		if (searchFilter?.length) {
			setSearchFilter(searchFilter + "; " + value);
		}
		else {
			setSearchFilter(value);
		}
	}

	const pageCount = Math.ceil(colGroups.length / pageSize);

	if (pageCount !== groupPageCount || groupPage > pageCount) {
		setGroupPageCount(pageCount);
		setGroupPage(Math.min(pageCount, 1));
		return <></>
	}
	let crewprep = colGroups.map((col) => col.crew).flat();
	const allCrew = crewprep.filter((fc, idx) => crewprep.findIndex(fi => fi.symbol === fc.symbol) === idx).sort((a, b) => a.name.localeCompare(b.name));
	
	//const rewards =
	const renderCollectionGroups = (colMap: CollectionMap[]) => {		
		return (<div style={{
			display: "flex",
			flexDirection: "column",
			justifyContent: "stretch"
		}}>
			{!mapFilter?.collectionsFilter?.length && 
				<i className='ui segment' style={{color:"goldenrod", fontWeight: 'bold', margin: "0.5em 0"}}>
					The grouped collection view shows only owned crew if the collections list is not filtered.
				</i>}
			<div style={{
				display: "flex",
				flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
				alignItems: "center",
				justifyContent: "flex-start"			
			}}>
				<Dropdown
					multiple
					style={{ width: narrow ? '100%' : '50%', margin: "0.5em 0" }}
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
					value={mapFilter?.rewardFilter} 
					onChange={(value) => setMapFilter({ ...mapFilter ?? {}, rewardFilter: value as string[] | undefined })}
					 />
				<Checkbox label={"Group rewards"} checked={short} onChange={(e, { checked }) => setShort(checked ?? false)} />
			</div>
			{!!colMap?.length && 			
			<div style={{display:"flex", flexDirection: "row", alignItems: "center"}}>
			<Pagination style={{margin: "1em 0 1em 0"}} totalPages={pageCount} activePage={groupPage} onPageChange={(e, { activePage }) => setGroupPage(activePage as number) } />
			<div style={{margin:"0 0.5em", padding: 0}}>
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
			</div>}

			<Table striped>
				{colMap.slice(pageSize * (groupPage - 1), (pageSize * (groupPage - 1)) + pageSize).map((col, idx) => {

					const collection = col.collection;
					if (!collection?.totalRewards || !collection.milestone) return <></>;
					const rewards = collection.totalRewards > 0 ? collection.milestone.buffs?.map(b => b as BuffBase).concat(collection.milestone.rewards ?? []) as Reward[] : [];
					
					const crewneed = (collection?.milestone?.goal === 'n/a' ? 0 : collection?.milestone?.goal ?? 0);
					const crewhave = (collection?.owned ?? 0);

					return (<Table.Row key={"colgroup" + idx}>
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
							
						<Grid doubling columns={3} textAlign='center' >
								{col.crew.map((crew, ccidx) => (
									<div 
										className={ccidx < (collection?.needed ?? 0) ? 'ui segment' : undefined}
										style={{  
											margin: "1.5em", 
											display: "flex", 
											flexDirection: "column", 
											alignItems: "center", 
											justifyContent: "center",
											padding:"0.25em 1em",
											paddingTop: ccidx < (collection?.needed ?? 0) ? '0.75em' : undefined,
											borderRadius: "5px",																			
											
									}}>
									
									{ccidx < (collection?.needed ?? 0) && 
										<div style={{zIndex: 500, display: 'flex', width: "100%", flexDirection:'row', justifyContent: 'center'}}>
										<Icon color='green' 
											name='star'
											style={{marginLeft:"-52px", marginBottom: "-16px", height:'24px'}} />
										</div>}
									
									<ItemDisplay 
										size={64}
										src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
										rarity={!crew.have ? 0 : crew.rarity}
										maxRarity={crew.max_rarity}
										targetGroup={'collectionsTarget'}
										itemSymbol={crew.symbol}
										allCrew={context.core.crew}
										playerData={context.player.playerData}
										/>

										<b
											onClick={(e) => addToSearchFilter(crew.name)} 
											style={{
											cursor: "pointer", 
											margin:"0.5em 0 0 0",
											textDecoration: "underline"
											}}
											title={"Click to see collections containing this crew member"}
											>
											{crew.favorite && <Icon name='heart' style={{textDecoration: 'none'}} />} {crew.name}
										</b>			
										<i>({crew.pickerId} collections increased)</i>
										<i>Level {crew.level}</i>
										<CrewItemsView itemSize={16} mobileSize={16} crew={crew} />
										
										<div style={{margin:"0.5em 0"}}>
										<RewardsGrid kind={'need'} needs={makeCiteNeeds(crew)} />
										</div>
											
									</div>
								))}
							</Grid>
						</Table.Cell>
					</Table.Row>)
					}
				)}

			</Table>
			{!!colMap?.length && 			
			<div style={{display:"flex", flexDirection: "row", alignItems: "center"}}>
			<Pagination style={{margin: "1em 0 1em 0"}} totalPages={pageCount} activePage={groupPage} onPageChange={(e, { activePage }) => setGroupPage(activePage as number) } />
			<div style={{margin:"0 0.5em", padding: 0}}>
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
			</div>}
			{!colMap?.length && <div className='ui segment'>No results.</div>}
			<br /><br /><br />
		</div>)

	}
    
    return renderCollectionGroups(colGroups);
}


