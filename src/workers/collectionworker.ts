import { checkCommonFilter, compareRewards, neededStars, starCost } from "../utils/collectionutils";
import {
    CollectionMap,
    CollectionGroup,
    CollectionWorkerConfig,
    CollectionWorkerResult,
} from "../model/collectionfilter";
import { CompletionState, PlayerCollection } from "../model/player";
import { makeAllCombos } from "../utils/misc";

const CollectionOptimizer = {
    scanAll: (config: CollectionWorkerConfig) => {
        return new Promise<CollectionWorkerResult>((resolve, reject) => {
            const { playerData, filterProps } = config;
            const { playerCollections, collectionCrew } = config;
            const {
                costMode,
                short,
                mapFilter,
                ownedFilter,
                searchFilter,
            } = filterProps;

            const searches = searchFilter?.length
                ? searchFilter
                    .split(";")
                    .map((sf) => sf.trim())
                    ?.filter((f) => f?.length) ?? []
                : [];

            const createCollectionGroups = (): CollectionMap[] => {
                let fstep1 =
                    playerData?.player?.character.crew
                        .concat(
                            mapFilter?.collectionsFilter?.length
                                ? playerData?.player?.character.unOwnedCrew ?? []
                                : []
                        )
                        .filter((fc) =>
                            collectionCrew.some((pc) => pc.symbol === fc.symbol)
                        ) ?? [];
                let fss = {} as { [key: string]: boolean };

                if (fstep1.length) {
                    let currsym = "";
                    for (let item of fstep1) {
                        currsym = item.symbol;
                        if (!(currsym in fss)) {
                            fss[currsym] = true;
                        }
                        fss[currsym] =
                            fss[currsym] &&
                            !(
                                item.immortal > 0 ||
                                item.immortal === CompletionState.Immortalized
                            );
                    }
                }
                const fstep2 = fstep1.filter(
                    (crew, idx) =>
                        fss[crew.symbol] &&
                        idx === fstep1.findIndex((c2) => c2.symbol === crew.symbol)
                );

                let cstep1 = fstep2.map((g) => g.collections).flat();
                cstep1 = cstep1.filter((cn, idx) => cstep1.indexOf(cn) === idx).sort();

                const colMap = cstep1
                    .map((col, idx) => {
                        const cobj = playerCollections.find((f) => f.name === col);

                        return {
                            collection: cobj,
                            crew: fstep2.filter((crew) => {
                                if (
                                    crew.immortal === CompletionState.Immortalized ||
                                    crew.immortal > 0
                                )
                                    return false;

                                let fr = crew.collections.some((fc) => fc == col);

                                if (fr) {
                                    if (mapFilter?.collectionsFilter?.length) {
                                        if (ownedFilter === "unowned" && !!crew.have) return false;
                                        if (ownedFilter.slice(0, 5) === "owned" && !crew.have)
                                            return false;
                                    } else if (!crew.have) {
                                        return false;
                                    }

                                    if (!checkCommonFilter(filterProps, crew, ["unowned", "owned"]))
                                        return false;
                                }
                                return fr;
                            }),
                        } as CollectionMap;
                    })
                    .filter((fc) => {
                        if (fc.crew.length < (fc.collection.needed ?? 0)) return false;
                        if (!fc.collection.milestone.goal) return false;
                        return true;
                    });

                colMap.forEach((col, idx) => {
                    col.crew.forEach((a) => {
                        let acount =
                            a.collections.filter((afc) =>
                                playerCollections.find((cmf) => cmf.needed && cmf.name === afc)
                            )?.length ?? 1;
                        a.pickerId = acount;
                    });

                    col.crew.sort((a, b) => {
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

                        if (a.favorite !== b.favorite) {
                            if (a.favorite) return -1;
                            else return 1;
                        }

                        let acount = a.pickerId ?? 1;
                        let bcount = b.pickerId ?? 1;

                        let asearch =
                            !searchFilter?.length ||
                            searches.some((search) => a.name.includes(search));
                        let bsearch =
                            !searchFilter?.length ||
                            searches.some((search) => b.name.includes(search));

                        if (asearch !== bsearch) {
                            if (asearch) r = -1;
                            else r = 1;
                        }

                        if (!r) r = a.max_rarity - b.max_rarity;
                        if (!r)
                            r =
                                b.rarity / (b.highest_owned_rarity ?? b.max_rarity) -
                                a.rarity / (a.highest_owned_rarity ?? a.max_rarity);
                        if (!r) r = b.level - a.level;
                        if (!r) r = (b.equipment?.length ?? 0) - (a.equipment?.length ?? 0);
                        if (!r) r = bcount - acount;
                        if (!r) r = a.name.localeCompare(b.name);
                        return r;
                    });

                    col.neededStars = neededStars(col.crew, col.collection.needed ?? 0);
                });

                colMap.forEach(
                    (c) =>
                    (c.collection.neededCost = starCost(
                        c.crew,
                        c.collection.needed,
                        costMode === "sale"
                    ))
                );

                colMap.sort((a, b) => {
                    let acol = a.collection;
                    let bcol = b.collection;
                    let r = 0;

                    if (mapFilter?.rewardFilter) {
                        r = compareRewards(mapFilter, [acol], [bcol], short);
                        if (r) return r;
                    }

                    let amissing =
                        (acol?.milestone?.goal === "n/a" ? 0 : acol?.milestone?.goal ?? 0) -
                        (acol?.owned ?? 0);
                    let bmissing =
                        (bcol?.milestone?.goal === "n/a" ? 0 : bcol?.milestone?.goal ?? 0) -
                        (bcol?.owned ?? 0);
                    if (amissing < 0) amissing = 0;
                    if (bmissing < 0) bmissing = 0;
                    if (!r) r = amissing - bmissing;
                    if (!r) r = (acol?.neededCost ?? 0) - (bcol?.neededCost ?? 0);
                    if (!r) r = (acol?.needed ?? 0) - (bcol?.needed ?? 0);
                    if (!r)
                        r =
                            ((bcol?.milestone?.goal as number) ?? 0) -
                            ((acol?.milestone?.goal as number) ?? 0);
                    if (!r) r = acol?.name.localeCompare(bcol?.name ?? "") ?? 0;
                    return r;
                });

                return colMap.filter((cm) => cm.crew?.length);
            };

            const unfilteredGroups = createCollectionGroups();

            const colGroups = unfilteredGroups.filter((x) => {
                let bPass =
                    x.collection !== undefined &&
                    x.crew?.length &&
                    x.collection?.totalRewards &&
                    x.collection.milestone &&
                    (!mapFilter?.collectionsFilter?.length ||
                        mapFilter.collectionsFilter.some((cf) => x.collection?.id === cf));

                if (searchFilter?.length && bPass) {
                    bPass &&= x.crew?.some((csf) =>
                        searches.some((search) => csf.name.includes(search))
                    );
                }

                return !!bPass;
            });

            // TODO: Optimizer depends on createCollectionGroups, wrap it in!
            // TODO: Sort Optimizer by filter options
            // TODO: Optimizer option show crew on top
            const createOptimizerGroups = (colGroups: CollectionMap[]) => {
                const linkScores = {} as { [key: string]: CollectionMap[] };

                for (let col of colGroups) {
                    linkScores[col.collection.name] ??= [];
                    if (col.collection.progress === "n/a") continue;
                    if (
                        (col.collection.progress ?? 0) + (col.collection.needed ?? 0) >
                        (col.collection.owned ?? 0)
                    )
                        continue;
                    for (let col2 of colGroups) {
                        if (col2.collection.progress === "n/a") continue;
                        if (
                            (col2.collection.progress ?? 0) + (col2.collection.needed ?? 0) >
                            (col2.collection.owned ?? 0)
                        )
                            continue;
                        if (col.collection.name === col2.collection.name) continue;
                        if ((col.collection.needed ?? 0) < (col2.collection.needed ?? 0))
                            continue;

                        let crew = col.crew.filter((cr) =>
                            col2.crew.some((cr2) => cr2.symbol === cr.symbol)
                        );
                        crew = crew.concat(
                            col2.crew.filter((cr) =>
                                col.crew.some((cr2) => cr2.symbol === cr.symbol)
                            )
                        );
                        crew = crew.filter(
                            (cr, idx) =>
                                crew.findIndex((cr2) => cr2.symbol === cr.symbol) === idx
                        );
                        crew.sort((a, b) => a.name.localeCompare(b.name));
                        if (!!crew?.length) {
                            linkScores[col.collection.name].push({
                                collection: col2.collection,
                                crew: crew,
                                completes: crew.length >= (col2.collection.needed ?? 0),
                            });
                        }
                    }

                    linkScores[col.collection.name] = linkScores[col.collection.name]
                        .filter((ls) => ls.completes)
                        .sort((a, b) => {
                            let r = b.crew.length - a.crew.length;
                            if (!r) r = a.collection.name.localeCompare(b.collection.name);
                            return r;
                        });
                }

                const colOptimized = Object.keys(linkScores)
                    .map((key, idx) => {
                        let unique = linkScores[key].map((c) => c.crew).flat();
                        let col = colGroups.find((f) => f.collection.name === key);

                        let common = [...unique];
                        common = common.filter(
                            (fi, idx) =>
                                unique.findIndex((f2) => f2.symbol === fi.symbol) === idx
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
                            let ca = innercounts[a.symbol];
                            let cb = innercounts[b.symbol];
                            r = cb - ca;
                            if (!r) {
                                r =
                                    starCost([a], undefined, costMode === "sale") -
                                    starCost([b], undefined, costMode === "sale");
                            }
                            return r;
                        });
                        return {
                            name: key,
                            maps: linkScores[key],
                            uniqueCrew: unique,
                            commonCrew: common,
                            collection: col?.collection,
                            neededStars: neededStars(unique),
                            uniqueCost: starCost(unique, undefined, costMode === "sale"),
                        } as CollectionGroup;
                    })
                    .filter((g) => !!g.maps?.length && g.maps.some((gm) => gm.completes))
                    .sort((a, b) => {
                        let dista = a.uniqueCrew.length - a.commonCrew.length;
                        let distb = b.uniqueCrew.length - b.commonCrew.length;
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

                const createCombos = (col: CollectionGroup) => {
                    const names = col.maps.map((c) => c.collection.name);

                    let result = makeAllCombos(names);

                    let exact = [] as { names: string[]; count: number }[];
                    let over = [] as { names: string[]; count: number }[];
                    let under = [] as { names: string[]; count: number }[];
                    let colneed = col.collection.needed ?? 0;

                    for (let test of result) {
                        let cols = test.map((tc) =>
                            col.maps.find((f) => f.collection.name === tc)
                        );

                        if (cols?.length) {
                            let extracrew = [] as string[];
                            extracrew = cols
                                .map((cm) => cm?.crew.slice(0, cm.collection.needed))
                                .flat()
                                .map((f) => f?.symbol ?? "");
                            extracrew =
                                extracrew.filter(
                                    (ef, i) =>
                                        ef !== "" && extracrew.findIndex((fi) => fi === ef) === i
                                ) ?? [];
                            let total = extracrew.length; // cols.map(c => c?.collection.needed ?? 0).reduce((p, n) => p + n, 0);
                            let tc = cols
                                .map((c) => c?.collection.needed ?? 0)
                                .reduce((p, n) => p + n, 0);

                            if (total) {
                                if (total === colneed) {
                                    exact.push({ names: test, count: total });
                                } else if (total > colneed) {
                                    over.push({ names: test, count: total });
                                } else {
                                    under.push({ names: test, count: total });
                                }
                            }
                        }
                    }
                    exact.sort((a, b) => b.names.length - a.names.length);
                    under.sort((a, b) => b.names.length - a.names.length);
                    for (let ex of exact) {
                        ex.names = ex.names.map((eu, idx) => (!idx ? "* " : "") + eu);
                    }
                    if (exact.length > 1) {
                        return exact.map((d) => d.names);
                    }
                    return exact.concat(under).map((d) => d.names);
                };

                for (let col of colOptimized) {
                    col.combos = createCombos(col);
                    if (mapFilter?.rewardFilter?.length) {
                        col.combos?.sort((a, b) => {
                            let acol = (a.map((a) =>
                                playerCollections.find((f) => f.name === a)
                            ) ?? []) as PlayerCollection[];
                            let bcol = (b.map((b) =>
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
                            col.combos = col.combos.filter((fc) => {
                                let col = fc.map((sc) =>
                                    playerCollections.find(
                                        (col) => col.name === sc.replace("* ", "")
                                    )
                                );
                                return col.some((c) =>
                                    mapFilter?.collectionsFilter?.includes(c?.id ?? -1)
                                );
                            });
                        }
                    }
                }

                return colOptimized
                    .filter((c) => c.combos?.length)
                    .map((fc) => {
                        if (mapFilter?.rewardFilter?.length) {
                            let col = (fc.combos
                                ?.map((sc) =>
                                    sc.map((tu) =>
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
                                fc.combos = col?.map((c) => c.map((d) => d.name));
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
                                r = compareRewards(mapFilter, [acol], [bcol], short);
                                if (r) return r;
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

                                if (r) return r;
                            }
                        }

                        if (a.combos && b.combos) {
                            let acb = a.combos.length;
                            let bcb = b.combos.length;
                            let ayes =
                                a.combos.filter((c) => c[0].startsWith("* "))?.length ?? 0;
                            let byes =
                                b.combos.filter((c) => c[0].startsWith("* "))?.length ?? 0;
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

            const colOptimized = createOptimizerGroups(unfilteredGroups.map(g => {
                return {
                    ... g,
                    crew: g.crew.filter(f => f.have || (f.immortal !== undefined && f.immortal >= -1))
                }
            }).filter(f => !!f.crew.length));

            resolve({
                groups: colOptimized,
                maps: colGroups,
            });
        });
    },
};

export default CollectionOptimizer;
