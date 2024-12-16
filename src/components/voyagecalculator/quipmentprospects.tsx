
import React from 'react';
import { GlobalContext } from '../../context/globalcontext';
import { Modal, Button, Checkbox, Dropdown, Table } from 'semantic-ui-react';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { Skill } from '../../model/crew';
import { PlayerCrew } from '../../model/player';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { EquipmentCommon, EquipmentItem } from '../../model/equipment';
import { getItemWithBonus, ItemWithBonus, mergeItems } from '../../utils/itemutils';
import { AvatarView } from '../item_presenters/avatarview';
import CrewStat from '../crewstat';
import { skillSum } from '../../utils/crewutils';
import { omniSearchFilter } from '../../utils/omnisearch';
import CONFIG from '../CONFIG';
import { ItemHoverStat } from '../hovering/itemhoverstat';

export type QuipmentProspectMode = 'best' | 'best_2' | 'all';
export type VoyageSkillPreferenceMode = 'none' | 'voyage' | 'voyage_1' | 'voyage_2';

export type QuipmentProspectConfig = {
	mode: QuipmentProspectMode;
	enabled: boolean;
    current: boolean;
	voyage: VoyageSkillPreferenceMode;
    slots: number;
    calc: 'all' | 'core' | 'proficiency'
}

export interface QuipmentProspectProps {
    config: QuipmentProspectConfig;
    setConfig: (value: QuipmentProspectConfig) => void;
}

