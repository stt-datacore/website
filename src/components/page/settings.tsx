import React from 'react';
import { Modal, Input, Button, Icon, Grid, Checkbox } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { OptionsBase } from '../base/optionsmodal_base';
import { NavItem, getAllOptions, settingsToPermalink } from './util';

export interface NavigationSettingsConfig {
	current: string[];
	setCurrent: (value: string[]) => void;
	defaultOptions: string[];
    maxItems: number;

	mobileCurrent: string[];
	setMobileCurrent: (value: string[]) => void;
	defaultMobileOptions: string[];
    maxItemsMobile: number;

    menu: NavItem[];
}

export interface NavigationSettingsProps {

    config: NavigationSettingsConfig;
	renderTrigger?: () => React.JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;

};

const NavigationSettings = <T extends OptionsBase>(props: NavigationSettingsProps) => {
	const context = React.useContext(GlobalContext);
	const { config } = props;
	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const inputRef = React.createRef<Input>();

    const [workConf, setWorkConf] = React.useState(config);

    const menuItems = getAllOptions(config.menu);

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

    const setMobileCurrent = (current: string[]) => {
        setWorkConf({ ... workConf, mobileCurrent: current });
    }


    const setCurrent = (current: string[]) => {
        setWorkConf({ ... workConf, current: current });
    }

    const toggleOption = (value: boolean, option: string, mobile: boolean) => {
        if (mobile) {
            if (!value && workConf.mobileCurrent.includes(option)) {
                setMobileCurrent(workConf.mobileCurrent.filter(f => f !== option) ?? []);
            }
            else if (value && workConf.mobileCurrent.length < workConf.maxItemsMobile) {
                setMobileCurrent([...workConf.mobileCurrent, option]);
            }
        }
        else {
            if (!value && workConf.current.includes(option)) {
                setCurrent(workConf.current.filter(f => f !== option) ?? []);
            }
            else if (value && workConf.current.length < workConf.maxItems) {
                setCurrent([...workConf.current, option]);
            }
        }
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
                    Menu Settings
                </React.Fragment>
			</Modal.Header>
			<Modal.Content scrolling>
				{renderGrid()}
			</Modal.Content>
			<Modal.Actions>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                    <Button
                            style={{alignSelf: "flex-start"}}
                            content={`Permalink`}
                            icon='chain'
                            onClick={() => copyPermalink()} />
                            {showCopied && <div style={{margin: "0 0.5em"}}>Link copied to clipboard!</div>}
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

    function renderGrid(): React.JSX.Element {

        const opts = [workConf.current, workConf.mobileCurrent];
        const maxes = [workConf.maxItems, workConf.maxItemsMobile];
        const titles = ['Menu Options', 'Mobile Menu Options'];

        return <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "stretch",
            alignItems: "center",
            overflowY: 'auto',
            maxHeight: '15em'
        }}>
                {opts.map((current, idx) =>
                    <React.Fragment key={'page_setting_menu_option'+idx.toString()}>
                    <h4>{titles[idx]}</h4>
                    <Grid style={{margin: 0, padding:0}}>

                    {menuItems.map((item, navIdx) => {
                        return (
                            <Grid.Row style={{margin: 0, padding:0}} key={'page_setting_menu_option_item'+idx.toString()+navIdx.toString()}>

                            <div style={{
                                display:"flex",
                                flexDirection: "row",
                                justifyContent: "flex-start",
                                alignItems: "center",
                                textAlign: 'left'
                            }}>

                                <Checkbox checked={!!item.optionKey && current.includes(item.optionKey)}
                                    disabled={current.length >= maxes[idx] && !!item.optionKey && !current.includes(item.optionKey)}
                                    onChange={(e, { checked }) => toggleOption(checked ?? false, item.optionKey ?? '', idx === 1)}
                                    />
                                <div style={{width:"36px", margin:"0 0.5em", display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                {!!item.icon && <Icon name={item.icon} size='small' />}
                                {!!item.src && <img src={item.src} style={{height: '24px' }} />}
                                </div>
                                <div style={{ margin: "1em 0" }}>
                                    {item.title ?? item.tooltip}
                                </div>

                            </div>
                            </Grid.Row>
                        )
                    })}
                    </Grid>
                </React.Fragment>)}
            </div>
    }

    function copyPermalink() {
        let url = settingsToPermalink(workConf.current, workConf.mobileCurrent);
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

	function renderDefaultTrigger(): React.JSX.Element {
		return (
        <Button color='blue' fluid>
            Menu Options
        </Button>
		);
	}

	function confirmSelection(): void {
		config.setCurrent(workConf.current);
        config.setMobileCurrent(workConf.mobileCurrent);
        setModalIsOpen(false);
	}
};


export default NavigationSettings;
