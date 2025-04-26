import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { BuffBase, CompletionState, ImmortalReward, MilestoneBuff, PlayerCollection, PlayerCrew, PlayerData, Reward } from '../../model/player';
import { crewCopy, oneCrewCopy } from '../../utils/crewutils';
import { TinyStore } from '../../utils/tiny';
import { CollectionsOverview } from './views/overview';
import { CollectionsContext, CollectionFilterProvider } from './context';
import { CollectionsViews } from './collectionsviews';
import { checkCommonFilter, rewardsFilterPassFail } from '../../utils/collectionutils';
import { WorkerProvider } from '../../context/workercontext';

export const CollectionPlanner = () => {
	const context = React.useContext(GlobalContext);
	const { playerData } = context.player;
	const { crew, collections: allCollections } = context.core;

	if (!context.core.collections?.length) {
		return context.core.spin ? context.core.spin() : <></>;
	}

	if (!playerData) return <CollectionsOverview />;

	const allCrew = JSON.parse(JSON.stringify(crew)) as PlayerCrew[];
	const myCrew = crewCopy(playerData.player.character.crew);

	const collectionCrew = [...new Set(allCollections.map(ac => ac.crew).flat())].map(acs => {
		const crew = oneCrewCopy(allCrew.find(ac => ac.symbol == acs) as PlayerCrew) as PlayerCrew;
		crew.highest_owned_rarity = 0;
		crew.highest_owned_level = 0;
		crew.immortal = CompletionState.DisplayAsImmortalUnowned;
		crew.unmaxedIds = [];
		crew.immortalRewards = [];
		const owned = myCrew.filter(mc => mc.symbol === acs).sort((a, b) => {
			if (a.rarity == b.rarity) {
				if (a.level == b.level) return b.equipment.length - a.equipment.length;
				return b.level - a.level;
			}
			return b.rarity - a.rarity;
		});
		if (owned.length > 0) {
			crew.action = { ... owned[0].action };
			crew.ship_battle = { ... owned[0].ship_battle };
			crew.immortal = owned[0].immortal;
			if ((owned[0].level == 100 && owned[0].rarity == owned[0].max_rarity && (!owned[0].equipment || owned[0].equipment?.length == 4))) {
				crew.immortal = CompletionState.Immortalized;
			}
			crew.rarity = owned[0].rarity;
			crew.level = owned[0].level;
			crew.base_skills = {...owned[0].base_skills};

			crew.highest_owned_rarity = owned[0].rarity;
			crew.highest_owned_level = owned[0].level;
		}
		return crew;
	});

	const playerCollections = allCollections.map(ac => {
		let collection: PlayerCollection = { id: ac.id, name: ac.name, progress: 0, milestone: { goal: 0 }, owned: 0, milestones: ac.milestones };
		if (playerData.player.character.cryo_collections) {
			const pc = playerData.player.character.cryo_collections.find((pc) => pc.name === ac.name);
			if (pc) collection = { ...collection, ...JSON.parse(JSON.stringify(pc)) };
		}
		collection.id = ac.id; // Use allCollections ids instead of ids in player data
		collection.crew = ac.crew;
		collection.simpleDescription = collection.description ? simplerDescription(collection.description) : '';
		if (collection.milestone.goal != 'n/a' && collection.progress != 'n/a') {
			collection.progressPct = collection.milestone.goal > 0 ? collection.progress / collection.milestone.goal : 1;
			collection.neededPct = 1 - collection.progressPct;
			collection.needed = collection.milestone.goal > 0 ? Math.max(collection.milestone.goal - collection.progress, 0) : 0;
		}

		collection.totalRewards = (collection.milestone.buffs?.length ?? 0) + (collection.milestone.rewards?.length ?? 0);
		collection.owned = 0;

		ac.crew?.forEach(acs => {
			let cc = collectionCrew.find(crew => crew.symbol === acs);
			if (!cc) return;
			if (collection.milestone.goal != 'n/a' && collection.milestone.goal > 0) {
				if (!cc.unmaxedIds) cc.unmaxedIds = [];
				if (!cc.immortalRewards) cc.immortalRewards = [];
				cc.unmaxedIds.push(collection.id);
				if (collection.progress != 'n/a' && collection.milestone.goal - collection.progress <= 1) {
					mergeRewards(cc.immortalRewards, collection.milestone.buffs);
					mergeRewards(cc.immortalRewards, collection.milestone.rewards);
				}
			}
			if ((cc.highest_owned_rarity ?? 0) > 0) collection.owned++;
		});
		return collection;
	});

	return (
		<CollectionFilterProvider pageId='collectionTool' playerCollections={playerCollections}>
			<CollectionsUI playerData={playerData} allCrew={allCrew} playerCollections={playerCollections} collectionCrew={collectionCrew} />
		</CollectionFilterProvider>
	);

	function mergeRewards(current: ImmortalReward[], rewards: BuffBase[] | null | undefined): void {
		if (!rewards || rewards.length == 0) return;
		rewards.forEach(reward => {
			const existing = current.find(c => c.symbol === reward.symbol);
			if (existing) {
				existing.quantity += reward.quantity ?? 1;
			}
			else {
				current.push(JSON.parse(JSON.stringify(reward)));
			}
		});
	}

	function simplerDescription(description: string): string {
		let simple = description.replace(/&lt;/g, '<').replace(/&gt;/g, '>') /* Webarchive import fix */
			.replace(/(<([^>]+)>)/g, '')
			.replace('Immortalize ', '')
			.replace(/^the /i, '')
			.replace(/\.$/, '');
		return simple.slice(0, 1).toUpperCase() + simple.slice(1);
	}
};

