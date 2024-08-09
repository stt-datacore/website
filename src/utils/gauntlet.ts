
import { IDefaultGlobal } from "../context/globalcontext";
import { ComputedSkill, CrewMember, Skill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { Gauntlet, PairGroup } from "../model/gauntlets";
import { CompletionState, PlayerBuffMode, PlayerCrew } from "../model/player";
import { EMPTY_SKILL } from "../model/worker";
import { FilterProps } from "../pages/gauntlets";
import { applyCrewBuffs, getCrewPairScore, getCrewQuipment, getPlayerPairs, getSkills, shortToSkill, skillToShort, updatePairScore } from "./crewutils";
import { ItemBonusInfo, getItemBonuses } from "./itemutils";

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

export const crit65 = 2;
export const crit45 = 1.85;
export const crit25 = 1.45;
export const crit5 = 1;

export const defaultSettings = {
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



export function getBernardsNumber<T extends CrewMember>(a: T, gauntlet?: Gauntlet, apairs?: Skill[][] | Skill[], settings?: GauntletSettings) {
	let atrait = gauntlet?.prettyTraits?.filter(t => a.traits_named.includes(t)).length ?? 0;
	settings ??= defaultSettings;

	if (atrait >= 3) atrait = settings.crit65;
	else if (atrait >= 2) atrait = settings.crit45;
	else if (atrait >= 1) atrait = settings.crit25;
	else atrait = settings.crit5;

	apairs ??= getPlayerPairs(a, atrait, settings.minWeight, settings.maxWeight);

	let cn = 0;
	let w = 0;

	if (apairs?.length && ("length" in apairs[0])) {
		const skills = [apairs[0][0], apairs[0][1], apairs.length > 1 ? apairs[1][1] : { core: 0, range_min: 0, range_max: 0 }];

		for (let skill of skills) {
			if (skill.range_max === 0) continue;
			let dn = (skill.range_max + skill.range_min) / 2;
			if (dn) {
				cn += dn;
				w++;
			}
		}
		if (apairs.length === 1) cn /= 2;
	}
	else if (apairs?.length && !("length" in apairs[0])) {
		for (let skill of apairs as Skill[]) {
			if (skill.range_max === 0) continue;
			let dn = (skill.range_max + skill.range_min) / 2;
			if (dn) {
				cn += dn;
				w++;
			}
		}
	}

	//cn /= w;

	return cn;
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
							return crew2.isOpponent !== true;
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
										skill: srank.find(sr => sr !== p.skill)
									}
									]
									if (idx === 0) amatch = glitch.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
									else bmatch = glitch.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
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
		})
	}
	pairGroups.sort((a, b) => {

		const apair = a.pair.map(z => shortToSkill(z, true)).sort().join();
		const bpair = b.pair.map(z => shortToSkill(z, true)).sort().join();

		if (apair !== bpair) {
			if (apair === currSkills) return -1;
			else if (bpair === currSkills) return 1;
		}

		if (a.pair.includes(featRank) === b.pair.includes(featRank)) {
			let r = a.pair[0].localeCompare(b.pair[0]);
			if (!r) {
				r = a.pair[1].localeCompare(b.pair[1]);
			}
			return r;
		}
		else if (a.pair.includes(featRank)) {
			return -1;
		}
		else {
			return 1;
		}
	})

	return pairGroups;
}

