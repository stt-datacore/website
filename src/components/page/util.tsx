
import { navigate } from 'gatsby';
import React from 'react';
import { Menu, Dropdown, Icon, SemanticICONS, DropdownItem, DropdownMenu, Container } from 'semantic-ui-react';
import { v4 } from 'uuid';
import * as lz from 'lz-string';

export const MaxMenuItems = 5;
export const MaxMobileItems = 4;

export const DefaultOpts = ['crew', 'behold', 'gauntlet', 'voyage', 'fbb'] as string[];
export const DefaultOptsMobile = ['crew', 'gauntlet', 'voyage', 'fbb'] as string[];

export interface NavItem {
	title?: string | JSX.Element,
    textTitle?: string,
	link?: string,
	tooltip?: string,
	src?: string,
	right?: boolean;
	icon?: SemanticICONS;
	subMenu?: NavItem[];
	checkVisible?: (data: NavItem) => boolean;
	customAction?: (e: Event, data: NavItem) => void;
	customRender?: (data: NavItem) => JSX.Element;
    sidebarRole?: 'item' | 'heading' | 'separator';
    optionKey?: string;
}

export const renderColumnsMenu = (menu: NavItem, columns: number = 2) => {
    return (
        <Dropdown key={v4()} text={menu.title as string} item simple direction='left'>
            {menu.subMenu && (
                <Menu>
                    <Container fluid>
                        <div style={{ columns, columnGap: '1px' }}>
                            {menu.subMenu.map(item => renderColumnsSubmenuItem(item))}
                        </div>
                    </Container>
                </Menu>
            )}
        </Dropdown>
    );
};

// Similar to renderSubmenuItem, with tweaks to look better in columns
//	Only used by renderColumnsMenu
const renderColumnsSubmenuItem = ((item: NavItem) => {
    // Set border to 0 to avoid weird shifting when hovering over some items
    return (
        <Menu.Item key={v4()} onClick={(e) => item.link && navigate(item.link)}
            style={{border:"0"}}
        >
            <div style={{
                display:"flex",
                flexDirection: "row",
                textAlign: "left",
                padding: "0.25em",
                lineHeight:"1.45em",
                alignItems: "center",
                columnGap: ".5em",
            }}>
                {!!item.src && <img src={item.src} style={{height:'36px'}} alt={item.tooltip ?? item.textTitle ?? (typeof item.title === 'string' ? item.title : '')} />}
                {item.title}
            </div>
        </Menu.Item>
    );
});

export const renderSubmenuItem = (item: NavItem, title?: string, asDropdown?: boolean) => {
    //const menuKey = title?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();
    if (asDropdown) {
        return (
            <Dropdown.Item key={v4()} onClick={(e) => item.customAction ? item.customAction(e.nativeEvent, item) : navigate(item.link ?? '')}
            >
                <div style={{display: 'flex', flexDirection: 'row', alignItems: "center"}}>
                    {!!item.src && <div style={{width:"36px"}}><img src={item.src} style={{height:'24px', margin: "0.5em", padding: 0}} alt={item.tooltip ?? item.textTitle ?? (typeof item.title === 'string' ? item.title : '')} /></div>}
                    {item.title}
                    {!!item.subMenu?.length && <>
                        <div style={{marginLeft: '1em'}}>
                            {item.subMenu?.map((sub) => {
                                return renderSubmenuItem(sub);
                            })}
                       </div>
                    </>}
                </div>
            </Dropdown.Item>
        )
    }

    return (
        <Menu.Item fitted="horizontally" key={v4()} onClick={(e) => item.customAction ? item.customAction(e.nativeEvent, item) : (item.link ? navigate(item.link ?? '') : null)}
            style={{borderRadius:"6px", paddingLeft:"0.5em", paddingRight:"0.5em"}}
            >
            <>
            <div style={{
                display:"flex",
                flexDirection: "row",
                textAlign: "left",
                padding: "0.25em",
                lineHeight:"1.45em",
                alignItems: "center",
                justifyContent: "flex-start"
            }}>
                {!!item.src && <div style={{width:"36px", marginRight: "1em"}}><img src={item.src} style={{height:'24px', margin: "0.5em", padding: 0}} alt={item.tooltip ?? item.textTitle ?? (typeof item.title === 'string' ? item.title : '')} /></div>}
                {item.title}
            </div>
            {!!item.subMenu?.length && <>
                    <div style={{marginLeft: '1em'}}>
                        {item.subMenu?.map((sub) => {
                            return renderSubmenuItem(sub);
                        })}
                    </div>
                </>}
            </>
        </Menu.Item>
    )
}

