import { CrewMember, Skill, ComputedBuff } from "../model/crew";
import { Gauntlet, PairGroup } from "../model/gauntlets";
import { PlayerCrew, CompletionState, PlayerBuffMode } from "../model/player";
import { EMPTY_SKILL, GauntletCalcConfig, GauntletCalcResults } from "../model/worker";
import { getBernardsNumber } from "../utils/gauntlet";
import { skillToRank, rankToSkill, getPlayerPairs, updatePairScore, getCrewPairScore, applyCrewBuffs, getCrewQuipment, getSkills } from "../utils/crewutils";
import { ItemBonusInfo, getItemBonuses } from "../utils/itemutils";
import { EquipmentItem } from "../model/equipment";

const GauntletWorker = {        

    calcGauntletCrew: (config: GauntletCalcConfig) => {
        const discoverPairs = (crew: (PlayerCrew | CrewMember)[], featuredSkill?: string) => {
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
    
        const getPairGroups = (crew: (PlayerCrew | CrewMember)[], gauntlet: Gauntlet, featuredSkill?: string, top?: number, maxResults?: number) => {
            featuredSkill ??= gauntlet.contest_data?.featured_skill;
            const pairs = discoverPairs(crew, featuredSkill);
            const { onlyActiveRound, hideOpponents } = config;
            const featRank = skillToRank(featuredSkill ?? "") ?? "";
            const ptop = top;
            const pairGroups = [] as PairGroup[];
            const currSkills = [gauntlet.contest_data?.primary_skill ?? "", gauntlet.contest_data?.secondary_skill ?? ""].sort().join();
    
            for (let pair of pairs) {
    
                if (pair === '') continue;
    
                let rank = pair;
                let rpairs = pair.replace("G_", "").split("_");
    
                const px = pairGroups.length;
    
                let srank = rpairs.map(p => rankToSkill(p) as string).sort();
                let pjoin = srank.join();
                
                const hapres = rpairs.map(z => rankToSkill(z)).sort().join();
                const { settings } = config;
    
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
                        .sort((a, b) => {
    
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
                                    for(let wpair of pset) {
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
                                                    ... p
                                                },
                                                { 
                                                    ... JSON.parse(JSON.stringify(EMPTY_SKILL)) as Skill,
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
                        })					
                });
    
                gauntlet.pairMax ??= [];
                gauntlet.pairMin ??= [];
    
                pairGroups[px].crew.forEach((c) => {
                    let tstr = rpairs.map(z => rankToSkill(z));
                    let gp = gauntlet.pairMin?.find(fo => fo.pair.map(foz => foz.skill).sort().join("_") === tstr.sort().join("_"));
                    let ps = getCrewPairScore(c, rank);
                    if (!ps) return;
    
                    if (!gp) {
                        gp = {
                            ... ps
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
                            ... ps
                        };
                        gauntlet.pairMax ??= [];
                        gauntlet.pairMax.push(gp);
                    }
                    else {
                        if (ps.score > gp.score) {
                            gp.score = ps.score;
                        }
                    }
                    
                })
    
            }
            if (maxResults) {
                pairGroups.forEach((pg) => {
                    pg.crew = pg.crew.slice(0, maxResults);
                })
            }
            pairGroups.sort((a, b) => {
    
                const apair = a.pair.map(z => rankToSkill(z)).sort().join();
                const bpair = b.pair.map(z => rankToSkill(z)).sort().join();
                
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
        
        let { gauntlet, rankByPair, range_max, filter, textFilter } = config;

        if (rankByPair === '' || rankByPair === 'none') rankByPair = undefined;

        const rmax = range_max ?? 500;
        const search = textFilter;

        const { buffConfig, maxBuffs } = config.context.player;		
        const { crew: allCrew, translation: allTraits } = config.context.core;		

        const availBuffs = ['none'] as PlayerBuffMode[];
        const oppo = [] as PlayerCrew[];
    
        if (gauntlet.opponents?.length && !config.hideOpponents) {
            for (let op of gauntlet.opponents){
                const ocrew = op.crew_contest_data.crew[0];
                const nfcrew = config.context.core.crew.find((cf) => cf.symbol === ocrew.archetype_symbol);
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

        const { buffMode } = config;

        const hasPlayer = !!config.context.player.playerData?.player?.character?.crew?.length;

        const prettyTraits = gauntlet.contest_data?.traits?.map(t => allTraits.trait_names[t]);
        gauntlet.prettyTraits = prettyTraits;

        if (!prettyTraits) {
            
            return new Promise<GauntletCalcResults>((resolve, reject) => {
                
                reject({
                    error: "Gauntlet has no traits!"
                });
            });
        }
        
        delete gauntlet.matchedCrew;
        delete gauntlet.maximal;
        delete gauntlet.minimal;
        delete gauntlet.pairMax;
        delete gauntlet.pairMin;

        const { settings } = config;

        const matchesCrew = (crew: PlayerCrew, value?: string) => {
            if (value !== '' && value !== undefined) {
                let ltf = value.toLowerCase();
                if (crew.name.toLowerCase().includes(ltf)) return true;
                if (crew.symbol.includes(ltf)) return true;
                if (crew.traits.some(t => t.toLowerCase().includes(ltf))) return true;
                if (crew.traits_hidden.some(t => t.toLowerCase().includes(ltf))) return true;
                if (crew.traits_named.some(t => t.toLowerCase().includes(ltf))) return true;
                return false;
            }
            return true;
        }
    
        const crewQuip = {} as { [key: string]: EquipmentItem[] };
        const bonusInfo = {} as { [key: string]: ItemBonusInfo };

        const matchedCrew1 =
            allCrew.concat(oppo).map(crewObj => crewObj as PlayerCrew).filter(crew => crew.max_rarity > 3 && (
                (!rankByPair || (rankByPair in crew.ranks)) &&
                (Object.keys(crew.base_skills).some(k => crew.base_skills[k].range_max >= rmax) || !!crew.isOpponent) ||
                prettyTraits.filter(t => crew.traits_named.includes(t)).length > 1))
                .map((inputCrew) => {
                    let crew = !!inputCrew.isOpponent ? inputCrew : JSON.parse(JSON.stringify(inputCrew)) as PlayerCrew;

                    if (!inputCrew.isOpponent) {
                        if (buffConfig && buffMode === 'player') {
                            applyCrewBuffs(crew, buffConfig);
                        }
                        else if (maxBuffs && buffMode === 'max') {
                            applyCrewBuffs(crew, maxBuffs);
                        }
                    }

                    let c = config.context.player.playerData?.player?.character?.crew?.find(d => d.symbol === crew.symbol);

                    if (!crew.isOpponent && c) {
                        crew = JSON.parse(JSON.stringify(c)) as PlayerCrew;
                        if (buffConfig && buffMode === 'player') {
                            applyCrewBuffs(crew, buffConfig);
                        }
                        else if (buffConfig && buffMode === 'quipment') {
                            if (crew.kwipment?.length) {
                                if (!crewQuip[crew.symbol]) {
                                    crewQuip[crew.symbol] = getCrewQuipment(crew, config.context.core.items);
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
                        crew.have = true;
                    }
                    else {
                        crew.have = !!c;
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
                        if (gauntlet.contest_data?.selected_crew?.length) {
                            let selcrew = gauntlet.contest_data.selected_crew.find((sel) => sel.archetype_symbol === crew.symbol);
                            if (selcrew) {
                                if (selcrew.disabled) {
                                    crew.isDisabled = true;
                                }
                                else {
                                    let oskill = crew.skills;
                                    crew.skills = {};

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
                                        crew[sk] = { core: 0, max: selskill.max, min: selskill.min } as ComputedBuff;
                                    }
                                }
                            }
                        }
                
                        if (!hasPlayer) crew.rarity = crew.max_rarity;
                        else if (!c) crew.rarity = 0;
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
                //.filter((crew) => (!filter || config.crewInFilter(crew, filter)) && matchesCrew(crew, search))
                .map((crew) => { 
                    if (filter?.ownedStatus === 'nofemax' || filter?.ownedStatus === 'ownedmax' || filter?.ownedStatus === 'maxall') {
                        if ((crew.level === 100 && crew.equipment?.length === 4) || !crew.have) return crew;
                        let fcrew = allCrew.find(z => z.symbol === crew.symbol);
                        if (!fcrew) return crew;

                        crew.base_skills = JSON.parse(JSON.stringify(fcrew.base_skills));
                        crew.rarity = crew.max_rarity;
                        crew.level = 100;
                        crew.equipment = [0,1,2,3];
                        crew.immortal = CompletionState.DisplayAsImmortalOwned;
                        crew.skills ??= {};
                        for (let skill of Object.keys(crew.base_skills)) {
                            crew.skills[skill] = { ... crew.base_skills[skill] };
                        }
                        if (buffMode === 'player' && buffConfig) {
                            applyCrewBuffs(crew, buffConfig);
                        }
                        else if (buffConfig && buffMode === 'quipment') {
                            if (crew.kwipment?.length) {
                                let cq = getCrewQuipment(crew, config.context.core.items);
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
        let pgs = [] as PairGroup[];

        if (gauntlet.prettyTraits?.length) {
            const maxpg = 10;
            pgs = getPairGroups(matchedCrew1, gauntlet, undefined, 100, maxpg);
            
            const incidence = {} as { [key: string]: number };
            const avgidx = {} as { [key: string]: number };
            const fsk = gauntlet.contest_data?.featured_skill;
            let pc = 0;
            for(let pg of pgs) {
                let idx = 1;
                
                for (let pgcrew of pg.crew) {
                    incidence[pgcrew.symbol] ??= 0;				
                    avgidx[pgcrew.symbol] ??= 0;

                    if (pg.pair.some(p => rankToSkill(p) === fsk) && pc === 0) {
                        incidence[pgcrew.symbol] += settings.linearSkillIncidenceWeightPrimary;
                        avgidx[pgcrew.symbol] += (idx * settings.linearSkillIndexWeightPrimary);
                    }
                    else if (pg.pair.some(p =>  rankToSkill(p) === fsk) && pc === 1) {
                        incidence[pgcrew.symbol] += settings.linearSkillIncidenceWeightSecondary;
                        avgidx[pgcrew.symbol] += (idx * settings.linearSkillIndexWeightSecondary);
                    }
                    else if (pg.pair.some(p =>  rankToSkill(p) === fsk) && pc === 2) {
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

        gauntlet.matchedCrew = matchedCrew;
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

        return new Promise<GauntletCalcResults>((resolve, reject) => {
            resolve({
                gauntlet,
                matchedCrew,
                pairGroups: pgs
            });
        });
    },
    
}

export default GauntletWorker;