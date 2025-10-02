import React from "react";
import { CrewMember } from "../../model/crew";
import { Button, Checkbox, Container, Icon, Modal, Segment, SemanticICONS, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewItemsView } from "../item_presenters/crew_items";
import { OptionsPanelFlexRow } from "../stats/utils";
import { PlayerCrew } from "../../model/player";


export interface NoteEditorProps {
    title: string | React.JSX.Element;
    mode: 'add' | 'remove';
    crewIds: number[];
    isOpen: boolean;
    onClose: (results?: number[]) => void;
    currentSelection?: number[];
}

export const NoteEditor = (props: NoteEditorProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const { crewIds, currentSelection, isOpen, onClose, title, mode } = props;

    const [selection, setSelection] = React.useState(currentSelection || []);

    const items = React.useMemo(() => {
        let crew: (PlayerCrew | CrewMember)[] | undefined = undefined;
        if (!playerData) {
            crew = globalContext.core.crew;
        }
        else {
            crew = playerData.player.character.crew;
        }
        return crewIds.map(id => crew.find(cc => cc.id === id)).filter(f => f !== undefined);
    }, [crewIds, playerData]);

    React.useEffect(() => {
        if (currentSelection) {
            setSelection(currentSelection);
        }
    }, [currentSelection]);

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
                                            <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
                                            <AvatarView
                                                mode='crew'
                                                item={item}
                                                partialItem={true}
                                                size={48}
                                                />
                                            {item.name}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <CrewItemsView itemSize={32}
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
            </Modal.Content>
            <Modal.Actions>
                <div style={{...OptionsPanelFlexRow, justifyContent: 'space-between'}}>
                    <div style={{...OptionsPanelFlexRow, gap: '1em'}}>
                        <Button onClick={() => setSelection([].slice())}>
                            <Icon name='eraser' />&nbsp;
                            {t('global.reset')}
                        </Button>
                        <Button onClick={() => setSelection(items.map(n => n.id))}>
                            <Icon name='world' />&nbsp;
                            {t('global.select_all')}
                        </Button>
                    </div>
                    <div style={{...OptionsPanelFlexRow, gap: '1em'}}>
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
}