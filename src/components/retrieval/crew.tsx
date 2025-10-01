import React from 'react';
import { Button, Checkbox, Dropdown, Form, Icon, Loader } from 'semantic-ui-react';

import { Collection } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import { RarityFilter, CrewTraitFilter } from '../../components/crewtables/commonoptions';

import { ActionableState, IPolestar, IRosterCrew, RetrievableState } from './model';
import { getComboCost, RetrievalContext } from './context';
import { RetrievalCrewTable } from './crewtable';
import { filterTraits } from './utils';

export const RetrievalCrew = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { collections, maincast } = globalContext.core;
	const { playerData } = globalContext.player;
	const { market, allKeystones, rosterCrew, setRosterCrew, polestarTailors, getCrewFilter, setCrewFilter, resetForm, wishlist, autoWishes } = React.useContext(RetrievalContext);

	const addedPolestars = polestarTailors.added;
	const disabledPolestars = polestarTailors.disabled;

	const retrievableFilter = getCrewFilter('retrievable') as string;
	const ownedFilter = getCrewFilter('owned') as string;
	const hideFullyFused = getCrewFilter('hideFullyFused') as boolean;
	const rarityFilter = getCrewFilter('rarity') as number[];
	const traitFilter = getCrewFilter('trait') as string[];
	const minTraitMatches = getCrewFilter('minTraitMatches') as number;
	const collectionFilter = getCrewFilter('collection') as string;

	const [isPreparing, setIsPreparing] = React.useState<boolean>(true);
	const [filteredCrew, setFilteredCrew] = React.useState<IRosterCrew[]>([]);

	// Calculate roster on updated keystone owned counts (i.e. playerData change) or on polestar tailoring
	React.useEffect(() => {
		setIsPreparing(true);
		calculateRoster().then((rosterCrew: IRosterCrew[]) => {
			setRosterCrew([...rosterCrew]);
		}).finally(() => {
			setIsPreparing(false);
		});
	}, [market, allKeystones, disabledPolestars, addedPolestars]);

	// Apply crew filters here
	React.useEffect(() => {
		const cast = Object.values(maincast).flat();
		const filtered = rosterCrew.filter(c =>
			retrievableFilter === '' ||
			(retrievableFilter === 'retrievable' && c.retrievable === RetrievableState.Viable) ||
			(retrievableFilter === 'expiring' && c.retrievable === RetrievableState.Expiring) ||
			(retrievableFilter === 'actionable' &&
				(c.actionable === ActionableState.Now || c.actionable === ActionableState.PostTailor))
		).filter(c =>
			ownedFilter === '' ||
			(ownedFilter === 'owned' && c.highest_owned_rarity > 0) ||
			(ownedFilter === 'unowned' && c.highest_owned_rarity === 0) ||
			(ownedFilter === 'wishlist' && (wishlist.includes(c.symbol) || autoWishes.includes(c.symbol)))
		).filter(c =>
			ownedFilter === 'unowned' ||
				!hideFullyFused ||
				c.highest_owned_rarity < c.max_rarity
		).filter(c =>
			rarityFilter.length === 0 ||
				rarityFilter.includes(c.max_rarity)
		).filter(c => {
			if (traitFilter.length === 0) return true;
			if (traitFilter.includes('maincast') && cast.some(trait => c.traits_hidden.includes(trait))) {
				return true;
			}
			if (traitFilter.includes('notmaincast') && !cast.some(trait => c.traits_hidden.includes(trait))) {
				return true;
			}
			if (minTraitMatches >= traitFilter.length)
				return traitFilter.every(trait => c.traits.includes(trait) || c.traits_hidden.includes(trait));
			else if (minTraitMatches === 2) {
				let matches = 0;
				traitFilter.forEach(trait => {
					if (c.traits.includes(trait)) matches++;
				});
				return matches >= 2;
			}
			return traitFilter.some(trait => c.traits.includes(trait));
		}).filter(c => {
			if (collectionFilter === '') return true;
			const collection = collections.find(collection => collection.name === collectionFilter);
			return collection?.crew?.includes(c.symbol);
		});
		setFilteredCrew([...filtered]);
	}, [rosterCrew, retrievableFilter, ownedFilter, hideFullyFused, rarityFilter, traitFilter, minTraitMatches, collectionFilter, wishlist, autoWishes]);

	const retrievableFilterOptions = [
		{ key: 'none', value: '', text: t('retrieval.crew.show_all_crew') },
		{ key: 'retrievable', value: 'retrievable', text: t('retrieval.crew.show_all_uniquely_retrievable') },
		{ key: 'expiring', value: 'expiring', text: t('retrieval.crew.show_expiring_crew') },
	];
	if (playerData) {
		retrievableFilterOptions.push(
			{ key: 'actionable', value: 'actionable', text: t('retrieval.crew.show_retrievable_crew') }
		);
	}

	const ownedFilterOptions = [
		{ key: 'none', value: '', text: t('options.crew_status.none') },
		{ key: 'owned', value: 'owned', text: t('crew_ownership.owned') },
		{ key: 'unowned', value: 'unowned', text: t('crew_ownership.unowned') },
		{ key: 'wishlist', value: 'wishlist', text: t('crew_ownership.wishlist') }
	];

	const collectionFilterOptions = [
		{ key: 'none', value: '', text: t('global.any'), content: <span>{t('global.any')}</span> }
	];
	collections.sort((a, b) => a.name.localeCompare(b.name)).forEach(collection => {
		const playerProgress = (collection: Collection) => {
			if (!playerData) return <></>;
			const cryoCollection = playerData.player.character.cryo_collections.find(cc => cc.name === collection.name);
			if (cryoCollection) {
				if (!cryoCollection.milestone.goal) return <>({t('global.max')?.toUpperCase() ?? 'MAX'})</>;
				return (
					<span style={{ whiteSpace: 'nowrap' }}>
						({cryoCollection.progress} / {cryoCollection.milestone.goal})
					</span>
				);
			};
			return <>(N/A)</>;
		};
		collectionFilterOptions.push(
			{
				key: `${collection.id}`,
				value: collection.name,
				text: collection.name,
				content: <span>{collection.name} {playerProgress(collection)}</span>
			}
		)
	});

	if (rosterCrew.length === 0)
		return (<div style={{ marginTop: '1em' }}><Icon loading name='spinner' /> {t('spinners.default')}</div>);

	return (
		<React.Fragment>
			<Form>
				<Form.Group inline>
					<Form.Field
						placeholder={t('hints.filter_by_retrieval_options')}
						control={Dropdown}
						clearable
						selection
						options={retrievableFilterOptions}
						value={retrievableFilter}
						onChange={(e, { value }) => setCrewFilter('retrievable', value as string)}
					/>
					{playerData &&
						<React.Fragment>
							<Form.Field
								placeholder={t('hints.filter_by_owned_status')}
								control={Dropdown}
								clearable
								selection
								options={ownedFilterOptions}
								value={ownedFilter}
								onChange={(e, { value }) => setCrewFilter('owned', value as string)}
							/>
							{ownedFilter !== 'unowned' && (
								<Form.Field
									control={Checkbox}
									label={t('retrieval.hide_fully_fused_crew')}
									checked={hideFullyFused}
									onChange={(e, { checked }) => setCrewFilter('hideFullyFused', checked as boolean)}
								/>
							)}
						</React.Fragment>
					}
				</Form.Group>
				<Form.Group inline>
					<RarityFilter
						rarityFilter={rarityFilter}
						setRarityFilter={(rarityFilter: number[]) => setCrewFilter('rarity', rarityFilter)}
					/>
					<CrewTraitFilter
						traitFilter={traitFilter}
						setTraitFilter={(traitFilter: string[]) => setCrewFilter('trait', traitFilter)}
						minTraitMatches={minTraitMatches}
						setMinTraitMatches={(minTraitMatches: number) => setCrewFilter('minTraitMatches', minTraitMatches)}
					/>
					<Form.Field
						placeholder={t('hints.filter_by_collections')}
						control={Dropdown}
						search
						clearable
						selection
						options={collectionFilterOptions}
						value={collectionFilter}
						onChange={(e, { value }) => setCrewFilter('collection', value as string)}
					/>
					<Button onClick={resetForm}>{t('global.reset')}</Button>
					<Loader inline active={isPreparing} />
				</Form.Group>
			</Form>
			<RetrievalCrewTable filteredCrew={filteredCrew} />
		</React.Fragment>
	);

	// calculateRoster is a good candidate for a worker, especially if we want to precalculate combos and fuse groups
	async function calculateRoster(): Promise<IRosterCrew[]> {
		return new Promise((resolve, reject) => {
			// Owned polestars determine if crew is actionable now
			// Tailored polestars determine if crew is actionable after polestar filtering (i.e. owned polestars - disabled + added)
			const allPolestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
			const ownedPolestars = allPolestars.filter(polestar => polestar.owned > 0);
			const tailoredPolestars = allPolestars.filter(polestar =>
				(polestar.owned > 0 && !disabledPolestars.includes(polestar.id)) || addedPolestars.includes(polestar.symbol)
			);

			// Calculate retrievable, actionable states; highest owned rarities, levels
			//	Retrievable = any player can retrieve crew
			//	Actionable = user can retrieve with tailored polestars
			const rosterCrew = structuredClone(globalContext.core.crew) as IRosterCrew[];
			rosterCrew.forEach(crew => {
				crew.retrievable = RetrievableState.Viable;
				crew.alt_source = '';
				if (!crew.in_portal) {
					let source = '';
					switch (crew.obtained) {
						case 'BossBattle': source = t('obtained.long.BossBattle'); break;
						case 'Collection': source = t('obtained.long.Collection'); break;
						case 'FactionStore': source = t('obtained.long.FactionStore'); break;
						case 'Fuse': source = t('obtained.long.Fuse'); break;
						case 'Gauntlet': source = t('obtained.long.Gauntlet'); break;
						case 'HonorHall': source = t('obtained.long.Honor Hall'); break;
						case 'Missions': source = t('obtained.long.Missions'); break;
						case 'Voyage': source = t('obtained.long.Voyage'); break;
						case 'WebStore': source = t('obtained.long.WebStore'); break;
					}
					if (source !== '') {
						crew.retrievable = RetrievableState.Never;
						crew.alt_source = source;
					}
					else {
						crew.retrievable = RetrievableState.InFuture;
					}
				}
				else if (!crew.unique_polestar_combos?.length) {
					crew.retrievable = RetrievableState.NonUnique;
				}
				else if (crew.unique_polestar_combos?.length && !crew.unique_polestar_combos_later?.length) {
					crew.retrievable = RetrievableState.Expiring;
				}

				crew.actionable = ActionableState.None;
				crew.highest_owned_rarity = 0;
				crew.highest_owned_level = 0;
				crew.progressable_collections = crew.collections;
				if (playerData) {
					if (crew.retrievable !== RetrievableState.Viable)
						crew.actionable = ActionableState.NonViable;
					else {
						const canRetrievePreTailor = canRetrieveWithPolestars(crew, ownedPolestars);
						const isTailored = addedPolestars.length > 0 || disabledPolestars.length > 0;
						if (isTailored) {
							const canRetrievePostTailor = canRetrieveWithPolestars(crew, tailoredPolestars)
							if (canRetrievePreTailor && canRetrievePostTailor)
								crew.actionable = ActionableState.Now;
							else if (canRetrievePreTailor && !canRetrievePostTailor)
								crew.actionable = ActionableState.PreTailor;
							else if (!canRetrievePreTailor && canRetrievePostTailor)
								crew.actionable = ActionableState.PostTailor;
							else
								crew.actionable = ActionableState.Viable;
						}
						else {
							crew.actionable = canRetrievePreTailor ? ActionableState.Now : ActionableState.Viable;
						}
					}

					const owned = playerData.player.character.crew.filter(oc => oc.symbol === crew.symbol);
					if (owned.length > 0) {
						const bestOwned = owned.sort((a, b) => b.rarity - a.rarity)[0];
						crew.highest_owned_rarity = bestOwned.rarity;
						crew.highest_owned_level = bestOwned.level;
					}

					crew.progressable_collections = crew.collections.filter(collectionName => {
						const cryoCollection = playerData.player.character.cryo_collections.find(cc => cc.name === collectionName);
						return cryoCollection?.milestone.goal;
					});

					if (market) {
						const pricemap = [] as { total: number, index: number, sell_count: number }[];
						crew.unique_polestar_combos?.forEach((combo, index) => {
							pricemap.push({ ...getComboCost(combo, allKeystones, market), index });
						});

						if (pricemap.length) {
							pricemap.sort((a, b) => a.total - b.total);
							crew.price = pricemap[0].total;
							pricemap.sort((a, b) => a.sell_count - b.sell_count);
							crew.sell_count = pricemap[0].sell_count;
						}
						else {
							crew.price = 0;
							crew.sell_count = 0;
						}
					}
				}
			});
			resolve(rosterCrew);
		});
	}

	function canRetrieveWithPolestars(crew: IRosterCrew, polestars: IPolestar[]): boolean {
		if (crew.unique_polestar_combos) {
			return crew.unique_polestar_combos.some(
				(upc) => upc.every(
					(trait) => polestars.some(polestar => filterTraits(polestar, trait))
				)
			);
		}
		return false;
	}
};
