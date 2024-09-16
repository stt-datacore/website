// import { Link } from 'gatsby';
// import React from 'react';
// import { Accordion, Button, Checkbox, Dropdown, Grid, Icon, Input, Label, Pagination, Popup, Rating, Segment, Tab, Table } from 'semantic-ui-react';
// import { calculateBuffConfig } from '../../utils/voyageutils';

// import { UnifiedWorker } from '../../typings/worker';

// import { StatLabelProps } from '../statlabel';
// import { GlobalContext } from '../../context/globalcontext';
// import { CrewMember } from '../../model/crew';
// import { LockedProspect } from '../../model/game-elements';
// import { CiteEngine, CiteMode, PlayerCrew, PlayerData } from '../../model/player';
// import { BetaTachyonRunnerConfig, BetaTachyonSettings, CiteData, SkillOrderRarity, VoyageImprovement } from '../../model/worker';
// import { applyCrewBuffs, gradeToColor, numberToGrade, printPortalStatus, printSkillOrder } from '../../utils/crewutils';
// import { appelate } from '../../utils/misc';
// import { TinyStore } from '../../utils/tiny';
// import CONFIG from '../CONFIG';
// import { PortalFilter, RarityFilter, descriptionLabel } from '../crewtables/commonoptions';
// import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
// import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
// import ItemDisplay from '../itemdisplay';
// import BetaTachyonSettingsPopup, { DefaultBetaTachyonSettings, permalinkToSettings } from './btsettings';
// import ProspectPicker from '../prospectpicker';
// import { navToCrewPage } from '../../utils/nav';

// const pagingOptions = [
// 	{ key: '0', value: 10, text: '10' },
// 	{ key: '1', value: 25, text: '25' },
// 	{ key: '2', value: 50, text: '50' },
// 	{ key: '3', value: 100, text: '100' }
// ];

// type CiteOptimizerProps = {
// };

// interface SymCheck { symbol: string, checked: boolean };

// type CiteOptimizerState = {
// 	citePage: number;
// 	trainingPage: number;
// 	paginationRows: number;
// 	citeData: CiteData | undefined | null;
// 	currentCrew: CrewMember | null | undefined;
// 	touchCrew: CrewMember | null | undefined;
// 	touchToggled: boolean;
// 	citeMode?: CiteMode;
// 	sort?: string;
// 	direction?: 'ascending' | 'descending';
// 	checks?: SymCheck[];
// 	settingsOpen: boolean;
// 	betaTachyonSettings: BetaTachyonSettings;
// 	skoMap: { [key: string]: SkillOrderRarity }
// 	crewSkills: { [key: string]: string };
// 	prospects: LockedProspect[];
// 	appliedProspects: PlayerCrew[];
// 	unownedProspects: boolean;
// 	showEV: boolean;
// };

// export class StatLabel extends React.Component<StatLabelProps> {
// 	render() {
// 		const { title, value } = this.props;

// 		return (
// 			<Label size="small" style={{ marginBottom: '0.5em', width: "12em" }}>
// 				{title}
// 				<Label.Detail>{value}</Label.Detail>
// 			</Label>
// 		);
// 	}
// }

// class CiteOptimizer extends React.Component<CiteOptimizerProps, CiteOptimizerState> {
// 	static contextType = GlobalContext;
// 	context!: React.ContextType<typeof GlobalContext>;
// 	private lastCiteMode: CiteMode | undefined = undefined;
// 	private tiny = TinyStore.getStore('citeOptimizer');

// 	constructor(props: CiteOptimizerProps) {
// 		super(props);
// 		let plink = permalinkToSettings();
// 		if (plink) {
// 			this.tiny.setValue<BetaTachyonSettings>('betaTachyonSettings', plink);
// 		}
		
// 		let prospects: LockedProspect[] = this.tiny.getValue<LockedProspect[]>('lockedProspects', []) ?? [];
		
// 		this.state = {
// 			citePage: 1,
// 			trainingPage: 1,
// 			paginationRows: this.tiny.getValue<number>('paginationRows', 25) ?? 25,
// 			citeData: undefined,
// 			currentCrew: undefined,
// 			touchCrew: undefined,
// 			touchToggled: false,
// 			direction: 'ascending',
// 			citeMode: {
// 				rarities: [],
// 				engine: this.tiny.getValue<CiteEngine>('engine', "original") ?? "original"
// 			},
// 			settingsOpen: false,
// 			betaTachyonSettings: {
// 				... DefaultBetaTachyonSettings,
// 				... this.tiny.getValue<BetaTachyonSettings>('betaTachyonSettings', DefaultBetaTachyonSettings) ?? DefaultBetaTachyonSettings
// 			},
// 			skoMap: {},
// 			crewSkills: {},
// 			prospects,
// 			unownedProspects: this.tiny.getValue('unowned', false) ?? false,
// 			appliedProspects: [],
// 			showEV: this.tiny.getValue('showEV', false) ?? false
// 		};
// 	}

// 	readonly setUnowned = (value: boolean) => {		
// 		this.tiny.setValue('unowned', value, true);
// 		this.setState({ ...this.state, unownedProspects: value });
// 	}

// 	readonly setProspects = (value: LockedProspect[]) => {
// 		value.forEach(f => {
// 			if (f.rarity === f.max_rarity) {
// 				f.rarity = 1;
// 			}
// 		});
// 		this.tiny.setValue('lockedProspects', value, true);
// 		this.setState({ ...this.state, prospects: value });
// 	}

// 	readonly applyProspects = () => {
// 		const { crew } = this.context.core;
// 		const { buffConfig } = this.context.player;
// 		const { prospects } = this.state;

// 		if (!crew) return;
// 		let outcrew = [] as PlayerCrew[];
// 		let nid = -90000;

// 		prospects.forEach((p) => {
// 			let c = crew.find(f => f.symbol === p.symbol) as PlayerCrew;
// 			if (c) {
// 				c = JSON.parse(JSON.stringify(c)) as PlayerCrew;
// 				c.id = nid--;
// 				c.date_added = new Date(c?.date_added);
// 				c.level = 100;
// 				c.rarity = p.rarity;
// 				c.prospect = true;
// 				c.equipment = [0, 1, 2, 3];
// 				c.immortal = 0;
// 				let skillset = c.skill_data.find(f => f.rarity === p.rarity);
// 				if (skillset) {
// 					c.base_skills = skillset.base_skills;
// 				}
// 				if (buffConfig) {					
// 					applyCrewBuffs(c, buffConfig);
// 				}
// 				Object.keys(c.base_skills).forEach((skill) => {
// 					c.skills ??= {}
// 					if (c[skill]) {
// 						c.skills[skill] = {
// 							core: c[skill].core,
// 							range_min: c[skill].min,
// 							range_max: c[skill].max
// 						}
// 					}
// 				});

