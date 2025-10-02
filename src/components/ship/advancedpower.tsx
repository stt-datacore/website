import React from 'react';
import { Modal, Input, Button, Dropdown, Checkbox } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { OptionsBase } from '../base/optionsmodal_base';
import { AdvancedCrewPower, AdvancedCrewPowerConfig } from '../../model/ship';
import CONFIG from '../CONFIG';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';

export interface AdvancedCrewPowerProps {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    renderTrigger?: (disabled?: boolean) => React.JSX.Element;
    config: AdvancedCrewPowerConfig;
    disabled?: boolean;
}

const AdvancedCrewPowerPopup = <T extends OptionsBase>(props: AdvancedCrewPowerProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt } = globalContext.localized;
    const { disabled, config } = props;
    const [modalIsOpen, setModalIsOpen] = React.useState(false);
    const inputRef = React.createRef<Input>();

    // const [workConf, setWorkConf] = React.useState(config);
    const [innerSettings, setInnerSettings] = React.useState<AdvancedCrewPower>(config.current);

    const abilities = Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE).slice(0, 9).map(m => Number.parseInt(m));
    // const [showCopied, setShowCopied] = React.useState(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    React.useEffect(() => {
        if (!modalIsOpen && JSON.stringify(innerSettings) !== JSON.stringify(config.current)) {
            setInnerSettings({ ...config.current });
        }
    }, [config.current])

    const powerDepthChoices = [-1, 0, 1, 2, 3, 4].map((n) => {
        if (n === -1) {
            return {
                key: `idpd_none`,
                value: -1,
                text: t('global.default')
            }
        }
        else {
            return {
                key: `idpd_${n}`,
                value: n,
                text: `${n}`
            }
        }
    });

    // if (typeof window !== 'undefined' && document.location.search) {
    //     let parm = new URLSearchParams();
    //     if (parm.get("pmc")?.length) {
    //         let value = parm.get("pmc");
    //     }
    // }

    React.useEffect(() => {
        if (modalIsOpen) inputRef.current?.focus();
    }, [modalIsOpen]);

    React.useEffect(() => {
        if (props.isOpen !== undefined && props.isOpen) {
            setModalIsOpen(true);
        }
    }, [props.isOpen]);

    const setCurrent = (current: AdvancedCrewPower) => {
        Object.keys(current).forEach((key) => {
            if (current[key] === -1) current[key] = null;
        })
        setInnerSettings({ ...current });
    }


    return (
        <Modal
            open={modalIsOpen}
            onClose={closeModal}
            onOpen={() => setModalIsOpen(true)}
            trigger={props.renderTrigger ? props.renderTrigger(disabled) : renderDefaultTrigger()}

            size={isMobile ? 'small' : 'small'}
            closeIcon
        >
            <Modal.Header>
                <React.Fragment>
                    {t('ship.calc.advanced.power_depth')}
                </React.Fragment>
            </Modal.Header>
            <Modal.Content scrolling style={{ height: isMobile ? '55vh' : '50vh' }}>
                {renderGrid()}
            </Modal.Content>
            <Modal.Actions style={{ height: '5em' }}>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                        {/* <Button
                            style={{alignSelf: "flex-start"}}
                            content={`Permalink`}
                            icon='chain'
                            onClick={() => copyPermalink()} />
                            {showCopied && <div style={{margin: "0 0.5em"}}>Link copied to clipboard!</div>} */}
                        <Button style={{ alignSelf: "flex-end" }} content={t('global.load_defaults')} onClick={() =>
                            setCurrent({ ...config.defaultOptions })
                        } />
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

    function renderGrid(): React.JSX.Element {

        const rowStyle = {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            width: isMobile ? '100%' : '40em',
            alignItems: "center"
        } as React.CSSProperties;

        const checkRowStyle = {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            width: isMobile ? '100%' : '40em',
            alignItems: "center",
            borderTop: '1px solid #7f7f7f'
        } as React.CSSProperties;


        const textStyle = {
            width: isMobile ? '50%' : "40%",
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
            overflowY: 'auto'
        }}>
            <div style={rowStyle}>
                <div style={textStyle}>{t('ship.attack')}:</div>
                <Dropdown
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.attack_depth ?? -1}
                    options={powerDepthChoices}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, attack_depth: (value ?? null) as number | null })}>
                </Dropdown>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('ship.evasion')}:</div>
                <Dropdown
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.evasion_depth ?? -1}
                    options={powerDepthChoices}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, evasion_depth: (value ?? null) as number | null })}>
                </Dropdown>
            </div>
            <div style={rowStyle}>
                <div style={textStyle}>{t('ship.accuracy')}:</div>
                <Dropdown
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.accuracy_depth ?? -1}
                    options={powerDepthChoices}
                    onChange={(e, { value }) => setCurrent({ ...innerSettings, accuracy_depth: (value ?? null) as number | null })}>
                </Dropdown>
            </div>
            {abilities.map((acode, idx) => {
                if (!innerSettings.ability_depths?.length) {
                    innerSettings.ability_depths = [];
                    innerSettings.ability_depths.length = abilities.length;
                    innerSettings.ability_depths = innerSettings.ability_depths.map(n => null)
                }
                if (!innerSettings.ability_exclusions?.length) {
                    innerSettings.ability_exclusions = [];
                    innerSettings.ability_exclusions.length = abilities.length;
                    innerSettings.ability_exclusions = innerSettings.ability_exclusions.map(n => false)
                }
                let nv = [...innerSettings.ability_depths];
                let ne = [...innerSettings.ability_exclusions];

                return (
                    <div style={checkRowStyle}>
                        <div style={textStyle}>{CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[acode]}:</div>

                        <Dropdown
                            style={{...inputStyle, width : '7em'}}
                            placeholder="Value"
                            disabled={innerSettings.ability_exclusions[acode]}
                            value={innerSettings.ability_depths[acode] ?? -1}
                            options={powerDepthChoices}
                            onChange={(e, { value }) => {
                                nv[acode] = (value ?? null) as number | null
                                setCurrent({ ...innerSettings, ability_depths: nv })
                            }}>
                        </Dropdown>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <Checkbox checked={innerSettings.ability_exclusions[acode]}
                                label={t('ship.calc.advanced.exclude_ability')}
                                onChange={((e, { checked }) => {
                                    ne[acode] = checked!
                                    setCurrent({ ...innerSettings, ability_exclusions: ne })
                                })}
                            />
                        </div>

                    </div>)

            })}

        </div>
    }

    // function settingsToPermalink(value: GauntletSettings): string {
    //     return "";
    // }

    // function copyPermalink() {
    //     let url = settingsToPermalink(workConf.current);
    //     if (typeof navigator !== 'undefined') {
    //         navigator.clipboard.writeText(url);
    //         setShowCopied(true);
    //         window.setTimeout(() => {
    //             setShowCopied(false);
    //         }, 3500);
    //     }
    // }

    function closeModal(): void {
        if (props.setIsOpen) props.setIsOpen(false);
        setModalIsOpen(false);
    }

    function renderDefaultTrigger(): React.JSX.Element {
        return (
            <Button disabled={disabled}>
                {t('ship.calc.advanced.power_depth')}
            </Button>
        );
    }

    function confirmSelection(): void {
        const newSettings = {
            ...innerSettings
        }
        Object.keys(newSettings).forEach((key) => {
            if (newSettings[key] === -1) newSettings[key] = null;
        })

        config.setCurrent(newSettings);
        setModalIsOpen(false);
    }
};


export default AdvancedCrewPowerPopup;
