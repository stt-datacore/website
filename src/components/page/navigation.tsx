import React, { ElementRef } from 'react';
import { navigate } from "gatsby";
import { SemanticICONS, Menu, Dropdown, Icon, Segment, Sidebar, Grid, Table, CardGroup, Container, Input } from "semantic-ui-react";
import { v4 } from "uuid";
import { GlobalContext } from "../../context/globalcontext";
import { useOtherPages } from "../otherpages";
import { PlayerMenu } from "../playerdata/playermenu";
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { NavItem, createSubMenu, drawMenuItem } from './util';

type NavigationProps = {
	requestPlayerPanel: (panel: string | undefined) => void;
	requestClearPlayerData: () => void;
    sidebarTarget?: React.RefObject<HTMLElement>;
    children: JSX.Element;
};


export const Navigation = (props: NavigationProps) => {
	const context = React.useContext(GlobalContext);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const [openBar, setOpenBar] = React.useState(false);
	const { requestClearPlayerData, requestPlayerPanel } = props;

	const requestPanel = (panel: string | undefined) => {
		requestPlayerPanel(panel);
		setOpenBar(false);
	}

	const requestClear = () => {
		requestClearPlayerData();
		setOpenBar(false);
	}

	const pages = [
		{
			src: '/media/logo.png',
			customAction: (e, data) => {
				if (isMobile) setOpenBar(!openBar);
				else (navigate("/"))
			}
		},
		{
			icon: 'paste',
			tooltip: "Paste or upload player data",
			checkVisible: (data) => {
				return !!context.player.playerData;
			},
			customAction: (e, data) => props.requestPlayerPanel('input'),
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
		{
			src: `${process.env.GATSBY_ASSETS_URL}${'crew_portraits_cm_empty_sm.png'}`,
			title: isMobile ? undefined : 'Import Player Data ...',
			customAction: () => props.requestPlayerPanel('input'),
			checkVisible: (data) => {
				return !context.player.playerData;
			},
		},
		{
			title: context.player.playerData?.player?.display_name ?? 'Player',
			checkVisible: (data) => {
				return !!context.player.playerData && !isMobile;
			},
			customRender: (data) => {
				return (<PlayerMenu key={v4()}
					requestPanel={requestPanel}
					requestClearData={requestClear}
				/>)
			}
		},
		{
			checkVisible: () => isMobile,
			title: 'Player',
            sidebarRole: 'heading',
            subMenu: [
				{
					sidebarRole: 'item',
					checkVisible: (data) => {
						return !!context.player.playerData && !isMobile;
					},
					customRender: (data) => {
						return (<PlayerMenu key={v4()}
							vertical
							requestPanel={props.requestPlayerPanel}
							requestClearData={props.requestClearPlayerData}
						/>)
					}
				}
			]
		},
		{
			checkVisible: () => isMobile,
			title: 'Worfle',
			sidebarRole: 'heading',
			subMenu: [
				{ title: 'Worfle', link: '/crewchallenge' }
			]
		},
		{ src: '/media/crew_icon.png', tooltip: "Crew Roster", link: '/' },
		{ src: '/media/portal.png', tooltip: 'Behold', link: '/behold', checkVisible: () => !isMobile },
		{ link: "/gauntlets", src: '/media/gauntlet.png', tooltip: "Gauntlets" },
		{ link: "/playertools?tool=voyage", src: '/media/voyage.png', tooltip: "Voyage Calculator" },
		{ link: "/playertools?tool=fleetbossbattles", src: '/media/fbb.png', tooltip: "Fleet Boss Battles" },
		{ 
			title: 'Roster',
            sidebarRole: 'heading',
			subMenu: [
				{ title: 'Crew', link: '/', sidebarRole: 'item' },
				{ title: 'Ships', link: '/playertools?tool=ships', sidebarRole: 'item' },
				{ title: 'Owned Items', link: '/playertools?tool=items', sidebarRole: 'item' },
				{ title: 'All Items', link: '/items', sidebarRole: 'item' },
				{ title: 'Unneeded Items', link: '/playertools?tool=unneeded', sidebarRole: 'item' },
			]
		},
		{ 
			title: 'Tools',
            sidebarRole: 'heading',
            subMenu: [
				{ title: "Behold Helper", link: "/behold", sidebarRole: 'item' },	// Behold available at launch
				{ title: "Factions", link: "/playertools?tool=factions", sidebarRole: 'item' },	// Factions available at launch
				{ title: "Event Planner", link: "/playertools?tool=event-planner", sidebarRole: 'item' },	// Events added post-launch
				{ title: "Gauntlet", link: "/gauntlets", sidebarRole: 'item' },	// Gauntlet added v1.7
				{ title: "Citation Optimizer", link: "/playertools?tool=cite-optimizer", sidebarRole: 'item' },	// Citations added 1.9
				{ title: "Voyage Calculator", link: "/playertools?tool=voyage", sidebarRole: 'item' },	// Voyages added v3
				{ title: "Voyage History", link: "/voyagehistory", sidebarRole: 'item' },	// Voyages added v3
				{ title: "Collection Planner", link: "/playertools?tool=collections", sidebarRole: 'item' },	// Collections added v4
				{ title: "Crew Retrieval", link: "/playertools?tool=crew-retrieval", sidebarRole: 'item' },	// Crew retrieval added v8
				{ title: "Fleet Boss Battles", link: "/playertools?tool=fleetbossbattles", sidebarRole: 'item' },	// Fleet boss battles added v9
			]
		},
		{ 
			title: 'Game Info',
            sidebarRole: 'heading',
            subMenu: [
				{ title: 'Episodes', link: '/episodes', sidebarRole: 'item' },
				{ title: 'Events', link: '/events', sidebarRole: 'item' },
				{ title: 'Collections', link: '/collections', sidebarRole: 'item' },
				{ title: 'Voyage Hall of Fame', link: '/hall_of_fame', sidebarRole: 'item' },
				{ title: "Misc Game Stats", link: "/stats", sidebarRole: 'item' },
			]
		},
		// TODO: Use later?
		// {
		// 	title: 'Search',
		// 	right: true,
		// 	customRender: (data) => {
		// 		return <Input />
		// 	},
		// 	customAction: (e, data) => { return true; },
		// 	checkVisible: (data) => !isMobile
		// },
		{
			title: 'Worfle',
			right: true,
			link: '/crewchallenge',
			checkVisible: (data) => !isMobile
		},
	] as NavItem[];

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
		if (isMobile) {
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
		else {
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

	if (!isMobile) {
		rightItems.push(createSubMenu('About', about));
	}
	else {
		sidebarItems.push(createSubMenu('About', about, true));
	}


	const sref = React.useRef<HTMLDivElement>(null);

	return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: "sticky", top: "0px", zIndex: "1000" }}>
                <Container>
					<Menu style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', alignSelf: 'center'}}>
						{menuItems}
							{rightItems}

					</Menu>
				</Container>
            </div>
			<div ref={sref} onClick={(e) => setOpenBar(false)} style={{flexGrow: 1}}>
				<Sidebar.Pushable style={{ minHeight:"100vh"}}>
					<Sidebar
						as={Grid}
						animation='overlay'
						onHide={() => setOpenBar(false)}
						vertical
						visible={openBar}>
						<Menu size={'large'} vertical style={{width: "300px"}}>
							{sidebarItems}
						</Menu>
					</Sidebar>
					<div>
					{props.children}
					</div>
				</Sidebar.Pushable>
			</div>
        </>
	);
};
