import React from 'react';
import { Gauntlet } from '../model/gauntlets';
import { CrewMember, QuipmentScores, SkillQuipmentScores } from '../model/crew';
import { Ship, Schematics, BattleStations, ReferenceShip } from '../model/ship';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { Collection, Constellation, KeystoneBase, Polestar, PortalLogEntry, POST_BIGBOOK_EPOCH } from '../model/game-elements';
import { BuffStatTable, calculateMaxBuffs } from '../utils/voyageutils';
import { Mission } from '../model/missions';
import { Icon } from 'semantic-ui-react';
import { navigate } from 'gatsby';
import { ContinuumMission } from '../model/continuum';
import { calcQuipmentScore } from '../utils/equipment';
import { getItemWithBonus } from '../utils/itemutils';
import { EventInstance, EventLeaderboard } from '../model/events';
import { StaticFaction } from '../model/shuttle';
import { allLevelsToLevelStats, highestLevel, levelToLevelStats } from '../utils/shiputils';
import { ObjectiveEvent } from '../model/player';
import { ICoreData } from './coremodel';
import { EventStats } from '../utils/event_stats';

const DC_DEBUGGING: boolean = false;

export type ValidDemands =
	'all_buffs' |
	'all_ships' |
	'battle_stations' |
	'cadet' |
	'collections' |
	'continuum_missions' |
	'crew' |
	'current_weighting' |
	'dilemmas' |
	'disputes' |
	'episodes' |
	'event_instances' |
	'event_leaderboards' |
	'event_scoring' |
	'event_stats' |
	'factions' |
	'gauntlets' |
	'items' |
	'keystones' |
	'misc_stats' |
	'missions' |
	'missionsfull' |
	'objective_events' |
	'portal_log' |
	'quests' |
	'ship_schematics' |
	'skill_bufs';

export interface DataProviderProperties {
	children: JSX.Element;
};

export interface ICoreContext extends ICoreData {
	ready: (demands: ValidDemands[], onReady: () => void) => void;
	reset: () => boolean;
	spin: (message?: string) => JSX.Element;
};

interface IDemandResult {
	demand: ValidDemands;
	json: any;
};

const defaultData = {
	all_buffs: {} as BuffStatTable,
	all_ships: [] as ReferenceShip[],
	battle_stations: [] as BattleStations[],
	cadet: [] as Mission[],
	collections: [] as Collection[],
	continuum_missions: [] as ContinuumMission[],
	crew: [] as CrewMember[],
	current_weighting: {},
	episodes: [] as Mission[],
	event_instances: [] as EventInstance[],
	event_leaderboards: [] as EventLeaderboard[],
	event_scoring: {},
	event_stats: [] as EventStats[],
	factions: [] as StaticFaction[],
	gauntlets: [] as Gauntlet[],
	items: [] as EquipmentItem[],
	keystones: [] as KeystoneBase[],
	missions: [] as Mission[],
	missionsfull: [] as Mission[],
	objective_events: [] as ObjectiveEvent[],
	portal_log: [] as PortalLogEntry[],
	ship_schematics: [] as Schematics[],
	ships: [] as Ship[],
	topQuipmentScores: [] as QuipmentScores[],
} as ICoreData;

export const defaultCore = {
	...defaultData,
	ready: () => { return false; },
	reset: () => { return false; },
	spin: () => { return <></>; },
} as ICoreContext;

export const DataContext = React.createContext<ICoreContext>(defaultCore as ICoreContext);

