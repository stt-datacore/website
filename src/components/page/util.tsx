
import { navigate } from 'gatsby';
import React from 'react';
import { Menu, Dropdown, Icon, SemanticICONS } from 'semantic-ui-react';
import { v4 } from 'uuid';
import * as lz from 'lz-string';

export const MaxMenuItems = 5;
export const MaxMobileItems = 4;

export const DefaultOpts = ['crew', 'behold', 'gauntlet', 'voyage', 'fbb'] as string[];
export const DefaultOptsMobile = ['crew', 'gauntlet', 'voyage', 'fbb'] as string[];

export interface NavItem {    
	title?: string,
	link?: string,
	tooltip?: string,
	src?: string,
	right?: boolean;
	icon?: SemanticICONS;
	subMenu?: NavItem[];
	checkVisible?: (data: NavItem) => boolean;
	customAction?: (e: Event, data: NavItem) => void;
	customRender?: (data: NavItem) => JSX.Element;
    sidebarRole?: 'item' | 'heading';
    optionKey?: string;
}

export const renderSubmenuItem = (item: NavItem, title?: string, asDropdown?: boolean) => {
    //const menuKey = title?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();

    if (asDropdown) {
        return (
            <Dropdown.Item key={v4()} onClick={(e) => item.customAction ? item.customAction(e.nativeEvent, item) : navigate(item.link ?? '')}
            >
                <div style={{display: 'flex', flexDirection: 'row', alignItems: "center"}}>
                {!!item.src && <div style={{width:"36px"}}><img src={item.src} style={{height:'24px', margin: "0.5em", padding: 0}} alt={item.tooltip ?? item.title} /></div>}
                {item.title}
                </div>
            </Dropdown.Item>
        )
    }

    return (
        <Menu.Item fitted="horizontally" key={v4()} onClick={(e) => item.customAction ? item.customAction(e.nativeEvent, item) : navigate(item.link ?? '')}
            style={{borderRadius:"6px", paddingLeft:"0.5em", paddingRight:"0.5em"}}
        >
        <div style={{
            display:"flex",
            flexDirection: "row",
            textAlign: "left",
            padding: "0.25em",
            lineHeight:"1.45em", 
            alignItems: "center",
            justifyContent: "flex-start"
        }}>
            {!!item.src && <div style={{width:"36px", marginRight: "1em"}}><img src={item.src} style={{height:'24px', margin: "0.5em", padding: 0}} alt={item.tooltip ?? item.title} /></div>}
            {item.title}
        </div>
    </Menu.Item>
    )
}

export const createSubMenu = (title: string, children: NavItem[], verticalLayout: boolean = false) => {
    //const menuKey = title.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();
    if (verticalLayout) {
        return (
            <React.Fragment>
            {<h3 style={{marginTop:"0.75em"}}>{title}<hr/></h3>}
            {children.map(item => item.customRender ? item.customRender(item) : (renderSubmenuItem(item)))}
            </React.Fragment>
        );
    } else {
        return (
            <Dropdown key={v4()} item simple text={title}>
                <Dropdown.Menu>
                    {children.map(item => {

                        if (item.customRender) return item.customRender(item);
                        return (
                            <Dropdown.Item icon={item.icon} key={v4()} onClick={(e) => item?.customAction ? item.customAction(e.nativeEvent, item) : navigate(item.link ?? '')}>
                                <div style={{display: 'flex', flexDirection: 'row', alignItems: "center"}}>
                                {!!item.src && <div style={{width:"36px"}}><img src={item.src} style={{height:'24px', margin: "0.5em", padding: 0}} alt={item.tooltip ?? item.title} /></div>}
                                {item.title}
                                </div>
                            </Dropdown.Item>
                        )
                    })}
                    
                </Dropdown.Menu>
            </Dropdown>
        );
    }
};

export function drawMenuItem(page: NavItem, idx?: number, dropdown?: boolean) {
    //const menuKey = page.title?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? page.tooltip?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();
    return (
        <Menu.Item key={v4()} style={{ padding: (!!page.src && !page.title) ? "0 0.5em" : "0 1.25em", height: "48px" }} className='link item'  onClick={(e) => page.customAction ? page.customAction(e.nativeEvent, page) : navigate(page.link ?? '')}>
            <div title={page.tooltip ?? page.title} style={{display: 'flex', flexDirection: 'row', justifyContent: "center", alignItems: "center", margin: 0, padding: 0}}>
                {page.src && <img style={{height:'32px', margin: "0.5em", padding: 0}} alt={page.tooltip ?? page.title} src={page.src} />}
                {page.icon && <Icon name={page.icon} size={'large'} />}
                {page.title && <div>{page.title}</div>}
            </div>
        </Menu.Item>)
}

export function getAllOptions(menu: NavItem[]) {
    return menu.map(m => [ ... m.subMenu ?? [], m ]).flat().filter(m => !!m.optionKey && (!!m.icon || !!m.src));
}

export function settingsToPermalink(options: string[], mobileoptions: string[]) {

    let opt = JSON.stringify([ options, mobileoptions ]);
    let b64 = lz.compressToBase64(opt);
    if (typeof document !== 'undefined') {
        return document.location.origin + "?pmc=" + b64;
    }
    else {
        return "?pmc=" + b64;
    }
}

export function parsePermalink(value: string): string[][] | undefined {    
    try {
        let rev = lz.decompressFromBase64(value);
        let opt = JSON.parse(rev);
        if ("length" in opt && opt.length && "length" in opt[0]) return opt;
    }
    catch {
    }
    return undefined;
}