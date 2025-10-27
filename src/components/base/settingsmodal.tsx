import React from 'react';
import { Modal, Input, Button, Dropdown, DropdownItemProps } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { PromptContext } from '../../context/promptcontext';

export interface SettingsConfigBase {
    title: string,
    field: string,
    qs_param?: string;
}

export interface SettingsFieldConfig extends SettingsConfigBase {
    validate?: ((value: any) => boolean) | 'number' | 'required' | 'required_number';
    fieldType?: 'number' | 'string' | 'boolean';
    defaultValue?: any;
}

export interface SettingsValue extends SettingsConfigBase {
    value: any;
}

export interface SettingsStateField extends SettingsFieldConfig, SettingsValue {
    validate: (value: any) => boolean;
}

interface EditObject {
    name: string;
    is_custom?: boolean;
    [key: string]: any;
}

type InternalSettings = EditObject;

export interface SettingsModalConfig {
	current: EditObject;
	setCurrent: (value: EditObject) => void;
	defaultOptions: EditObject;
}

export interface SettingsModalProps {
    presets: EditObject[];
    page: string;
    updatePresets: (value: EditObject[]) => void;
    config: SettingsModalConfig;
    fields: SettingsFieldConfig[];
	renderTrigger?: () => JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;
};

export function settingsToPermalink(page: string, settings: EditObject, fields: SettingsConfigBase[]) {
    let params = new URLSearchParams();
    for (let field of fields) {
        let value = settings[field.field];
        if (value) {
            let qs = field.qs_param ?? field.field;
            params.set(qs, value.toString());
        }
    }
    let host = "";
    if (!globalThis.window) host = (process.env.GATSBY_DATACORE_URL ?? "") as string;
    else host = globalThis.window.location.origin + "/";
    return `${host}${page}?${params.toString()}`;
}

export function permalinkToSettings(fields: SettingsFieldConfig[]) {
    if (!globalThis.window) return undefined;
    let params = new URLSearchParams(globalThis.window.location.search);
    if (!params.size) return undefined;

    let newConfig = {} as EditObject;
    for (let field of fields) {
        let qs = field.qs_param ?? field.field;
        let value = params.get(qs) as any;
        if (value) {
            if (field.fieldType === 'number') {
                value = Number(value);
            }
            else if (field.fieldType === 'boolean') {
                if (value.toLowerCase() === 'true' || value.toLowerCase() === 'yes') {
                    value = true;
                }
                else {
                    value = false;
                }
            }
            newConfig[field.field] = value;
        }
    }
    return newConfig;
}


export function createNewSettings(name: string, fields: SettingsFieldConfig[], existing?: EditObject): EditObject {

    let obj = {
        ...existing,
        name,
        is_custom: true
    } as any;
    for (let field of fields) {
        if (obj[field.field] === undefined && field.defaultValue) {
            obj[field.field] = field.defaultValue;
        }
    }
    return obj;
}

export function getNewSettingsName(presets: EditObject[], base = 'New Preset') {
    base ??= 'New Preset';
    let name = base.trim();
    let x = 1;
    while (presets.some(p => p.name.toLowerCase()?.trim() === name.toLowerCase())) {
        name = `${base} (${x++})`;
    }
    return name;
}

export function mergePresets(presets: EditObject[], newpresets: EditObject[], defaultPresets?: EditObject[]) {
    let merged = [...presets, ...newpresets];
    merged = merged.filter(f => f.is_custom && !defaultPresets?.some(d => d.name.toLowerCase().trim() === f.name.toLowerCase().trim()));
    for (let p of merged) {
        p.name = p.name.trim();
        let testmerge = merged.filter(m => m != p);
        if (testmerge.some(m => m.name.toLowerCase().trim() === p.name.toLowerCase().trim())) {
            p.name = getNewSettingsName(testmerge, p.name);
        }
    }
    merged = merged.filter((m, idx) => merged.findIndex(m2 => m.name.toLowerCase() === m2.name.toLowerCase()) === idx);
    return defaultPresets?.concat(merged) ?? merged;
}

function makeDefaultObject(fields: SettingsFieldConfig[]) {
    const obj = {
        name: '',
        is_custom: false
    } as any;

    for (let field of fields) {
        if (field.defaultValue) {
            obj[field.field] ??= structuredClone(field.defaultValue);
        }
        else if (field.fieldType === 'number') {
            obj[field.field] ??= 0;
        }
        else if (field.fieldType === 'boolean') {
            obj[field.field] ??= false;
        }
        else {
            obj[field.field] ??= '';
        }
    }
    return obj as EditObject;
}

