import React from 'react';
import { Modal, Input, Button, Table } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { BetaTachyonSettings } from '../../model/worker';
import { ConstituentWeights, CurrentWeighting } from '../../model/crew';
import { OptionsPanelFlexColumn } from '../stats/utils';
import { RarityFilter } from './commonoptions';
import { Slider } from '../base/slider';

export interface WeightingInfoProps {
    config?: CurrentWeighting;
    saveConfig?: (rarity: number, value: ConstituentWeights) => void,
    editable?: boolean;
    rarity?: number;
	renderTrigger?: () => JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;
};

const WeightingInfoPopup = (props: WeightingInfoProps) => {
	const inputRef = React.createRef<Input>();
	const globalContext = React.useContext(GlobalContext);

    const { current_weighting } = globalContext.core;
    const { t, tfmt } = globalContext.localized;
	const { saveConfig, config: inputConfig } = props;

    const editable = !!props.editable && !!saveConfig;

    const [modalIsOpen, setModalIsOpen] = React.useState(false);

    // const [showCopied, setShowCopied] = React.useState(false);

    const [rarity, setRarity] = React.useState(props?.rarity ?? 5);
    const [weighting, setWeighting] = React.useState<ConstituentWeights | undefined>(undefined);

    const config = React.useMemo(() => {
        if (!inputConfig) return globalContext.core.current_weighting;
        else return inputConfig;
    }, [inputConfig, current_weighting]);

    React.useEffect(() => {
        setWeighting({ ...config[rarity] });
    }, [rarity, config]);

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

    const flexCol = OptionsPanelFlexColumn;

	return (
		<Modal
			open={modalIsOpen}
			onClose={closeModal}
			onOpen={() => setModalIsOpen(true)}
			trigger={props.renderTrigger ? props.renderTrigger() : renderDefaultTrigger()}
			size={!editable ? 'tiny' : 'small'}
			closeIcon
		>
			<Modal.Header>
                <React.Fragment>
                    {t('ranking_tools.current_weighting')}
                </React.Fragment>
			</Modal.Header>
			<Modal.Content scrolling>
                <div style={{...flexCol, gap: '1em', width: '100%', alignItems: 'flex-start'}}>
                    {!props.rarity &&
                        <div style={{fontSize: '1.2em', textAlign:'left', gap:'0.5em', display: 'flex', flexDirection: 'row'}}>
                            <b>{t('base.rarity') + t('global.colon')}</b>&nbsp;
                            <RarityFilter
                                selection={false}
                                clearable={false}
                                multiple={false}
                                rarityFilter={[rarity]}
                                setRarityFilter={((value) => {
                                    setRarity(value?.length ? value[0] : 5);
                                })}
                            />
                        </div>}
                    {renderGrid()}
                </div>
			</Modal.Content>
			<Modal.Actions>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                    <div style={{ display: 'flex', gap: "0.5em", flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                        {!!editable && <Button style={{alignSelf: "flex-end"}} content={t('global.load_default_settings')} onClick={() => setWeighting({ ... config[rarity] })} />}
                    </div>
                    <div style={{ display: 'flex', gap: "0.5em", flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end'}}>

                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                            {!!editable && <Button
                                    style={{alignSelf: "flex-end"}}
                                    color='blue'
                                    content={t('global.save')}
                                    onClick={() => confirmSelection()} />}

                            <Button style={{alignSelf: "flex-end"}} content={t(`global.${editable ? 'cancel' : 'close'}`)} onClick={closeModal} />
                        </div>
                    </div>
                </div>
			</Modal.Actions>
		</Modal>
	);

    function renderGrid(): JSX.Element {

        const titleStyle = {
            fontSize: '1.2em',
            fontWeight: 'bold',
            textAlign: 'left',
            margin: "0.25em 2em",
        } as React.CSSProperties;

        const textStyle = {
            textAlign: 'left',
            margin: "0.5em 2em",
        } as React.CSSProperties;

        const inputStyle = {
            width: "130px",
            margin: "0.5em",
            textAlign: 'left',
            padding: "0.5em 1em"
        } as React.CSSProperties;

        const weightKeys = weighting ? Object.keys(weighting).filter(f => typeof weighting[f] === 'number') : undefined;
        if (!editable) weightKeys?.sort((a, b) => weighting![b] - weighting![a]);
        else weightKeys?.sort((a, b) => a.localeCompare(b));
        return (
            <Table striped>
                {!!weightKeys && !!weighting && weightKeys.map((key) => {
                    return (<Table.Row key={`WeightingRow_${key}`}>
                        <Table.Cell>
                            <div style={titleStyle}>
                                {t(`rank_names.scores.${key}`)}
                            </div>
                        </Table.Cell>
                        <Table.Cell>
                            {!!editable && <Input
                                style={inputStyle}
                                placeholder="Value"
                                value={weighting[key]}
                                onChange={(e, { value }) => setWeighting({ ... weighting, [key]: value })}>
                            </Input>}
                            {!!editable && <div>
                                <Slider
                                    key={`WeightingRow_${key}_slider`}
                                    hideValue
                                    min={0}
                                    max={10}
                                    width={400}
                                    stepSize={0.01}
                                    value={weighting[key]}
                                    onChange={(value) => setWeighting({ ... weighting, [key]: value })}
                                />
                            </div>}
                            {!editable && <div style={textStyle}>
                                {t('global.n_%', { n: `${Number((weighting[key] * 100).toFixed(3))}` })}
                            </div>}
                        </Table.Cell>
                    </Table.Row>)
                })}
            </Table>
        )
    }

	function closeModal(): void {
		if (props.setIsOpen) props.setIsOpen(false);
		setModalIsOpen(false);
	}

	function renderDefaultTrigger(): JSX.Element {
		return (
        <Button>
            {t('ranking_tools.show_weighting_details')}
        </Button>
		);
	}

	function confirmSelection(): void {
		if (!!weighting && editable && !!saveConfig) {
            saveConfig(rarity, weighting);
        }
        setModalIsOpen(false);
	}
};


export default WeightingInfoPopup;
