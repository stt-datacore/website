import React from 'react';
import { Modal, Input, Button } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { OptionsBase } from '../base/optionsmodal_base';
import { BetaTachyonSettings } from '../../model/worker';
import { BetaTachyonPresets } from './btpresets';

interface InternalSettings {
    name?: string,
    // Voyages Improved
    improved: number | string,
    // Base Power Score
    power: number | string,
    // Effort To Max
    citeEffort: number | string,
    // Antimatter Traits
    antimatter: number | string,
    // Not In Portal Now
    portal: number | string,
    // In Portal Ever
    never: number | string,
    // Stat-Boosting Collections Increased
    collections: number | string,
    // Skill-Order Rarity
    skillRare: number | string,
    // Overall Roster Power Rank
    score: number | string,
    // Power Rank Within Skill Order
    triplet: number | string,
    // Magic Number    
    magic: number | string,
    // Retrieval Odds
    retrieval: number | string,
    // Quipment Score
    quipment: number | string,
    // Voyage Group Sparsity
    groupSparsity: number | string
}

export interface BetaTachyonSettingsConfig {
	current: BetaTachyonSettings;
	setCurrent: (value: BetaTachyonSettings) => void;
	defaultOptions: BetaTachyonSettings;
}

export interface BetaTachyonSettingsProps {	
    config: BetaTachyonSettingsConfig;    
	renderTrigger?: () => JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;
};

export function settingsToPermalink(settings: BetaTachyonSettings) {
    let params = new URLSearchParams();
    params.set("imp", settings.improved.toString());
    params.set("pow", settings.power.toString());
    params.set("cite", settings.citeEffort.toString());
    params.set("am", settings.antimatter.toString());
    params.set("portal", settings.portal.toString());
    params.set("never", settings.never.toString());
    params.set("col", settings.collections.toString());
    params.set("rare", settings.skillRare.toString());
    params.set("score", settings.score.toString());
    params.set("tri", settings.triplet.toString());
    params.set("odds", settings.retrieval.toString());
    params.set("magic", settings.magic.toString());
    params.set("quip", settings.quipment.toString());
    params.set("gs", settings.groupSparsity.toString());

    if (settings.name) {
        params.set('name', settings.name);
    }

    let host = "";

    if (!globalThis.window) host = (process.env.GATSBY_DATACORE_URL ?? "") as string;
    else host = globalThis.window.location.origin + "/";

    return `${host}cite-opt?${params.toString()}`;
}

export function permalinkToSettings() {
    if (!globalThis.window) return undefined;
    let params = new URLSearchParams(globalThis.window.location.search);    
    if (!params.size) return undefined;

    let newConfig = {
        ... DefaultBetaTachyonSettings,
        improved: Number.parseFloat(params.get("imp") ?? DefaultBetaTachyonSettings.improved.toString()),
        power: Number.parseFloat(params.get("pow") ?? DefaultBetaTachyonSettings.power.toString()),
        citeEffort: Number.parseFloat(params.get("cite") ?? DefaultBetaTachyonSettings.citeEffort.toString()),
        antimatter: Number.parseFloat(params.get("am") ?? DefaultBetaTachyonSettings.antimatter.toString()),
        portal: Number.parseFloat(params.get("portal") ?? DefaultBetaTachyonSettings.portal.toString()),
        never: Number.parseFloat(params.get("never") ?? DefaultBetaTachyonSettings.never.toString()),
        collections: Number.parseFloat(params.get("col") ?? DefaultBetaTachyonSettings.collections.toString()),
        skillRare: Number.parseFloat(params.get("rare") ?? DefaultBetaTachyonSettings.skillRare.toString()),
        score: Number.parseFloat(params.get("score") ?? DefaultBetaTachyonSettings.score.toString()),
        triplet: Number.parseFloat(params.get("tri") ?? DefaultBetaTachyonSettings.triplet.toString()),
        magic: Number.parseFloat(params.get("magic") ?? DefaultBetaTachyonSettings.magic.toString()),
        retrieval: Number.parseFloat(params.get("odds") ?? DefaultBetaTachyonSettings.retrieval.toString()),
        quipment: Number.parseFloat(params.get("quip") ?? DefaultBetaTachyonSettings.quipment.toString()),
        groupSparsity: Number.parseFloat(params.get("gs") ?? DefaultBetaTachyonSettings.groupSparsity.toString()),
    } as BetaTachyonSettings;

    Object.keys(DefaultBetaTachyonSettings).forEach(k => {
        if (k !== 'name') {
            if (newConfig[k] === undefined || Number.isNaN(newConfig[k])) {
                newConfig[k] = DefaultBetaTachyonSettings[k];
            }    
        }
    });

    newConfig.name = params.get("name") ?? undefined;

    return newConfig;
}

export const DefaultBetaTachyonSettings = {
    // Voyages Improved
    improved: 1,
    // Base Power Score
    power: 3,
    // Effort To Max
    citeEffort: 0.75,
    // Antimatter Traits
    antimatter: 0.1,
    // In Portal Now
    portal: 1.5,
    // In Portal Ever
    never: 3,
    // Stat-Boosting Collections Increased
    collections: 2,
    // Skill-Order Rarity
    skillRare: 2,
    // Overall Roster Power Rank
    score: 1,
    // Power Rank Within Skill Order
    triplet: 3,
    // Magic number
    magic: 10,
    // Retrieval odds
    retrieval: 3,
    // Quipment Score
    quipment: 0.5,
    // Voyage Group Sparsity
    groupSparsity: 2,
} as BetaTachyonSettings;

