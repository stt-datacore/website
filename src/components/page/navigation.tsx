import React, { ElementRef } from 'react';
import { navigate } from "gatsby";
import { SemanticICONS, Menu, Dropdown, Icon, Segment, Sidebar, Grid, Table } from "semantic-ui-react";
import { v4 } from "uuid";
import { GlobalContext } from "../../context/globalcontext";
import { useOtherPages } from "../otherpages";
import { PlayerMenu } from "../playerdata/playermenu";
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';

type NavigationProps = {
	requestPlayerPanel: (panel: string | undefined) => void;
	requestClearPlayerData: () => void;
    sidebarTarget?: React.RefObject<HTMLElement>;
    children: JSX.Element;
};

interface NavItem {
	title?: string,
	link?: string,
	tooltip?: string,
	src?: string,
	right?: boolean;
	icon?: SemanticICONS;
	subMenu?: NavItem[];
	checkVisible?: (data: NavItem) => boolean;
	customAction?: (data: NavItem) => void;
	customRender?: (data: NavItem) => JSX.Element;
    sidebarRole?: 'item' | 'heading';
}

export const Navigation = (props: NavigationProps) => {
	const context = React.useContext(GlobalContext);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const [openBar, setOpenBar] = React.useState(false);

	const pages = [
		{ title: 'Home', src: '/media/logo.png', customAction: () => { if (!openBar) setOpenBar(true); else setOpenBar(false); } },
		{ icon: 'paste',
		  tooltip: "Paste or upload player data",
		  checkVisible: (data) => {
			return !!context.player.playerData;
		  },
		  customAction: () => props.requestPlayerPanel('input'),
		  customRender: (data) => {
			return <Menu.Item key={'customInput'} onClick={() => props.requestPlayerPanel('input')}>
			<img
				style={{height:"24px", width: "24px"}}
				src={`${process.env.GATSBY_ASSETS_URL}${context.player.playerData?.player.character.crew_avatar?.icon
						? context.player.playerData?.player.character.crew_avatar.portrait.file
						: 'crew_portraits_cm_empty_sm.png'
					}`}
			/>
			</Menu.Item>
		  }
		},
		{ src: `${process.env.GATSBY_ASSETS_URL}${'crew_portraits_cm_empty_sm.png'}`,
		  title: 'Import Player Data ...',
		  customAction: () => props.requestPlayerPanel('input'),
  		  checkVisible: (data) => {
			return !context.player.playerData;
		  },
		},
		{ title: 'Player',
  		  checkVisible: (data) => {
			return !!context.player.playerData;
		  },
		  customRender: (data) => {
			return (<PlayerMenu
				requestPanel={props.requestPlayerPanel}
				requestClearData={props.requestClearPlayerData}
			/>)
		} },
		{ link: "/playertools?tool=fleetbossbattles", src: '/media/fbb.png', tooltip: "Fleet Boss Battles" },
		{ link: "/gauntlets", src: '/media/gauntlet.png', tooltip: "Gauntlets" },
		{ link: "/playertools?tool=voyage", src: '/media/voyage.png', tooltip: "Voyage Calculator" },
		{ src: '/media/portal.png', tooltip: 'Behold', link: '/behold' },
		{ icon: 'users', tooltip: "Crew Roster", link: '/' },
		{ title: 'Roster',
            sidebarRole: 'heading',
			subMenu: [
				{ title: 'Crew', link: '/', sidebarRole: 'item' },
				{ title: 'Ships', link: '/playertools?tool=ships', sidebarRole: 'item' },
				{ title: 'Owned Items', link: '/playertools?tool=items', sidebarRole: 'item' },
				{ title: 'All Items', link: '/items', sidebarRole: 'item' },
				{ title: 'Unneeded Items', link: '/playertools?tool=unneeded', sidebarRole: 'item' },
			]
		},
		{ title: 'Game Play',
            sidebarRole: 'heading',
            subMenu: [
				{ title: "Gauntlet", link: "/gauntlets", sidebarRole: 'item' },
				{ title: "Fleet Boss Battles", link: "/playertools?tool=fleetbossbattles", sidebarRole: 'item' },
				{ title: "Voyage Calculator", link: "/playertools?tool=voyage", sidebarRole: 'item' },
				{ title: "Voyage History", link: "/voyagehistory", sidebarRole: 'item' },
				{ title: "Event Planner", link: "/playertools?tool=event-planner", sidebarRole: 'item' },
				{ title: "Crew Retrieval", link: "/playertools?tool=crew-retrieval", sidebarRole: 'item' },
				{ title: "Citation Optimizer", link: "/playertools?tool=cite-optimizer", sidebarRole: 'item' },
				{ title: "Collections", link: "/playertools?tool=collections", sidebarRole: 'item' },
				{ title: "Factions", link: "/playertools?tool=factions", sidebarRole: 'item' },
			]
		},
		{ title: 'Game Info',
            sidebarRole: 'heading',
            subMenu: [
				{ title: 'Collections', link: '/collections', sidebarRole: 'item' },
				{ title: 'Events', link: '/events', sidebarRole: 'item' },
				{ title: 'Episodes', link: '/episodes', sidebarRole: 'item' }
			]
		},
		{ title: 'Stats',
            sidebarRole: 'heading',
            subMenu: [
				{ title: "Player Stats", link: "/playertools?tool=other", sidebarRole: 'item' },
				{ title: "Charts & Stats", link: "/playertools?tool=charts", sidebarRole: 'item' },
				{ title: "Misc Stats", link: "/stats", sidebarRole: 'item' },
				{ title: 'Hall of Fame', link: '/hall_of_fame', sidebarRole: 'item' },
			]
		},
		{ title: 'Worfle', link: '/crewchallenge' },
	] as NavItem[];


	const createSubMenu = (title: string, children: NavItem[], verticalLayout: boolean = false) => {
		const menuKey = title.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();
		if (verticalLayout) {
			return (
                <React.Fragment>
                {<h3 style={{marginTop:"0.75em"}}>{title}<hr/></h3>}
                {children.map(item => (
                    <Menu.Item fitted="horizontally" key={`${menuKey}${item.link}`} onClick={() => navigate(item.link ?? '')}>
                        <div style={{
                            display:"flex",
                            flexDirection: "column",
                            textAlign: "left",
                            padding: "0.25em"
                        }}>
                            {item.title}
                        </div>
                    </Menu.Item>
                ))}
                </React.Fragment>
			);
		} else {
			return (
				<Dropdown key={`/${menuKey}`} item simple text={title}>
					<Dropdown.Menu>
						{children.map(item => (
							<Dropdown.Item key={`${menuKey}${item.link}`} onClick={() => navigate(item.link ?? '')}>
								{item.title}
							</Dropdown.Item>
						))}
					</Dropdown.Menu>
				</Dropdown>
			);
		}
	};

	function drawMenuItem(page: NavItem, idx?: number, dropdown?: boolean) {
		const menuKey = page.title?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? page.tooltip?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? v4();
		return (
			<Menu.Item key={'menu_'+idx+menuKey} style={{ padding: (!!page.src && !page.title) ? "0 0.5em" : "0 1.25em", height: "48px" }} className='link item'  onClick={() => page.customAction ? page.customAction(page) : navigate(page.link ?? '')}>
				<div title={page.tooltip ?? page.title} style={{display: 'flex', flexDirection: 'row', justifyContent: "center", alignItems: "center", margin: 0, padding: 0}}>
					{page.src && <img style={{height:'32px', margin: "0.5em", padding: 0}} alt={page.tooltip ?? page.title} src={page.src} />}
					{page.icon && <Icon name={page.icon} size={'large'} />}
					{page.title && <div>{page.title}</div>}
				</div>
			</Menu.Item>)
	}

	const otherPages = useOtherPages();
	const about = [
		{ title: 'About DataCore', link: '/about', sidebarRole: 'item' },
		{ title: 'Announcements', link: '/announcements', sidebarRole: 'item' }
	] as NavItem[];

	otherPages.map((page) => {
		about.push(
			{ title: page.title, link: page.slug, sidebarRole: 'item' }
		);
	});

	const sidebarItems = [] as JSX.Element[];
	const menuItems = [] as JSX.Element[];
	const rightItems = [] as JSX.Element[];

	for (let page of pages) {
		if (page.right) continue;
        
		if (page.checkVisible && !page.checkVisible(page)) continue;
        if (true) {
            if (page.sidebarRole === undefined) {
                if (page.customRender) {
                    menuItems.push(page.customRender(page));
                }
                else if (page.subMenu) {
                    menuItems.push(createSubMenu(page.title ?? '', page.subMenu));
                }
                else {
                    menuItems.push(drawMenuItem(page));
                }        
            }
            else {
                if (page.customRender) {
                    sidebarItems.push(page.customRender(page));
                }
                else if (page.subMenu) {
                    sidebarItems.push(createSubMenu(page.title ?? '', page.subMenu, true));
                }
                else {
                    sidebarItems.push(drawMenuItem(page));
                }        
            }
        }
        // else {
        //     if (page.customRender) {
        //         menuItems.push(page.customRender(page));
        //     }
        //     else if (page.subMenu) {
        //         menuItems.push(createSubMenu(page.title ?? '', page.subMenu));
        //     }
        //     else {
        //         menuItems.push(drawMenuItem(page));
        //     }    
        // }
	}

	for (let page of pages) {
		if (!page.right) continue;
		if (page.checkVisible && !page.checkVisible(page)) continue;
		if (page.customRender) {
			rightItems.push(page.customRender(page));
		}
		else if (page.subMenu) {
			rightItems.push(createSubMenu(page.title ?? '', page.subMenu));
		}
		else {
			rightItems.push(drawMenuItem(page));
		}
	}

	sidebarItems.push(createSubMenu('About', about, true));

	return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', position: "fixed", top: "0px", width :"100vw", zIndex: "1000" }}>
                <Menu>
                    {menuItems}
                    <Menu.Menu position={'right'}>
                        {rightItems}
                    </Menu.Menu>
                </Menu>
            </div>

            
            <Sidebar.Pushable as={Table} style={{paddingTop:"64px"}}>
            <Sidebar              
              style={{paddingTop:"2.5em"}}
              as={Grid}
              invert
              animation='overlay'
              icon='labeled'              
              onHide={() => setOpenBar(false)}
              vertical
              target={props.sidebarTarget}
              visible={openBar}
              width='thin'              
            >
                <Menu vertical>
                  {sidebarItems}
              </Menu>
            </Sidebar>
            {props.children}
            </Sidebar.Pushable>
        </>
	);
};
