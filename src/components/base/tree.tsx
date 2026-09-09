import React, { JSX } from "react";
import { Button, Icon, Popup } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { TranslateMethod } from "../../model/player";
import { decamelify } from "../../utils/misc";


export interface TreeAccessor {
    render?: (value: any, path: string, open: boolean, config: TreeAccessor) => React.ReactNode;
    renderChild?: (value: any, path: string, config: TreeAccessor) => React.ReactNode;
    renderContent?: (value: any, path: string, config: TreeAccessor) => React.ReactNode;
    click?: (value: any, path: string, config: TreeAccessor) => void;
    renderLabel?: (value: string) => string | React.ReactNode;
    labelWidth?: string;
    isOpen?: boolean;
}

export interface TreeAccessorEntry {
    [key:string]: TreeAccessor | TreeAccessorEntry;
}

export interface TreeComponentProps {
    data: any[];
    config?: TreeAccessorEntry[];
    rootLabel?: (key: string, data?: any) => string | React.ReactNode;
    keyRenderer?: (key: string, data?: any) => string | React.ReactNode;
    dataRenderer?: (key: string, data?: any) => string | React.ReactNode;
    clickNode?: (key: string, data?: any) => void;
    t?: TranslateMethod;
}

export const StandardTreeComponent = (props: TreeComponentProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { data, config, rootLabel, keyRenderer, clickNode } = props;

    const [headsOpen, setHeadsOpen] = React.useState({} as {[key:string]: boolean});

    return (<div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%'}}>
        {data.map((d, idx) => {
            return (
                <div key={`__tree_root_key_${idx}`}
                    style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '0.5em'
                    }}>
                    <Popup
                        trigger={
                            <Button icon onClick={() => jsonClip(d)} style={{margin: '1em 0'}}>
                                <Icon name='clipboard' />
                            </Button>
                        }
                        content={t('clipboard.copy')}
                        />
                        <Button icon onClick={() => setHeadsOpen({})} style={{margin: '1em 0'}}>
                            <Icon name='minus' />
                        </Button>
                    </div>
                    {renderNode(d, `${idx}`, config ? config[idx] : undefined)}
                </div>
            )
        })}
    </div>);

    function jsonClip(obj: any) {
        let json = JSON.stringify(obj, null, 4);
        if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(json);
        }
    }

    function renderNode(obj: any, path: string = "", config?: TreeAccessorEntry) {
        let heads = Object.keys(obj);
        let jout = [] as React.ReactNode[];
        let accessor: TreeAccessor | TreeAccessorEntry | undefined = config;
        for(let key of heads) {
            let value = obj[key];
            let newpath: string;
            if (path) newpath = `${path}.${key}`;
            else newpath = key;
            let child_accessor: TreeAccessor | TreeAccessorEntry | undefined = config ? config[path] : undefined;

            if (config && config[key]) {
                child_accessor = config[key];
                if ("render" in child_accessor && typeof child_accessor.render === 'function') {
                    jout.push(child_accessor.render(value, newpath, !!child_accessor.isOpen || !!headsOpen[newpath], child_accessor));
                    continue;
                }
            }
            let dtest = typeof value === 'string' ? new Date(value) : 'invalid date';

            if (dtest.toString().toLowerCase() !== 'invalid date') value = dtest;
            if (typeof value === 'boolean') {
                value = decamelify(`${value}`)
            }
            if (!value || typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint' || typeof value === 'boolean' || value instanceof Date) {
                if (accessor && "renderChild" in accessor && typeof accessor.renderChild === 'function') {
                    jout.push(accessor.renderChild(value, newpath, accessor));
                    continue;
                }
                const nodeClick = child_accessor && "click" in child_accessor && typeof child_accessor.click === 'function' ? child_accessor.click : clickBody;
                const pathLabel = (keyRenderer && keyRenderer(newpath, value)) || (((child_accessor && "renderLabel" in child_accessor && typeof child_accessor.renderLabel === 'function' && child_accessor.renderLabel(newpath)) || defaultPathText(newpath)));
                const renderedValue = (child_accessor && "renderContent" in child_accessor && typeof child_accessor.renderContent === 'function' && child_accessor.renderContent(value, newpath, child_accessor)) || ((props.dataRenderer && props.dataRenderer(newpath, value)) || value?.toString());

                jout.push(
                    <div style={{
                        margin: '0.5em 0',
                        display: 'grid',
                        gridTemplateAreas: `'dropper key content'`,
                        gridTemplateColumns: `24px ${child_accessor?.labelWidth ? child_accessor.labelWidth : '10em'} auto`,
                        alignItems: 'center',
                        gap: '0em',
                        justifyContent: 'flex-start'
                    }}
                        onClick={() => {
                            if (child_accessor) {
                                nodeClick(value, newpath, child_accessor);
                            }
                        }}
                    >
                        <div style={{gridArea: 'dropper'}}>
                            &nbsp;
                        </div>
                        <div style={{gridArea: 'key'}}>
                            {pathLabel}
                        </div>
                        <div style={{gridArea: 'content'}}>
                            {renderedValue}
                        </div>
                    </div>
                )
            }
            else if (typeof value === 'object' || Array.isArray(value)) {
                if (accessor && "renderChild" in accessor && typeof accessor.renderChild === 'function') {
                    jout.push(accessor.renderChild(value, newpath, child_accessor as TreeAccessor))
                }
                else {
                    let subobj = renderNode(value, newpath, child_accessor as TreeAccessorEntry | undefined);
                    jout.push(subobj);
                }
            }
        }
        const isOpen = headsOpen[path];
        const pathLabel = (rootLabel && rootLabel(path, obj)) || (((accessor && "renderLabel" in accessor && typeof accessor.renderLabel === 'function' && accessor.renderLabel(path)) || (props.keyRenderer && props.keyRenderer(path, obj)) || defaultPathText(path)));
        const nodeClick = accessor && "click" in accessor && typeof accessor.click === 'function' ? accessor.click : clickHead;

        return (<>
            <div style={{
                margin: '0.5em 0',
                display: 'grid',
                gridTemplateAreas: `'dropper content'`,
                gridTemplateColumns: `24px auto`,
                alignItems: 'center',
                justifyContent: 'flex-start'
            }}>
                <div style={{
                    gridArea: 'dropper',
                    cursor: 'pointer'
                    }}
                    onClick={() => {
                        if (accessor) {
                            let prev = !!accessor?.isOpen;
                            nodeClick(obj, path, accessor)
                            let aft = !!accessor.isOpen;
                            if (prev !== aft) {
                                clickHead(obj, path);
                            }
                        }
                        else {
                            clickHead(obj, path)
                        }
                    }}
                    >
                    <Icon name={isOpen ? 'arrow circle down' : 'arrow circle right'} color={isOpen ? 'green' : undefined}  />
                </div>
                <div>
                    {pathLabel}
                </div>
            </div>
            <div style={{marginLeft: '2em'}}>
                {isOpen && jout.reduce((p, n) => p ? <>{p}{n}</> : <>{n}</>, undefined as React.ReactNode | undefined)}
            </div>
        </>);
    }

    function defaultPathText(path: string) {
        let parts = path.split(".");
        let key = parts[parts.length - 1];
        return props.t ? props.t(key) : ((t(`base.${key}`)) || t(`global.${key}`) || key);
    }
    function clickHead(obj: any, path: string) {
        let h = {...headsOpen};
        h[path] = !h[path];
        setHeadsOpen(h);
        if (clickNode) {
            clickNode(path, obj);
        }
    }

    function clickBody(obj: any, path: string, config?: TreeAccessor) {
        if (clickNode) {
            clickNode(path, obj);
        }
        if (config?.click && typeof config.click === 'function') {
            config.click(obj, path, config);
        }
    }
}