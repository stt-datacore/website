import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { CollectionsContext } from "./context";
import { Checkbox, Pagination, Dropdown, Form, DropdownItemProps } from "semantic-ui-react";
import { CollectionCombo, CollectionMatchMode, ComboCostMap } from "../../model/collections";
import { appelate } from "../../utils/misc";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { RewardFilter } from "./rewardfilter";
import { PlayerCollection, PlayerCrew } from "../../model/player";
import CONFIG from "../CONFIG";


export interface CollectionPrefsProps {
    colCombos: CollectionCombo[];
    playerCollections: PlayerCollection[];
    extendedCollections: PlayerCollection[];
    workerRunning: boolean;
    mode: 'crew' | 'group' | 'optimizer';
}

export const CollectionPrefs = (props: CollectionPrefsProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt } = globalContext.localized;
    const colContext = React.useContext(CollectionsContext);
    const { playerCollections, extendedCollections, mode, colCombos } = props;
    const { favorited, setFavorited, showIncomplete, setShowIncomplete, hardFilter, setHardFilter, byCost, setByCost, costMode, setCostMode, setShort, short, searchFilter, setSearchFilter, mapFilter, setMapFilter } = colContext;
    const { setTierFilter, tierFilter, ownedFilter, setOwnedFilter, rarityFilter, setRarityFilter, fuseFilter, setFuseFilter } = colContext;

    const [allCrew, setAllCrew] = React.useState<PlayerCrew[]>([]);

    const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const tierOpts = React.useMemo(() => {
        const results = [] as DropdownItemProps[];
        if (playerCollections?.length) {
            if (mapFilter.collectionsFilter?.length === 1) {
                let col = playerCollections.find(f => Number(mapFilter.collectionsFilter![0]) === Number(f.type_id!));
                if (col && col.milestone.goal !== 'n/a') {
                    let mis = col.milestones?.filter(f => f.goal >= (col.milestone.goal as number)) ?? [];
                    mis.forEach((mi, idx) => {
                        results.push({
                            key: `${col.type_id}_milestone_${mi.goal}`,
                            value: mi.goal,
                            text: `${mi.goal}`
                        })
                    });
                }
            }
        }
        if (!results.length && tierFilter) {
            setTierFilter(undefined);
        }
        return results;
    }, [playerCollections, mapFilter]);

    const collectionsOptions = React.useMemo(() => {
        const results = (mode === 'crew' ? extendedCollections : playerCollections)
        .filter(collection => collection.milestone.goal != 'n/a' && collection.milestone.goal > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(collection => {
            return {
                key: collection.id,
                value: collection.id,
                text: collection.name + ' (' + collection.progress + ' / ' + collection.milestone.goal + ')'
            };
        });

        if (mapFilter.collectionsFilter?.length &&
            mapFilter.collectionsFilter.some(col => !results.some(opt => opt.key == col))
        ) {
            setMapFilter({...mapFilter, collectionsFilter: mapFilter.collectionsFilter.filter(col => results.some(opt => opt.key == col))})
        }
        return results;
    }, [mode, playerCollections, extendedCollections]);


    const ownedFilterOptions = [] as DropdownItemProps;

    ownedFilterOptions.push({ key: 'owned', value: 'owned', text: t('crew_ownership.owned') })
    ownedFilterOptions.push({ key: 'owned-impact', value: 'owned-impact', text: t('options.roster_maintenance.impact') });
    ownedFilterOptions.push({ key: 'owned-threshold', value: 'owned-threshold', text: t('options.roster_maintenance.liminal') });
    ownedFilterOptions.push({ key: 'owned-ff', value: 'owned-ff', text: t('options.roster_maintenance.priority') });

    const fuseFilterOptions = [
        { key: 'none', value: '', text: t('options.roster_maintenance.none') },
        { key: 'portal', value: 'portal', text: t('options.portal_status.retrievable') },
        { key: 'portal-unique', value: 'portal-unique', text: t('options.portal_status.uniquely_retrievable') },
        { key: 'portal-nonunique', value: 'portal-nonunique', text: t('options.portal_status.not_uniquely_retrievable') },
        { key: 'nonportal', value: 'nonportal', text: t('options.portal_status.not_retrievable') }
    ];

    const rarityFilterOptions = [] as any[];

    CONFIG.RARITIES.forEach((r, i) => {
        if (i === 0) return;
        rarityFilterOptions.push(
            { key: `${i}*`, value: i, text: `${i}* ${r.name}` }
        )
    });

    React.useEffect(() => {
        let crewprep = colCombos.map((col) => col.combinedUnique).flat();
        crewprep = crewprep.filter((fc, idx) => crewprep.findIndex(fi => fi.symbol === fc.symbol) === idx)
            .sort((a, b) => a.name.localeCompare(b.name));

        setAllCrew(crewprep);
    }, [colCombos]);

    return (<div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch"
    }}>

        <React.Fragment>
            <div style={{
                margin: '1em 0',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: "1em"
            }}>
                <Form.Field
                    placeholder={t('hints.filter_by_collections')}
                    control={Dropdown}
                    clearable
                    multiple
                    search
                    selection
                    options={collectionsOptions}
                    value={mapFilter.collectionsFilter}
                    onChange={(e, { value }) => setMapFilter({ ...mapFilter ?? {}, collectionsFilter: value })}
                    closeOnChange
                />
                {mapFilter.collectionsFilter?.length === 1 && !!tierOpts.length &&
                    <Form.Field
                        placeholder={t('hints.tiers')}
                        control={Dropdown}
                        clearable
                        selection
                        options={tierOpts}
                        value={tierFilter}
                        onChange={(e, { value }) => setTierFilter(value as number)}
                        closeOnChange
                    />}
            </div>
            <div style={{ margin: '1em 0' }}>
                <Form>
                    <Form.Group inline>

                        <Form.Field
                            placeholder={t('hints.filter_by_owned_status')}
                            control={Dropdown}
                            clearable
                            selection
                            options={ownedFilterOptions}
                            value={ownedFilter}
                            onChange={(e, { value }) => setOwnedFilter(value)}
                        />
                        <Form.Field
                            placeholder={t('hints.filter_by_portal_status')}
                            control={Dropdown}
                            clearable
                            selection
                            options={fuseFilterOptions}
                            value={fuseFilter}
                            onChange={(e, { value }) => setFuseFilter(value)}
                        />
                        <Form.Field
                            placeholder={t('hints.filter_by_rarity')}
                            control={Dropdown}
                            clearable
                            multiple
                            selection
                            options={rarityFilterOptions}
                            value={rarityFilter}
                            onChange={(e, { value }) => setRarityFilter(value)}
                            closeOnChange
                        />
                    </Form.Group>
                </Form>
            </div>
        </React.Fragment>

        {mode === 'optimizer' &&
        <i className='ui segment' style={{ color: "goldenrod", fontWeight: 'bold', margin: "0.5em 0" }}>
            {t('collections.optimizer.warning')}
        </i>}
        {mode === 'group' && !mapFilter?.collectionsFilter?.length && !searchFilter?.length &&
        <i className='ui segment' style={{color:"goldenrod", fontWeight: 'bold', margin: "0.5em 0"}}>
            {t('collections.group.warning')}
        </i>}

        <div style={{
            display: "flex",
            flexDirection:
                window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',

            alignItems:
                window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'flex-start' : 'center',

            justifyContent: "flex-start"
        }}>
            <RewardFilter
                hardFilter={hardFilter}
                setHardFilter={setHardFilter}
                narrow={narrow}
                grouped={short}
                setGrouped={setShort}
                searchFilter={searchFilter}
                setSearchFilter={setSearchFilter}
                collectionSource={playerCollections}
                crewSource={allCrew}
                selection={mapFilter?.rewardFilter}
                setSelection={(value) => setMapFilter({ ...mapFilter ?? {}, rewardFilter: value as string[] | undefined })}
            />
            <div style={{ display: 'grid', gridTemplateAreas: "'a b' 'c d'" }}>
                {mode !== 'crew' && <Checkbox style={{ margin: "0.5em 1em", gridArea: 'a' }} label={t('collections.options.honor_sale_pricing')} checked={costMode === 'sale'} onChange={(e, { checked }) => setCostMode(checked ? 'sale' : 'normal')} />}
                {mode !== 'crew' && <Checkbox style={{ margin: "0.5em 1em", gridArea: 'c' }} label={t('collections.options.prioritize_favorite_crew')} checked={favorited} onChange={(e, { checked }) => setFavorited(!!checked)} />}
                {mode === 'optimizer' && <Checkbox style={{ margin: "0.5em 1em", gridArea: 'b' }} label={t('collections.options.sort_by_cost')} checked={byCost} onChange={(e, { checked }) => setByCost(checked ?? false)} />}
                {mode === 'optimizer' && <Checkbox style={{ margin: "0.5em 1em", gridArea: 'd' }} label={t('collections.options.show_incomplete_combos')} checked={showIncomplete} onChange={(e, { checked }) => setShowIncomplete(!!checked)} />}
            </div>
        </div>
    </div>)
}