// 				outcrew.push(c);
// 			}
// 		});

// 		this.setState({ ... this.state, appliedProspects: outcrew, citeData: undefined });
// 		setTimeout(() =>{
// 			const { citeMode } = this.state;
// 			this.runWorker(citeMode);
// 		});
// 	}

// 	readonly getSettingsOpen = () => {
// 		return this.state.settingsOpen;
// 	}
// 	readonly setSettingsOpen = (value: boolean) => {
// 		this.setState({ ... this.state, settingsOpen: value });
// 	}

// 	readonly setSettings = (value: BetaTachyonSettings) => {
// 		if (JSON.stringify(value) !== JSON.stringify(this.state.betaTachyonSettings)) {
// 			this.tiny.setValue('betaTachyonSettings', value, true);
// 			this.setState({ ...this.state, betaTachyonSettings: value, citeData: undefined });
// 			setTimeout(() =>{
// 				const { citeMode } = this.state;
// 				this.runWorker(citeMode);
// 			});
// 		}
// 	}

// 	componentDidMount() {
// 		const { citeMode } = this.state;
// 		if (!this.lastCiteMode) {
// 			const crewsk = {} as { [key: string]: string };
// 			for (let crew of this.context.core.crew) {
// 				let sko = printSkillOrder(crew).replace(/_skill/g, '');
// 				crewsk[crew.symbol] = sko;
				
// 			}
			
// 			this.setState({ ... this.state, crewSkills: crewsk });
			
// 			if (this.state.prospects.length && this.state.appliedProspects.length !== this.state.prospects.length) {
// 				this.applyProspects();
// 			}
// 			else {
// 				window.setTimeout(() => {
// 					this.runWorker(citeMode);
// 				});
// 			}
// 		}
// 		else {
// 			this.runWorker(citeMode);
// 		}
// 	}

// 	componentDidUpdate(prevProps: Readonly<CiteOptimizerProps>, prevState: Readonly<CiteOptimizerState>, snapshot?: any): void {
// 		if (JSON.stringify(this.state.citeMode ?? {}) !== JSON.stringify(this.lastCiteMode ?? {})) {
// 			this.lastCiteMode = this.state.citeMode;
// 			this.runWorker(this.lastCiteMode);
// 		}
// 	}

// 	readonly setEngine = (engine: CiteEngine) => {
// 		if (this.state.citeMode?.engine !== engine) {
// 			this.tiny.setValue('engine', engine, true);
// 			this.setState({ ... this.state, citeMode: { ... this.state.citeMode, engine: engine }, citeData: null });
// 		}
// 	}

// 	readonly setChecked = (crew: PlayerCrew | string, value?: boolean) => {
// 		const fpros = this.state.checks ?? [] as SymCheck[];
// 		let fi: SymCheck | null = null;

// 		if (typeof crew === 'string') {
// 			fi = fpros.find(z => z.symbol === crew) ?? null;
// 		}
// 		else {
// 			fi = fpros.find(z => z.symbol === crew.symbol) ?? null;
// 		}

// 		if (fi) {
// 			fi.checked = value ?? false;
// 		}
// 		else if (value) {
// 			fi = {
// 				symbol: typeof crew === 'string' ? crew : crew.symbol,
// 				checked: value
// 			}
// 			fpros.push(fi);
// 		}

// 		this.setState({ ... this.state, checks: fpros });
// 	}

// 	readonly getChecked = (crew: PlayerCrew | string) => {
// 		const fpros = this.state.checks ?? [] as SymCheck[];
// 		let fi: SymCheck | null = null;

// 		if (typeof crew === 'string') {
// 			fi = fpros.find(z => z.symbol === crew) ?? null;
// 		}
// 		else {
// 			fi = fpros.find(z => z.symbol === crew.symbol) ?? null;
// 		}

// 		return fi?.checked ?? false;
// 	}

// 	private runWorker(citeMode?: CiteMode) {
// 		const worker = new UnifiedWorker();
// 		const { buffConfig } = this.context.player;
// 		const allCrew = this.context.core.crew;
// 		const collections = this.context.core.collections;

// 		if (!this.context.player.playerData) return;

// 		let playerData = JSON.parse(JSON.stringify(this.context.player.playerData)) as PlayerData;		

// 		if (this.state.appliedProspects?.length) {
// 			playerData.player.character.crew = playerData.player.character.crew.concat(this.state.appliedProspects);
// 		}

// 		const engine = this.state.citeMode?.engine ?? "original";
		
// 		playerData.citeMode = citeMode;

// 		worker.addEventListener('message', (message: { data: { result: any; }; }) => {
// 			const result = message.data.result as CiteData;

// 			if (engine === 'beta_tachyon_pulse') {
// 				let skmap = {} as { [key: string]: SkillOrderRarity };		
// 				result.skillOrderRarities.forEach(sko => skmap[sko.skillorder] = sko);
// 				let retrievable = result.crewToRetrieve.filter(f => playerData.player.character.crew.find(fc => fc.name === f.name && fc.unique_polestar_combos?.length))
// 				result.crewToRetrieve = retrievable.map((r, i) => ({ ...r, pickerId: i + 1 }));
// 				this.setState({ citeData: result, skoMap: skmap });	
// 			}
// 			else {
// 				let retrievable = result.crewToCite.filter(f => playerData.player.character.crew.find(fc => fc.name === f.name && fc.unique_polestar_combos?.length))
// 				result.crewToRetrieve = retrievable.map((r, i) => ({ ...JSON.parse(JSON.stringify(r)), pickerId: i + 1 }));
// 				this.setState({ citeData: result });	
// 			}

// 		});

// 		const workerName = engine === 'original' ? 'citeOptimizer' : 'ironywrit';

// 		if (engine === 'original') {
// 			worker.postMessage({
// 				worker: workerName,
// 				playerData,
// 				allCrew,
// 				collections,
// 				buffs: buffConfig
// 			});
// 		}
// 		else {
// 			worker.postMessage({
// 				worker: workerName,
// 				config: { 
// 					playerData,
// 					inputCrew: allCrew,
// 					collections,
// 					buffs: buffConfig,
// 					settings: this.state.betaTachyonSettings,
// 					coreItems: this.context.core.items
// 				} as BetaTachyonRunnerConfig
// 			});	
// 		}
// 	}

// 	cc = false;

// 	private createStateAccessors<T>(name: string, persist?: boolean): [T, (value: T) => void] { return [
// 		this.state[name],
// 		persist ? 
// 		(value: T) => {
// 			this.tiny.setValue(name, value, true);
// 			this.setState((prevState) => { prevState[name] = value; return prevState; });
// 		} 
// 		:
// 		(value: T) => this.setState((prevState) => { prevState[name] = value; return prevState; })	
// 	] };

