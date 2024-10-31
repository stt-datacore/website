import React from 'react';
import { Modal, Input, Button } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { OptionsBase } from '../base/optionsmodal_base';
import { GauntletSettingsProps, InternalSettings, DefaultAdvancedGauntletSettings, GauntletSettings } from '../../utils/gauntlet';

const GauntletSettingsPopup = <T extends OptionsBase>(props: GauntletSettingsProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt } = globalContext.localized;
    const { config } = props;
    const [modalIsOpen, setModalIsOpen] = React.useState(false);
    const inputRef = React.createRef<Input>();

    const [workConf, setWorkConf] = React.useState(config);
    const [innerSettings, setInnerSettings] = React.useState<InternalSettings>(config.current);

    const [showCopied, setShowCopied] = React.useState(false);

    if (typeof window !== 'undefined' && document.location.search) {
        let parm = new URLSearchParams();
        if (parm.get("pmc")?.length) {
            let value = parm.get("pmc");
        }
    }

    React.useEffect(() => {
        setInnerSettings(config.current);
    }, [config.current]);

    React.useEffect(() => {
        if (modalIsOpen) inputRef.current?.focus();
    }, [modalIsOpen]);

    React.useEffect(() => {
        if (props.isOpen !== undefined && props.isOpen) {
            setModalIsOpen(true);
        }
    }, [props.isOpen]);

    const setCurrent = (current: InternalSettings) => {
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
                    {t('global.advanced_settings')}
                </React.Fragment>
            </Modal.Header>
            <Modal.Content scrolling>
                {renderGrid()}
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
                        <Button style={{ alignSelf: "flex-end" }} content={t('global.load_defaults')} onClick={() => setCurrent(DefaultAdvancedGauntletSettings)} />
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

    function renderGrid(): JSX.Element {

        const rowStyle = {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            width: '35em',
            alignItems: "center"
        } as React.CSSProperties;

        const textStyle = {
            width: "40%",
            margin: "0.5em"
        } as React.CSSProperties;

        const inputStyle = {
            width: "40%",
            margin: "0.5em",
            textAlign: 'left',
            padding: "0.5em 1em"
        }
        return <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "stretch",
            width: '100%',
            alignItems: "center",
            overflowY: 'auto',
            maxHeight: '15em'
        }}>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.crit_multiplier', { p: '5'})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit5}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, crit5: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.crit_multiplier', { p: '25'})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit25}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, crit25: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.crit_multiplier', { p: '45'})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit45}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, crit45: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.crit_multiplier', { p: '65'})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit65}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, crit65: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.min_multiplier')}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.minWeight}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, minWeight: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.max_multiplier')}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.maxWeight}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, maxWeight: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.incidence', { name: t('gauntlet.advanced.primary')})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.linearSkillIncidenceWeightPrimary}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, linearSkillIncidenceWeightPrimary: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.index', { name: t('gauntlet.advanced.primary')})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.linearSkillIndexWeightPrimary}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, linearSkillIndexWeightPrimary: value })}>
                </Input>
            </div>

            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.incidence', { name: t('gauntlet.advanced.secondary')})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.linearSkillIncidenceWeightSecondary}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, linearSkillIncidenceWeightSecondary: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.index', { name: t('gauntlet.advanced.secondary')})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.linearSkillIndexWeightSecondary}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, linearSkillIndexWeightSecondary: value })}>
                </Input>
            </div>

            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.incidence', { name: t('gauntlet.advanced.tertiary')})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.linearSkillIncidenceWeightTertiary}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, linearSkillIncidenceWeightTertiary: value })}>
                </Input>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('gauntlet.advanced.index', { name: t('gauntlet.advanced.tertiary')})}:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.linearSkillIndexWeightTertiary}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, linearSkillIndexWeightTertiary: value })}>
                </Input>
            </div>


        </div>
    }

    function settingsToPermalink(value: GauntletSettings): string {
        return "";
    }

    function copyPermalink() {
        let url = settingsToPermalink(workConf.current);
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
        config.setCurrent({
            maxWeight: Number.parseFloat(innerSettings.maxWeight.toString()),
            minWeight: Number.parseFloat(innerSettings.minWeight.toString()),
            crit5: Number.parseFloat(innerSettings.crit5.toString()),
            crit25: Number.parseFloat(innerSettings.crit25.toString()),
            crit45: Number.parseFloat(innerSettings.crit45.toString()),
            crit65: Number.parseFloat(innerSettings.crit65.toString()),
            linearSkillIncidenceWeightPrimary: Number.parseFloat(innerSettings.linearSkillIncidenceWeightPrimary.toString()),
            linearSkillIndexWeightPrimary: Number.parseFloat(innerSettings.linearSkillIndexWeightPrimary.toString()),
            linearSkillIncidenceWeightSecondary: Number.parseFloat(innerSettings.linearSkillIncidenceWeightSecondary.toString()),
            linearSkillIndexWeightSecondary: Number.parseFloat(innerSettings.linearSkillIndexWeightSecondary.toString()),
            linearSkillIncidenceWeightTertiary: Number.parseFloat(innerSettings.linearSkillIncidenceWeightTertiary.toString()),
            linearSkillIndexWeightTertiary: Number.parseFloat(innerSettings.linearSkillIndexWeightTertiary.toString()),
        });
        setModalIsOpen(false);
    }
};


export default GauntletSettingsPopup;
