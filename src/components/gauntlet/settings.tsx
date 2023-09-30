import React from 'react';
import { Modal, Input, Button } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { OptionsBase } from '../base/optionsmodal_base';

export interface InternalSettings {    
    crit5: number | string;
    crit25: number | string;
    crit45: number | string;
    crit65: number | string;
    minWeight: number | string;
    maxWeight: number | string;
}

export interface GauntletSettings extends InternalSettings {    
    crit5: number;
    crit25: number;
    crit45: number;
    crit65: number;
    minWeight: number;
    maxWeight: number;
}

export interface GauntletSettingsConfig {
	current: GauntletSettings;
	setCurrent: (value: GauntletSettings) => void;
	defaultOptions: GauntletSettings;
}

export interface GauntletSettingsProps {	
    config: GauntletSettingsConfig;    
	renderTrigger?: () => JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;
};

export const crit65 = 2;
export const crit45 = 1.85;
export const crit25 = 1.45;
export const crit5 = 1;

export const defaultSettings = {
	crit5,
	crit25,
	crit45,
	crit65,
	minWeight: 1,
	maxWeight: 1
} as GauntletSettings;

const GauntletSettingsPopup = <T extends OptionsBase>(props: GauntletSettingsProps) => {
	const context = React.useContext(GlobalContext);
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
			size='mini'
			closeIcon
		>
			<Modal.Header>
                <React.Fragment>
                    Advanced Gauntlet Settings
                </React.Fragment>
			</Modal.Header>
			<Modal.Content scrolling>
				{renderGrid()}
			</Modal.Content>
			<Modal.Actions>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                    {/* <Button 
                            style={{alignSelf: "flex-start"}}
                            content={`Permalink`}
                            icon='chain'
                            onClick={() => copyPermalink()} />
                            {showCopied && <div style={{margin: "0 0.5em"}}>Link copied to clipboard!</div>} */}
                        <Button style={{alignSelf: "flex-end"}} content='Load Defaults' onClick={() => setCurrent(defaultSettings)} />
                        </div>
                    <div>
                        <Button 
                                style={{alignSelf: "flex-end"}}
                                color='blue'
                                content={`Save`}
                                onClick={() => confirmSelection()} />
                        <Button style={{alignSelf: "flex-end"}} content='Cancel' onClick={closeModal} />

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
            alignItems: "center",
            overflowY: 'auto',
            maxHeight: '15em'
        }}>
                <div style={rowStyle}>
                <div style={textStyle}>5% Crit Multiplier:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit5}
                    onChange={(e, { value }) => setCurrent({ ... innerSettings, crit5: value })}>
                </Input>                        
                </div>
                <div style={rowStyle}>
                <div style={textStyle}>25% Crit Multiplier:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit25}
                    onChange={(e, { value }) => setCurrent({ ... innerSettings, crit25: value })}>
                </Input>                        
                </div>
                <div style={rowStyle}>
                <div style={textStyle}>45% Crit Multiplier:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit45}
                    onChange={(e, { value }) => setCurrent({ ... innerSettings, crit45: value })}>
                </Input>                        
                </div>
                <div style={rowStyle}>
                <div style={textStyle}>65% Crit Multiplier:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.crit65}
                    onChange={(e, { value }) => setCurrent({ ... innerSettings, crit65: value })}>
                </Input>                        
                </div>
                <div style={rowStyle}>
                <div style={textStyle}>Proficiency Min Multiplier:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.minWeight}
                    onChange={(e, { value }) => setCurrent({ ... innerSettings, minWeight: value })}>
                </Input>                        
                </div>
                <div style={rowStyle}>
                <div style={textStyle}>Proficiency Max Multiplier:</div>
                <Input
                    style={inputStyle}
                    placeholder="Value"
                    value={innerSettings.maxWeight}
                    onChange={(e, { value }) => setCurrent({ ... innerSettings, maxWeight: value })}>
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
            Advanced Settings
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
        });
        setModalIsOpen(false);
	}
};


export default GauntletSettingsPopup;