// 	renderVoyageGroups(data: CiteData, confine?: string[]) {
// 		const voyages = [] as VoyageImprovement[];
// 		let currVoy: string = '';
// 		const { playerData } = this.context.player;

// 		const voyageData = this.context.player.ephemeral;
// 		const [citeMode, setCiteMode] = this.createStateAccessors<CiteMode>('citeMode');

// 		if (voyageData?.voyage?.length) {
// 			let v = voyageData.voyage[0];
// 			let sk = [v.skills.primary_skill, v.skills.secondary_skill].map((t) => t.replace("_skill", "")).reduce((prev, curr) => prev + "/" + curr);
// 			if (sk) currVoy = appelate(sk);
// 		}

// 		const currentVoyage = currVoy;

// 		[data.crewToCite, data.crewToTrain].forEach((dataSet) => {
// 			for (let voycrew of dataSet) {
// 				const findcrew = playerData?.player.character.crew.find((c) => c.name === voycrew.name) ?? this.context.core.crew.find(f => f.symbol === voycrew.symbol);

// 				if (!findcrew) continue;

// 				if (this.state.checks?.some(c => c.checked) && !this.state.checks?.some(c => c.checked && c.symbol === findcrew?.symbol)) {
// 					continue;
// 				}

// 				const crew = JSON.parse(JSON.stringify(findcrew), (key, value) => {
// 					if (key.includes("data")) {
// 						try {
// 							let v = new Date(value);
// 							return v;
// 						}
// 						catch {
// 							return value;
// 						}
// 					}
// 					return value;
// 				});

// 				crew.voyagesImproved = voycrew.voyagesImproved;
// 				crew.evPerCitation = voycrew.evPerCitation;
// 				crew.addedEV = voycrew.addedEV;
// 				crew.totalEVContribution = voycrew.totalEVContribution;
// 				crew.totalEVRemaining = voycrew.totalEVRemaining;
// 				crew.pickerId = voycrew.pickerId;

// 				for (let voyage of crew.voyagesImproved ?? []) {
// 					if (!!(confine?.length) && !confine.includes(voyage)) continue;

// 					let vname = appelate(voyage);
// 					let currvoy = voyages.find((v) => v.voyage === vname);

// 					if (!currvoy){
// 						currvoy = { voyage: vname, crew: [], maxEV: 0, remainingEV: 0 };
// 						voyages.push(currvoy);
// 					}

// 					let test = currvoy.crew.find((c) => c.name === crew.name);

// 					if (!test) {
// 						currvoy.crew.push(crew);
// 					}
// 				}
// 			}
// 		});

// 		voyages.sort((a, b) => {

// 			let ma = Math.max(...a.crew.map(ac => ac.totalEVContribution ?? 0));
// 			let mb = Math.max(...b.crew.map(bc => bc.totalEVContribution ?? 0));

// 			if (!a.maxEV) a.maxEV = ma;
// 			if (!b.maxEV) b.maxEV = mb;

// 			let ra = Math.min(...a.crew.map(ac => ac.totalEVRemaining ?? 0));
// 			let rb = Math.min(...b.crew.map(bc => bc.totalEVRemaining ?? 0));

// 			if (!a.remainingEV) a.remainingEV = ra;
// 			if (!b.remainingEV) b.remainingEV = rb;

// 			if (a.voyage === currentVoyage) return -1;
// 			else if (b.voyage === currentVoyage) return 1;

// 			let r = mb - ma;

// 			if (r) return r;

// 			r = ra - rb;

// 			if (r) return r;

// 			ma = a.crew.map(ac => ac.pickerId ?? 0).reduce((prev, curr) => prev + curr);
// 			mb = b.crew.map(bc => bc.pickerId ?? 0).reduce((prev, curr) => prev + curr);

// 			r = ma - mb;

// 			if (r) return r;

// 			r = b.crew.length - a.crew.length;
// 			if (!r) r = a.voyage.localeCompare(b.voyage);

// 			return r;
// 		});

// 		voyages.forEach((voyage) => {
// 			voyage.crew.sort((a, b) => {
// 				if (a.totalEVContribution !== undefined && b.totalEVContribution !== undefined) {
// 					return b.totalEVContribution - b.totalEVContribution;
// 				}
// 				else if (a.pickerId !== undefined && b.pickerId !== undefined) {
// 					return a.pickerId - b.pickerId;
// 				}
// 				else {
// 					return a.name.localeCompare(b.name);
// 				}

// 			})
// 		})

// 		return (<div style={{
// 			display: "flex",
// 			flexDirection: "column",
// 			justifyContent: "stretch"
// 		}}>
// 			<Table striped>
// 				{voyages.map((voyage, idx) => {

// 					let sp = voyage.voyage.split("/");
// 					if (citeMode?.priSkills?.length) {
// 						if (!citeMode.priSkills.includes(sp[0])) return (<></>);
// 					}
// 					if (citeMode?.secSkills?.length) {
// 						if (!citeMode.secSkills.includes(sp[1])) return (<></>);
// 					}


// 					return (<Table.Row key={"voy" + idx}>
// 						<Table.Cell style={{backgroundColor: voyage.voyage === currentVoyage ? 'green' : undefined,}}>
// 							<div style={{
// 								display: "flex",
// 								flexDirection: "column",
// 								justifyContent: "center",
// 								alignItems: "center",
// 								height: "100%",
// 								margin: "1em"
// 							}}>
// 							{voyage.voyage === currentVoyage && <h3 style={{marginBottom:0}}><u>Current Voyage</u></h3>}
// 							<h2 style={{marginBottom: 0}}>{voyage.voyage}</h2>
// 							<i style={{margin:0}}>(Max Final EV: <b>+{Math.ceil(voyage.maxEV)})</b></i>
// 							<i style={{margin:0}}>(Min Remaining EV: <b>+{Math.ceil(voyage.remainingEV)})</b></i>
// 							</div>
// 						</Table.Cell>
// 						<Table.Cell>

// 						<Grid doubling columns={3} textAlign='center'>
// 								{voyage.crew.filter(c => !!c).map((crew) => (
// 									<div style={{margin: "1.5em", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
// 									<ItemDisplay
// 										size={64}
// 										src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
// 										rarity={crew.rarity}
// 										maxRarity={crew.max_rarity}
// 										targetGroup='citationTarget'
// 										itemSymbol={crew.symbol}
// 										allCrew={this.context.core.crew}
// 										playerData={this.context.player.playerData}
// 										/>
// 										<b onClick={(e) => setCiteMode({ ... citeMode ?? {}, nameFilter: crew.name })}
// 											style={{
// 											cursor: "pointer",
// 											margin:"0.5em 0 0 0",
// 											textDecoration: "underline"
// 											}}
// 											title={"Click to see only this crew member"}
// 											>
// 												{crew.name} ({crew.pickerId})
// 										</b>
// 										<i style={{margin:"0"}} >
// 											<span
// 											title={"Click to see only voyages involving this crew member"}
// 											style={{cursor: "pointer", margin:"0", textDecoration: "underline"}}
// 											 onClick={(e) => setCiteMode({ ... citeMode ?? {}, nameFilter: "voyage:" + crew.name })}
// 											>{crew.voyagesImproved?.length} Voyages, </span>
// 											{Math.ceil(crew.totalEVContribution ?? 0)} Total EV
// 										</i>
// 									</div>
// 								))}
// 							</Grid>
// 						</Table.Cell>
// 					</Table.Row>)
// 					}
// 				)}