export interface CollectionsUIProps {
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	allCrew: PlayerCrew[];
	playerData: PlayerData;
};

const CollectionsUI = (props: CollectionsUIProps) => {
	const colContext = React.useContext(CollectionsContext);
	const { allCrew, playerCollections: tempcol, collectionCrew } = props;
	const { setSearchFilter, mapFilter, setMapFilter, hardFilter, short, costMode, showThisCrew, tierFilter } = colContext;

	const crewAnchor = React.useRef<HTMLDivElement>(null);

	if (checkAnchor(crewAnchor)) return <></>;

	const playerCollections = React.useMemo(() => {
		return tempcol.filter((col) => {
			if (hardFilter && mapFilter?.rewardFilter) {
				return rewardsFilterPassFail(mapFilter, [col], short);
			}
			else {
				return true;
			}
		});
	}, [hardFilter, mapFilter]);

	const extendedCollections = React.useMemo(() => {
		return tempcol.filter((col) => {
			if (hardFilter && mapFilter?.rewardFilter) {
				return rewardsFilterPassFail(mapFilter, [col], short, true);
			}
			else {
				return true;
			}
		});
	}, [hardFilter, mapFilter]);

	if (mapFilter.collectionsFilter?.length === 1) {
		let idx = playerCollections.findIndex(fc => fc.id === (!!mapFilter.collectionsFilter ? mapFilter.collectionsFilter[0] : null));
		if (idx >= 0) {
			let n = playerCollections[idx].claimable_milestone_index ?? -1;
			if (n !== -1 && n != ((playerCollections[idx].milestones?.length ?? 0) - 1)) {
				if (tierFilter > 1 && mapFilter.collectionsFilter?.length === 1) {
					playerCollections[idx] = mergeTiers(playerCollections[idx], playerCollections[idx].claimable_milestone_index ?? 0, tierFilter);
				}
			}
		}
	}

	const displayCrew = directFilterCrew(collectionCrew);

	const [topCrewScore, topStarScore] = computeGrades(playerCollections, displayCrew);

	return (
		<React.Fragment>
			<div ref={crewAnchor} />
			<WorkerProvider>
				<CollectionsViews
					topCrewScore={topCrewScore}
					topStarScore={topStarScore}
					filterCrewByCollection={filterCrewByCollection}
					allCrew={allCrew}
					playerCollections={playerCollections}
					extendedCollections={extendedCollections}
					collectionCrew={displayCrew} />
			</WorkerProvider>
		</React.Fragment>
	);

	function directFilterCrew(crew: PlayerCrew[]): PlayerCrew[] {
		return crew.filter(c => checkCommonFilter(colContext, c))
	}

	function filterCrewByCollection(collectionId: number): void {
		setSearchFilter('');
		setMapFilter({ ...mapFilter ?? {}, collectionsFilter: [collectionId]});
	}

	function computeGrades(cols: PlayerCollection[], colcrew: PlayerCrew[]) {

		const costs = [0, 0, 500, 4500, 18000, costMode === 'sale' ? 40000 : 50000];

		let hiscore = 0;
		let hiscore_n = 0;
		let histars = [1,1,1,1,1,1];

		colcrew.forEach((crew) => {
			crew.collectionScore = 0;
			crew.collectionScoreN = 0;

			if (!showThisCrew(crew, [], 'Exact')) return;

			let colIds = crew.collection_ids.filter(c => cols.some(col => col.id.toString() === c));
			let curr_rarity = crew.rarity;
			let max_rare = crew.max_rarity;
			if (curr_rarity === undefined) {
				curr_rarity = 1;
			}

			let prefilter = cols.filter((col) => colIds.some(nid => nid === col.id.toString()) && !!col.needed);
			if (!prefilter.length) {
				return;
			}

			let ind_scores = [] as number[];
			prefilter.forEach((col) => {
				if (col.milestone.goal === 'n/a') return;
				if (!col.needed) return;

				ind_scores.push(1 / col.needed);
			})

			let acc_score = ind_scores.reduce((p, n) => p + n, 0);
			crew.collectionScore = Math.round(acc_score * 10000);

			if (crew.collectionScore > hiscore) {
				hiscore = crew.collectionScore;
			}

			if (max_rare !== curr_rarity) {

				if (histars[max_rare] < curr_rarity) {
					histars[max_rare] = curr_rarity;
				}

				crew.collectionScoreN = Math.round(acc_score / ((costs[max_rare] * (max_rare - curr_rarity))) * 1000000000);

				if (crew.collectionScoreN > hiscore_n) {
					hiscore_n = crew.collectionScoreN;
				}
			}
			else {
				crew.collectionScoreN = -1;
			}

		});

		return [hiscore, hiscore_n];
	}

	function checkAnchor(crewAnchor: React.RefObject<HTMLDivElement>) {
		const tinyCol = TinyStore.getStore('collections');
		const offsel = tinyCol.getValue<string | undefined>("collectionsTool/selectedCollection");
		tinyCol.removeValue("collectionsTool/selectedCollection");
		const selColId = tempcol.find(f => f.name === offsel)?.id;
		if (selColId !== undefined && !mapFilter?.collectionsFilter?.includes(selColId)) {
			if (tempcol?.some(c => c.id === selColId && !!c.milestone?.goal && !!c.needed)) {
				setMapFilter({...mapFilter, collectionsFilter: [...mapFilter?.collectionsFilter ?? [], ...[selColId]]});
				setTimeout(() => {
					crewAnchor?.current?.scrollIntoView({
						behavior: 'smooth',
					});
				});

				return true;
			}
		}

		return false;
	}


    function mergeTiers(col: PlayerCollection, startTier: number, endTier: number): PlayerCollection {
        let result = JSON.parse(JSON.stringify(col)) as PlayerCollection;


        let mergedRewards = {} as { [key: number]: Reward };
        let mergedBuffs = {} as { [key: number]: MilestoneBuff };
        let mergedCount = 0;

        result.milestones?.forEach((m, idx) => {
            if (idx >= startTier && idx <= endTier) {
                mergedCount = m.goal;

                m.rewards.forEach((reward) => {
                    if (!(reward.id in mergedRewards)) {
                        mergedRewards[reward.id] = JSON.parse(JSON.stringify(reward));
                    }
                    else {
                        mergedRewards[reward.id].quantity += reward.quantity;
                    }
                });

                m.buffs.forEach((buff) => {
                    if (!(buff.id in mergedBuffs)) {
                        mergedBuffs[buff.id] = JSON.parse(JSON.stringify(buff));
                    }
                    else {
                        mergedBuffs[buff.id].quantity ??= 1;
                        (mergedBuffs[buff.id].quantity as number) += buff.quantity ?? 1;
                    }
                })
            }
        });

        result.milestone = {
            ... result.milestone,
            goal: mergedCount,
            buffs: Object.values(mergedBuffs),
            rewards: Object.values(mergedRewards)
        };

        if (result.milestone.goal != 'n/a' && result.progress != 'n/a') {
            result.progressPct = result.milestone.goal > 0 ? result.progress / result.milestone.goal : 1;
            result.neededPct = 1 - result.progressPct;
            result.needed = result.milestone.goal > 0 ? Math.max(result.milestone.goal - result.progress, 0) : 0;
        }

        result.totalRewards = (result.milestone.buffs?.length ?? 0) + (result.milestone.rewards?.length ?? 0);

        return result;
    }
};


export default CollectionPlanner;
