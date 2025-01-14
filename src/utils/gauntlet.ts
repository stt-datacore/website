
import { BaseSkills, ComputedSkill, CrewMember, QuippedPower, Skill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { Gauntlet, GauntletContestCrew, OwnedStatus, PairGroup } from "../model/gauntlets";
import { CompletionState, GauntletPlayerBuffMode, PlayerBuffMode, PlayerCrew, PlayerImmortalMode } from "../model/player";
import { TraitNames } from "../model/traits";
import { EMPTY_SKILL } from "../model/worker";

import { applyCrewBuffs, getCrewPairScore, getCrewQuipment, getPlayerPairs, getSkills, shortToSkill, skillAdd, skillSum, skillToShort, updatePairScore } from "./crewutils";
import { calcQLots } from "./equipment";
import { ItemBonusInfo, getItemBonuses, getQuipmentAsItemWithBonus } from "./itemutils";
import { BuffStatTable } from "./voyageutils";

export interface InternalSettings {
	crit5: number | string;
	crit25: number | string;
	crit45: number | string;
	crit65: number | string;
	minWeight: number | string;
	maxWeight: number | string;
	linearSkillIncidenceWeightPrimary: number | string;
	linearSkillIndexWeightPrimary: number | string;
	linearSkillIncidenceWeightSecondary: number | string;
	linearSkillIndexWeightSecondary: number | string;
	linearSkillIncidenceWeightTertiary: number | string;
	linearSkillIndexWeightTertiary: number | string;
}

export interface GauntletSettings extends InternalSettings {
	crit5: number;
	crit25: number;
	crit45: number;
	crit65: number;
	minWeight: number;
	maxWeight: number;
	linearSkillIncidenceWeightPrimary: number;
	linearSkillIndexWeightPrimary: number;
	linearSkillIncidenceWeightSecondary: number;
	linearSkillIndexWeightSecondary: number;
	linearSkillIncidenceWeightTertiary: number;
	linearSkillIndexWeightTertiary: number;
}

export interface GauntletSettingsConfig {
	current: GauntletSettings;
	setCurrent: (value: GauntletSettings) => void;
	defaultOptions: GauntletSettings;
}

export interface GauntletSettingsProps {
	config: GauntletSettingsConfig;
	renderTrigger?: () => JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;
};

export interface FilterProps {
	ownedStatus?: OwnedStatus;
	rarity?: number;
	maxResults?: number;
	skillPairs?: string[];
}


export const crit65 = 2;
export const crit45 = 1.85;
export const crit25 = 1.45;
export const crit5 = 1;

export const DefaultAdvancedGauntletSettings = {
	crit5,
	crit25,
	crit45,
	crit65,
	minWeight: 1,
	maxWeight: 1,
	linearSkillIncidenceWeightPrimary: 1.25,
	linearSkillIndexWeightPrimary: 0.75,
	linearSkillIncidenceWeightSecondary: 1.1,
	linearSkillIndexWeightSecondary: 0.9,
	linearSkillIncidenceWeightTertiary: 1.05,
	linearSkillIndexWeightTertiary: 0.95,
} as GauntletSettings;



export function getBernardsNumber<T extends CrewMember>(crew: T, gauntlet?: Gauntlet, player_pairs?: Skill[][] | Skill[], settings?: GauntletSettings) {
	let trait_mul = gauntlet?.prettyTraits?.filter(t => crew.traits_named.includes(t)).length ?? 0;
	settings ??= DefaultAdvancedGauntletSettings;

	// Weighted; Weights defined in advanced settings.
	if (trait_mul >= 3) trait_mul = settings.crit65;
	else if (trait_mul >= 2) trait_mul = settings.crit45;
	else if (trait_mul >= 1) trait_mul = settings.crit25;
	else trait_mul = settings.crit5;

	player_pairs ??= getPlayerPairs(crew, trait_mul, settings.minWeight, settings.maxWeight);

	let bernardsNumber = 0;
	let count = 0;

	if (player_pairs?.length && ("length" in player_pairs[0])) {
		const skills = [player_pairs[0][0], player_pairs[0][1], player_pairs.length > 1 ? player_pairs[1][1] : { core: 0, range_min: 0, range_max: 0 }];

		for (let skill of skills) {
			if (skill.range_max === 0) continue;
			let dmg_num = (skill.range_max + skill.range_min) / 2;
			if (dmg_num) {
				bernardsNumber += dmg_num;
				count++;
			}
		}
		if (player_pairs.length === 1) bernardsNumber /= 2;
	}
	else if (player_pairs?.length && !("length" in player_pairs[0])) {
		for (let skill of player_pairs as Skill[]) {
			if (skill.range_max === 0) continue;
			let dmg_num = (skill.range_max + skill.range_min) / 2;
			if (dmg_num) {
				bernardsNumber += dmg_num;
				count++;
			}
		}
	}

	return bernardsNumber;
}

export function discoverPairs(crew: (PlayerCrew | CrewMember)[], featuredSkill?: string) {
	let rmap = crew.map((item) => Object.keys(item.ranks));
	let ranks = [] as string[];
	ranks.push('');
	for (let rc of rmap) {
		for (let rank of rc) {
			if (rank.startsWith("G_") && !ranks.includes(rank)) {
				ranks.push(rank);
			}
		}
	}

	ranks.sort((a, b) => {
		if (featuredSkill) {
			let ak = a.includes(featuredSkill);
			let bk = b.includes(featuredSkill);

			if (ak != bk) {
				if (ak) return -1;
				else return 1;
			}
		}

		return a.localeCompare(b);
	})
	return ranks;
}


export function getPairGroups(crew: (PlayerCrew | CrewMember)[], gauntlet: Gauntlet, settings: GauntletSettings, hideOpponents?: boolean, onlyActiveRound?: boolean, featuredSkill?: string, top?: number, maxResults?: number) {
	featuredSkill ??= gauntlet.contest_data?.featured_skill;
	const pairs = discoverPairs(crew, featuredSkill);
	const featRank = skillToShort(featuredSkill ?? "", true) ?? "";
	const ptop = top;
	const pairGroups = [] as PairGroup[];
	const currSkills = [gauntlet.contest_data?.primary_skill ?? "", gauntlet.contest_data?.secondary_skill ?? ""].sort().join();

	for (let pair of pairs) {

		if (pair === '') continue;

		let rank = pair;
		let rpairs = pair.replace("G_", "").split("_");

		const px = pairGroups.length;

		let srank = rpairs.map(p => shortToSkill(p, true) as string).sort();
		let pjoin = srank.join();

		const hapres = rpairs.map(z => shortToSkill(z, true)).sort().join();

		pairGroups.push({
			pair: rpairs,
			crew: crew.filter(c => rank in c.ranks && (!ptop || (ptop && c.ranks[rank] <= ptop)))
				.map(d => d as PlayerCrew)
				.filter((crew2) => {
					if (hideOpponents && crew2.isOpponent) return false;

					if (onlyActiveRound) {
						if (hapres === currSkills) {
							return true;
						}
						else {
							return !crew2.isSelected && !crew2.isOpponent;
						}
					}
					else {
						return true;
					}
				})

		});

		let singleEntry = false;

		if (pairGroups[px].crew.length === 1) {
			pairGroups[px].crew.push(pairGroups[px].crew[0]);
			singleEntry = true;
		}

		if (pairGroups[px].crew.length) {
			pairGroups[px].crew.sort((a, b) => {
				let atrait = gauntlet.prettyTraits?.filter(t => a.traits_named.includes(t)).length ?? 0;
				let btrait = gauntlet.prettyTraits?.filter(t => b.traits_named.includes(t)).length ?? 0;

				if (atrait >= 3) atrait = settings.crit65;
				else if (atrait >= 2) atrait = settings.crit45;
				else if (atrait >= 1) atrait = settings.crit25;
				else atrait = settings.crit5;

				if (btrait >= 3) btrait = settings.crit65;
				else if (btrait >= 2) btrait = settings.crit45;
				else if (btrait >= 1) btrait = settings.crit25;
				else btrait = settings.crit5;

				let r = 0;

				let apairs = getPlayerPairs(a, atrait, settings.minWeight, settings.maxWeight);
				let bpairs = getPlayerPairs(b, btrait, settings.minWeight, settings.maxWeight);

				if (apairs && bpairs) {
					let amatch = [] as Skill[];
					let bmatch = [] as Skill[];

					[apairs, bpairs].forEach((pset, idx) => {
						for (let wpair of pset) {
							let djoin = wpair.map(s => s.skill).sort().join();
							if (djoin === pjoin) {
								if (idx === 0) amatch = wpair.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
								else bmatch = wpair.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
								return;
							}
						}
						pset = pset?.filter(ap => ap.some(p2 => p2.skill && srank.includes(p2.skill)));

						if (pset?.length) {
							for (let p of pset[0]) {
								if (p.skill && srank.includes(p.skill)) {
									let glitch = [{
										...p
									},
									{
										...JSON.parse(JSON.stringify(EMPTY_SKILL)) as Skill,
										skill: srank.find(sr => sr !== p.skill) || ''
									}
									]
									if (idx === 0) amatch = glitch.sort((a, b) => a.skill.localeCompare(b.skill) || 0);
									else bmatch = glitch.sort((a, b) => a.skill.localeCompare(b.skill) || 0);
									return;
								}
							}
						}
					});

					const ascore = amatch?.length ? getBernardsNumber(a, gauntlet, amatch, settings) : getBernardsNumber(a, gauntlet, apairs, settings);
					const bscore = bmatch?.length ? getBernardsNumber(b, gauntlet, bmatch, settings) : getBernardsNumber(b, gauntlet, bpairs, settings);

					updatePairScore(a, { score: ascore, pair: amatch ?? apairs[0] });
					updatePairScore(b, { score: bscore, pair: bmatch ?? bpairs[0] });

					r = Math.round(bscore) - Math.round(ascore);
					if (!r) r = a.name.localeCompare(b.name);
				}
				return r ? r : a.ranks[rank] - b.ranks[rank];
			});

			if (singleEntry) {
				pairGroups[px].crew.splice(0, 1);
			}

			gauntlet.pairMax ??= [];
			gauntlet.pairMin ??= [];

			pairGroups[px].crew.forEach((c) => {
				let tstr = rpairs.map(z => shortToSkill(z, true));
				let gp = gauntlet.pairMin?.find(fo => fo.pair.map(foz => foz.skill).sort().join("_") === tstr.sort().join("_"));
				let ps = getCrewPairScore(c, rank);
				if (!ps) return;

				if (!gp) {
					gp = {
						...ps
					};
					gauntlet.pairMin ??= [];
					gauntlet.pairMin.push(gp);
				}
				else {
					if (ps.score < gp.score) {
						gp.score = ps.score;
					}
				}

				gp = gauntlet.pairMax?.find(fo => fo.pair.map(foz => foz.skill).sort().join("_") === tstr.sort().join("_"));

				if (!gp) {
					gp = {
						...ps
					};
					gauntlet.pairMax ??= [];
					gauntlet.pairMax.push(gp);
				}
				else {
					if (ps.score > gp.score) {
						gp.score = ps.score;
					}
				}

			});
		}
	}

	if (maxResults) {
		pairGroups.forEach((pg) => {
			pg.crew = pg.crew.slice(0, maxResults);
		});
	}
	const blank = { core: 0, max: 0, min: 0 };
	pairGroups.sort((a, b) => {
		const apairs = a.pair.map(z => shortToSkill(z, true)).sort().map(s => s as string);
		const bpairs = b.pair.map(z => shortToSkill(z, true)).sort().map(s => s as string);

		const apair = apairs.join();
		const bpair = bpairs.join();

		if (apair !== bpair) {
			if (apair === currSkills) return -1;
			else if (bpair === currSkills) return 1;
		}

		if (a.pair.includes(featRank) === b.pair.includes(featRank)) {
			let r = 0;
			let asum = skillSum([a.crew[0][apairs[0]] || blank, a.crew[0][apairs[1]] || blank], 'proficiency')
			let bsum = skillSum([b.crew[0][bpairs[0]] || blank, b.crew[0][bpairs[1]] || blank], 'proficiency')
			r = bsum - asum;
			if (!r) r = a.pair[0].localeCompare(b.pair[0]);
			if (!r) r = a.pair[1].localeCompare(b.pair[1]);
			return r;
		}
		else if (a.pair.includes(featRank)) {
			return -1;
		}
		else {
			return 1;
		}
	});

	return pairGroups;
}

function testFilterCrew(crew: PlayerCrew, filter: FilterProps, context: GauntletMinimalContext): boolean {
	const hasPlayer = !!context.player.playerData?.player?.character?.crew?.length;
	if (!filter.rarity || crew.rarity === filter.rarity) {
		if (filter.skillPairs?.length) {
			if (!filter.skillPairs.some((sp) => {
				let p = sp.split("/");
				let p1 = shortToSkill(p[0]);
				if (p.length === 1) {
					return !p1 || (p1 in crew && crew[p1]?.max);
				}
				let p2 = shortToSkill(p[1]);
				if (!p1 || !p2) return true;
				return (p1 in crew && crew[p1]?.max && p2 in crew && crew[p2]?.max);
			})) return false;
		}
		if (filter.ownedStatus) {
			switch (filter.ownedStatus) {
				case 'any':
				case 'maxall':
					return true;
				case 'fe':
					if (!hasPlayer) return true;
					return !!crew.have && crew.level === 100 && crew.equipment?.length === 4;
				case 'nofe':
				case 'nofemax':
					if (!hasPlayer) return true;
					return !!crew.have && (crew.level !== 100 || crew.equipment?.length !== 4);
				case 'ownedmax':
					if (!hasPlayer) return true;
					return !!crew.have;
				case 'unfrozen':
					if (!hasPlayer) return true;
					return !!crew.have && crew.immortal <= 0;
				case 'owned':
					if (!hasPlayer) return true;
					return !!crew.have;
				case 'unowned':
					if (!hasPlayer) return true;
					return !crew.have;
				case 'portal':
					return !crew.have && crew.in_portal;
				case 'nonportal':
					return !crew.have && !crew.in_portal;
				case 'gauntlet':
					return !crew.have && !crew.in_portal && crew.traits_hidden.includes("exclusive_gauntlet")

			}
		}
	}
	return true;
}

export type GauntletPane = 'today' | 'yesterday' | 'previous' | 'browse' | 'live';

export interface GauntletUserPrefs {
	settings: GauntletSettings,
	buffMode: GauntletPlayerBuffMode;
	rankByPair?: string,
	range_max?: number,
	filter?: FilterProps,
	textFilter?: string,
	hideOpponents?: boolean,
	onlyActiveRound?: boolean,
	immortalModes?: { [key: string]: PlayerImmortalMode }
}

export interface GauntletMinimalContext {
	player: {
		buffConfig?: BuffStatTable,
		maxBuffs?: BuffStatTable,
		playerData?: {
			player: {
				character: {
					crew: PlayerCrew[],
					unOwnedCrew?: PlayerCrew[]
				}
			}
		}
	},
	core: {
		crew: CrewMember[],
		items: EquipmentItem[]
	},
	localized: {
		TRAIT_NAMES: TraitNames;
	},
}

export interface GauntletCalcConfig extends GauntletUserPrefs {
	gauntlet: Gauntlet,
	context: GauntletMinimalContext,
	bonusCache: { [key: string]: ItemBonusInfo }
	equipmentCache: { [key: string]: EquipmentItem[] }
}

export function calculateGauntlet(config: GauntletCalcConfig) {

	const { bonusCache: bonusInfo, equipmentCache: crewQuip, settings, buffMode, context, gauntlet, range_max, filter, textFilter, hideOpponents, onlyActiveRound } = config;
	let { rankByPair } = config;
	if (rankByPair === '' || rankByPair === 'none') rankByPair = undefined;

	const rmax = range_max ?? 100;
	const search = textFilter;

	const { buffConfig, maxBuffs } = context.player;
	const { crew: allCrew, items } = context.core;
	const { TRAIT_NAMES } = context.localized;

	const availBuffs = ['none'] as GauntletPlayerBuffMode[];
	const oppo = [] as PlayerCrew[];
	const roster = [] as PlayerCrew[];

	const allQuipment = getQuipmentAsItemWithBonus(items);

	let acc = [] as PlayerCrew[];

	if (context.player.playerData?.player?.character?.crew) {
		acc = context.player.playerData?.player?.character?.crew.concat(context.player.playerData?.player?.character?.unOwnedCrew ?? []);
	}
	else {
		acc = allCrew as PlayerCrew[];
	}

	const workCrew = acc;

	if (gauntlet.opponents?.length) {
		for (let op of gauntlet.opponents) {
			const ocrew = op.crew_contest_data.crew[0];
			const refcrew = context.core.crew.find((cf) => cf.symbol === ocrew.archetype_symbol);
			if (refcrew) {
				const fcrew = JSON.parse(JSON.stringify(refcrew)) as PlayerCrew;
				for (let skname of Object.keys(fcrew.base_skills)) {
					const skill = fcrew.base_skills[skname] as Skill;
					const opposkill = ocrew.skills.find((f) => f.skill === skname);
					fcrew.skills ??= {};
					fcrew.skills[skname] = {
						...skill,
						range_max: opposkill?.max,
						range_min: opposkill?.min
					} as Skill;

					fcrew[skname] = {
						core: skill.core,
						max: opposkill?.max,
						min: opposkill?.min,
						skill: skill.skill
					} as ComputedSkill;
				}
				fcrew.id = ocrew.crew_id;
				fcrew.rarity = ocrew.rarity;
				fcrew.isOpponent = true;
				fcrew.ssId = op.player_id.toString();
				fcrew.immortal = CompletionState.DisplayAsImmortalOpponent;
				fcrew.have = false;
				oppo.push(fcrew);
			}
		}
	}

	if (gauntlet?.contest_data?.selected_crew?.length) {
		for (let selcrew of gauntlet.contest_data.selected_crew) {
			let crew = context.core.crew.find(f => f.symbol === selcrew.archetype_symbol)! as PlayerCrew;
			crew = JSON.parse(JSON.stringify(crew));

			let fffe = workCrew.find(f => f.symbol === selcrew.archetype_symbol && f.immortal);

			crew.isSelected = true;
			crew.isDisabled = selcrew.disabled;

			crew.skills = {};

			delete crew.command_skill;
			delete crew.diplomacy_skill;
			delete crew.engineering_skill;
			delete crew.security_skill;
			delete crew.science_skill;
			delete crew.medicine_skill;

			crew.id = selcrew.crew_id;
			crew.isDebuffed = !!selcrew.debuff;

			for (let selskill of selcrew.skills) {
				let sk = selskill.skill;
				crew.skills[sk] = { core: 0, range_max: selskill.max, range_min: selskill.min, skill: sk } as Skill;
				crew[sk] = { core: 0, max: selskill.max, min: selskill.min, skill: sk } as ComputedSkill;
			}

			crew.rarity = selcrew.rarity;
			crew.level = selcrew.level;
			crew.have = true;
			crew.immortal = CompletionState.DisplayAsImmortalSelected;

			roster.push(crew);
		}
	}

	if (buffConfig && Object.keys(buffConfig).length) {
		availBuffs.push('player');
		availBuffs.push('quipment');
	}
	if (maxBuffs && Object.keys(maxBuffs).length) {
		availBuffs.push('max');
		availBuffs.push('max_quipment_2');
		availBuffs.push('max_quipment_3');
	}

	const applyMaxQuip = (crew: PlayerCrew, buffs: BuffStatTable) => {
		if (buffMode.startsWith('max_quipment')) {
			crew = calcQLots(crew, allQuipment, buffs, true, 4, "proficiency");
			let bestQuip = undefined as QuippedPower | undefined;
			if (buffMode === 'max_quipment_2' && crew.best_quipment_1_2) {
				bestQuip = crew.best_quipment_1_2
			}
			else if (buffMode === 'max_quipment_3' && crew.best_quipment_3) {
				bestQuip = crew.best_quipment_3;
			}
			else if (buffMode === 'max_quipment_3' && crew.best_quipment_1_2) {
				bestQuip = crew.best_quipment_1_2;
			}
			else if (crew.best_quipment) {
				bestQuip = crew.best_quipment
			}

			if (bestQuip) {
				crew.kwipment = [];
				crew.kwipment_expiration = [0, 0, 0, 0];
				Object.values(bestQuip.skill_quipment).forEach((data) => {
					for (let q of data) {
						crew.kwipment.push(Number(q.kwipment_id!) as any);
					}
				});
				while (crew.kwipment.length < 4) crew.kwipment.push(0 as any);
				crew.kwipment_prospects = true;
				Object.keys(bestQuip.skills_hash).forEach((skill) => {
					crew[skill].base = bestQuip.skills_hash[skill].base;
					crew[skill].min = bestQuip.skills_hash[skill].range_min;
					crew[skill].max = bestQuip.skills_hash[skill].range_max;
				});
			}
		}
	}

	const hasPlayer = !!context.player.playerData?.player?.character?.crew?.length;

	const prettyTraits = gauntlet.contest_data?.traits?.map(t => TRAIT_NAMES[t]);
	gauntlet.prettyTraits = prettyTraits;

	if (!prettyTraits) {
		return {
			gauntlet: null,
			bonusCache: bonusInfo,
			equipmentCache: crewQuip
		};
	}

	delete gauntlet.allCrew;
	delete gauntlet.maximal;
	delete gauntlet.minimal;
	delete gauntlet.pairMax;
	delete gauntlet.pairMin;

	const matchedCrew1 =
		workCrew
			.concat(roster)
			.concat(oppo)
			.map(crewObj => crewObj as PlayerCrew)
			.filter(crew => {
				return (!!crew.isOpponent || crew.max_rarity > 3 || !!crew.kwipment?.length);
			})
			.map((inputCrew) => {
				if (inputCrew.isSelected) {
					inputCrew.pairs = getPlayerPairs(inputCrew);
					return inputCrew;
				}
				let crew = !!inputCrew.isOpponent ? inputCrew : JSON.parse(JSON.stringify(inputCrew)) as PlayerCrew;
				if (!crew.isOpponent) {
					if (!crew.have) {
						if (!crew.id) {
							crew.id = crew.archetype_id;
						}
						crew.immortal ??= hasPlayer ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
						if (buffConfig && (buffMode === 'player' || buffMode === 'quipment')) {
							applyCrewBuffs(crew, buffConfig);
						}
						else if (maxBuffs && buffMode.startsWith("max")) {
							if (buffMode === 'max' || !buffConfig) {
								applyCrewBuffs(crew, maxBuffs);
								applyMaxQuip(crew, maxBuffs);
							}
							else {
								applyCrewBuffs(crew, buffConfig);
								applyMaxQuip(crew, buffConfig);
							}

						}
					}
					else {
						if (buffConfig && buffMode === 'player') {
							applyCrewBuffs(crew, buffConfig);
						}
						else if (buffConfig && buffMode === 'quipment') {
							if (crew.kwipment?.length) {
								if (!crewQuip[crew.id!]) {
									crewQuip[crew.id!] = getCrewQuipment(crew, context.core.items);
								}
								let cq = crewQuip[crew.id!];
								let bn = cq?.map(q => {
									bonusInfo[q.id!] ??= getItemBonuses(q);
									return bonusInfo[q.id!];
								}) ?? undefined;

								applyCrewBuffs(crew, buffConfig, undefined, bn);
							}
							else {
								applyCrewBuffs(crew, buffConfig);
							}
						}
						else if (maxBuffs && buffMode.startsWith("max")) {
							if (buffMode === 'max' || !buffConfig) {
								applyCrewBuffs(crew, maxBuffs);
								if (crew.immortal) applyMaxQuip(crew, maxBuffs);
							}
							else {
								applyCrewBuffs(crew, buffConfig);
								if (crew.immortal) applyMaxQuip(crew, buffConfig);
							}

						}
						else {
							for (let skill of Object.keys(crew.base_skills)) {
								crew[skill] = { core: crew.base_skills[skill].core, min: crew.base_skills[skill].range_min, max: crew.base_skills[skill].range_max };
							}
						}
					}

					if (!hasPlayer) {
						crew.rarity = crew.max_rarity;
					}
					else if (!crew.have) {
						crew.rarity = 0;
						crew.immortal = hasPlayer ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
					}
				}
				else {
					crew.immortal = CompletionState.DisplayAsImmortalOpponent;
					crew.have = false;
				}

				if (!crew.have || crew.isOpponent) {
					let skills = getSkills(crew);
					for (let s of skills) {
						if (!(s in crew)) {
							crew[s] = {
								core: 0,
								min: 0,
								max: 0
							}
						}
					}
				}

				crew.pairs = getPlayerPairs(crew);
				return crew;
			})
			.filter((crew) => (!filter || testFilterCrew(crew, filter, context)))
			.map((crew) => {
				if (crew.isSelected) return crew;
				if (filter?.ownedStatus === 'nofemax' || filter?.ownedStatus === 'ownedmax' || filter?.ownedStatus === 'maxall') {
					if ((crew.immortal) || !crew.have) return crew;
					let fcrew = allCrew.find(z => z.symbol === crew.symbol);
					if (!fcrew) return crew;

					crew.base_skills = JSON.parse(JSON.stringify(fcrew.base_skills));
					crew.rarity = crew.max_rarity;
					crew.level = 100;
					crew.equipment = [0, 1, 2, 3];
					crew.immortal = CompletionState.DisplayAsImmortalOwned;
					crew.skills ??= {};
					for (let skill of Object.keys(crew.base_skills)) {
						crew.skills[skill] = { ...crew.base_skills[skill] };
					}
					if (buffMode === 'player' && buffConfig) {
						applyCrewBuffs(crew, buffConfig);
					}
					else if (buffConfig && buffMode === 'quipment') {
						if (crew.kwipment?.length) {
							let cq = getCrewQuipment(crew, context.core.items);
							let bn = cq?.map(q => getItemBonuses(q)) ?? undefined;
							applyCrewBuffs(crew, buffConfig, undefined, bn);
						}
						else {
							applyCrewBuffs(crew, buffConfig);
						}
					}
					else if (buffMode.startsWith('max') && maxBuffs) {
						if (buffMode === 'max' || !buffConfig) {
							applyCrewBuffs(crew, maxBuffs);
							applyMaxQuip(crew, maxBuffs);
						}
						else {
							applyCrewBuffs(crew, buffConfig);
							applyMaxQuip(crew, buffConfig);
						}

					}
					crew.pairs = getPlayerPairs(crew);
				}
				return crew;
			})
			.filter(crew => {
				let result =
					(
						(!rankByPair || (rankByPair in crew.ranks)) &&
						(Object.keys(crew.base_skills).some(k => crew.base_skills[k].range_max >= rmax) || !!crew.isOpponent) ||
						(prettyTraits.length && prettyTraits.filter(t => crew.traits_named.includes(t)).length > 1)
					);

				return result;
			})
			.sort((a, b) => {
				if (rankByPair) {
					return a.ranks[rankByPair] - b.ranks[rankByPair];
				}

				let r = 0;

				let atrait = prettyTraits.filter(t => a.traits_named.includes(t)).length;
				let btrait = prettyTraits.filter(t => b.traits_named.includes(t)).length;

				if (atrait >= 3) atrait = settings.crit65;
				else if (atrait >= 2) atrait = settings.crit45;
				else if (atrait >= 1) atrait = settings.crit25;
				else atrait = settings.crit5;

				if (btrait >= 3) btrait = settings.crit65;
				else if (btrait >= 2) btrait = settings.crit45;
				else if (btrait >= 1) btrait = settings.crit25;
				else btrait = settings.crit5;

				let ap = getPlayerPairs(a, atrait, settings.minWeight, settings.maxWeight);
				let bp = getPlayerPairs(b, btrait, settings.minWeight, settings.maxWeight);

				if (!a.score) {
					a.score = getBernardsNumber(a, gauntlet, ap, settings);
				}

				if (!b.score) {
					b.score = getBernardsNumber(b, gauntlet, bp, settings);
				}

				r = r = Math.round(b.score) - Math.round(a.score);;

				if (!r) r = a.name.localeCompare(b.name);
				return r;
			});

	let matchedResults: PlayerCrew[] | undefined = undefined;

	if (gauntlet.prettyTraits?.length) {
		const maxpg = 10;
		let pgs = getPairGroups(matchedCrew1, gauntlet, settings, false, onlyActiveRound, undefined, 100, maxpg);

		const incidence = {} as { [key: string]: number };
		const avgidx = {} as { [key: string]: number };
		const fsk = gauntlet.contest_data?.featured_skill;
		let pc = 0;
		for (let pg of pgs) {
			let idx = 1;

			for (let pgcrew of pg.crew) {
				incidence[pgcrew.id] ??= 0;
				avgidx[pgcrew.id] ??= 0;

				if (pg.pair.some(p => shortToSkill(p, true) === fsk) && pc === 0) {
					incidence[pgcrew.id] += settings.linearSkillIncidenceWeightPrimary;
					avgidx[pgcrew.id] += (idx * settings.linearSkillIndexWeightPrimary);
				}
				else if (pg.pair.some(p => shortToSkill(p, true) === fsk) && pc === 1) {
					incidence[pgcrew.id] += settings.linearSkillIncidenceWeightSecondary;
					avgidx[pgcrew.id] += (idx * settings.linearSkillIndexWeightSecondary);
				}
				else if (pg.pair.some(p => shortToSkill(p, true) === fsk) && pc === 2) {
					incidence[pgcrew.id] += settings.linearSkillIncidenceWeightTertiary;
					avgidx[pgcrew.id] += (idx * settings.linearSkillIndexWeightTertiary);
				}
				else {
					incidence[pgcrew.id]++;
					avgidx[pgcrew.id] += idx;
				}
				idx++;
			}
			pc++;
		}

		Object.keys(avgidx).forEach(key => {
			avgidx[key] /= incidence[key];
		});

		matchedResults = matchedCrew1.filter(c => c.id in incidence).sort((a, b) => {
			let r = 0;
			let anum = (maxpg - avgidx[a.id]) * incidence[a.id];
			let bnum = (maxpg - avgidx[b.id]) * incidence[b.id];

			r = bnum - anum;
			return r;
		});
	}
	else {
		matchedResults = matchedCrew1;
	}

	const matchedCrew = matchedResults;

	gauntlet.allCrew = matchedCrew;
	gauntlet.searchCrew = matchedCrew;

	gauntlet.origRanks = {};

	let maximal = 0;
	let minimal = 0;

	matchedCrew.forEach((crew, idx) => {
		if (maximal === 0 || (crew.score && crew.score > maximal)) {
			maximal = crew.score ?? 0;
		}
		if (minimal === 0 || (crew.score && crew.score < minimal)) {
			minimal = crew.score ?? 0;
		}

		gauntlet.origRanks ??= {};
		gauntlet.origRanks[crew.symbol] = idx + 1;
	});

	gauntlet.maximal = maximal;
	gauntlet.minimal = minimal;
	gauntlet.prettyTraits = prettyTraits;

	return {
		gauntlet,
		bonusCache: bonusInfo,
		equipmentCache: crewQuip
	};
}

export function getCrewCrit(crew: PlayerCrew | CrewMember | GauntletContestCrew, gauntlet: Gauntlet) {
	if ("archetype_symbol" in crew) {
		return crew.crit_chance;
	}
	else {
		return 5 + (20 * gauntlet.contest_data!.traits.filter(f => crew.traits.includes(f)).length)
	}
}

export function printGauntlet(gauntlet: Gauntlet, TRAIT_NAMES: TraitNames) {
	return (gauntlet.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/") + "/" + skillToShort(gauntlet.contest_data?.featured_skill ?? ""));
}

export function getCritColor(crit: number) {
	return crit >= 65 ? 'purple' : crit >= 45 ? 'blue' : crit >= 25 ? 'green' : undefined;
}