// 			</Table>
// 		</div>)

// 	}

// 	setSort = (key?: string) => {
// 		this.setState({ ... this.state, sort: key });
// 	}

// 	setDirection = (key?: 'ascending' | 'descending') => {
// 		this.setState({ ...this.state, direction: key });
// 	}

// 	sortcrew = (crew: PlayerCrew[], training: boolean, engine: 'original' | 'beta_tachyon_pulse') => {
// 		const { crewSkills, sort, direction, skoMap } = this.state;

// 		if (!sort || !direction) return crew;

// 		return crew.sort((a, b) => {
// 			let r = 0;
			
// 			if (sort === 'pickerId' && a.pickerId && b.pickerId) {
// 				r = a.pickerId - b.pickerId;
// 			}
// 			else if (sort === 'name') {
// 				r  = a.name.localeCompare(b.name);
// 			}
// 			else if (sort === 'rarity') {
// 				r = a.max_rarity - b.max_rarity;				
// 				if (!r) r = a.rarity - b.rarity;
// 			}
// 			else if (sort === 'quipment_score') {
// 				r = Math.ceil(a.quipment_score ?? 0) - Math.ceil(b.quipment_score ?? 0);
// 			}
// 			else if (sort === 'groupSparsity') {
// 				r = (a.groupSparsity ?? 0) - (b.groupSparsity ?? 0);
// 			}
// 			else if (sort === 'finalEV') {
// 				let aev = Math.ceil(training ? (a.addedEV ?? a.totalEVContribution ?? 0) : (a.totalEVContribution ?? 0));
// 				let bev = Math.ceil(training ? (b.addedEV ?? b.totalEVContribution ?? 0) : (b.totalEVContribution ?? 0));
// 				r = aev - bev;
// 			}
// 			else if (sort === 'remainingEV' && !training) {
// 				r = Math.ceil(a.totalEVRemaining ?? 0) - Math.ceil(b.totalEVRemaining ?? 0);
// 			}
// 			else if (sort === 'evPer' && !training) {
// 				r = Math.ceil(a.evPerCitation ?? 0) - Math.ceil(b.evPerCitation ?? 0);
// 			}
// 			else if (sort === 'voyages') {
// 				r = (a.voyagesImproved?.length ?? 0) - (b.voyagesImproved?.length ?? 0);
// 			}
// 			else if (sort === 'amTraits' && engine === 'beta_tachyon_pulse') {
// 				r = (a.amTraits?.length ?? 0) - (b.amTraits?.length ?? 0);
// 			}
// 			else if (sort === 'colIncreased' && engine === 'beta_tachyon_pulse') {
// 				r = (a.collectionsIncreased?.length ?? 0) - (b.collectionsIncreased?.length ?? 0);
// 			}
// 			else if (sort === 'eventScore' && engine === 'beta_tachyon_pulse') {
// 				r = (a.events ?? 0) - (b.events ?? 0);
// 			}
// 			else if (sort === 'skillOrder' && engine === 'beta_tachyon_pulse') {
// 				let ska = crewSkills[a.symbol];
// 				let skb = crewSkills[b.symbol];
// 				r = skoMap[ska].count - skoMap[skb].count;
// 				if (!r) {
// 					r = (a.scoreTrip ?? 0) - (b.scoreTrip ?? 0);
// 					if (direction === 'ascending') r *= -1;
// 				}
// 			}
// 			else if (sort === 'in_portal') {
// 				if (a.in_portal) r--;
// 				if (b.in_portal) r++;

// 				//if (!r) r = a.obtained.localeCompare(b.obtained);
// 			}
// 			else if (sort === 'compare') {
// 				if (this.getChecked(a.symbol)) r--;
// 				if (this.getChecked(b.symbol)) r++;
// 			}
			
// 			if (direction === 'descending') r *= -1;
			
// 			if (!r) {
// 				r = (a.pickerId ?? 0) - (b.pickerId ?? 0);
// 			}
// 			if (!r) {
// 				r = a.name.localeCompare(b.name);
// 			}			
			
// 			return r;
// 		})
// 	}

// 	renderTable(data?: PlayerCrew[], tabName?: string, training = true) {
// 		if (!data || !this.context.player.playerData) return <></>;
// 		const { t } = this.context.localized;
// 		const [paginationPage, setPaginationPage] = this.createStateAccessors<number>(training ? 'trainingPage' : 'citePage');
// 		const [otherPaginationPage, setOtherPaginationPage] = this.createStateAccessors<number>(training ? 'citePage' : 'trainingPage');
// 		const [paginationRows, setPaginationRows] = this.createStateAccessors<number>('paginationRows', true);
// 		const [showEV, setShowEV] = this.createStateAccessors<boolean>('showEV', true);
// 		const [currentCrew, setCurrentCrew] = this.createStateAccessors<(PlayerCrew | CrewMember | null | undefined)>('currentCrew');
// 		const engine = this.state.citeMode?.engine ?? 'original';
// 		const skoMap = this.state.skoMap;
// 		const baseRow = (paginationPage - 1) * paginationRows;
// 		const totalPages = Math.ceil(data.length / paginationRows);
// 		const buffConfig = calculateBuffConfig(this.context.player.playerData.player);
// 		tabName ??= "";
// 		const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
// 			console.log("imageClick");
// 			// if (matchMedia('(hover: hover)').matches) {
// 			// 	window.location.href = "/crew/" + data.symbol;
// 			// }
// 		}
// 		const maxQuip = data.map(d => d.quipment_score ?? 0).reduce((p, n) => p > n ? p : n, 0);
// 		const { sort, direction } = this.state;
// 		data = this.sortcrew(data ?? [], training, engine);

// 		const formatVoyImp = (value: string) => {
// 			return value.split("/").map(m => m+"_skill").map(skill => CONFIG.SKILLS[skill]).join("/");
// 		}

// 		return (<div style={{overflowX: "auto"}}>
// 			<Table sortable celled selectable striped collapsing unstackable compact="very">
// 				<Table.Header>
// 					<Table.Row>
// 						<Table.HeaderCell 
// 							onClick={(e) => sort === 'pickerId' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('pickerId')}
// 							sorted={sort === 'pickerId' ? direction : undefined}>

