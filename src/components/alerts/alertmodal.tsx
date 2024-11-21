import React from 'react';
import { Modal, Input, Button, Checkbox } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { OptionsBase } from '../base/optionsmodal_base';
import { AlertModalProps, DefaultAlertConfig, IAlertConfig } from './model';

export const AlertModal = <T extends OptionsBase>(props: AlertModalProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt } = globalContext.localized;
    const { config, setConfig } = props;
    const [modalIsOpen, setModalIsOpen] = React.useState(false);
    const inputRef = React.createRef<Input>();

    const [workConf, setWorkConf] = React.useState(config);
    const [innerSettings, setInnerSettings] = React.useState<IAlertConfig>(DefaultAlertConfig);

    const [showCopied, setShowCopied] = React.useState(false);
    const [copies, setCopies] = React.useState('');

    if (typeof window !== 'undefined' && document.location.search) {
        let parm = new URLSearchParams();
        if (parm.get("pmc")?.length) {
            let value = parm.get("pmc");
        }
    }

    React.useEffect(() => {
        setInnerSettings(JSON.parse(JSON.stringify(config)));
    }, [config]);

    React.useEffect(() => {
        if (modalIsOpen) inputRef.current?.focus();
    }, [modalIsOpen]);

    React.useEffect(() => {
        if (props.isOpen !== undefined && props.isOpen) {
            setModalIsOpen(true);
        }
    }, [props.isOpen]);

    React.useEffect(() => {
        setCopies(innerSettings.alert_new.toString());
    }, [innerSettings]);

    const setCurrent = (current: IAlertConfig) => {
        setInnerSettings(current);
    }

    return (
        <Modal
            open={modalIsOpen}
            onClose={closeModal}
            onOpen={() => setModalIsOpen(true)}
            trigger={props.renderTrigger ? props.renderTrigger() : renderDefaultTrigger()}
            size='small'
            closeIcon
        >
            <Modal.Header>
                <React.Fragment>
                    {t('alerts.name')}
                </React.Fragment>
            </Modal.Header>
            <Modal.Content scrolling>
                <div style={{
                    display: 'grid',
                    gridTemplateAreas: `'setting1 text1' 'setting2 text2' 'setting3 text3'`,
                    gridTemplateColumns: `3em auto`,
                    gap: '1em'
                }}>
                    <div style={{gridArea: 'setting1', margin: 'auto'}}>
                        <Input style={{width: '3em'}} value={copies} onChange={(e, { value }) => setCopies(value)} />
                    </div>
                    <div style={{gridArea: 'text1', margin: 'auto', marginLeft: 0}}>
                        {t('alerts.when_new_crew')}
                    </div>
                    <div style={{gridArea: 'setting2', margin: 'auto'}}>
                        <Checkbox
                            checked={!!innerSettings.alert_fuses}
                            onChange={(e, { checked }) => setCurrent({ ...innerSettings, alert_fuses: checked ? 1 : 0 })}
                            />
                    </div>
                    <div style={{gridArea: 'text2', cursor: 'pointer', margin: 'auto', marginLeft: 0}} onClick={() => setCurrent({ ...innerSettings, alert_fuses: innerSettings.alert_fuses ? 0 : 1})}>
                        {t('alerts.when_new_fuse')}
                    </div>
                    <div style={{gridArea: 'setting3', margin: 'auto'}}>
                        <Checkbox
                            checked={!!innerSettings.always_legendary}
                            onChange={(e, { checked }) => setCurrent({ ...innerSettings, always_legendary: !!checked })}
                            />
                    </div>
                    <div style={{gridArea: 'text3', cursor: 'pointer', margin: 'auto', marginLeft: 0}} onClick={() => setCurrent({ ...innerSettings, always_legendary: !innerSettings.always_legendary })}>
                        {t('alerts.always_alert_legendary')}
                    </div>
                </div>
            </Modal.Content>
            <Modal.Actions>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        {/* <Button
                            style={{alignSelf: "flex-start"}}
                            content={`Permalink`}
                            icon='chain'
                            onClick={() => copyPermalink()} />
                            {showCopied && <div style={{margin: "0 0.5em"}}>Link copied to clipboard!</div>} */}
                        <Button style={{ alignSelf: "flex-end" }} content={t('global.load_defaults')} onClick={() => setCurrent(DefaultAlertConfig)} />
                    </div>
                    <div>
                        <Button
                            style={{ alignSelf: "flex-end" }}
                            color='blue'
                            content={t('global.save')}
                            onClick={() => confirmSelection()} />
                        <Button style={{ alignSelf: "flex-end" }} content={t('global.cancel')} onClick={closeModal} />
                    </div>
                </div>
            </Modal.Actions>
        </Modal>
    );

    function settingsToPermalink(value: IAlertConfig): string {
        return JSON.stringify(value);
    }

    function copyPermalink() {
        let url = settingsToPermalink(workConf);
        if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(url);
            setShowCopied(true);
            window.setTimeout(() => {
                setShowCopied(false);
            }, 3500);
        }
    }

    function closeModal(): void {
        if (props.setIsOpen) props.setIsOpen(false);
        setModalIsOpen(false);
    }

    function renderDefaultTrigger(): JSX.Element {
        return (
            <Button>
                {t('global.advanced_settings')}
            </Button>
        );
    }

    function confirmSelection(): void {
        innerSettings.alert_new = Number(copies)
        setConfig(innerSettings);
        closeModal();
    }
};