export const QuipmentProspects = (props: QuipmentProspectProps) => {
    const globalContext = React.useContext(GlobalContext);

    const { t } = globalContext.localized;
    const { config, setConfig } = props;
    const [modalIsOpen, setModalIsOpen] = React.useState(false);

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const crewOpts = [
        { key: 'best', value: 'best', text: t('voyage.quipment.mode.best') },
        { key: 'best_2', value: 'best_2', text: t('voyage.quipment.mode.best_2') },
        { key: 'all', value: 'all', text: t('voyage.quipment.mode.all') },
    ]

    const voyOpts = [
        { key: 'none', value: 'none', text: t('voyage.quipment.skill_prefs.none') },
        { key: 'voyage', value: 'voyage', text: t('voyage.quipment.skill_prefs.voyage') },
        { key: 'voyage_1', value: 'voyage_1', text: t('voyage.quipment.skill_prefs.voyage_1') },
        { key: 'voyage_2', value: 'voyage_2', text: t('voyage.quipment.skill_prefs.voyage_2') },
    ]

    const quipOpts = [
        { key: 'none', value: 0, text: t('quipment_dropdowns.slots.natural') },
        { key: '1_natural', value: 1, text: t('quipment_dropdowns.slots.n_natural', { n: 1 }) },
        { key: '2_natural', value: 2, text: t('quipment_dropdowns.slots.n_natural', { n: 2 }) },
        { key: '3_natural', value: 3, text: t('quipment_dropdowns.slots.n_natural', { n: 3 }) },
    ]

    const calcOpts = [
        { key: 'all', value: 'all', text: t('quipment_dropdowns.calc_mode.core_and_proficiencies') },
        { key: 'core', value: 'core', text: t('quipment_dropdowns.calc_mode.core') },
        { key: 'proficiency', value: 'proficiency', text: t('quipment_dropdowns.calc_mode.proficiencies') },
    ]

    return (
		<Modal
			size='small'
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			centered={true}
		>
			<Modal.Header>
				{t('voyage.quipment.title')}
			</Modal.Header>
			<Modal.Content >
                <div style={{...flexCol, gap: '1em', flexWrap: 'wrap'}}>
                    <div style={{...flexCol, gap: '1em', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                        <Checkbox label={t('voyage.quipment.enable')}
                            style={{wordWrap:'wrap'}}
                            checked={config.enabled}
                            onChange={(e, { checked }) => setConfig({...config, enabled: !!checked })}
                            />
                        <Checkbox label={t('voyage.quipment.use_current')}
                            style={{wordWrap:'wrap'}}
                            disabled={!config.enabled}
                            checked={config.current}
                            onChange={(e, { checked }) => setConfig({...config, current: !!checked })}
                            />
                        <div style={{...flexRow, gap: '2em', flexWrap: 'wrap'}}>
                            <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
                                <b>{t('voyage.quipment.crew_prefs')}</b>
                                <Dropdown
                                    disabled={!config.enabled}
                                    selection
                                    options={crewOpts}
                                    value={config.mode}
                                    onChange={(e, { value }) => {
                                        setConfig({...config, mode: value as QuipmentProspectMode })
                                    }}
                                    />
                            </div>
                            <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
                                <b>{t('voyage.quipment.voyage_prefs')}</b>
                                <Dropdown
                                    disabled={!config.enabled}
                                    selection
                                    clearable
                                    options={voyOpts}
                                    value={config.voyage}
                                    onChange={(e, { value }) => {
                                        setConfig({...config, voyage: value as VoyageSkillPreferenceMode || 'none' })
                                    }}
                                    />
                            </div>
                        </div>
                        <div style={{...flexRow, gap: '2em', flexWrap: 'wrap'}}>
                            <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
                                <b>{t('quipment_dropdowns.slot_label')}</b>
                                <Dropdown
                                    disabled={!config.enabled}
                                    selection
                                    clearable
                                    options={quipOpts}
                                    value={config.slots || 0}
                                    onChange={(e, { value }) => {
                                        setConfig({...config, slots: value as number || 0 })
                                    }}
                                    />
                            </div>
                            <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
                                <b>{t('quipment_dropdowns.calc_mode_label')}</b>
                                <Dropdown
                                    disabled={!config.enabled}
                                    selection
                                    options={calcOpts}
                                    value={config.calc || 'all'}
                                    onChange={(e, { value }) => {
                                        setConfig({...config, calc: value as 'all' | 'core' | 'proficiency' })
                                    }}
                                    />
                            </div>
                        </div>
                        <i>{t('voyage.quipment.voyage_prefs_explain')}</i>
                    </div>
                </div>
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={() => setModalIsOpen(false)}>
                    {t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

    function renderTrigger() {

        return <Button color={config.enabled ? 'green' : undefined}>
            {t('voyage.quipment.title')}
        </Button>
    }
}

export interface QuipmentProspectListProps {
    crew: PlayerCrew[];
}

type RecipeType = { [key: string]: EquipmentCommon[] };
type CrewRefType = { [key: string]: PlayerCrew[] };

export const QuipmentProspectList = (props: QuipmentProspectListProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew } = props;
    const quipment = globalContext.core.items.filter(f => f.type === 14 || f.type === 15);

    const [items, setItems] = React.useState<ItemWithBonus[]>();
    const [recipes, setRecipes] = React.useState<RecipeType>({});
    const [crewRef, setCrewRef] = React.useState<CrewRefType>({});
    const [ingredients, setIngredients] = React.useState<EquipmentItem[]>([]);

    const [mode, setMode] = React.useState('items');
    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;

    const itemTable = [
        { width: 2, column: 'item.name', title: t('base.quipment') },
        // {
        //     width: 1,
        //     column: 'item.needed',
        //     title: t('items.columns.quantity'),
        //     reverse: true,
        //     customCompare: (a, b) => a.item.needed! - b.item.needed! || compareIngredients(a.item, b.item)
        // },
        {
            width: 2,
            column: 'buffs',
            title: t('items.columns.item_buffs'),
            reverse: true,
            customCompare: (a: ItemWithBonus, b: ItemWithBonus) => {
                return skillSum(Object.values(a.bonusInfo.bonuses)) - skillSum(Object.values(b.bonusInfo.bonuses));
            }
        },
        {
            width: 2,
            column: 'ingredients',
            title: t('base.ingredients'),
            reverse: true,
            customCompare: (a, b) => compareIngredients(a.item, b.item)
        },
        {
            width: 2,
            column: 'crew',
            title: t('base.crew'),
            reverse: true,
            customCompare: (a, b) => a.item.needed! - b.item.needed! || compareIngredients(a.item, b.item)
        },
    ] as ITableConfigRow[];

    const ingTable = [
        {
            width: 3,
            column: 'name',
            title: t('base.ingredient')
        },
        { width: 2, column: 'quantity', title: t('items.columns.owned') },
        { width: 2, column: 'needed', title: t('items.columns.needed') },
        {
            width: 3,
            column: 'items',
            title: t('global.items'),
            customCompare: (a: EquipmentItem, b: EquipmentItem) => {
                let ax = Object.keys(recipes).filter(key => recipes[key].some(se => se.symbol === a.symbol))?.length;
                let bx = Object.keys(recipes).filter(key => recipes[key].some(se => se.symbol === b.symbol))?.length;
                return ax - bx;
            }
        }
    ] as ITableConfigRow[];

    React.useEffect(() => {
        const { newitems, newrecipes, newref } = compileIngredients();
        const newingredients = [] as EquipmentItem[];

        Object.values(newrecipes).forEach((common) => {
            common.forEach((item) => {
                let ing = newingredients.find(f => f.symbol === item.symbol);
                if (ing) {
                    ing.needed! += item.needed!;
                }
                else {
                    newingredients.push(JSON.parse(JSON.stringify(item)));
                }
            });
        });

        setIngredients(newingredients);
        setItems(newitems.map(m => getItemWithBonus(m as any)));
        setRecipes(newrecipes);
        setCrewRef(newref);
    }, [crew]);

    const modeOpts = [
        { key: 'items', value: 'items', text: t('global.items') },
        { key: 'ingredients', value: 'ingredients', text: t('base.ingredients') },
    ]

    return (
        <div>
            <div style={{...flexCol, alignItems: 'flex-start', gap: '0.5em', margin: '1em 0'}}>
                <div>{t('collections.options.mode.title')}</div>
                <Dropdown
                    selection
                    options={modeOpts}
                    value={mode}
                    onChange={(e, { value }) => setMode(value as string)}
                    />
            </div>
            {!!items && mode === 'items' && <SearchableTable
                data={items}
                filterRow={(row, filter, filterType) => filterRow(row, filter, filterType)}
                renderTableRow={(row, i) => renderTableRow(row, i)}
                config={itemTable}
                />}
            {!!items && mode === 'ingredients' && <SearchableTable
                data={ingredients}
                filterRow={(row, filter, filterType) => filterRow(row, filter, filterType)}
                renderTableRow={(row, i) => renderIngredient(row, i)}
                config={ingTable}
                />}
        </div>
    )

    function filterRow(row: any, filter: any, filterType: string | undefined) {
        if (mode === 'items') {
            return omniSearchFilter(
                row,
                filter,
                filterType,
                [
                    'item.name',
                    {
                        field: 'bonusInfo.bonuses',
                        customMatch: (field: { [key: string]: Skill }, text) => {
                            if (!text) return true;
                            let match = false;
                            let n = Number(text);
                            Object.values(field).forEach((skill) => {
                                if (!Number.isNaN(n)) {
                                    if (Object.values(skill).some(v => n == v)) {
                                        match = true;
                                        return;
                                    }
                                }
                                else {
                                    if (skill.skill.includes(text.toLowerCase())) match = true;
                                    else if (CONFIG.SKILLS[skill.skill].toLowerCase().includes(text.toLowerCase())) match = true;
                                }
                            });

                            return match;
                        }
                    },
                    {
                        field: 'item',
                        customMatch: (field: EquipmentCommon, text) => {
                            if (!text) return true;
                            if (recipes[field.symbol]) {
                                if (recipes[field.symbol].some(e => e.name.toLowerCase().includes(text))) return true;
                            }
                            return false;
                        }
                    }
                ],
            );
        }
        else {
            return omniSearchFilter(row, filter, filterType, ['name'])
        }

    }

    function renderTableRow(iwb: ItemWithBonus, idx: any) {
        const row = iwb.item;

        return <Table.Row key={`quipment_row_${idx}_${row.symbol}`}>
            <Table.Cell>
                <div style={{...flexRow, gap: '1em'}}>
                    <AvatarView
                        partialItem={true}
                        targetGroup='voyage_prospect_summary'
                        mode='item'
                        item={row}
                        size={48}
                        />
                    <span>{row.name}</span>
                </div>
            </Table.Cell>
            {/* <Table.Cell>
                {row.needed || 0}
            </Table.Cell> */}
            <Table.Cell>
                {Object.entries(iwb.bonusInfo.bonuses).map(([skill, bonus]) => {

                    return (
                        <CrewStat
                            style={{fontSize: '0.9em'}}
                            key={`crew_stat_${skill}_${idx}_${row.name}`}
                            skill_name={skill}
                            data={bonus}
                            />
                    )
                })}
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexCol, gap: '0.5em', alignItems: 'flex-start'}}>
                {recipes[row.symbol].map((item, idx2) => <div key={`voy-needed-${item.symbol}-${idx}-${idx2}`} style={{...flexRow, gap: '1em'}}>
                    <AvatarView
                        partialItem={true}
                        targetGroup='voyage_prospect_summary'
                        mode='item'
                        item={item}
                        size={32}
                        />
                    <span>{item.needed}x {item.name} {item.quantity !== undefined && <>({t('items.n_owned', { n: item.quantity })})</>}</span>
                </div>)}
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexCol, gap: '0.5em', alignItems: 'flex-start'}}>
                {crewRef[row.symbol].map((c, idx2) =>
                <div key={`voy-needed-crew-sum-${c.symbol}-${idx}-${idx2}`}  style={{...flexRow, gap: '1em'}}>
                    <AvatarView
                        targetGroup='voyageLineupHover'
                        mode='crew'
                        partialItem={true}
                        item={c}
                        size={32} />
                    <span>{c.name}</span>
                </div>
                )}
                </div>
            </Table.Cell>
        </Table.Row>

    }

    function renderIngredient(item: EquipmentItem, idx: any) {

        return <Table.Row key={`ingredient_${idx}_${item.symbol}`}>
            <Table.Cell>
                <div style={flexRow}>
                    <AvatarView
                        partialItem={true}
                        targetGroup='voyage_prospect_summary'
                        mode='item'
                        item={item}
                        size={48}
                        />
                    <span>{item.name}</span>
                </div>
            </Table.Cell>
            <Table.Cell>
                {item.quantity || 0}
            </Table.Cell>
            <Table.Cell style={{color: item.needed! > item.quantity! ? 'tomato' : undefined}}>
                {item.needed || 0}
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexRow, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                    {items?.filter(orig => recipes[orig.item.symbol].some(rid => rid.symbol === item!.symbol)).map(item => {
                        return <AvatarView
                                    partialItem={true}
                                    targetGroup='voyage_prospect_summary'
                                    key={`item_summary_key_${item.item.symbol}+recipe`}
                                    mode='item'
                                    item={item.item}
                                    size={32}
                                />
                    })}
                </div>
            </Table.Cell>
        </Table.Row>
    }

    function compileIngredients() {
        const counts = {} as {[key:string]: number};
        const newref = {} as CrewRefType;
        crew.forEach((c) => {
            c.kwipment.map((qp: any, idx) => {
                if (c.kwipment_expiration[idx]) return;
                if (typeof qp === 'number') {
                    let item = quipment.find(f => f.kwipment_id == qp);
                    if (item) {
                        counts[item.symbol] ??= 0;
                        counts[item.symbol]++;
                        newref[item.symbol] ??= [];
                        if (!newref[item.symbol].includes(c)) {
                            newref[item.symbol].push(c);
                        }
                    }
                }
            });
        });
        const newitems = [] as EquipmentCommon[];
        const newrecipes = {} as RecipeType;
        Object.entries(counts).forEach(([symbol, count]) => {
            let item = quipment.find(f => f.symbol === symbol);
            if (!item?.recipe?.list?.length) return;
            item = JSON.parse(JSON.stringify(item)) as EquipmentItem;
            item.needed = count;
            newitems.push(item);
            const qpcounts = {} as {[key: string]: number }

            const list = item.recipe!.list.map(li => {
                let qi = quipment.find(fq => fq.symbol === li.symbol);
                if (qi) {
                    qpcounts[qi.symbol] ??= 0;
                    qpcounts[qi.symbol] += (li.count * count);
                    return JSON.parse(JSON.stringify(qi));
                }
                else return undefined;
            }).filter(i => i) as EquipmentItem[];

            let items = [] as EquipmentCommon[];

            if (globalContext.player.playerData) {
                let pitems = globalContext.player.playerData.player.character.items.filter(f => list.some(li => li.symbol === f.symbol)).map(e => e as EquipmentItem);
                items = mergeItems(pitems, list, true);
            }
            else {
                items = list;
            }

            items.sort((a, b) => a.name.localeCompare(b.name));

            newrecipes[item.symbol] = items.map(i => {
                if (qpcounts[i.symbol]) i.needed = qpcounts[i.symbol];
                return i;
            });
        });

        return { newitems, newrecipes, newref };
    }

    function compareIngredients(a: EquipmentCommon, b: EquipmentCommon) {
        if (!recipes[a.symbol] && !recipes[b.symbol]) return 0;
        else if (!recipes[a.symbol]) return -1;
        else if (!recipes[b.symbol]) return 1;
        const ra = recipes[a.symbol];
        const rb = recipes[b.symbol];
        let r = ra.reduce((p, n) => p + n.needed!, 0) - rb.reduce((p, n) => p + n.needed!, 0)
        if (!r) r = ra.length - rb.length;
        if (!r) {
            return ra[0].name.localeCompare(rb[0].name);
        }
        return r;
    }
}


