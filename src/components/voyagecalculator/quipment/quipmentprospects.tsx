
import React from 'react';
import { GlobalContext } from '../../../context/globalcontext';
import { Modal, Button, Checkbox, Dropdown, Table, Accordion, Icon, Segment, SemanticICONS } from 'semantic-ui-react';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../../stats/utils';
import { Skill } from '../../../model/crew';
import { PlayerCrew, Voyage } from '../../../model/player';
import { ITableConfigRow, SearchableTable } from '../../searchabletable';
import { EquipmentItem } from '../../../model/equipment';
import { getItemWithBonus, ItemWithBonus, mergeItems } from '../../../utils/itemutils';
import { AvatarView } from '../../item_presenters/avatarview';
import CrewStat from '../../item_presenters/crewstat';
import { skillSum } from '../../../utils/crewutils';
import { omniSearchFilter } from '../../../utils/omnisearch';
import CONFIG from '../../CONFIG';
import { useStateWithStorage } from '../../../utils/storage';
import { IVoyageCalcConfig } from '../../../model/voyage';

type RecipeType = { [key: string]: EquipmentItem[] };
type CrewRefType = { [key: string]: PlayerCrew[] };

export interface QuipmentProspectAccordionProps {
    voyageConfig: Voyage | IVoyageCalcConfig;
    initialExpand?: boolean;
}

export const QuipmentProspectAccordion = (props: QuipmentProspectAccordionProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

	const [isActive, setIsActive] = React.useState<boolean>(false);
    const { voyageConfig: voyageData, initialExpand: externActive } = props;
	const crew = voyageData.crew_slots.map(s => s.crew);

    const voyState = voyageData.state;
    const quipment_prospects = voyState == 'pending' && voyageData.crew_slots.some(slot => slot.crew.kwipment_prospects);

    React.useEffect(() => {
        if (externActive !== undefined) {
            setIsActive(externActive);
        }
    }, [externActive]);

    if (!quipment_prospects) return <></>;

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
                <Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('voyage.quipment.title')}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && (
					<Segment>
		                <QuipmentProspectList crew={crew} />
                    </Segment>
				)}
			</Accordion.Content>
		</Accordion>
	);

}

export interface QuipmentProspectListProps {
    crew: PlayerCrew[];
}