const BetaTachyonSettingsPopup = <T extends OptionsBase>(props: BetaTachyonSettingsProps) => {
	const context = React.useContext(GlobalContext);
    const { t, tfmt } = context.localized;
	const { config } = props;    
	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const inputRef = React.createRef<Input>();

    const [workConf, setWorkConf] = React.useState(config);
    const [innerSettings, setInnerSettings] = React.useState<InternalSettings>({ ... DefaultBetaTachyonSettings, ... config.current });

    const [showCopied, setShowCopied] = React.useState(false);
    
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

    const setCurrent = (current: InternalSettings) => {
        setInnerSettings(current);
    }

	return (
		<Modal
			open={modalIsOpen}
			onClose={closeModal}
			onOpen={() => setModalIsOpen(true)}
			trigger={props.renderTrigger ? props.renderTrigger() : renderDefaultTrigger()}
			size='tiny'
			closeIcon
		>
			<Modal.Header>
                <React.Fragment>
                    {tfmt('cite_opt.btp.settings_tweaker.title')}<br />
                    <sub style={{fontStyle:'italic'}}>({tfmt('cite_opt.btp.settings_tweaker.heading')})</sub>
                </React.Fragment>
			</Modal.Header>
			<Modal.Content scrolling>
				{renderGrid()}
			</Modal.Content>
			<Modal.Actions>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                    <div style={{ display: 'flex', gap: "0.5em", flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                        <Button 
                            style={{alignSelf: "flex-start"}}
                            content={t('global.permalink')}
                            icon={showCopied ? 'green chain' : 'chain'}
                            
                            onClick={() => copyPermalink()} />
                            
                        <Button style={{alignSelf: "flex-end"}} content={t('global.load_default_settings')} onClick={() => setCurrent(DefaultBetaTachyonSettings)} />
                    </div>
                    <div style={{ display: 'flex', gap: "0.5em", flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                        {/* <BetaTachyonPresets activeSettings={innerSettingsToSettings()} setActiveSettings={setCurrent} /> */}
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                            <Button 
                                    style={{alignSelf: "flex-end"}}
                                    color='blue'
                                    content={t('global.save')}
                                    onClick={() => confirmSelection()} />
                            <Button style={{alignSelf: "flex-end"}} content={t('global.cancel')} onClick={closeModal} />

                        </div>
                    </div>
                </div>
			</Modal.Actions>
		</Modal>		
	);

    function renderGrid(): JSX.Element {                       

        const rowStyle = {
            display: "flex",
            flexDirection: "row",
            justifyContent: "left",
            alignItems: "center"
        } as React.CSSProperties;

        const textStyle = {
            width: "110px",
            textAlign: 'right',
            margin: "0.5em",
            marginLeft: 0
        } as React.CSSProperties;

        const inputStyle = {
            width: "110px",
            margin: "0.5em",
            textAlign: 'left',
            padding: "0.5em 1em"
        }

        return <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "stretch",
            alignItems: "center",
            textAlign: 'left',
            overflowY: 'auto',
            maxHeight: '40em'
        }}>
                <div style={rowStyle}>
                    <div style={textStyle}>{t('global.name')} ({t('global.optional')}):</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.name}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, name: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.magic')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.magic}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, magic: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.improved')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.improved}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, improved: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.groupSparsity')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.groupSparsity}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, groupSparsity: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.power')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.power}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, power: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.citeEffort')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.citeEffort}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, citeEffort: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.antimatter')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.antimatter}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, antimatter: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.quipment')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.quipment}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, quipment: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.portal')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.portal}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, portal: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.never')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.never}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, never: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.retrieval')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.retrieval}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, retrieval: value })}>
                    </Input>                        
                </div>
    
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.collections')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.collections}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, collections: value })}>
                    </Input>                        
                </div>
               
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.skillRare')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.skillRare}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, skillRare: value })}>
                    </Input>                        
                </div>
    
                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.score')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.score}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, score: value })}>
                    </Input>                        
                </div>

                <div style={rowStyle}>
                    <div style={textStyle}>{t('cite_opt.btp.settings.triplet')}:</div>
                    <Input
                        style={inputStyle}
                        placeholder="Value"
                        value={innerSettings.triplet}
                        onChange={(e, { value }) => setCurrent({ ... innerSettings, triplet: value })}>
                    </Input>                        
                </div>
        
            </div>
    }

    function copyPermalink() {
        let url = settingsToPermalink(innerSettingsToSettings());
        if (typeof navigator?.clipboard !== 'undefined') {
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
    function innerSettingsToSettings() {
        return {
            name: innerSettings.name,
            improved: Number.parseFloat(innerSettings.improved as string),
            power: Number.parseFloat(innerSettings.power as string),
            citeEffort: Number.parseFloat(innerSettings.citeEffort as string),
            antimatter: Number.parseFloat(innerSettings.antimatter as string),
            portal: Number.parseFloat(innerSettings.portal as string),
            never: Number.parseFloat(innerSettings.never as string),
            collections: Number.parseFloat(innerSettings.collections as string),
            skillRare: Number.parseFloat(innerSettings.skillRare as string),
            score: Number.parseFloat(innerSettings.score as string),
            triplet: Number.parseFloat(innerSettings.triplet as string),
            magic: Number.parseFloat(innerSettings.magic as string),
            retrieval: Number.parseFloat(innerSettings.retrieval as string),
            quipment: Number.parseFloat(innerSettings.quipment as string),
            groupSparsity: Number.parseFloat(innerSettings.groupSparsity as string),
        } as BetaTachyonSettings;
    }
	function confirmSelection(): void {		
		config.setCurrent(innerSettingsToSettings());
        setModalIsOpen(false);
	}
};


export default BetaTachyonSettingsPopup;
