import React from 'react';
import { CollectionFilterContext } from './filtercontext';
import { Pagination, Table, Grid, Image, Dropdown, Button, Checkbox, Icon, Input, Progress } from 'semantic-ui-react';
import { Reward, BuffBase, PlayerCrew, PlayerCollection } from '../../model/player';
import { RewardPicker, RewardsGrid } from '../crewtables/rewards';
import { CrewItemsView } from '../item_presenters/crew_items';
import { formatColString } from '../item_presenters/crew_preparer';
import ItemDisplay from '../itemdisplay';
import { GlobalContext } from '../../context/globalcontext';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { useStateWithStorage } from '../../utils/storage';
import { appelate } from '../../utils/misc';
import CollectionsCrewCard from './crewcard';
import { CollectionGroup, CollectionMap } from '../../model/collectionfilter';
import { makeCiteNeeds, neededStars, starCost } from '../../utils/collectionutils';

export interface CollectionOptimizerProps {
    colOptimized: CollectionGroup[];
	playerCollections: PlayerCollection[];
	workerRunning: boolean;
}

interface ComboConfig {
	collection: string;
	name: string;
}

export const CollectionOptimizerTable = (props: CollectionOptimizerProps) => {
    const colContext = React.useContext(CollectionFilterContext);
    const context = React.useContext(GlobalContext);
    const { workerRunning, playerCollections } = props;
    const { costMode, setCostMode, setShort: internalSetShort, short, searchFilter, setSearchFilter, mapFilter, setMapFilter } = colContext;

    const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    
    const { colOptimized } = props;
    
	const [pageSize, setPageSize] = useStateWithStorage("colOptimizer/itemsPerPage", 1, { rememberForever: true });
	const [byCost, internalSetByCost] = useStateWithStorage("colOptimizer/sortByCost", false, { rememberForever: true });
	const [combos, setCombos] = React.useState([] as ComboConfig[]);
	const [optPage, setOptPage] = React.useState(1);
	const [optPageCount, setOptPageCount] = React.useState(1);	
	const [crewPos, setCrewPos] = useStateWithStorage<'top' | 'bottom'>("colOptimizer/crewPos", 'top', { rememberForever: true });

	const searches = searchFilter?.length ? searchFilter.split(';').map(sf => sf.trim())?.filter(f => f?.length) ?? [] : [];
	const costMap = [] as { collection: string, combo: string[], cost: number, crew: PlayerCrew[] }[];

	const setByCost = (value: boolean) => {
		internalSetByCost(value);
		setMapFilter({ ... mapFilter });
	}
	
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
		return f?.name ?? (col.combos?.length ? col.combos[0].join(" / ") : undefined);
	}
	
	const getOptCols = (col: CollectionGroup, combo?: string) => {
		if (!combo) {
			return col.maps;
		}
		else {
			let split = combo.split(" / ");
			return split.map(s => col.maps.find(cm => cm.collection.name === s.replace("* ", ''))).filter(f => f) as CollectionMap[];	
		}
	}

	const getOptCrew = (col: CollectionGroup, combo?: string) => {
		let cma: PlayerCrew[];
		let cols = getOptCols(col, combo);
		if (!combo) {
			cma = col.uniqueCrew;
		}
		else {

			cma = cols.map(c => c.crew.slice(0, c.collection.needed)).flat();
			cma = cma.filter((cz, idx) => cma.findIndex(cfi => cfi.symbol === cz.symbol) === idx);

			let max = cols.map(c => c.collection.needed ?? 0).reduce((p, n) => p + n, 0);			
			max = col.collection.needed ?? 0;

			if (cma.length < max) {
				let cm = 0;
				let cidx = 0;
				let c = col.uniqueCrew.length;
				while (cm < max && cidx < c) {
					if (cma.some(cc => cc.symbol === col.uniqueCrew[cidx].symbol)) {
						cidx++;
						continue;
					}
					cma.push(col.uniqueCrew[cidx]);
					cidx++;
					cm++;					
				}
			}
		}			

		let needs = [ col.collection.needed ?? 0, ... cols.map(c => c.collection.needed ?? 0) ];
		let chks = [ 0, ... cols.map(c => 0) ];
		let allneed = undefined as number | undefined;

		cma.sort((a, b) => {
			let x = 0;
			let y = 0;
			
			if (searches?.length) {
				let ares = searches.includes(a.name);
				let bres = searches.includes(b.name);
				if (ares !== bres) {
					if (ares) return -1;
					return 1;
				}
			}
			if (a.favorite != b.favorite) {
				if (a.favorite) return -1;
				else return 1;
			}
			if (col.collection.crew?.find(f => f === a.symbol)) x++;
			if (col.collection.crew?.find(f => f === b.symbol)) y++;

			for (let i = 0; i < cols.length; i++) {
				if (cols[i].crew.find(fc => fc.symbol === a.symbol)) {
					x++;
				}
				if (cols[i].crew.find(fc => fc.symbol === b.symbol)) {
					y++;
				}
			}
			let r = y - x;
			if (!r) {
				r = starCost([a], undefined, costMode === 'sale') - starCost([b], undefined, costMode === 'sale');
			}
			return r;
		});
		
		let p = 0;
		
		for (let item of cma) {
			if (col.collection.crew?.find(f => item.symbol === f)) {
				chks[0]++;
			}
			for (let i = 0; i < cols.length; i++) {
				if (cols[i].crew.find(fc => fc.symbol === item.symbol)) {
					chks[i+1]++;
				}					
			}

			let ct = 0;				
			for (let i = 0; i < needs.length; i++) {
				if (chks[i] >= needs[i]) ct++;
			}
			if (ct >= needs.length && !allneed) {
				allneed = p + 1;
			}			
			p++;
		}

		return cma.slice(0, allneed);			
		
	}
	

	colOptimized.forEach((col) => {			
		col.comboCost = [];
		for(let combo of col.combos ?? []) {
			let crew = getOptCrew(col, combo.join(" / "));
			costMap.push({
				collection: col.collection.name,
				combo: combo,
				cost: starCost(crew, undefined, costMode === 'sale'),
				crew: crew
			});
		}

		//cmap.sort((a, b) => a.cost - b.cost);
		//col.combos = cmap.map(m => m.combo);
		col.comboCost = costMap.map(m => m.cost);
	});

	const findCrew = (col: CollectionGroup, combo?: string) => {
		return costMap.find(f => f.collection === col.collection.name && (!combo || f.combo.join(" / ") === combo))?.crew ?? [];
	}

    const addToSearchFilter = (value: string) => {
		if (searchFilter?.length) {
			setSearchFilter(searchFilter + "; " + value);
		}
		else {
			setSearchFilter(value);
		}
	}
	
	if (colOptimized?.length) {
		colOptimized.forEach(col => {
			let map = costMap.filter(f => f.collection === col.collection.name);
			map = map.filter(mf => (!byCost || (byCost && !!mf.cost)) && mf.crew.length <= (col.collection.needed ?? 0));
			col.combos = map.map(m => m.combo);
			col.comboCost = map.map(m => m.cost);
		});	
	}

	if (byCost && colOptimized?.length ){
		colOptimized.forEach(col => {
			let map = costMap.filter(f => f.collection === col.collection.name);
			map = map.sort((a, b) => a.cost - b.cost);
			col.combos = map.map(m => m.combo);
			col.comboCost = map.map(m => m.cost);
		});
	
		colOptimized.sort((a, b) => {
			let acost = 0;
			let bcost = 0;

			if (a.comboCost?.length) {
				acost = a.comboCost[0];
			}
			else {
				acost = 0;
			}
			if (b.comboCost?.length) {
				bcost = b.comboCost[0];
			}
			else {
				bcost = 0;
			}
			return acost - bcost;

		});	
	}

	let crewprep = colOptimized.map((col) => col.uniqueCrew).flat();
	const allCrew = crewprep.filter((fc, idx) => crewprep.findIndex(fi => fi.symbol === fc.symbol) === idx).sort((a, b) => a.name.localeCompare(b.name));
	
	const finalCol = colOptimized.filter((col) => {		
		if (searches?.length) {
			let newcombos = [] as string[][];
			let newcombocost = [] as number[];
			let x = 0;
			for (let combo of col.combos ?? []) {
				let fc = findCrew(col, combo.join(" / "));
				if (fc.some(fcc => searches.includes(fcc.name))) {
					newcombos.push(combo);
					if (col.comboCost?.length) newcombocost.push(col.comboCost[x]);
				}
				x++;
			}
			col.combos = newcombos;
			col.comboCost = newcombocost;
			if (!col.uniqueCrew?.some(f => searches.includes(f.name))) return false;
		}
		return !!col.combos?.length;
	});

	const optCount = Math.ceil(finalCol.length / pageSize);

	if (optCount !== optPageCount || optPage > optCount) {
		setOptPageCount(optCount);
		setOptPage(Math.min(optCount, 1));
		return <></>
	}

	//const rewards =
	const renderOptimizer = (colMap: CollectionGroup[]) => {		
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
					disabled={byCost}
					value={mapFilter?.rewardFilter} 
					onChange={(value) => setMapFilter({ ...mapFilter ?? {}, rewardFilter: value as string[] | undefined })}
					 />
				<Checkbox disabled={byCost} style={{margin: "0 1em"}} label={"Group rewards"} checked={short} onChange={(e, { checked }) => setShort(checked ?? false)} />
				<Checkbox style={{margin: "0.5em 1em"}} label={"Sort by cost"} checked={byCost} onChange={(e, { checked }) => setByCost(checked ?? false)} />
				<Checkbox style={{margin: "0.5em 1em"}} label={"Honor Sale Pricing"} checked={costMode === 'sale'} onChange={(e, { checked }) => setCostMode(checked ? 'sale' : 'normal')} />
			</div>

			{!workerRunning &&
			<>
			{!!colMap?.length && 			
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
			</div>}
			<Table striped>
				{colMap.slice(pageSize * (optPage - 1), (pageSize * (optPage - 1)) + pageSize).map((col, idx) => {
					
					const optCombo = getCombo(col);					
					const comboCrew = findCrew(col, optCombo);
					if (!comboCrew?.length && optCombo !== undefined && optCombo !== '') {
						window.setTimeout(() => {
							setCombo(col, col.combos ? col.combos[0].join(" / ") : undefined);
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
									key: opt.join(" / "),
									value: opt.join(" / "),
									text: opt.join(" / ")
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
			{!!colMap?.length && 			
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
			</div>}
			</>}
			{workerRunning && <div style={{height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start"}}>{context.core.spin("Calculating Crew...")}</div>}
			{!colMap?.length && <div className='ui segment'>No results.</div>}
			<br /><br /><br />
		</div>)

	}

    return renderOptimizer(finalCol);
}