export const DataProvider = (props: DataProviderProperties) => {
	const { children } = props;

	const [isReadying, setIsReadying] = React.useState(false);
	const [data, setData] = React.useState<ICoreData>(defaultData);

	const spin = (message?: string) => {
		message ??= "Loading..."
		return (<span><Icon loading name='spinner' /> {message}</span>);
	};

	const providerValue = {
		...data,
		ready,
		reset,
		spin,
	} as ICoreContext;

	return (
		<DataContext.Provider value={providerValue}>
			{children}
		</DataContext.Provider>
	);

	function ready(demands: ValidDemands[] = [], onReady: () => void): void {
		demands = [ ... demands ];
		// Not ready if any valid demands are being processed
		if (isReadying) return;
		// Fetch only if valid demand is not already satisfied
		const valid = [
			'all_buffs',
			'all_ships',
			'battle_stations',
			'cadet',
			'crew',
			'collections',
			'continuum_missions',
			'current_weighting',
			'dilemmas',
			'disputes',
			'episodes',
			'event_instances',
			'event_leaderboards',
			'event_scoring',
			'event_stats',
			'factions',
			'gauntlets',
			'items',
			'keystones',
			'misc_stats',
			'missions',
			'missionsfull',
			'objective_events',
			'portal_log',
			'quests',
			'ship_schematics',
			'skill_bufs',
		] as ValidDemands[];

		if (demands.includes('ship_schematics') && !demands.includes('battle_stations')) {
			demands.push('battle_stations');
		}

		// Identify unsatisfied demands
		const unsatisfied = [] as string[];
		demands.forEach(demand => {
			// this is a hack because BB uses all buffs but we don't always have player data
			// and our skill_bufs does not yet match BB data. So for now, we're ignoring them.
			if (demand === 'skill_bufs') demand = 'all_buffs';
			if (valid.includes(demand)) {
				if (DC_DEBUGGING) console.log(demand);
				if (data[demand].length === 0 || (['all_buffs', 'current_weighting', 'event_scoring'].includes(demand) && !Object.keys(data[demand])?.length)) {
					unsatisfied.push(demand);
				}
			}
			else {
				if (DC_DEBUGGING) console.log(`Invalid data demand: ${demand}`);
			}
		});

		// Ready only if all valid demands are satisfied
		if (unsatisfied.length === 0) {
			onReady();
			return;
		}

		// Alert page that processing has started
		setIsReadying(true);

		// Fetch all unsatisfied demands concurrently
		Promise.all(unsatisfied.map(async (demand) => {
			let url = `/structured/${demand}.json`;
			if (demand === 'cadet') url = '/structured/cadet.txt';
			const response = await fetch(url);
			const json = await response.json();
			return { demand, json } as IDemandResult;
		})).then((results) => {
			const newData = {...data};

			// Process individual demands
			results.forEach(result => {
				if (DC_DEBUGGING) console.log(`Demand '${result.demand}' loaded, processing ...`);
				switch (result.demand) {
					case 'all_buffs':
						newData.all_buffs = calculateMaxBuffs(result.json);
						break;
					case 'crew':
						newData.crew = processCrew(result.json);
						break;
					case 'gauntlets':
						newData.gauntlets = processGauntlets(result.json);
						break;
					case 'items':
						newData.items = processItems(result.json);
						break;
					case 'all_ships':
						newData.all_ships = processAllShips(result.json);
						break;
					case 'portal_log':
						newData.portal_log = result.json;
						newData.portal_log?.forEach(log => log.date = new Date(log.date));
						break;

					default:
						newData[result.demand] = result.json;
						break;
				}
			});

			// Post-process interdependent demands
			if (unsatisfied.includes('items') && unsatisfied.includes('cadet')) {
				postProcessCadetItems(newData);
			}
			if (unsatisfied.includes('items') && unsatisfied.includes('crew') && unsatisfied.includes('all_buffs')) {
				postProcessQuipmentScores(newData.crew, newData.items);
				//calculateQPower(newData.crew, newData.items, newData.all_buffs);
				newData.topQuipmentScores = calculateTopQuipment(newData.crew);
			}
			if (unsatisfied.includes('ship_schematics') && unsatisfied.includes('battle_stations')) {
				postProcessShipBattleStations(newData);
			}

			setData({...newData});
		}).catch((error) => {
			console.log(error);
		}).finally(() => {
			// Alert page that processing is done (successfully or otherwise)
			setIsReadying(false);
			onReady();
		});
	}

	function calculateTopQuipment(crew: CrewMember[]) {

		const scores = [] as QuipmentScores[];
		for (let i = 0; i < 5; i++) {
			scores.push({
				quipment_score: 0,
				quipment_scores: {
					command_skill: 0,
					diplomacy_skill: 0,
					medicine_skill: 0,
					science_skill: 0,
					engineering_skill: 0,
					security_skill: 0,
					trait_limited: 0
				} as SkillQuipmentScores,
				voyage_quotient: 0,
				voyage_quotients: {
					command_skill: 0,
					diplomacy_skill: 0,
					medicine_skill: 0,
					science_skill: 0,
					engineering_skill: 0,
					security_skill: 0,
					trait_limited: 0
				} as SkillQuipmentScores
			} as QuipmentScores);
		}

		const qkeys = Object.keys(scores[0].quipment_scores as SkillQuipmentScores);

		for (let c of crew) {
			const r = c.max_rarity - 1;
			const skscore = scores[r].quipment_scores as SkillQuipmentScores;

			if (!c.quipment_score || !c.quipment_scores) continue;
			if (c.quipment_score > (scores[r].quipment_score ?? 0)) {
				scores[r].quipment_score = c.quipment_score;
			}
			for (let key of qkeys) {
				if (c.quipment_scores[key] > skscore[key]) {
					skscore[key] = c.quipment_scores[key];
				}
			}
			const vqscore = scores[r].voyage_quotients as SkillQuipmentScores;

			if (!c.voyage_quotient) continue;
			if (scores[r].voyage_quotient === 0 || c.voyage_quotient < (scores[r].voyage_quotient ?? 0)) {
				scores[r].voyage_quotient = c.voyage_quotient;
			}
			if (!c.voyage_quotients) continue;
			for (let key of qkeys) {
				if (c.voyage_quotients[key] > vqscore[key]) {
					vqscore[key] = c.voyage_quotients[key];
				}
			}
		}

		for (let c of crew) {
			const r = c.max_rarity - 1;
			const skscore = scores[r].quipment_scores as SkillQuipmentScores;
			const escore = scores[r].quipment_score as number;
			if (c.quipment_score && escore) {
				c.quipment_grade = c.quipment_score / escore;
			}
			if (c.quipment_scores) {
				Object.keys(c.quipment_scores).forEach((key) => {
					if (key in skscore) {
						c.quipment_grades ??= {
							command_skill: 0,
							diplomacy_skill: 0,
							medicine_skill: 0,
							science_skill: 0,
							engineering_skill: 0,
							security_skill: 0,
							trait_limited: 0
						}
						c.quipment_grades[key] = (c.quipment_scores as SkillQuipmentScores)[key] / skscore[key];
					}
				})
			}
		}

		return scores;
	}

	function reset(): boolean {
		setData({ ...defaultData });
		return true;
	}

	function processAllShips(all_ships: ReferenceShip[]) {
		for (let ship of all_ships) {
			ship.id = ship.archetype_id;
			ship.ranks ??= { overall: 0, arena: 0, fbb: 0, kind: 'ship', overall_rank: all_ships.length + 1, fbb_rank: all_ships.length + 1, arena_rank: all_ships.length + 1, divisions: { fbb: {}, arena: {} } }
		}
		data.ships = all_ships.map(ship => ({...ship, levels: allLevelsToLevelStats(ship.levels) }));
		return all_ships;
	}

	function processCrew(result: CrewMember[]): CrewMember[] {
		result.forEach((item) => {
			if (typeof item.date_added === 'string') {
				item.date_added = new Date(item.date_added);
			}
			item.post_bigbook_epoch = item.date_added.getTime() > POST_BIGBOOK_EPOCH.getTime();
			item.bigbook_tier ??= -1;
			if (!item.id) item.id = item.archetype_id;
		});

		return result;
	}

	function postProcessQuipmentScores(crew: CrewMember[], items: EquipmentItem[]) {
		const quipment = items.filter(f => f.type === 14).map(item => getItemWithBonus(item));
		crew.forEach(crew => {
			calcQuipmentScore(crew, quipment);
		});
	}

	function processGauntlets(result: Gauntlet[] | undefined): Gauntlet[] {
		result?.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
		return result ?? [];
	}

	function processItems(result: EquipmentItem[] | undefined): EquipmentItem[] {
		result?.forEach((item) => {
			if ("item_type" in item) {
				item.type = (item["item_type"] as number);
				delete item["item_type"];
			}
		})
		return result ?? [];
	}

	function postProcessShipBattleStations(data: ICoreData): void {
		if (data.battle_stations.length && data.ship_schematics.length) {
			for (let sch of data.ship_schematics) {
				let battle = data.battle_stations.find(b => b.symbol === sch.ship.symbol);
				if (battle) {
					sch.ship.battle_stations = battle.battle_stations;
				}
			}

			let scsave = data.ship_schematics.map((sc => JSON.parse(JSON.stringify({ ...sc.ship, level: 0 })) as Ship));
			let c = scsave.length;
			for (let i = 0; i < c; i++) {
				let ship = scsave[i];
				if (ship.levels) {
					let n = highestLevel(ship);
					if (ship.max_level && n === ship.max_level + 1 && ship.levels[`${n}`].hull) {
						scsave[i] = { ...ship, ...ship.levels[`${n}`] };
					}
				}
			}
			//data.ships = scsave;
		}
	}

	function postProcessCadetItems(data: ICoreData): void {
		const cadetforitem = data.cadet?.filter(f => f.cadet);
		if (DC_DEBUGGING) console.log("Finding cadet mission farm sources for items ...");

		if (cadetforitem?.length) {
			for(const item of data.items) {
				for (let ep of cadetforitem) {
					let quests = ep.quests.filter(q => q.quest_type === 'ConflictQuest' && q.mastery_levels?.some(ml => ml.rewards?.some(r => r.potential_rewards?.some(px => px.symbol === item.symbol))));
					if (quests?.length) {
						for (let quest of quests) {
							if (quest.mastery_levels?.length) {
								let x = 0;
								for (let ml of quest.mastery_levels) {
									if (ml.rewards?.some(r => r.potential_rewards?.some(pr => pr.symbol === item.symbol))) {
										let mx = ml.rewards.map(r => r.potential_rewards?.length).reduce((prev, curr) => Math.max(prev ?? 0, curr ?? 0)) ?? 0;
										mx = (1/mx) * 1.80;
										let qitem = {
											type: 4,
											mastery: x,
											name: quest.name,
											energy_quotient: 1,
											chance_grade: 5 * mx,
											mission_symbol: quest.symbol,
											cost: 1,
											avg_cost: 1/mx,
											cadet_mission: ep.episode_title,
											cadet_symbol: ep.symbol
										} as EquipmentItemSource;
										if (!item.item_sources.find(f => f.mission_symbol === quest.symbol)) {
											item.item_sources.push(qitem);
										}
									}
									x++;
								}
							}
						}
					}
				}
			}
		}

		if (DC_DEBUGGING) console.log("Done with cadet missions.");
	}


	function getObtained(data: CrewMember) {
		if (data.traits_hidden.includes("exclusive_honorhall") || data.symbol === "crusher_j_vox_crew") {
			return "HonorHall";
		}
		else if (data.traits_hidden.includes("exclusive_gauntlet")) {
			return "Gauntlet";
		}
		else if (data.traits_hidden.includes("exclusive_voyage")) {
			return "Voyage";
		}
		else if (data.traits_hidden.includes("exclusive_collection")) {
			return "Collection";
		}
		else if (data.traits_hidden.includes("exclusive_bridge")) {
			return "BossBattle";
		}
		else if (data.traits_hidden.includes("exclusive_fusion")) {
			return "Fuse";
		}
		else if (data.traits_hidden.includes("exclusive_achievement")) {
			return "Achievement";
		}
		else if (data.symbol === "tuvok_mirror_crew") {
			return "Faction";
		}
		else if (data.symbol === "boimler_evsuit_crew") {
			return "WebStore";
		}
		else if (data.symbol === "quinn_crew") {
			return "Missions";
		}
		else {
			return "Event/Pack/Giveaway";
		}
	}

};

export function randomCrew(symbol: string, allCrew: CrewMember[]) {
	if (!allCrew?.length) {
		return  <img style={{ height: "15em", cursor: "pointer" }} src={`${process.env.GATSBY_ASSETS_URL}crew_full_body_cm_qjudge_full.png`} />;
	}

	const rndcrew_pass1 = (allCrew.filter((a: CrewMember) => a.traits_hidden.includes(symbol) && a.max_rarity >= 4) ?? []) as CrewMember[];
	const rndcrew = [] as CrewMember[];

	for (let qc of rndcrew_pass1) {
		let max = 0;
		for (let sk of Object.values(qc.base_skills)) {
			max += sk.range_max;
		}
		if (max >= 800) {
			rndcrew.push(qc);
		}
	}

	const idx = Math.floor(Math.random() * (rndcrew.length - 1));
	const q = rndcrew[idx];
	const img = q.imageUrlFullBody;
	const fullurl = `${process.env.GATSBY_ASSETS_URL}${img}`;

	return <img style={{ height: "15em", cursor: "pointer" }} src={fullurl} onClick={(e) => navigate("/crew/" + q.symbol)} />
}