// 							Rank
// 						</Table.HeaderCell>
// 						<Table.HeaderCell 
// 							onClick={(e) => sort === 'name' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('name')}
// 							sorted={sort === 'name' ? direction : undefined}>
// 							Crew
// 						</Table.HeaderCell>
// 						<Table.HeaderCell 
// 							onClick={(e) => sort === 'rarity' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('rarity')}
// 							sorted={sort === 'rarity' ? direction : undefined}>
// 							Rarity
// 						</Table.HeaderCell>
// 						{(engine !== 'beta_tachyon_pulse' || showEV) && <Table.HeaderCell 
// 							onClick={(e) => sort === 'finalEV' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('finalEV')}
// 							sorted={sort === 'finalEV' ? direction : undefined}>
// 							Final EV
// 						</Table.HeaderCell>}
// 						{!training && (engine !== 'beta_tachyon_pulse' || showEV) &&
// 						<React.Fragment>
// 							<Table.HeaderCell
// 								onClick={(e) => sort === 'remainingEV' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('remainingEV')}
// 								sorted={sort === 'remainingEV' ? direction : undefined}>
// 								Remaining EV
// 							</Table.HeaderCell>
// 							<Table.HeaderCell
// 								onClick={(e) => sort === 'evPer' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('evPer')}
// 								sorted={sort === 'evPer' ? direction : undefined}>
// 								EV Per<br />Citation
// 							</Table.HeaderCell>
// 						</React.Fragment>
// 						}
// 						<Table.HeaderCell
// 								onClick={(e) => sort === 'voyages' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('voyages')}
// 								sorted={sort === 'voyages' ? direction : undefined}>
// 							Voyage<br />Groups
// 						</Table.HeaderCell>
// 						{engine === 'beta_tachyon_pulse' &&
// 							<React.Fragment>
// 							<Table.HeaderCell
// 								onClick={(e) => sort === 'groupSparsity' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('groupSparsity')}
// 								sorted={sort === 'groupSparsity' ? direction : undefined}>
// 								Voyage<br />Group<br />Sparsity
// 							</Table.HeaderCell>
// 							<Table.HeaderCell
// 								onClick={(e) => sort === 'amTraits' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('amTraits')}
// 								sorted={sort === 'amTraits' ? direction : undefined}>
// 								Antimatter<br />Traits
// 							</Table.HeaderCell>
// 							<Table.HeaderCell
// 								onClick={(e) => sort === 'colIncreased' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('colIncreased')}
// 								sorted={sort === 'colIncreased' ? direction : undefined}>
// 								Stat-<br />Boosting<br />Collections
// 							</Table.HeaderCell>
// 							<Table.HeaderCell
// 								onClick={(e) => sort === 'skillOrder' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('skillOrder')}
// 								sorted={sort === 'skillOrder' ? direction : undefined}>
// 								Skill Order
// 							</Table.HeaderCell>
// 							<Table.HeaderCell
// 								onClick={(e) => sort === 'quipment_score' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('quipment_score')}
// 								sorted={sort === 'quipment_score' ? direction : undefined}>
// 								Quipment<br />Score
// 							</Table.HeaderCell>
// 							</React.Fragment>
// 							}
// 						<Table.HeaderCell
// 							onClick={(e) => sort === 'in_portal' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('in_portal')}
// 							sorted={sort === 'in_portal' ? direction : undefined}>
// 							In Portal
// 						</Table.HeaderCell>
// 						<Table.HeaderCell
// 							onClick={(e) => sort === 'compare' ? this.setDirection(direction === 'descending' ? 'ascending' : 'descending') : this.setSort('compare')}
// 							sorted={sort === 'compare' ? direction : undefined}>
// 							Compare
// 						</Table.HeaderCell>
// 					</Table.Row>
// 				</Table.Header>
// 				<Table.Body>
// 					{data.slice(baseRow, baseRow + paginationRows).map((row, idx: number) => {
// 						let cop: PlayerCrew | undefined;
						
// 						if (this.state.citeMode?.engine === 'beta_tachyon_pulse') {
// 							cop = this.state.appliedProspects.find(c => c.id === row.id) ?? this.context.player.playerData?.player.character.crew.find(c => c.id == row.id);
// 						}
// 						else {
// 							cop = this.state.appliedProspects.find(c => c.name === row.name) ?? this.context.player.playerData?.player.character.crew.find(c => c.name == row.name);
// 						}
						
// 						const crew = cop;
// 						const crew_quipment_score = Math.round(((row.quipment_score ?? 0) / maxQuip) * 1000) / 10;
// 						const crew_sparsity = Math.round(((row.groupSparsity ?? 0)) * 1000) / 10;
// 						const skp = engine === 'beta_tachyon_pulse' && !!crew ? printSkillOrder(crew).replace(/_skill/g, '') : 'no_order';
// 						const sko = engine === 'beta_tachyon_pulse' && !!crew ? crew.skill_order : 'no_order';
// 						//const isProspect = !!crew?.prospect;
// 						const rarecolor = skp !== 'no_order' ? CONFIG.RARITIES[skoMap[skp].rarity].color : undefined;

// 						return (!!crew && !!sko && !!skp &&
// 							<Table.Row key={crew.symbol + idx + tabName} positive={this.getChecked(crew.symbol)}>

// 								<Table.Cell>{row.pickerId}</Table.Cell>
// 								<Table.Cell>
// 									<div
// 										style={{
// 											display: 'grid',
// 											gridTemplateColumns: '60px auto',
// 											gridTemplateAreas: `'icon stats' 'icon description'`,
// 											gridGap: '1px'
// 										}}>
// 										<div style={{ gridArea: 'icon' }}

