import { compareRewards, findColGroupsCrew, getOptCrew, neededStars, starCost } from "../utils/collectionutils";
import {
    CollectionInfo,
    CollectionCombo,
    CollectionWorkerConfig,
    CollectionWorkerResult,
    ColComboMap,
    ComboCostMap,
} from "../model/collections";
import { PlayerCollection, PlayerCrew } from "../model/player";
import { getPermutations, makeAllCombos } from "../utils/misc";

function makeOptimizedCombos(colCombos: CollectionCombo, playerCollections: PlayerCollection[]) {
    let cname = colCombos.collection.name;
    let mneeded = colCombos.collection.needed ?? 0;
    let tc = colCombos.combinedUnique;
    let isect = [...new Set(tc.map(c => c.collections)?.flat())];

    const pc = playerCollections.filter(col => !!col.needed && isect.includes(col.name));
    const heads = {} as { [key: string]: string[] };

    for (let acol of pc) {
        let nc = tc.filter(f => f.collections.includes(acol.name))?.map(c => c.symbol) ?? [];
        if (nc.length >= (acol.needed ?? 0)) {
            heads[acol.name] = nc;
        }
    }

    let protocombos = [] as string[];
    const counts = {} as { [key: string]: number };
    Object.values(heads).forEach((c) => {
        for (let symbol of c) {
            counts[symbol] ??= 0;
            counts[symbol]++;
        }
    });

    for (let uc of tc) {
        let cols = Object.keys(heads).filter(f => {
            if (cname === f) return false;
            return heads[f].includes(uc.symbol);
        }).sort((a, b) => a.localeCompare(b)).join(" / ");
        if (cols.length) protocombos.push(cols);
    }

    let exact = [] as string[];
    let less = [] as string[];

    protocombos = [...new Set(protocombos)];

    less = protocombos.filter((col) => {
        let cols = col.split(" / ");
        return cols.every(c => (playerCollections.find(f => f.name === c)?.needed ?? 0) < mneeded);
    });

    exact = protocombos.filter((col) => {
        let cols = col.split(" / ");
        return cols.every(c => (playerCollections.find(f => f.name === c)?.needed ?? 0) === mneeded);
    });

    less = [...new Set(less.map(l => l.split(" / ")).flat())];
    let eOut = exact.map(e => e.split(" / ")).filter(n => !n.some(nc => nc === colCombos.name));

    if (!less.length) return eOut;
    //console.log(`${colCombos.name}: Size of 'less': ${less.length}`);
    let limit = Number.POSITIVE_INFINITY;

    if (less.length >= 10) {
        limit = 3000;
        let needmap = [] as { str: string, n: number }[];
        less.forEach(f => {
            let cols = f.split(" / ").map(fc => playerCollections.find(pc => pc.name === fc) as PlayerCollection);
            needmap.push({
                n: cols.reduce((p, n) => p ? p + n.needed! : n.needed!, 0),
                str: f
            });
        });
        needmap.sort((a, b) => {
            let r = (b.n / colCombos.collection.needed!) - (a.n / colCombos.collection.needed!);
            if (!r) {
                r = a.str.localeCompare(b.str);
            }
            return r;
        });
        less = needmap.map(m => m.str);
    }

    let rawcombos = eOut.concat(makeAllCombos(less, limit));

    rawcombos.forEach(rc => rc.sort());
    let stitched = rawcombos.map(rc => rc.sort());

    let finals = [] as string[][];

    let c = stitched.length;
    for (let i = 0; i < c; i++) {
        finals.push(stitched[i]);
    }

    if (Number.isFinite(limit)) {
        finals.unshift(less);
    }
    //console.log(`Combos: ${results.length}`);
    return finals;

}

