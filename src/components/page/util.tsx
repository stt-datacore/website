
import { navigate } from 'gatsby';
import React from 'react';
import { Menu, Dropdown, Icon, SemanticICONS } from 'semantic-ui-react';
import { v4 } from 'uuid';

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
}

export const renderSubmenuItem = (item: NavItem, title?: string) => {
    //const menuKey = title?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();

    return (
        <Menu.Item fitted="horizontally" key={v4()} onClick={(e) => item.customAction ? item.customAction(e.nativeEvent, item) : navigate(item.link ?? '')}
            style={{borderRadius:"6px", paddingLeft:"0.5em", paddingRight:"0.5em"}}
        >
        <div style={{
            display:"flex",
            flexDirection: "column",
            textAlign: "left",
            padding: "0.25em",
            lineHeight:"1.45em"
        }}>
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
                    {children.map(item => (
                        <Dropdown.Item key={v4()} onClick={(e) => item?.customAction ? item.customAction(e.nativeEvent, item) : navigate(item.link ?? '')}>
                            {item.title}
                        </Dropdown.Item>
                    ))}
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