// 										>
// 											<CrewTarget targetGroup='citationTarget'
// 												inputItem={crew}>
// 												<img
// 													onClick={(e) => imageClick(e, crew)}
// 													width={48}
// 													src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
// 													/>
// 											</CrewTarget>
// 										</div>
// 										<div style={{ gridArea: 'stats' }}>
// 											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
// 										</div>
// 										<div style={{ gridArea: 'description' }}>{descriptionLabel(t, crew, false)}</div>
// 									</div>
// 								</Table.Cell>
// 								<Table.Cell>
// 									<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
// 								</Table.Cell>
// 								{(engine !== 'beta_tachyon_pulse' || showEV) &&<Table.Cell>
// 									{Math.ceil(training ? (row.addedEV ?? row.totalEVContribution ?? 0) : (row.totalEVContribution ?? 0))}
// 								</Table.Cell>}
// 								{
// 									!training && (engine !== 'beta_tachyon_pulse' || showEV) &&
// 									<React.Fragment>
// 										<Table.Cell>
// 											{Math.ceil(row.totalEVRemaining ?? 0)}
// 										</Table.Cell>
// 										<Table.Cell>
// 											{Math.ceil(row.evPerCitation ?? 0)}
// 										</Table.Cell>
// 									</React.Fragment>
// 								}
// 								<Table.Cell>
// 									<Popup trigger={<b>{row.voyagesImproved?.length}</b>} content={row.voyagesImproved?.map(voy => formatVoyImp(voy)).join(', ')} />
// 								</Table.Cell>
// 								{engine === 'beta_tachyon_pulse' &&
// 									<React.Fragment>
// 										<Table.Cell>
// 										<div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.25em"}}>
// 											<span style={{
// 												color: gradeToColor(crew_sparsity / 100) ?? undefined
// 											}}>
// 												{numberToGrade(crew_sparsity / 100)}
// 											</span>
// 											<sub><i>({crew_sparsity.toLocaleString()})</i></sub>
// 											</div>
// 										</Table.Cell>
// 										<Table.Cell>
// 											<Popup trigger={<b>{row.amTraits?.length}</b>} content={row.amTraits?.map(tr => this.context.localized.TRAIT_NAMES[tr]).join(', ')} />
// 										</Table.Cell>
// 										<Table.Cell>
// 											<Popup trigger={<b>{row.collectionsIncreased?.length}</b>} content={row.collectionsIncreased?.join(' / ')} />
// 										</Table.Cell>
// 										<Table.Cell width={2}>
// 										<div style={{
// 												display: "flex",
// 												flexDirection: "row",
// 												justifyContent: "flex-start",
// 												alignItems: "left"
// 											}}>

// 											<div style={{
// 												display: "flex",
// 												flexDirection: "column",
// 												justifyContent: "center",
// 												alignItems: "center"
// 											}}>
// 												<div style={{
// 													display: "flex",
// 													flexDirection: "row",
// 													justifyContent: "space-evenly",
// 													alignItems: "center"
// 												}}>
// 													{row.skill_order.map((mskill, idx) => (
// 													<img
// 														title={appelate(mskill)}
// 														key={"skimage"+idx+mskill}
// 														src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${mskill}.png`}
// 														style={{
// 															maxHeight: "1.5em",
// 															maxWidth: "1.5em",
// 															margin: "0.5em",
// 														}}

// 													/>))}
// 												</div>

// 												{!!skoMap[skp] && <div>
// 													<Popup trigger={
// 														<div style={{textAlign:'center'}}>
// 															<hr style={{width: "100px", height:"2px", borderRadius:"2px", color: rarecolor, background: rarecolor}} color={rarecolor} />
// 															<i style={{
// 																fontSize: "0.75em",
// 																fontWeight: "bold",
// 																color: gradeToColor(row.scoreTrip ?? 0) ?? 'lightgreen'
// 																}}>
// 																{Math.floor(100 * (row?.scoreTrip ?? 0)) / 10} / 10
// 															</i>
// 														</div>
// 														//<Rating icon='star' size='mini' style={{color: CONFIG.RARITIES[skoMap[skp].rarity].color}} disabled rating={skoMap[skp].rarity} maxRating={5} />
// 														} 
// 														content={
// 															<div>
// 																<b>Skill Order:</b><br/>
// 																<b style={{color: rarecolor}}>{CONFIG.RARITIES[skoMap[skp].rarity].name}</b>
// 																{skoMap[skp].skills.map((sk, idx) => <div key={sk+idx.toString()}>{idx+1}. {appelate(sk)}</div>)}
// 																<hr />
// 																<div>Crew Rank: <i style={{																
// 																	fontWeight: "bold",
// 																	color: gradeToColor(row.scoreTrip ?? 0) ?? 'lightgreen'
// 																	}}>
// 																	{Math.floor(100 * (row?.scoreTrip ?? 0)) / 10} / 10
// 																	</i>
// 																</div>
// 																<div>Total Crew: <b>{skoMap[skp].count}</b></div>
// 															</div>
// 														} />
													
// 												</div>}
// 											</div>
// 										</div>
// 										</Table.Cell>
// 										<Table.Cell>
// 											<div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.25em"}}>
// 											<span style={{
// 												color: gradeToColor(crew_quipment_score / 100) ?? undefined
// 											}}>
// 												{numberToGrade(crew_quipment_score / 100)}
// 											</span>
// 											<sub><i>({crew_quipment_score.toLocaleString()})</i></sub>
// 											</div>
// 										</Table.Cell>
// 									</React.Fragment>

// 									}

// 								<Table.Cell>
// 									<span title={printPortalStatus(crew, t, true, true)}>
// 									{printPortalStatus(crew, t, true, true)}
// 									</span>
// 								</Table.Cell>
// 								<Table.Cell>
// 									<Checkbox checked={this.getChecked(crew.symbol)} onChange={(e, { checked }) => this.setChecked(crew.symbol, checked as boolean)} />
// 								</Table.Cell>
// 							</Table.Row>
// 						);
// 					})}
// 				</Table.Body>
// 				<Table.Footer>
// 					<Table.Row>
// 						<Table.HeaderCell colSpan={engine === 'beta_tachyon_pulse' ? 15 : 9}>
// 							<div style={{ paddingLeft: '2em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>

// 							<Pagination
// 								totalPages={totalPages}
// 								activePage={paginationPage}
// 								onPageChange={(event, { activePage }) => setPaginationPage(activePage as number)}
// 							/>
// 							<div style={{ paddingLeft: '2em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
								
// 								<div style={{marginRight:"0.5em"}}>{t('global.rows_per_page')}:</div>
// 								<Dropdown
// 									inline
// 									options={pagingOptions}
// 									value={paginationRows}
// 									onChange={(event, { value }) => {
// 										setPaginationPage(1);
// 										setOtherPaginationPage(1);
// 										setPaginationRows(value as number);
// 									}}
// 								/>
// 							</div>
// 							</div>
// 						</Table.HeaderCell>
// 					</Table.Row>
// 				</Table.Footer>
// 			</Table>
// 			</div>);
// 	}

// 	get crew(): CrewMember | undefined {
// 		return this.state.currentCrew ?? undefined;
// 	}

// 	findSkills(crew: PlayerCrew[], secondary?: boolean) {
// 		let sk = [] as string[];
// 		for (let cm of crew) {
// 			if (cm.voyagesImproved?.length) {
// 				for (let voy of cm.voyagesImproved) {
// 					let sp = voy.split("/");
// 					let ns = (appelate(secondary ? sp[1] : sp[0]));
// 					if (!sk.includes(ns)) {
// 						sk.push(ns);
// 					}
// 				}
// 			}
// 		}

// 		sk.sort();
// 		return sk;
// 	}