function normalCollectionSort<T extends PlayerCrew>(crew: T[], searchFilter?: string, searches?: string[], favorites?: boolean) {
    return crew.sort((a, b) => {
        let r = 0;

        if (searches?.length) {
            let ares = searches.includes(a.name);
            let bres = searches.includes(b.name);
            if (ares !== bres) {
                if (ares) return -1;
                return 1;
            }
        }
        if (a.have !== b.have) {
            if (!a.have) return 1;
            else return -1;
        }

        if (favorites) {
            if (a.favorite !== b.favorite) {
                if (a.favorite) return -1;
                else return 1;
            }
        }

        let acount = a.pickerId ?? 1;
        let bcount = b.pickerId ?? 1;

        let asearch =
            !searchFilter?.length ||
            searches?.some((search) => a.name === search);
        let bsearch =
            !searchFilter?.length ||
            searches?.some((search) => b.name === search);

        if (asearch !== bsearch) {
            if (asearch) r = -1;
            else r = 1;
        }

        if (!r) r = a.max_rarity - b.max_rarity;
        if (!r)
            r =
                ((b.highest_owned_rarity ?? b.rarity) / b.max_rarity) -
                ((a.highest_owned_rarity ?? a.rarity) / a.max_rarity);
        if (!r) r = b.level - a.level;
        if (!r) r = (b.equipment?.length ?? 0) - (a.equipment?.length ?? 0);
        if (!r) r = bcount - acount;
        if (!r) r = a.name.localeCompare(b.name);
        return r;
    });
}

type Relative = { name: string, needed: number, crew: string[] };
interface LocalCollectionInfo {
    name: string;
    crew: string[];
    relatives: Relative[];
    needed: number;
}

