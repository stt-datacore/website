import React from "react";
import { CrewMember } from "../../model/crew";
import { Button, Checkbox, Container, Icon, Modal, Segment, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewItemsView } from "../item_presenters/crew_items";
import { OptionsPanelFlexRow } from "../stats/utils";
import { PlayerCrew } from "../../model/player";


export interface NoteEditorProps {
    notes: number[];
    setNotes: (value?: number[]) => void;
    isOpen: boolean;
    onClose: (results?: number[]) => void;
}

export const NoteEditor = (props: NoteEditorProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const { notes: selection, setNotes, isOpen, onClose } = props;

    const [trashed, setTrashed] = React.useState([] as (string | number)[]);

    const notes = React.useMemo(() => {
        let crew: (PlayerCrew | CrewMember)[] | undefined = undefined;
        if (!playerData) {
            crew = globalContext.core.crew;
        }
        else {
            crew = playerData.player.character.crew;
        }
        return selection.map(id => crew.find(cc => cc.id === id)).filter(f => f !== undefined);
    }, [selection, playerData]);

    return (<>
        <Modal open={isOpen} size='small'>
            <Modal.Header>
                {t('excluder.noted_exclusions')}
            </Modal.Header>
            <Modal.Content>
                <Container style={{overflowY: 'auto', maxHeight: '40em'}}>
                    <Table striped>
                        <Table.Body>
                            {notes.map((item) => {
                                return (
                                    <Table.Row key={`note_exc_${item.symbol}`} style={{height:'2.5em'}}>
                                        <Table.Cell>
                                            <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
                                                <Button icon='trash' color={trashed.includes(item.id) ? 'orange' : undefined}
                                                    onClick={() => toggleTrashed(item.id)}
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
                        <Button onClick={() => setTrashed([].slice())}>
                            <Icon name='eraser' />&nbsp;
                            {t('global.reset')}
                        </Button>
                        <Button onClick={() => setTrashed(notes.map(n => n.id))}>
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
        let newlist = notes.filter(f => !trashed.includes(f.id));
        onClose(newlist.map(i => i.id));
    }

    function onCancel() {
        onClose(undefined);
    }

    function toggleTrashed(id: number) {
        if (!trashed.includes(id)) {
            trashed.push(id);
            setTrashed([...trashed]);
        }
        else {
            setTrashed(trashed.filter(t => t !== id));
        }
    }
}