// 	render() {
// 		if (!this.context.player.playerData) return <></>;
// 		const { t } = this.context.localized;
// 		const buffConfig = calculateBuffConfig(this.context.player.playerData.player);
// 		const [citeMode, setCiteMode] = this.createStateAccessors<CiteMode>('citeMode');
// 		const [showEV, setShowEV] = this.createStateAccessors<boolean>('showEV', true);
// 		const { engine } = citeMode;
// 		const { prospects, unownedProspects } = this.state;

// 		const [preFilterData, setCiteData] = this.createStateAccessors<CiteData | undefined>('citeData');

// 		let compact = true;
// 		const workset = !preFilterData ? undefined : { ...preFilterData, crewToCite: [ ... preFilterData?.crewToCite ?? [] ], crewToTrain: [ ... preFilterData?.crewToTrain ?? [] ] } as CiteData;

// 		workset?.crewToCite?.forEach((crew, idex) => crew.pickerId = idex + 1);
// 		workset?.crewToTrain?.forEach((crew, idex) => crew.pickerId = idex + 1);

// 		let pri: string[] = [];
// 		let sec: string[] = [];
// 		let seat: string[] = [];

// 		const confine = [] as string[];

// 		const engOptions = [
// 			{
// 				key: 'original',
// 				value: 'original',
// 				text: t('cite_opt.original_engine')
// 			},
// 			{
// 				key: 'beta_tachyon_pulse',
// 				value: 'beta_tachyon_pulse',
// 				text: `${t('cite_opt.btp.name')} (${t('global.experimental')})`
// 			}
// 		]

// 		if (workset) {
// 			let ac = workset.crewToCite.concat(workset.crewToTrain);
// 			pri = this.findSkills(ac);
// 			sec = this.findSkills(ac, true);
// 			seat = ["command", "diplomacy", "science", "engineering", "security", "medicine"].sort();
// 		}

// 		const priSkills = pri.map((sk) =>{
// 			return {
// 				key: sk,
// 				value: sk,
// 				text: sk
// 			}
// 		})

// 		const secSkills = sec.map((sk) =>{
// 			return {
// 				key: sk,
// 				value: sk,
// 				text: sk
// 			}
// 		})

// 		const seatSkills = seat.map((sk) =>{
// 			return {
// 				key: sk,
// 				value: sk,
// 				text: appelate(sk)
// 			}
// 		})

// 		if (workset && citeMode?.priSkills?.length) {
// 			workset.crewToCite = workset.crewToCite.filter((crew) => crew.voyagesImproved?.some(vi => citeMode.priSkills?.some(ci => vi.startsWith(ci.toLowerCase()))));
// 			workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.voyagesImproved?.some(vi => citeMode.priSkills?.some(ci => vi.startsWith(ci.toLowerCase()))));
// 		}

// 		if (workset && citeMode?.secSkills?.length) {
// 			workset.crewToCite = workset.crewToCite.filter((crew) => crew.voyagesImproved?.some(vi => citeMode.secSkills?.some(ci => vi.endsWith(ci.toLowerCase()))));
// 			workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.voyagesImproved?.some(vi => citeMode.secSkills?.some(ci => vi.endsWith(ci.toLowerCase()))));
// 		}

// 		if (workset && citeMode?.seatSkills?.length) {
// 			const { playerData } = this.context.player;

// 			workset.crewToCite = workset.crewToCite
// 				.map(crew => {
// 					let fc = playerData?.player?.character?.crew?.find(fc => fc.name === crew.name);
// 					if (fc) {
// 						crew.base_skills = fc.base_skills;
// 					}
// 					return crew;
// 				})
// 				.filter((crew) => citeMode.seatSkills?.some(sk => (sk.toLowerCase() + "_skill") in crew?.base_skills));

// 			workset.crewToTrain = workset.crewToTrain
// 				.map(crew => {
// 					let fc = playerData?.player?.character?.crew?.find(fc => fc.name === crew.name);
// 					if (fc) {
// 						crew.base_skills = fc.base_skills;
// 					}
// 					return crew;
// 				})
// 				.filter((crew) => citeMode.seatSkills?.some(sk => (sk.toLowerCase() + "_skill") in crew?.base_skills));
// 		}

// 		if (workset && citeMode?.portal !== undefined && this.context?.player?.playerData?.player?.character?.crew?.length) {
// 			workset.crewToCite = workset.crewToCite.filter((crew) => this.context.core.crew.find(c => c.name === crew.name)?.in_portal === citeMode.portal);
// 			workset.crewToTrain = workset.crewToTrain.filter((crew) => this.context.core.crew.find(c => c.name === crew.name)?.in_portal === citeMode.portal);
// 		}

// 		if (workset && citeMode?.nameFilter) {
// 			if (citeMode.nameFilter.startsWith("voyage:")) {
// 				const voyscan = citeMode.nameFilter.slice(7).toLowerCase();
// 				const voycrew = workset.crewToCite.concat(workset.crewToTrain).find(d => d.name.toLowerCase() === voyscan);

// 				if (voycrew) {
// 					workset.crewToCite = workset.crewToCite.filter((crew) => crew.voyagesImproved?.some(p => voycrew.voyagesImproved?.includes(p)));
// 					workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.voyagesImproved?.some(p => voycrew.voyagesImproved?.includes(p)));
// 					for (let vn of voycrew.voyagesImproved ?? []) {
// 						confine.push(vn);
// 					}
// 				}
// 				else {
// 					workset.crewToCite = workset.crewToCite.filter((crew) => crew.name.toLowerCase().includes(voyscan));
// 					workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.name.toLowerCase().includes(voyscan));
// 				}
// 			}
// 			else {
// 				workset.crewToCite = workset.crewToCite.filter((crew) => crew.name.toLowerCase().includes(citeMode.nameFilter?.toLowerCase() ?? ""));
// 				workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.name.toLowerCase().includes(citeMode.nameFilter?.toLowerCase() ?? ""));
// 			}
// 		}

// 		const citeData = workset;
// 		const compareCount = this.state.checks?.filter(z => z.checked)?.length;
// 		const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

// 		const corePool = this.context.core.crew.filter(c => 
// 		{
// 			let res = Object.keys(c.base_skills).length === 3 && (!citeMode.rarities?.length || citeMode.rarities.includes(c.max_rarity));
// 			if (res && unownedProspects) {
// 				res &&= !!this.context.player.playerData?.player.character.unOwnedCrew?.find(f => f.symbol === c.symbol)
// 			}
// 			return res;
// 		});

