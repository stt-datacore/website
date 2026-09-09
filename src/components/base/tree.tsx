import React, { JSX } from "react";
import { Icon } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";


export interface TreeAccessor {
    render?: (value: any, open: boolean, config: TreeAccessor) => React.ReactNode;
    click?: (value: any, path: string, config: TreeAccessor) => void;
    pathText?: (value: string) => string;
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
    clickNode?: (key: string, data?: any) => void;
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
                    <Icon name='clipboard' onClick={() => jsonClip(d)} />
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
        let accessor: TreeAccessor | TreeAccessorEntry | undefined = config ? config[path] : undefined;
        for(let key of heads) {
            let value = obj[key];
            let newpath: string;
            if (path) newpath = `${path}.${key}`;
            else newpath = key;
            let accessor: TreeAccessor | TreeAccessorEntry | undefined = config ? config[path] : undefined;

            if (config && config[key]) {
                accessor = config[key];
                if ("render" in accessor && typeof accessor.render === 'function') {
                    jout.push(accessor.render(value, !!accessor.isOpen || !!headsOpen[newpath], accessor));
                    continue;
                }
            }
            if (!value || typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint' || typeof value === 'boolean') {
                const nodeClick = accessor && "click" in accessor && typeof accessor.click === 'function' ? accessor.click : clickBody;
                const pathLabel = keyRenderer ? keyRenderer(newpath, value) : ((accessor && "pathText" in accessor && typeof accessor.pathText === 'function' ? accessor.pathText(newpath) : defaultPathText(newpath)));
                jout.push(
                    <div style={{
                        margin: '0',
                        display: 'grid',
                        gridTemplateAreas: `'dropper key content'`,
                        gridTemplateColumns: `24px ${accessor?.labelWidth ? accessor.labelWidth : '10em'} auto`,
                        alignItems: 'center',
                        gap: '0em',
                        justifyContent: 'flex-start'
                    }}
                        onClick={() => {
                            if (accessor) {
                                nodeClick(value, newpath, accessor);
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
                            {value}
                        </div>
                    </div>
                )
            }
            else if (typeof value === 'object' || Array.isArray(value)) {
                let subobj = renderNode(value, newpath, accessor as TreeAccessorEntry | undefined);
                jout.push(subobj);
            }
        }
        const isOpen = headsOpen[path];
        const pathLabel = path === '' ? (rootLabel ? rootLabel(path, obj) : t('global.root')) : ((accessor && "pathText" in accessor && typeof accessor.pathText === 'function' ? accessor.pathText(path) : defaultPathText(path)));
        const nodeClick = accessor && "click" in accessor && typeof accessor.click === 'function' ? accessor.click : clickHead;

        return (<>
            <div style={{
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
                    <Icon name={isOpen ? 'arrow circle down' : 'arrow circle right'} size='small' />
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
        return parts[parts.length - 1];
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