function testFilterCrew(crew: PlayerCrew, filter: FilterProps, context: IDefaultGlobal): boolean {
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


export interface GauntletCalcConfig {
	context: IDefaultGlobal,
	settings: GauntletSettings,
	gauntlet: Gauntlet,
	buffMode: PlayerBuffMode;
	equipmentCache: { [key: string]: EquipmentItem[] }
	bonusCache: { [key: string]: ItemBonusInfo }
	rankByPair?: string,
	range_max?: number,
	filter?: FilterProps,
	textFilter?: string,
	hideOpponents?: boolean,
	onlyActiveRound?: boolean
}

export function calculateGauntlet(config: GauntletCalcConfig) {

	const { bonusCache: bonusInfo, equipmentCache: crewQuip, settings, buffMode, context, gauntlet, range_max, filter, textFilter, hideOpponents, onlyActiveRound } = config;
	let { rankByPair } = config;

	if (rankByPair === '' || rankByPair === 'none') rankByPair = undefined;

	const rmax = range_max ?? 100;
	const search = textFilter;

	const { buffConfig, maxBuffs } = context.player;
	const { crew: allCrew } = context.core;
	const { TRAIT_NAMES } = context.localized;

	const availBuffs = ['none'] as PlayerBuffMode[];
	const oppo = [] as PlayerCrew[];

	if (gauntlet.opponents?.length && !hideOpponents) {
		for (let op of gauntlet.opponents) {
			const ocrew = op.crew_contest_data.crew[0];
			const nfcrew = context.core.crew.find((cf) => cf.symbol === ocrew.archetype_symbol);
			if (nfcrew) {
				const fcrew = JSON.parse(JSON.stringify(nfcrew)) as PlayerCrew;
				for (let skname of Object.keys(fcrew.base_skills)) {
					const skill = fcrew.base_skills[skname] as Skill;
					const opposkill = ocrew.skills.find((f) => f.skill === skname);
					fcrew.skills ??= {};
					fcrew.skills[skname] = {
						...skill,
						range_max: opposkill?.max,
						range_min: opposkill?.min
					};
					fcrew[skname] = {
						core: skill.core,
						max: opposkill?.max,
						min: opposkill?.min
					};
				}

				fcrew.rarity = ocrew.rarity;
				fcrew.isOpponent = true;
				fcrew.ssId = op.player_id.toString();
				fcrew.immortal = CompletionState.DisplayAsImmortalOpponent;
				fcrew.have = false;
				oppo.push(fcrew);
			}
		}
	}

	if (buffConfig && Object.keys(buffConfig).length) {
		availBuffs.push('player');
		availBuffs.push('quipment');
	}
	if (maxBuffs && Object.keys(maxBuffs).length) {
		availBuffs.push('max');
	}

	const hasPlayer = !!context.player.playerData?.player?.character?.crew?.length;

	const prettyTraits = gauntlet.contest_data?.traits?.map(t => TRAIT_NAMES[t]);
	gauntlet.prettyTraits = prettyTraits;

	if (!prettyTraits) {
		return null
	}

	delete gauntlet.allCrew;
	delete gauntlet.maximal;
	delete gauntlet.minimal;
	delete gauntlet.pairMax;
	delete gauntlet.pairMin;

	let acc = [] as CrewMember[];

	if (context.player.playerData?.player?.character?.crew) {
		acc = context.player.playerData?.player?.character?.crew.concat(context.player.playerData?.player?.character?.unOwnedCrew ?? []);
	}
	else {
		acc = allCrew;
	}

	const workCrew = acc;

	const matchedCrew1 =
		workCrew.concat(oppo)
			.map(crewObj => crewObj as PlayerCrew)
			.filter(crew => {
				return (!!crew.isOpponent || crew.max_rarity > 3 || !!crew.kwipment?.length);
			})
			.map((inputCrew) => {
				let crew = !!inputCrew.isOpponent ? inputCrew : JSON.parse(JSON.stringify(inputCrew)) as PlayerCrew;

				if (!inputCrew.isOpponent && !crew.have) {
					if (buffConfig && (buffMode === 'player' || buffMode === 'quipment')) {
						applyCrewBuffs(crew, buffConfig);
					}
					else if (maxBuffs && buffMode === 'max') {
						applyCrewBuffs(crew, maxBuffs);
					}
				}

				// let c = context.player.playerData?.player?.character?.crew?.find(d => d.id === crew.id);

				if (!crew.isOpponent && crew.have) {
					//crew = JSON.parse(JSON.stringify(c)) as PlayerCrew;

					if (buffConfig && buffMode === 'player') {
						applyCrewBuffs(crew, buffConfig);
					}
					else if (buffConfig && buffMode === 'quipment') {
						if (crew.kwipment?.length) {
							if (!crewQuip[crew.symbol]) {
								crewQuip[crew.symbol] = getCrewQuipment(crew, context.core.items);
							}
							let cq = crewQuip[crew.symbol];
							let bn = cq?.map(q => {
								bonusInfo[q.symbol] ??= getItemBonuses(q);
								return bonusInfo[q.symbol];
							}) ?? undefined;

							applyCrewBuffs(crew, buffConfig, undefined, bn);
						}
						else {
							applyCrewBuffs(crew, buffConfig);
						}
					}
					else if (maxBuffs && buffMode === 'max') {
						applyCrewBuffs(crew, maxBuffs);
					}
					else {
						for (let skill of Object.keys(crew.base_skills)) {
							crew[skill] = { core: crew.base_skills[skill].core, min: crew.base_skills[skill].range_min, max: crew.base_skills[skill].range_max };
						}
					}
					// crew.have = true;
				}
				else {
					// crew.have = !!c?.skills;
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


				if (!crew.isOpponent) {
					if (gauntlet.contest_data?.selected_crew?.length && crew.immortal <= 0 && crew.have) {
						let selcrew = gauntlet.contest_data.selected_crew.find((sel) => {
							return sel.archetype_symbol === crew.symbol;
						});

						if (selcrew && crew.skills) {
							crew.isSelected = true;

							if (selcrew.disabled) {
								crew.isDisabled = true;
							}
							else {
								let oskill = crew.skills;
								crew.skills = {};
								crew.isDisabled
								delete crew.command_skill;
								delete crew.diplomacy_skill;
								delete crew.engineering_skill;
								delete crew.security_skill;
								delete crew.science_skill;
								delete crew.medicine_skill;

								for (let selskill of selcrew.skills) {
									let sk = selskill.skill;
									crew.isDebuffed = (oskill[sk].range_max > selskill.max);
									crew.skills[sk] = { core: 0, range_max: selskill.max, range_min: selskill.min } as Skill;
									crew[sk] = { core: 0, max: selskill.max, min: selskill.min } as ComputedSkill;
								}
							}
						}
					}

					if (!hasPlayer) crew.rarity = crew.max_rarity;
					else if (!crew.have) crew.rarity = 0;
					if (!crew.immortal || crew.immortal < 0) {
						crew.immortal = hasPlayer ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
					}
				}
				else {
					crew.immortal = CompletionState.DisplayAsImmortalOpponent;
					crew.have = false;
				}

				crew.pairs = getPlayerPairs(crew);
				return crew;
			})
			.filter((crew) => (!filter || testFilterCrew(crew, filter, context)))
			.map((crew) => {
				if (filter?.ownedStatus === 'nofemax' || filter?.ownedStatus === 'ownedmax' || filter?.ownedStatus === 'maxall') {
					if ((crew.level === 100 && crew.equipment?.length === 4) || !crew.have) return crew;
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
					else if (buffMode === 'max' && maxBuffs) {
						applyCrewBuffs(crew, maxBuffs);
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
		let pgs = getPairGroups(matchedCrew1, gauntlet, settings, hideOpponents, onlyActiveRound, undefined, 100, maxpg);

		const incidence = {} as { [key: string]: number };
		const avgidx = {} as { [key: string]: number };
		const fsk = gauntlet.contest_data?.featured_skill;
		let pc = 0;
		for (let pg of pgs) {
			let idx = 1;

			for (let pgcrew of pg.crew) {
				incidence[pgcrew.symbol] ??= 0;
				avgidx[pgcrew.symbol] ??= 0;

				if (pg.pair.some(p => shortToSkill(p, true) === fsk) && pc === 0) {
					incidence[pgcrew.symbol] += settings.linearSkillIncidenceWeightPrimary;
					avgidx[pgcrew.symbol] += (idx * settings.linearSkillIndexWeightPrimary);
				}
				else if (pg.pair.some(p => shortToSkill(p, true) === fsk) && pc === 1) {
					incidence[pgcrew.symbol] += settings.linearSkillIncidenceWeightSecondary;
					avgidx[pgcrew.symbol] += (idx * settings.linearSkillIndexWeightSecondary);
				}
				else if (pg.pair.some(p => shortToSkill(p, true) === fsk) && pc === 2) {
					incidence[pgcrew.symbol] += settings.linearSkillIncidenceWeightTertiary;
					avgidx[pgcrew.symbol] += (idx * settings.linearSkillIndexWeightTertiary);
				}
				else {
					incidence[pgcrew.symbol]++;
					avgidx[pgcrew.symbol] += idx;
				}
				idx++;
			}
			pc++;
		}

		Object.keys(avgidx).forEach(key => {
			avgidx[key] /= incidence[key];
		});

		matchedResults = matchedCrew1.filter(c => c.symbol in incidence).sort((a, b) => {
			let r = 0;
			let anum = (maxpg - avgidx[a.symbol]) * incidence[a.symbol];
			let bnum = (maxpg - avgidx[b.symbol]) * incidence[b.symbol];

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
}