const CollectionOptimizer = {
    scanAll2: (config: CollectionWorkerConfig) => {
        return new Promise<CollectionWorkerResult>((resolve, reject) => {
            const { playerData, filterProps } = config;
            const { playerCollections, collectionCrew, matchMode, byCost } = config;
            const {
                costMode,
                short,
                mapFilter,
                ownedFilter,
                searchFilter,
                favorited: favorites,
                showIncomplete
            } = filterProps;

            const searches = searchFilter?.length
                ? searchFilter
                    .split(";")
                    .map((sf) => sf.trim())
                    ?.filter((f) => f?.length) ?? []
                : [];

            const eligCrew = collectionCrew.filter(f => !f.immortal || ((f.immortal && f.immortal < -1) && mapFilter.collectionsFilter?.length));
            eligCrew.forEach((f) => {
                if (f.have === undefined) f.have = !(f.immortal && f.immortal < -1);
                if (!f.have) {
                    f.rarity = 0;
                    f.equipment = [0, 1, 2, 3];
                    f.level = 100;
                    f.highest_owned_rarity = 0;
                }
            });

            const workingCollections = playerCollections.filter((col) => col.progress !== 'n/a' && (col.claimable_milestone_index ?? 0) < (col.milestones?.length ?? 0) && eligCrew.some(crew => crew.collections.some(col2 => col2 === col.name)));
            const colInfo = workingCollections.map((col) => ({
                name: col.name,
                crew: [],
                relatives: [],
                needed: col.needed ?? 0
            } as LocalCollectionInfo));

            colInfo.forEach((col) => {
                col.crew = eligCrew.filter(f => f.collections.some(col2 => col2 === col.name)).map(c => c.symbol);
            });

            const workingCrew = [... new Set(colInfo.map((col: LocalCollectionInfo) => col.crew).flat())].map(symbol => eligCrew.find(sym => sym.symbol === symbol) as PlayerCrew) as PlayerCrew[];
            normalCollectionSort(workingCrew);

            workingCrew.forEach((crew) => {
                let crewcols = colInfo.filter(c => crew.collections.includes(c.name));
                crew.pickerId = crewcols.length;
                let c = crewcols.length;
                for (let i = 0; i < c; i++) {
                    for (let j = 0; j < c; j++) {
                        if (i === j) continue;
                        let frel = crewcols[i].relatives.find(rel => rel.name === crewcols[j].name);
                        if (!frel) {
                            crewcols[i].relatives.push({
                                name: crewcols[j].name,
                                needed: crewcols[j].needed,
                                crew: [crew.symbol]
                            });
                        }
                        else if (!frel.crew.includes(crew.symbol)) {
                            frel.crew.push(crew.symbol);
                        }
                    }
                }
            });
            // type ComboKey = { main: Relative, cols: Relative[], crew: string[] };
            // function subset(a: ComboKey, b: ComboKey) {
            //     if (a === b) return false;
            //     if (a.main.name === b.main.name) {
            //         if (b.cols.every(c => a.cols.some(c2 => c.name === c2.name)) && a.cols.length > b.cols.length) {
            //             if (b.crew.every(c1 => a.crew.some(c2 => c1 === c2))) return true;
            //         }
            //     }
            //     return false;
            // }
            // const comboKeys = {} as { [key: string]: ComboKey };
            // const newCombos = colInfo.map(col => {
            //     const combos = [] as ComboKey[];
            //     if (col.name === 'The Way Home') {
            //         console.log('');
            //     }
            //     let rels = col.relatives.filter(f => f.needed <= col.needed);
            //     rels = rels.filter(rel => {
            //         if (rel.needed <= rel.crew.length) {
            //             combos.push({
            //                 main: col,
            //                 cols: [rel],
            //                 crew: rel.crew
            //             });
            //             return true;
            //         }
            //         return false;
            //     });
            //     let size = rels.length;
            //     for (let d = 2; d <= size; d++) {
            //         getPermutations(rels, d, undefined, true, undefined, (set, idx) => {
            //             let cc = col.crew.filter(f => set.some(s => s.crew.includes(f)));
            //             if (cc.length >= col.needed) {
            //                 let pset = set.filter(f => cc.filter(c2 => f.crew.includes(c2)).length >= f.needed);
            //                 if (pset.length === set.length) {
            //                     getPermutations(cc, col.needed, undefined, true, undefined, (roster) => {
            //                         let fset = pset.filter(prel => {
            //                             return prel.crew.filter(f => roster.includes(f)).length >= prel.needed;
            //                         });

            //                         if (fset.length === pset.length) {
            //                             let newkey = [col.name, ...set.map(s => s.name)].sort().join(",");
            //                             let cb = {
            //                                 main: col,
            //                                 cols: fset.map((fs) => ({...fs, crew: fs.crew.filter(f => roster.includes(f))})),
            //                                 crew: roster
            //                             };
            //                             combos.push(cb);
            //                             comboKeys[newkey] ??= cb;
            //                             return false;
            //                         }
            //                         return roster;
            //                     }, true);
            //                     return set;
            //                 }
            //             }
            //             return set;
            //         });
            //     }
            //     return { col, combos };
            // }).filter(f => f.combos.length);

            // let keybs = Object.keys(comboKeys);

            // //keybs = keybs.filter(key => keybs.every(key2 => key === key2 || !subset(key2.split(','), key.split(','))));
            // let finalCombos = keybs
            //     .map(key => comboKeys[key])
            //     .sort((a, b) => a.crew.length - b.crew.length || b.cols.length - a.cols.length || a.main.name.localeCompare(b.main.name));

            // finalCombos = finalCombos.filter((cb) => {
            //     if (!finalCombos.some(fc => subset(fc, cb))) {
            //         if (cb.crew.every(c => cb.cols.filter(f => f.crew.includes(c)).length >= 1)) {
            //             return true;
            //         }
            //     }
            //     return false;
            // });

            const preFiltered = colInfo.map(c => {
                //c.relatives = c.relatives.filter(f => f.needed <= c.needed);
                c.relatives.sort((a, b) => b.needed - a.needed || a.name.localeCompare(b.name));
                let col = workingCollections.find(f => f.name === c.name) as PlayerCollection;
                let map = {
                    collection: col,
                    crew: c.crew.map(csym => workingCrew.find(f => f.symbol === csym) as PlayerCrew)
                } as CollectionInfo;
                map.crew = normalCollectionSort(map.crew, searchFilter, searches, favorites);
                map.neededStars = neededStars(map.crew, map.collection.needed ?? 0);
                map.collection.neededCost = starCost(
                    map.crew,
                    map.collection.needed,
                    costMode === "sale");

                return map;
            })
            .sort((a, b) => {
                let acol = a.collection;
                let bcol = b.collection;
                let r = 0;

                if (mapFilter?.rewardFilter) {
                    r = compareRewards(mapFilter, [acol], [bcol], short);
                    if (r) return r;
                }

                let amissing = acol.milestone.goal as number - acol.owned as number;
                let bmissing = bcol.milestone.goal as number - bcol.owned as number;

                if (amissing < 0) amissing = 0;
                if (bmissing < 0) bmissing = 0;

                if (!r) r = amissing - bmissing;
                if (!r) r = (acol?.neededCost ?? 0) - (bcol?.neededCost ?? 0);
                if (!r) r = (acol?.needed ?? 0) - (bcol?.needed ?? 0);

                if (!r) {
                    r = (bcol.milestone.goal as number) - (acol.milestone.goal as number);
                }

                if (!r) r = acol?.name.localeCompare(bcol?.name ?? "") ?? 0;
                return r;
            });

            const colData = preFiltered.filter((x) => {
                let bPass =
                    x.collection !== undefined &&
                    x.crew?.length &&
                    x.collection?.totalRewards &&
                    x.collection.milestone &&
                    (!mapFilter?.collectionsFilter?.length ||
                        mapFilter.collectionsFilter.some((cf) => x.collection?.id === cf));

                if (searchFilter?.length && bPass) {
                    bPass &&= x.crew?.some((csf) =>
                        searches.some((search) => csf.name === search)
                    );
                }

                return !!bPass;
            });

            const linkScores = {} as { [key: string]: CollectionInfo[] };

            colInfo.forEach((ci) => {
                ci.relatives.forEach((rel) => {
                    let cirel = colInfo.find(c => c.name === rel.name);
                    if (cirel) {
                        let crew = ci.crew.filter(cf => cirel.crew.includes(cf)).map(ccsym => workingCrew.find(c => c.symbol === ccsym) as PlayerCrew).filter(f => f.have);
                        crew = normalCollectionSort(crew, searchFilter, searches, favorites);
                        //crew.sort((a, b) => a.name.localeCompare(b.name));
                        let col2 = workingCollections.find(wc => wc.name === cirel.name) as PlayerCollection;
                        if (!!crew?.length) {
                            linkScores[ci.name] ??= [];
                            linkScores[ci.name].push({
                                collection: col2,
                                crew: crew,
                                completes: crew.length >= (col2.needed ?? 0),
                            });

                            linkScores[ci.name] = linkScores[ci.name]
                                .filter((ls) => ls.completes)
                                .sort((a, b) => {
                                    let r = b.crew.length - a.crew.length;
                                    if (!r) r = a.collection.name.localeCompare(b.collection.name);
                                    return r;
                                });
                        }
                    }
                });
            });

            function sortCombos(combos: CollectionCombo[]) {
                combos.sort((a, b) => {
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
                        let r = acost - bcost;

                        if (!r && a.combos && b.combos) {
                            r = a.combos[0].crew.length - b.combos[0].crew.length;
                            if (!r) {
                                let atotal = a.combos[0].crew.map(c => collectionCrew.find(f => f.symbol === c && !f.immortal)).map(cl => cl?.level ?? 0).reduce((p, n) => p + n, 0);
                                let btotal = b.combos[0].crew.map(c => collectionCrew.find(f => f.symbol === c && !f.immortal)).map(cl => cl?.level ?? 0).reduce((p, n) => p + n, 0);
                                r = btotal - atotal;
                            }
                        }
                        return r;
                    });
            }

            const createOptimizerGroups = (colData: CollectionInfo[]) => {
                const colCombos = Object.keys(linkScores)
                    .map((key, idx) => {
                        let unique = linkScores[key].map((c) => c.crew).flat();
                        let col = colData.find((f) => f.collection.name === key);

                        let common = [...unique];
                        common = common.filter(
                            (fi, idx) => {
                                return unique.findIndex((f2) => f2.symbol === fi.symbol) === idx;
                            }
                        );

                        unique = [...unique, ...(col?.crew ?? [])];
                        unique = unique.filter(
                            (fi, idx) =>
                                unique.findIndex((f2) => f2.symbol === fi.symbol) === idx
                        );

                        const innercounts = {} as { [key: string]: number };
                        for (let u of unique) {
                            innercounts[u.symbol] = 1;
                            for (let subcol of linkScores[key]) {
                                if (subcol.crew.some((sc) => sc.symbol === u.symbol)) {
                                    innercounts[u.symbol]++;
                                }
                            }
                        }
                        unique.sort((a, b) => {
                            let r = 0;
                            let ca = 0;
                            let cb = 0;

                            if (favorites) {
                                if (a.favorite != b.favorite) {
                                    if (a.favorite) return -1;
                                    else return 1;
                                }
                            }

                            if (!r) {
                                ca = starCost([a], undefined, costMode === "sale")
                                cb = starCost([b], undefined, costMode === "sale");
                            }

                            r = ca - cb;

                            if (!r) {
                                ca = innercounts[a.symbol];
                                cb = innercounts[b.symbol];
                            }

                            r = cb - ca;
                            return r;
                        });
                        return {
                            name: key,
                            maps: linkScores[key],
                            combinedUnique: unique,
                            crewInCommon: common,
                            collection: col?.collection,
                            neededStars: neededStars(unique),
                            uniqueCost: starCost(unique, undefined, costMode === "sale"),
                        } as CollectionCombo;
                    })
                    .filter((g) => !!g.maps?.length && g.maps.some((gm) => gm.completes))
                    .sort((a, b) => {
                        let dista = a.combinedUnique.length - a.crewInCommon.length;
                        let distb = b.combinedUnique.length - b.crewInCommon.length;
                        let r = 0;

                        a.nonfullfilling = dista;
                        b.nonfullfilling = distb;

                        if (dista >= 0 && distb >= 0) {
                            if (dista !== distb) {
                                if (dista === 0) return -1;
                                else if (distb === 0) return 1;
                            }

                            a.nonfullfillingRatio = a.maps.length / dista;
                            b.nonfullfillingRatio = b.maps.length / distb;

                            r = dista - distb;
                        } else if (dista >= 0) {
                            return -1;
                        } else if (distb >= 0) {
                            return 1;
                        } else {
                            r = distb - dista;
                        }

                        if (!r) r = b.maps.length - a.maps.length;

                        if (!r) {
                            r = (a.uniqueCost ?? 0) - (b.uniqueCost ?? 0);
                        }
                        return r;
                    });

                const createCombos = (col: CollectionCombo): ColComboMap[] => {
                    const mneed = col.collection.needed!;

                    let result = makeOptimizedCombos(col, playerCollections);
                    //let result = makeAllCombos(names);

                    const colNeeded = col.collection.needed ?? 0;

                    const exact = [] as ColComboMap[];
                    const over = [] as ColComboMap[];
                    const under = [] as ColComboMap[];
                    // const cml = col.maps.length;

                    // for (let i = cml; i >= 1; i--) {
                    //     getPermutations(col.maps, i, undefined, true, undefined, (cols) => {
                    //         if (!cols.every(c => c.collection.needed! <= mneed)) return false;
                    //         let test = cols.map(m => m.collection.name);
                    //         //if (isSupersetSeen(test)) return false;

                    //         const colCounts = {} as { [key: string]: { count: number, need: number, crew: string[] } };

                    //         if (cols?.length) {
                    //             let good = [] as CollectionInfo[];

                    //             let allcrew = cols.map(c => c.crew).flat();
                    //             allcrew = allcrew.filter((f, i) => f && allcrew.findIndex(f2 => f2 && f2.symbol === f.symbol) === i);
                    //             for (let crew of allcrew) {
                    //                 let cfound = cols.filter(f => f.crew.find(fc => fc.symbol === crew.symbol)) ?? [];
                    //                 for (let ckey of cfound) {
                    //                     if (good.findIndex(d => d.collection.name === ckey.collection.name) !== -1) continue;
                    //                     colCounts[ckey.collection.name] ??= { count: 0, need: ckey.collection.needed ?? 0, crew: [] };
                    //                     colCounts[ckey.collection.name].count++;
                    //                     colCounts[ckey.collection.name].crew.push(crew.symbol);

                    //                     if (colCounts[ckey.collection.name].count === colCounts[ckey.collection.name].need) {
                    //                         if (!good.includes(ckey)) good.push(ckey);
                    //                     }
                    //                 }
                    //             }
                    //         }
                    //         const foundCols = Object.keys(colCounts);
                    //         if (foundCols.length === test.length) {
                    //             let crewnames = Object.values(colCounts).map(v => v.crew).flat();
                    //             crewnames = crewnames.filter((cn, idx) => crewnames.findIndex(cn2 => cn2 === cn) === idx);
                    //             let total = crewnames.length;

                    //             if (total) {
                    //                 if (total === colNeeded) {
                    //                     exact.push({ names: test, count: total, crew: crewnames, exact: true });
                    //                 } else if (total > colNeeded) {
                    //                     over.push({ names: test, count: total, crew: crewnames, exact: false });
                    //                 } else {
                    //                     under.push({ names: test, count: total, crew: crewnames, exact: false });
                    //                 }
                    //             }
                    //             //supersets.push(test);
                    //         }
                    //         return cols;
                    //     });

                    // }

                    for (let test of result) {
                        let cols = test.map((tc) =>
                            col.maps.find((f) => f.collection.name === tc)
                        ) as CollectionInfo[];

                        const colCounts = {} as { [key: string]: { count: number, need: number, crew: string[] } };

                        if (cols?.length) {
                            let good = [] as CollectionInfo[];

                            let allcrew = cols.map(c => c.crew).flat();
                            allcrew = allcrew.filter((f, i) => f && allcrew.findIndex(f2 => f2 && f2.symbol === f.symbol) === i);
                            for (let crew of allcrew) {
                                let cfound = cols.filter(f => f.crew.find(fc => fc.symbol === crew.symbol)) ?? [];
                                for (let ckey of cfound) {
                                    if (good.findIndex(d => d.collection.name === ckey.collection.name) !== -1) continue;
                                    colCounts[ckey.collection.name] ??= { count: 0, need: ckey.collection.needed ?? 0, crew: [] };
                                    colCounts[ckey.collection.name].count++;
                                    colCounts[ckey.collection.name].crew.push(crew.symbol);

                                    if (colCounts[ckey.collection.name].count === colCounts[ckey.collection.name].need) {
                                        if (!good.includes(ckey)) good.push(ckey);
                                    }
                                }
                            }
                        }
                        const foundCols = Object.keys(colCounts);
                        if (foundCols.length === test.length) {
                            let crewnames = Object.values(colCounts).map(v => v.crew).flat();
                            crewnames = crewnames.filter((cn, idx) => crewnames.findIndex(cn2 => cn2 === cn) === idx);
                            let total = crewnames.length;

                            if (total) {
                                if (total === colNeeded) {
                                    exact.push({ names: test, count: total, crew: crewnames, exact: true });
                                } else if (total > colNeeded) {
                                    over.push({ names: test, count: total, crew: crewnames, exact: false });
                                } else {
                                    under.push({ names: test, count: total, crew: crewnames, exact: false });
                                }
                            }
                        }
                    }

                    exact.sort((a, b) => b.crew.length - a.crew.length);
                    under.sort((a, b) => b.crew.length - a.crew.length);
                    over.sort((a, b) => b.crew.length - a.crew.length);

                    if (matchMode === 'normal') {
                        if (exact.length > 1) {
                            return exact;
                        }
                        else {
                            return exact.concat(under);
                        }
                    }
                    else if (matchMode === 'exact-only') {
                        return exact;
                    }
                    else if (matchMode === 'inexact-only') {
                        return under;
                    }
                    else {
                        return exact.concat(under);
                    }
                };

                for (let col of colCombos) {
                    col.combos = createCombos(col);
                    if (mapFilter?.rewardFilter?.length) {
                        col.combos?.sort((a, b) => {
                            let acol = (a.names.map((a) =>
                                playerCollections.find((f) => f.name === a)
                            ) ?? []) as PlayerCollection[];
                            let bcol = (b.names.map((b) =>
                                playerCollections.find((f) => f.name === b)
                            ) ?? []) as PlayerCollection[];

                            if (acol && bcol) {
                                return compareRewards(mapFilter, acol, bcol, short);
                            } else if (acol) {
                                return -1;
                            } else if (bcol) {
                                return 1;
                            }
                            return 0;
                        });
                    }
                    if (mapFilter?.collectionsFilter?.length) {
                        if (!mapFilter?.collectionsFilter?.includes(col.collection.id)) {
                            col.combos = col.combos?.filter((fc) => {
                                let col = fc.names.map((sc) =>
                                    playerCollections.find((col) => col.name === sc)
                                );
                                return col.some((c) =>
                                    mapFilter?.collectionsFilter?.includes(c?.id ?? -1)
                                );
                            });
                        }
                    }
                }

                return colCombos
                    .filter((c) => c.combos?.length)
                    .map((fc) => {
                        if (mapFilter?.rewardFilter?.length) {
                            let col = (fc.combos
                                ?.map((sc) =>
                                    sc.names.map((tu) =>
                                        playerCollections?.find(
                                            (col) => col?.name === tu?.replace("* ", "")
                                        )
                                    )
                                )
                                ?.filter((c) => c) ?? []) as PlayerCollection[][];

                            col?.sort((a, b) => {
                                return compareRewards(mapFilter, a, b, short);
                            });

                            if (col?.length) {
                                let newcombo = [] as ColComboMap[];
                                for (let pc of col) {
                                    let cb = fc.combos?.find(ff => ff.names.every(ffn => pc.some(cush => cush.name === ffn)))
                                    if (cb) {
                                        newcombo.push(cb);
                                    }
                                }
                                fc.combos = newcombo;
                            }
                        }
                        return fc;
                    })
                    .sort((a, b) => {
                        if (mapFilter?.rewardFilter?.length) {
                            let acol = a?.collection;
                            let bcol = b?.collection;
                            let r = 0;

                            if (mapFilter?.rewardFilter) {
                                //r = compareRewards(mapFilter, [acol], [bcol], short);
                                r = compareRewards(
                                    mapFilter,
                                    [acol, ...(a?.maps?.map((d) => d.collection) ?? [])].filter(
                                        (e) => e
                                    ),
                                    [bcol, ...(b?.maps?.map((d) => d.collection) ?? [])].filter(
                                        (e) => e
                                    ),
                                    short
                                );

                                if (r) {
                                    return r;
                                }
                            }
                        }

                        if (a.combos && b.combos) {
                            let acb = a.combos.length;
                            let bcb = b.combos.length;
                            let ayes = a.combos.filter((c) => c.exact)?.length ?? 0;
                            let byes = b.combos.filter((c) => c.exact)?.length ?? 0;

                            let r = 0;

                            if (!r) r = byes - ayes;
                            if (!r) r = bcb - acb;

                            return r;
                        } else if (a.combos) {
                            return -1;
                        } else if (b.combos) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
            };

            const colCombos = createOptimizerGroups(preFiltered.map(g => {
                return {
                    ...g,
                    crew: g.crew.filter(f => f.have || (f.immortal !== undefined && f.immortal >= -1))
                }
            }).filter(f => !!f.crew.length));

            const newCostMap = [] as ComboCostMap[];

            colCombos.forEach((col) => {
                let seengroups = {} as { [key: string]: ComboCostMap };
                col.comboCost = [];

                for (let combo of col.combos ?? []) {
                    let comboname = combo.names.join(" / ");
                    let crew = getOptCrew(col, costMode, searches, comboname);
                    let grouped = crew.map(c => c.symbol).sort().join(",");
                    let cost = starCost(crew, undefined, costMode === 'sale');
                    let cm: ComboCostMap = {
                        collection: col.collection.name,
                        combo: combo,
                        cost,
                        shadow_cost: cost,
                        crew: crew,
                        exact: combo.exact
                    };
                    seengroups[grouped] ??= cm;
                    if (combo.names.length > seengroups[grouped].combo.names.length) {
                        seengroups[grouped] = cm;
                    }
                }

                let cm = [] as ComboCostMap[];

                let newcombos = [] as ColComboMap[];
                let sg = Object.keys(seengroups);

                sg.forEach(key => {
                    let value = seengroups[key];
                    if (!newcombos.find(fc => fc.names.sort().join(" / ") === value.combo.names.sort().join(" / "))) {
                        newcombos.push(value.combo);
                        cm.push(value);
                        newCostMap.push(value);
                    }
                });

                col.combos = newcombos;
                col.comboCost = cm.map(m => m.cost);
            });

            if (colCombos?.length) {
                colCombos.forEach(col => {
                    let map = newCostMap.filter(f => f.collection === col.collection.name);
                    map = map.filter(mf => (!byCost || (byCost && !!mf.cost)) && mf.crew.length <= (col.collection.needed ?? 0));
                    map.sort((a, b) => {
                        return b.combo.count - a.combo.count
                    })
                    col.combos = map.map(m => m.combo);
                    col.comboCost = map.map(m => m.cost);
                });
            }

            if (colCombos?.length) {
                if (byCost) {
                    colCombos.forEach(col => {
                        let map = newCostMap.filter(f => f.collection === col.collection.name);
                        map = map.sort((a, b) => a.cost - b.cost);
                        col.combos = map.map(m => m.combo);
                        col.comboCost = map.map(m => m.cost);
                    });

                    sortCombos(colCombos);
                }
                else if (!filterProps.mapFilter.rewardFilter?.length) {
                    const honor = playerData.player.honor;
                    colCombos.sort((a, b) => {
                        let r = 0;

                        let aneeded = a.collection.neededCost ?? 0;
                        let bneeded = b.collection.neededCost ?? 0;

                        let amuch = aneeded > honor;
                        let bmuch = bneeded > honor;

                        if (amuch !== bmuch) {
                            if (amuch) return 1;
                            else if (bmuch) return -1;
                        }

                        if (a.combos?.length && b.combos?.length) {
                            let maxa = a.combos.map(c => c.count).reduce((p, n) => p > n ? p : n, 0);
                            let maxb = b.combos.map(c => c.count).reduce((p, n) => p > n ? p : n, 0);

                            r = (aneeded / maxa) - (bneeded / maxb);
                            if (!r) r = aneeded - bneeded;
                        }

                        return r;
                    });
                }
            }

            let fc = colCombos.filter((col) => {
                if (!showIncomplete && col.collection.owned < (col.collection.milestone.goal as number)) return false;

                if (col.combos) {
                    let newcombos = [] as ColComboMap[];
                    let newcombocost = [] as number[];
                    let x = 0;
                    for (let combo of col.combos) {
                        if (col.combos?.every((cb2) => !(combo !== cb2 && combo.names.every(name => cb2.names.includes(name))))) {
                            newcombos.push(combo);
                            if (col.comboCost?.length) newcombocost.push(col.comboCost[x]);
                        }
                        x++;
                    }

                    col.combos = newcombos;
                    col.comboCost = newcombocost;

                    if (searches?.length) {
                        newcombos = [];
                        newcombocost = [];
                        x = 0;
                        for (let combo of col.combos ?? []) {
                            let fc = findColGroupsCrew(newCostMap, col, combo.names.join(" / "));
                            if (fc.some(fcc => searches.includes(fcc.name))) {
                                newcombos.push(combo);
                                if (col.comboCost?.length) newcombocost.push(col.comboCost[x]);
                            }
                            x++;
                        }

                        col.combos = newcombos;
                        col.comboCost = newcombocost;

                        if (!col.combinedUnique?.some(f => searches.includes(f.name))) return false;
                    }

                    col.combos.forEach((combo) => {
                        if (combo.exact) {
                            combo.names[0] = "* " + combo.names[0];
                        }
                    });
                }


                return !!col.combos?.length;
            });

            sortCombos(fc);

            resolve({
                combos: fc,
                collections: colData,
                comboCostMap: newCostMap
            });

        });
    },
};

export default CollectionOptimizer;