// 		return (
// 			<>
// 				<Accordion
// 					defaultActiveIndex={-1}
// 					panels={[
// 						{
// 							index: 0,
// 							key: 0,
// 							title: 'Explainer (Click To Expand)',
// 							content: {
// 								content: (
// 									<div>
// 										{/* <h3>Explanation</h3> */}
// 										<p>
// 											A crew's Expected Value (EV) is the average you can expect a crew to contribute to all voyages. EV Final accounts for the crew fully fused. EV Left, while less important, calculates the difference in contribution between fully fused and their current rank. Voyages Improved is how many of the voyage combinations the crew contributes to. Primary and secondary are taken into account, because CMD/DIP voyage will yield different results than DIP/CMD.
// 										</p>
// 										<p>
// 											A crew's EV for a voyage is found by finding the crew's average for the skill "Base + (Min + Max) / 2", multiplying that by 0.35 if the skill is the primary for the voyage, 0.25 if it is secondary, and 0.1 otherwise. To find how much the crew contributes to the total voyage, we find the best crew for the voyage that are fully leveled and equipped.
// 										</p>
// 										<p>
// 											"Training" is considered simply leveling and equipping the considered crew <u>at their current rarity</u>. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>at current rarity</u>.
// 										</p>
// 										<p>
// 											"Citing" considered <u>fully fusing</u>, leveling and equipping the considered crew. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>and fused</u>.
// 										</p>
// 									</div>
// 								)
// 							}
// 						}
// 					]}
// 				/>
// 				<Segment>
// 					<h3>{t('cite_opt.engine')}</h3>
// 					<div style={{
// 						display: "flex",
// 						alignItems: "center",
// 						gap: "1em",
// 						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
// 					}}>
// 						<Dropdown
// 							multiple={false}
// 							options={engOptions}
// 							placeholder={"Select Engine"}
// 							value={engine}
// 							onChange={(e, { value }) => {
// 								this.setEngine(value as CiteEngine);
// 							}}
// 							/>

// 						{engine === 'beta_tachyon_pulse' && 
// 						<>
// 						<BetaTachyonSettingsPopup
// 							isOpen={this.state.settingsOpen}
// 							setIsOpen={this.setSettingsOpen}
// 							config={{
// 								current: this.state.betaTachyonSettings,
// 								setCurrent: this.setSettings,
// 								defaultOptions: DefaultBetaTachyonSettings
// 								}} />
// 							<Checkbox label={'Show EV Columns'} checked={showEV} onChange={(e, { checked }) => setShowEV(!!checked) } />
// 						</>}
							
// 					</div>
// 				</Segment>
// 				<Segment>
// 					<h3>{t('global.filters')}</h3>
// 					<div style={{
// 						display: "flex",
// 						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
// 					}}>
// 						<div style={{ display: "flex", flexDirection: "column", alignItems: "left", margin: 0, marginRight: "1em"}}>
// 							<RarityFilter
// 								altTitle='Calculate specific rarity'
// 								multiple={false}
// 								rarityFilter={citeMode?.rarities ?? []}
// 								setRarityFilter={(data) => {
// 									this.setState({ ...this.state, citeMode: { ... citeMode ?? {}, rarities: data }, citeData: null });
// 								}}
// 								/>
// 						</div>
// 						<div style={{ display: "flex", flexDirection: "column", alignItems: "left"}}>
// 							<PortalFilter
// 								portalFilter={citeMode?.portal}
// 								setPortalFilter={(data) => {
// 									setCiteMode({ ... citeMode ?? {}, portal: data });
// 								}}
// 								/>
// 						</div>
// 						<div style={{ display: "flex", height: "3em", flexDirection: "row", justifyContent: "center", alignItems: "center", marginLeft: "1em"}}>
// 							<Input
// 								label={"Search"}
// 								value={citeMode.nameFilter}
// 								onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, nameFilter: value })}
// 								/>
// 							<i className='delete icon'
// 								title={"Clear Searches and Comparison Marks"}
// 								style={{
// 									cursor: "pointer",
// 									marginLeft: "0.75em"
// 								}}
// 								onClick={(e) => {
// 										setCiteMode({ ... citeMode ?? {}, nameFilter: '' });
// 										window.setTimeout(() => {
// 											this.setState({ ...this.state, checks: undefined });
// 										});

// 									}
// 								}
// 						 	/>

// 						</div>
// 						<div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
// 							<Dropdown
// 								options={priSkills}
// 								multiple
// 								clearable
// 								placeholder={"Filter by primary skill"}
// 								value={citeMode.priSkills}
// 								onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, priSkills: value as string[] })}
// 								/>
// 						</div>
// 						<div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
// 							<Dropdown
// 								options={secSkills}
// 								multiple
// 								clearable
// 								placeholder={"Filter by secondary skill"}
// 								value={citeMode.secSkills}
// 								onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, secSkills: value as string[] })}
// 								/>
// 						</div>
// 						<div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
// 							<Dropdown
// 								options={seatSkills}
// 								multiple
// 								clearable
// 								placeholder={"Filter by voyage seating"}
// 								value={citeMode.seatSkills}
// 								onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, seatSkills: value as string[] })}
// 								/>
// 						</div>

// 					</div>
// 				</Segment>
// 				<Segment>
// 					<h3>Prospects</h3>
					
// 					<Checkbox checked={unownedProspects} onChange={(e, { checked }) => this.setUnowned(!!checked)} 
// 							label={'Unowned Crew Only'} />

// 					<div style={{ display: "flex", flexDirection: "row", gap: "1em", alignItems: "center", marginTop: "0.5em"}}>
					
// 						<div style={{display: "block"}}>
// 						<ProspectPicker
// 							prospects={prospects}
// 							setProspects={this.setProspects}
// 							pool={corePool} />
// 						</div>
// 						<div style={{display: "flex", flexDirection: "column", gap: "0.25em"}}>
// 						<Button onClick={(e) => this.applyProspects()}>Apply Prospect State</Button>
// 						<i>(State will only reflect in list once button is tapped)</i>

// 						</div>

// 					</div>

// 				</Segment>
// 				<Segment>
// 					{!citeData &&
// 						<>
// 							<Icon loading name='spinner' /> Loading citation optimizer ...
// 						</>
// 					}

// 					{citeData &&
// 						<>
// 						<Tab
// 						 	panes={[
// 							{ menuItem: narrow ? 'Cite' : 'Crew To Cite', render: () => this.renderTable(citeData?.crewToCite, "cite", false) },
// 							{ menuItem: narrow ? 'Retrievable' : 'Retrievable Only', render: () => this.renderTable(citeData?.crewToRetrieve, "retrieve", false) },
// 							{ menuItem: narrow ? 'Train' : 'Crew To Train', render: () => this.renderTable(citeData?.crewToTrain, "train", true) },
// 							{ menuItem: narrow ? 'Groups' : 'Voyage Groups' + (compareCount ? ' (' + compareCount + ')' : '') , render: () => this.renderVoyageGroups(citeData, confine) },
// 						]} />
// 						</>
// 					}
// 				</Segment>
// 				<CrewHoverStat openCrew={(crew) => navToCrewPage(crew, this.context.player.playerData?.player.character.crew, buffConfig)}  targetGroup='citationTarget' />

// 			</>
// 		);
// 	}
// }

// export default CiteOptimizer;