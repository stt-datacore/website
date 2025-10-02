import React from "react";
import { ComputedSkill, CrewMember } from "../../model/crew";
import { Button, Checkbox, Container, Icon, Modal, Popup, Segment, SemanticICONS, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewItemsView } from "../item_presenters/crew_items";
import { OptionsPanelFlexRow } from "../stats/utils";
import { PlayerCrew } from "../../model/player";
import CONFIG from "../CONFIG";
import { skillSum } from "../../utils/crewutils";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { drawSkills } from "../specialist/utils";
import { useStateWithStorage } from "../../utils/storage";


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
    const { t } = globalContext.localized;
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
        }
        return result;
    }, [items]);

    const iconName = React.useMemo(() => {
        let v = undefined as SemanticICONS | undefined;
        if (mode === 'remove') {
            v = 'trash';
        }
        else {
            v = 'add';
        }
        return v;
    }, [mode]);

    return (<>
        <Modal open={isOpen} size='small'>
            <Modal.Header>
                {title}
            </Modal.Header>
            <Modal.Content>
                <Container style={{overflowY: 'auto', maxHeight: '40em'}}>
                    <Table striped>
                        <Table.Body>
                            {items.map((item) => {
                                return (
                                    <Table.Row key={`note_exc_${item.symbol}`} style={{height:'2.5em'}}>
                                        <Table.Cell>
                                            <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
                                                <Button icon={iconName} color={selection.includes(item.id) ? mode ==='remove' ? 'orange' : 'green' : undefined}
                                                    onClick={() => toggleSelected(item.id)}
                                                />
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {!!highestSkill[item.id] && <>{drawSkills([highestSkill[item.id]], t, undefined, false, undefined, 20)}</>}
                                        </Table.Cell>
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
                                        <Table.Cell>
                                            <CrewItemsView itemSize={32}
                                                targetGroup="notedhoveritems"
                                                crew={item}
                                                quipment={true}
                                                />
                                        </Table.Cell>
                                    </Table.Row>
                                )
                            })}
                        </Table.Body>
                    </Table>
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
            let fin = cc.filter(n => !eaches.includes(n) && highestSkill[n.id] === skill);
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