const SettingsEditorModal = (props: SettingsModalProps) => {
	const globalContext = React.useContext(GlobalContext);
    const promptContext = React.useContext(PromptContext);
    const { t, tfmt } = globalContext.localized;
    const { confirm } = promptContext;
	const { config, presets, updatePresets, page, fields } = props;
	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const inputRef = React.createRef<Input>();
    const [innerSettings, setInnerSettings] = React.useState<InternalSettings>({ ... makeDefaultObject(fields), ... config.current });
    const [showCopied, setShowCopied] = React.useState(false);

	React.useEffect(() => {
		if (modalIsOpen) inputRef.current?.focus();
	}, [modalIsOpen]);

	React.useEffect(() => {
		if (props.isOpen !== undefined && props.isOpen) {
			setModalIsOpen(true);
		}
	}, [props.isOpen]);

    const presetChoices = React.useMemo(() => {
        let col = presets.map(p => {
            return {
                key: `${p.name}+preset`,
                value: p.name,
                text: p.name
            } as DropdownItemProps;
        });
        col.push({
            key: `_new`,
            value: `_new`,
            text: t('global.new') + " ..."
        })
        return col;
    }, [presets]);

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

                        <Button disabled={!innerSettings.is_custom} style={{alignSelf: "flex-end"}} content={t('global.load_default_settings')} onClick={() => applyDefaults()} />
                    </div>
                    <div style={{ display: 'flex', gap: "0.5em", flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                        <div style={{marginBottom: '1em'}}>
                            <Dropdown
                                options={presetChoices}
                                value={innerSettings.name}
                                placeholder={t('global.presets')}
                                onChange={(e, { value }) => selectPreset(value as string)}
                                />
                        </div>
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
        const defaultObj = makeDefaultObject(fields);
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
        const nameStyle = {
            ...inputStyle,
            width: '200px'
        }
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "stretch",
                alignItems: "center",
                textAlign: 'left',
                overflowY: 'auto',
                maxHeight: '40em'
            }}>
                {Object.keys(defaultObj).map((key) => {
                    let field = fields.find(f => f.field === key);
                    if (!field) return (<React.Fragment key={`null_${key}`}></React.Fragment>);
                    let disabled = false;
                    if (key === 'is_custom') return <></>;
                    if (!innerSettings['is_custom']) disabled = true;
                    return (
                        <div style={rowStyle} key={`${page}_setting_${key}`}>
                            <div style={textStyle}>{field.title}:</div>
                            <Input
                                disabled={disabled}
                                style={key === 'name' ? nameStyle : inputStyle}
                                placeholder="Value"
                                value={innerSettings[key]}
                                onChange={(e, { value }) => setCurrent({ ... innerSettings, [key]: value })}>
                            </Input>
                        </div>
                    );
                })}
            </div>
        )
    }

    function copyPermalink() {
        let url = settingsToPermalink(page, innerSettingsToSettings(), fields);
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

    function setCurrent(current: InternalSettings) {
        Object.keys(current).forEach((key) => {
            current[key] = `${current[key]}`;
        })
        setInnerSettings(current);
    }

    function innerSettingsToSettings() {
        let custom = innerSettings.is_custom?.toString()?.trim()?.toLowerCase();
        let yes = t('global.yes').toLowerCase();
        let no = t('global.no').toLowerCase();
        let isCustom = custom === 'true' || custom === yes;
        let obj = {
            name: innerSettings.name,
            is_custom: isCustom,
        } as EditObject;
        for (let field of fields) {
            if (field.fieldType === 'number') {
                obj[field.field] = Number.parseFloat(innerSettings[field.field]);
            }
            else if (field.fieldType === 'boolean') {
                obj[field.field] = [yes, 'yes', 'true'].includes(innerSettings[field.field].toLowerCase());
            }
            else {
                obj[field.field] = innerSettings[field.field];
            }
        }
        return obj;
    }

	function confirmSelection(): void {
        if (innerSettings.is_custom) {
            let preset = presets.find(f => f.name?.toLowerCase() === innerSettings?.name.toLowerCase());
            if (!preset) {
                updatePresets([...presets, innerSettingsToSettings()]);
            }
            else {
                confirm({
                    title: t('overwrite.title'),
                    message: t('overwrite.prompt_x', { x: preset.name }),
                    onClose: (confirm) => {
                        if (confirm) {
                            let presetIdx = presets.findIndex(f => f.name?.toLowerCase() === innerSettings?.name.toLowerCase());
                            if (presetIdx != -1) {
                                presets[presetIdx] = innerSettingsToSettings();
                            }
                            else {
                                presets.push(innerSettingsToSettings());
                            }
                            updatePresets([...presets]);
                            config.setCurrent(innerSettingsToSettings());
                            setModalIsOpen(false);
                        }
                    }
                });
                return;
            }
        }
		config.setCurrent(innerSettingsToSettings());
        setModalIsOpen(false);
	}

    function applyDefaults() {
        setCurrent({
            ...makeDefaultObject(fields),
            name: innerSettings.name,
            is_custom: true
        });
    }

    function selectPreset(value: string) {
        if (value === '_new') {
            setCurrent(
                createNewSettings(
                    getNewSettingsName(presets), fields, innerSettingsToSettings()
                )
            );
        }
        else {
            let settings = presets.find(f => f.name === value);
            if (settings) setCurrent(settings);
        }
    }
};

export default SettingsEditorModal;