export const QuipmentProspectList = (props: QuipmentProspectListProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew } = props;
    const slots = crew.map((c, idx) => t(`voyage.seats.${CONFIG.VOYAGE_CREW_SLOTS[idx]}`));
    const quipment = globalContext.core.items.filter(f => f.type === 14 || f.type === 15);

    const [items, setItems] = React.useState<ItemWithBonus[]>();
    const [recipes, setRecipes] = React.useState<RecipeType>({});
    const [crewRef, setCrewRef] = React.useState<CrewRefType>({});
    const [ingredients, setIngredients] = React.useState<EquipmentItem[]>([]);

    const [mode, setMode] = useStateWithStorage('voyage_quipment_prospects_mode', 'items', { rememberForever: true });
    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;

    const itemTable = [
        { width: 2, column: 'item.name', title: t('base.quipment') },
        {
            width: 1,
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

    const crewTable = [
        {
            width: 3,
            column: 'name',
            title: t('global.name')
        },
        {
            width: 2,
            column: 'seat',
            title: t('shuttle_helper.missions.columns.seat'),
            customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                let ax = crew.indexOf(a);
                let bx = crew.indexOf(b);
                return ax - bx;
            }
        },
        {
            column: 'kwipment',
            title: t('base.quipment'),
            customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                let ax = items?.filter(f => a.kwipment.includes(Number(f.item.kwipment_id!) as any));
                let bx = items?.filter(f => b.kwipment.includes(Number(f.item.kwipment_id!) as any));
                return ax?.reduce((p, n) => p + n.item.needed!, 0)! - bx?.reduce((p, n) => p + n.item.needed!, 0)!;
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
                    newingredients.push(structuredClone(item));
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
        { key: 'crew', value: 'crew', text: t('base.crew') },
    ]

    return (
        <div>
            <div style={{...flexCol, alignItems: 'flex-start', gap: '0.5em', margin: '1em 0'}}>
                {/* <div>{t('collections.options.mode.title')}</div> */}
                <div>{t('global.group_by')}</div>
                <Dropdown
                    selection
                    options={modeOpts}
                    value={mode}
                    onChange={(e, { value }) => setMode(value as string)}
                    />
            </div>
            {!!items && mode === 'items' && <SearchableTable
                id={`prospective_quipment_items`}
                data={items}
                filterRow={(row, filter, filterType) => filterRow(row, filter, filterType)}
                renderTableRow={(row, i) => renderTableRow(row, i)}
                config={itemTable}
                />}
            {!!items && mode === 'ingredients' && <SearchableTable
                id={`prospective_quipment_ingredients`}
                data={ingredients}
                filterRow={(row, filter, filterType) => filterRow(row, filter, filterType)}
                renderTableRow={(row, i) => renderIngredient(row, i)}
                config={ingTable}
                />}
            {!!items && mode === 'crew' && <SearchableTable
                id={`prospective_quipment_crew`}
                data={crew}
                filterRow={(row, filter, filterType) => filterRow(row, filter, filterType)}
                renderTableRow={(row, i) => renderCrewRow(row, i)}
                config={crewTable}
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
                        customMatch: (field: EquipmentItem, text) => {
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
        else if (mode === 'ingredients') {
            return omniSearchFilter(row, filter, filterType, ['name']);
        }
        else if (mode === 'crew') {
            if (!row.kwipment_prospects) return false;
            return omniSearchFilter(row, filter, filterType,
                [
                    'name',
                    {
                        field: '',
                        customMatch: (c: PlayerCrew, text) => {
                            if (!c) return false;
                            return slots[crew.findIndex(cf => cf.id == c.id)]?.toLowerCase().includes(text.toLowerCase());
                        }
                    },
                    {
                        field: 'kwipment',
                        customMatch: (value: number[], text) => {
                            return quipment.filter(fq => value.includes(Number(fq.kwipment_id!))).some(q => q.name.toLowerCase().includes(text.toLowerCase()))
                        }
                    },
                    {
                        field: 'traits_named',
                        customMatch: (traits: string[], text) => {
                            return traits.some(t => t.toLowerCase().includes(text.toLowerCase()))
                        }
                    }
                ]
            );
        }
        return false;

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
                {item.quantity?.toLocaleString() || 0}
            </Table.Cell>
            <Table.Cell style={{color: item.needed! > item.quantity! ? 'tomato' : undefined}}>
                {item.needed?.toLocaleString() || 0}
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

    function renderCrewRow(row: PlayerCrew, idx: any) {

        return <Table.Row key={`quipment_prospects_crew_${row.id}_${row.symbol}_${idx}`}>
            <Table.Cell>
                <div style={{...flexRow}}>
                    <AvatarView
                        mode='crew'
                        targetGroup='voyageLineupHover'
                        item={row}
                        partialItem={true}
                        size={48}
                        />
                    <span>{row.name}</span>
                </div>
            </Table.Cell>
            <Table.Cell>
                {slots[crew.indexOf(row)]}
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexRow, justifyContent: 'flex-start', flexWrap: 'wrap', gap: '2em'}}>
                {row.kwipment.map((m) => {
                    let item = quipment.find(fq => fq.kwipment_id == m);
                    if (!item) return <></>
                    return <div style={{...flexCol, width: '12em', textAlign:'center'}}>
                    <AvatarView
                        mode='item'
                        targetGroup='voyage_prospect_summary'
                        item={item}
                        partialItem={true}
                        size={48}
                        />
                    <span>{item.name}</span>
                </div>
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
        const newitems = [] as EquipmentItem[];
        const newrecipes = {} as RecipeType;
        Object.entries(counts).forEach(([symbol, count]) => {
            let item = quipment.find(f => f.symbol === symbol);
            if (!item?.recipe?.list?.length) return;
            item = structuredClone(item) as EquipmentItem;
            item.needed = count;
            newitems.push(item);
            const qpcounts = {} as {[key: string]: number }

            const list = item.recipe!.list.map(li => {
                let qi = quipment.find(fq => fq.symbol === li.symbol);
                if (qi) {
                    qpcounts[qi.symbol] ??= 0;
                    qpcounts[qi.symbol] += (li.count * count);
                    return structuredClone(qi);
                }
                else return undefined;
            }).filter(i => i) as EquipmentItem[];

            let items = [] as EquipmentItem[];

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

    function compareIngredients(a: EquipmentItem, b: EquipmentItem) {
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