function formatItem(page: NavItem, style?: React.CSSProperties) {
    if (page.sidebarRole === 'separator') {
        return <hr style={{color:"#777"}} />
    }
    return (
        <div title={page.tooltip ?? page.textTitle ?? (typeof page.title === 'string' ? page.title : '')}
            style={{
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'row',
                alignItems: "center",
                justifyContent: 'center',
                width: '100%',
                margin: 0,
                padding: 0,
                ...style
                }}>
            {(!!page.src || !!page.icon) && <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '48px !important'}}>
                {page.src && <img style={{height:'32px', width: '32px', margin: "0.5em", padding: 0}} alt={page.tooltip ?? page.textTitle ?? (typeof page.title === 'string' ? page.title : '')} src={page.src} />}
                {page.icon && <Icon name={page.icon} size={'large'} style={{ margin: 0, padding: 0, marginLeft: "-0.75em", marginRight: "-0.75em"}} />}
            </div>}
            {page.title && <div style={{textAlign:'left', width: "100%", margin: 0}}>{page.title}</div>}
        </div>
    )
}

export const createSubMenu = (title: string | JSX.Element | undefined, children: NavItem[], verticalLayout: boolean = false, page?: NavItem, recursed?: boolean) => {
    //const menuKey = title.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();
    const header = typeof title === 'string' ? undefined : title;
    const text = typeof title === 'string' ? title : undefined;

    if (verticalLayout) {
        return (
            <React.Fragment key={v4()}>
            {<h3 style={{marginTop:"0.75em"}}>{header ?? text}<hr/></h3>}
            {children.map(item => item.customRender ? item.customRender(item) : (renderSubmenuItem(item)))}
            </React.Fragment>
        );
    } else {
        return (<div key={v4()}>
            <Dropdown
                key={v4()}
                item
                text={page ? undefined : text}
                simple
                style={{display: 'flex', flexDirection: page ? 'row-reverse' : 'row', alignItems: 'center'}}>
                <>
                {!!page && formatItem(page)}
                <Dropdown.Menu style={{left: recursed ? "6em" : undefined}}>
                    {children.map(item => {
                        if (item.customRender) return item.customRender(item);
                        return (!!item.subMenu?.length && createSubMenu(item.title, item.subMenu, verticalLayout, item, true) ||
                            <Dropdown.Item disabled={item.sidebarRole === 'separator'} icon={item.icon} key={v4()} onClick={(e) => item?.customAction ? item.customAction(e.nativeEvent, item) : navigate(item.link ?? '')}>
                                {formatItem(item)}
                            </Dropdown.Item>
                        )
                    })}
                </Dropdown.Menu>
                </>
            </Dropdown>
            </div>
        );
    }
};

export function drawMenuItem(page: NavItem, idx?: number, dropdown?: boolean) {
    //const menuKey = page.title?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? page.tooltip?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();
    return (!!page.subMenu?.length && createSubMenu(page.title ?? '', page.subMenu, dropdown, page) ||
        <Menu.Item disabled={page.sidebarRole === 'separator'} key={v4()} style={{ padding: (!!page.src && !page.title) ? "0 0.5em" : "0 1.25em", height: "48px" }} className='link item'  onClick={(e) => page.customAction ? page.customAction(e.nativeEvent, page) : navigate(page.link ?? '')}>
            {formatItem(page)}
        </Menu.Item>)
}

export function getAllOptions(menu: NavItem[], current?: NavItem[]) {
    let output = current ?? [] as NavItem[];
    for (let item of menu) {
        if (item.subMenu) {
            for (let sub of item.subMenu) {
                if (sub.subMenu) {
                    output = getAllOptions(sub.subMenu, output)
                }
                else if (!!sub.optionKey && (!!sub.icon || !!sub.src)) {
                    output.push(sub);
                }
            }
        }
        else if (!!item.optionKey && (!!item.icon || !!item.src)) {
            output.push(item);
        }
    }
    return [ ...new Set(output)];
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