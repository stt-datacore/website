import React from "react";
import { Button, Container, Icon, Modal, Popup, SemanticICONS, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { ComputedSkill, CrewMember } from "../../model/crew";
import { Filter } from "../../model/game-elements";
import { PlayerCrew } from "../../model/player";
import { getCrewQuipment, skillSum } from "../../utils/crewutils";
import { omniSearchFilter } from "../../utils/omnisearch";
import CONFIG from "../CONFIG";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewItemsView } from "../item_presenters/crew_items";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { drawSkills } from "../specialist/utils";
import { OptionsPanelFlexRow } from "../stats/utils";

export interface NoteEditorProps {
    title: string | React.JSX.Element;
    mode: 'add' | 'remove';
    crewIds: number[];
    isOpen: boolean;
    showHighest?: boolean;
    showExpiring?: boolean;
    onClose: (results?: number[]) => void;
    currentSelection?: number[];
}

export const NoteEditor = (props: NoteEditorProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;
    const { playerData } = globalContext.player;
    const { crewIds, currentSelection, isOpen, onClose, title, mode, showHighest, showExpiring } = props;

    const [selection, setSelection] = React.useState(currentSelection || []);
    // const [sortCol, setSortCol] = useStateWithStorage(`note_editor_${mode}/sort_col`, 'crew', { rememberForever: true });
    // const [sortDir, setSortDir] = useStateWithStorage(`note_editor_${mode}/sort_dir`, -1, { rememberForever: true });

    const items = React.useMemo(() => {
        let crew: (PlayerCrew | CrewMember)[] | undefined = undefined;
        if (!playerData) {
            crew = globalContext.core.crew;
        }
        else {
            crew = playerData.player.character.crew;
        }
        return crewIds.map(id => crew.find(cc => cc.id === id)).filter(f => f !== undefined)
            .sort((a, b) => {
                if (showExpiring) {
                    return getCrewTime(b as PlayerCrew) - getCrewTime(a as PlayerCrew);
                }
                return a.name.localeCompare(b.name);
            });
    }, [crewIds, playerData, showHighest, showExpiring]);

    React.useEffect(() => {
        if (currentSelection) {
            setSelection(currentSelection);
        }
    }, [currentSelection]);

    const highestSkill = React.useMemo(() => {
        const result = {} as {[key:string]: string}
        if (showHighest || showExpiring) {
            items.forEach(item => {
                let crewskills = Object.keys(CONFIG.SKILLS).map(skill => ({...item[skill], skill})) as ComputedSkill[];
                crewskills.sort((a, b) => skillSum(b) - skillSum(a));
                result[item.id] = crewskills[0].skill;
            });
            return result;
        }
        return undefined;
    }, [items]);

    const iconName = React.useMemo(() => {
        let icn = undefined as SemanticICONS | undefined;
        if (mode === 'remove') {
            icn = 'trash';
        }
        else {
            icn = 'add';
        }
        return icn;
    }, [mode]);

    const skills = Object.keys(CONFIG.SKILLS);
    const quipment = globalContext.core.items.filter(f => f.type === 14);

    const tableConfig = [
        { width: 1, column: 'selected' },
    ] as ITableConfigRow[];

    if (highestSkill) {
        tableConfig.push(
            {
                width: 1, column: 'skill', title: t('base.skills'),
                customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                    return highestSkill[a.id]?.localeCompare(highestSkill[b.id] || '') || 0;
                }
            },
        )
    }
    tableConfig.push(
        { width: 4, column: 'name', title: t('base.crew') },
        {
            width: 3, column: 'quipment', title: t('base.quipment'),
            pseudocolumns: ['quipment', 'highest_power', 'last_expiring'],
            translatePseudocolumn: (field) => {
                if (field === 'quipment') return t('base.quipment');
                return t(`consider_crew.excluder.${field}`)
            },
            customCompare: (a: PlayerCrew, b: PlayerCrew, config) => {
                let r = 0;
                if (!r || config.field === 'quipment') {
                    r = getCrewQuipment(a, quipment).length - getCrewQuipment(b, quipment).length;
                    if (!r && highestSkill) r = highestSkill[a.id].localeCompare(highestSkill[b.id]);
                }
                if (!r || config.field === 'last_expiring') {
                    r = (getCrewTime(b as PlayerCrew) - getCrewTime(a as PlayerCrew))
                }
                if (!r || config.field === 'highest_power') {
                    r = (skillSum(skills.map(skill => a[skill])) - skillSum(skills.map(skill => b[skill])))
                }
                if (!r) {
                    r = a.name.localeCompare(b.name);
                }
                return r;
            }
        },
    );

    return (<>
        <Modal open={isOpen} size='small'>
            <Modal.Header>
                {title}
            </Modal.Header>
            <Modal.Content>
                <Container style={{overflowY: 'auto', maxHeight: '40em'}}>
                    <SearchableTable
                        stickyHeader
                        showSortDropdown
                        data={items}
                        config={tableConfig}
                        renderTableRow={renderTableRow}
                        filterRow={filterTableRow}
                        />
                </Container>
                <CrewHoverStat targetGroup="notedhover" modalPositioning />
                <ItemHoverStat targetGroup="notedhoveritems" modalPositioning />
            </Modal.Content>
            <Modal.Actions>
                <div style={{...OptionsPanelFlexRow, justifyContent: 'space-between'}}>
                    <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
                        <Button onClick={() => setSelection([].slice())}>
                            <Icon name='eraser' />&nbsp;
                            {t('global.reset')}
                        </Button>
                        <Popup
                            content={t('global.select_all')}
                            trigger={
                                <Button icon='world' onClick={() => setSelection(items.map(n => n.id))} />
                            }
                        />
                        {!!showHighest && <Popup
                            content={t('consider_crew.excluder.highest_power')}
                            trigger={
                                <Button onClick={selectHighest} icon='level up' />
                            }
                        />}
                        {!!showExpiring && <Popup
                            content={t('consider_crew.excluder.last_expiring')}
                            trigger={
                                <Button onClick={selectExpiring} icon='time' />
                            }
                        />}
                    </div>
                    <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
                        <Button onClick={onCancel} type='button'>{t('global.cancel')}</Button>
                        <Button onClick={onSubmit} type='submit'>{t('global.apply')}</Button>
                    </div>
                </div>
            </Modal.Actions>
        </Modal>
    </>)

    function filterTableRow(item: PlayerCrew | CrewMember, filter: Filter[], filterType?: string) {
        return omniSearchFilter(item, filter, filterType, [
            'name',
            {
                field: 'traits',
                customMatch: (value: string[], text) => {
                    return value.map(trait => TRAIT_NAMES[trait]).some(str => str.toLowerCase().includes(text.toLowerCase()));
                }
            },
            {
                field: 'skill_order',
                customMatch: (value: string[], text) => {
                    let r = value.map(skill => CONFIG.SKILLS[skill]).some(str => str.toLowerCase().includes(text.toLowerCase()));
                    if (!r) {
                        r = value.map(skill => CONFIG.SKILLS_SHORT.find(ss => ss.name === skill)!.short).some(str => str.toLowerCase().includes(text.toLowerCase()));
                    }
                    return r;
                }
            }
        ]);
    }

    function renderTableRow(item: PlayerCrew | CrewMember, idx?: number) {
        return (
            <Table.Row key={`note_exc_${item.symbol}`}>
                <Table.Cell>
                    <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
                        <Button icon={iconName} color={selection.includes(item.id) ? mode ==='remove' ? 'orange' : 'green' : undefined}
                            onClick={() => toggleSelected(item.id)}
                        />
                    </div>
                </Table.Cell>
                {!!highestSkill && <Table.Cell>
                    {!!highestSkill[item.id] && <>{drawSkills([highestSkill[item.id]], t, undefined, false, undefined, 20)}</>}
                </Table.Cell>}
                <Table.Cell>
                    <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
                    <AvatarView
                        mode='crew'
                        item={item}
                        partialItem={true}
                        targetGroup="notedhover"
                        size={48}
                        />
                    {item.name}
                    </div>
                </Table.Cell>
                <Table.Cell >
                    <CrewItemsView
                        itemSize={32}
                        nonInteractive={true}
                        gap={'0.75em'}
                        targetGroup="notedhoveritems"
                        crew={item}
                        quipment={true}
                        />
                </Table.Cell>
            </Table.Row>
        )
    }

    function onSubmit() {
        if (mode === 'add') {
            let newlist = items.filter(f => selection.includes(f.id));
            onClose(newlist.map(i => i.id));
        }
        else {
            let newlist = items.filter(f => !selection.includes(f.id));
            onClose(newlist.map(i => i.id));
        }
    }

    function onCancel() {
        onClose(undefined);
    }

    function toggleSelected(id: number) {
        if (!selection.includes(id)) {
            selection.push(id);
            setSelection([...selection]);
        }
        else {
            setSelection(selection.filter(t => t !== id));
        }
    }

    function selectHighest() {
        const eaches = [] as (PlayerCrew | CrewMember)[];
        Object.keys(CONFIG.SKILLS).forEach((skill) => {
            if (!items.some(c => skillSum(c[skill]))) return;
            let cc = [...items];
            cc.sort((a, b) => {
                if (!skillSum(a[skill])) return 1;
                if (!skillSum(b[skill])) return -1;
                return skillSum(b[skill]) - skillSum(a[skill])
            });
            let fin = cc.filter(n => !eaches.includes(n));
            if (fin.length) {
                if (!eaches.includes(fin[0])) eaches.push(fin[0]);
            }
        });
        setSelection(eaches.map(c => c.id));
    }

    function selectExpiring() {
        const eaches = [] as (PlayerCrew | CrewMember)[];
        Object.keys(CONFIG.SKILLS).forEach((skill) => {
            if (!items.some(c => skillSum(c[skill]))) return;
            let cc = [...items];
            cc.sort((a, b) => {
                if (!skillSum(a[skill])) return 1;
                if (!skillSum(b[skill])) return -1;

                return getCrewTime(b as PlayerCrew) - getCrewTime(a as PlayerCrew)
            });
            // Extra check for skills since skills are not the natural sort, here.
            let fin = cc.filter(n => !eaches.includes(n) && highestSkill && highestSkill[n.id] === skill);
            if (fin.length) {
                if (!eaches.includes(fin[0])) eaches.push(fin[0]);
            }
        });
        setSelection(eaches.map(c => c.id));
    }

    function getCrewTime(crew: PlayerCrew) {
        if (crew.kwipment_expiration) {
            let ns = crew.kwipment_expiration.map(kw => typeof kw === 'number' ? kw : kw[0] as number);
            return ns.reduce((p, n) => p + n) / ns.length;
        }
        return 0;
    }
}