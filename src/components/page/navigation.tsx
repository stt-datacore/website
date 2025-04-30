import React from 'react';
import { navigate } from "gatsby";
import { Menu, Dropdown, Icon, Sidebar, Grid, Container } from "semantic-ui-react";
import { v4 } from "uuid";
import { GlobalContext } from "../../context/globalcontext";
import { useOtherPages } from "../otherpages";
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { NavItem, createSubMenu, DefaultOpts, DefaultOptsMobile, drawMenuItem, MaxMenuItems, MaxMobileItems, getAllOptions as getAllMenuOptions, parsePermalink, renderColumnsMenu } from './util';
import { useStateWithStorage } from '../../utils/storage';
import { PlayerMenu } from "./playermenu";
import { SupportedLanguage, getBrowserLanguage } from '../../context/localizedcontext';
import { AlertContext } from '../alerts/alertprovider';


type NavigationProps = {
	requestPanel: (target: string, panel: string | undefined) => void;
    sidebarTarget?: React.RefObject<HTMLElement>;
    children: JSX.Element;
};

function printLang(lang?: SupportedLanguage) {
	if (lang === 'sp') return "ES";
	return lang?.toUpperCase() ?? "EN";
}

function getLanguageIcon(lang?: SupportedLanguage) {
	switch (lang) {
		case 'en':
			return `${process.env.GATSBY_ASSETS_URL}atlas/flag_english_icon.png`;
		case 'de':
			return `${process.env.GATSBY_ASSETS_URL}atlas/flag_german_icon.png`;
		case 'fr':
			return `${process.env.GATSBY_ASSETS_URL}atlas/flag_french_icon.png`;
		case 'sp':
			return `${process.env.GATSBY_ASSETS_URL}atlas/flag_spanish_icon.png`;
		default:
			return `${process.env.GATSBY_ASSETS_URL}atlas/flag_english_icon.png`;

	}
}

function getLanguageFullName(lang?: SupportedLanguage) {
	switch (lang) {
		case 'en':
			return "English";
		case 'de':
			return "Deutsche";
		case 'fr':
			return "Français";
		case 'sp':
			return "Español";
		default :
			return "English";
	}
}

export const Navigation = (props: NavigationProps) => {
	const windowGlobal = typeof globalThis.window !== 'undefined' ? globalThis.window : undefined;
	const globalContext = React.useContext(GlobalContext);

	const { t, language, setPreferredLanguage } = globalContext.localized;

    const [isMobile, setIsMobile] = React.useState(typeof windowGlobal !== 'undefined' && windowGlobal.innerWidth < DEFAULT_MOBILE_WIDTH);
    const [openBar, setOpenBar] = React.useState(false);

	const [activeMenu, setActiveMenu] = useStateWithStorage('navigation/active', DefaultOpts, { rememberForever: true });
	const [mobileActiveMenu, setMobileActiveMenu] = useStateWithStorage('navigation/mobileActive', DefaultOptsMobile, { rememberForever: true });

	if (!!globalContext.player.playerData && typeof windowGlobal !== 'undefined' && !!windowGlobal.location.search?.length) {
		let parm = new URLSearchParams(windowGlobal.location.search);
		if (parm.has('pmc')) {
			let result = parsePermalink(parm.get("pmc") ?? '');
			if (result) {
				const res = result;
				windowGlobal.setTimeout(() => {
					if (JSON.stringify(res) !== JSON.stringify([activeMenu, mobileActiveMenu])) {
						setActiveMenu(res[0]);
						setMobileActiveMenu(res[1]);
					}
				});
			}
		}
	}
	// const requestPanel = (target: string, panel: string | undefined) => {
	// 	props.requestPanel(target, panel);
	// 	setOpenBar(false);
	// }
	let portrait = `${process.env.GATSBY_ASSETS_URL}${globalContext.player.playerData?.player?.character?.crew_avatar
		? (globalContext.player.playerData?.player?.character?.crew_avatar?.portrait?.file ?? globalContext.player.playerData?.player?.character?.crew_avatar?.portrait ?? 'crew_portraits_cm_empty_sm.png')
		: 'crew_portraits_cm_empty_sm.png'}`;

	if (portrait.includes("crew_portraits") && !portrait.endsWith("_sm.png")) {
		portrait = portrait.replace("_icon.png", "_sm.png");
	}

	const avatar = portrait;

	const toolsSubMenu: NavItem[] = [
		{ optionKey: 'behold', src: '/media/portal.png', title: t('menu.tools.behold_helper'), link: "/behold", sidebarRole: 'item' },	// Behold available at launch
		{ optionKey: 'shuttles', src: '/media/shuttle_icon.png', title: t('menu.tools.shuttle_helper'), link: "/shuttlehelper", sidebarRole: 'item' },	// Shuttles available at launch
		{ optionKey: 'faction', title: t('menu.tools.factions'), src: '/media/faction.png', link: "/factions", sidebarRole: 'item' },	// Factions available at launch
		// { optionKey: 'fleet', title: "Fleet", src: '/media/fleet_icon.png', link: "/fleet", sidebarRole: 'item' },	// Factions available at launch
		{ optionKey: 'event', src: '/media/event.png', title: t('menu.tools.event_planner'), link: "/eventplanner", sidebarRole: 'item' },	// Events added post-launch
		{ optionKey: 'gauntlet', src: '/media/gauntlet.png', title: t('menu.tools.gauntlet'), link: "/gauntlets", sidebarRole: 'item' },	// Gauntlet added v1.7
		{ optionKey: 'cite', src: `${process.env.GATSBY_ASSETS_URL}/atlas/star_reward.png`, title: t('menu.tools.citation_optimizer'), link: "/cite-opt", sidebarRole: 'item' },	// Citations added 1.9
		{ optionKey: 'voyage', src: "/media/voyage.png", title: t('menu.tools.voyage_calculator'), link: "/voyage", sidebarRole: 'item' },	// Voyages added v3
		{ optionKey: 'voyhist', src: "/media/antimatter_icon.png", title: t('menu.tools.voyage_history'), link: "/voyagehistory", sidebarRole: 'item' },	// Voyages added v3
		{ optionKey: 'collection', src: '/media/vault.png', title: t('menu.tools.collection_planner'), link: "/collections", sidebarRole: 'item' },	// Collections added v4
		{ optionKey: 'retrieval', src: '/media/retrieval.png', title: t('menu.tools.crew_retrieval'), link: "/retrieval", sidebarRole: 'item' },	// Crew retrieval added v8
		{ optionKey: 'fbb', src: '/media/fbb.png', title: t('menu.tools.fleet_boss_battles'), link: "/fbb", sidebarRole: 'item' },	// Fleet boss battles added v9
		{ optionKey: 'continuum', src: '/media/continuum.png', title: t('menu.tools.continuum_helper'), link: "/continuum", sidebarRole: 'item' },	// Continuum missions added v10
		//{ optionKey: 'objective', src: '/media/objective_event_icon.png', title: t('menu.tools.objective_event_helper'), link: "/oehelper", sidebarRole: 'item' },	// Continuum missions added v10
	];

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
				return !!globalContext.player.playerData;
			},
			customAction: (e, data) => props.requestPanel('player', 'input'),
			customRender: (data) => {
				return <Menu.Item key={'customInput'} onClick={() => props.requestPanel('player', 'input')}>
				<img
					style={{height:"24px", width: "24px"}}
					src={`${avatar}`}
				/>
				</Menu.Item>
			}
		},
		{
			src: `${process.env.GATSBY_ASSETS_URL}${'crew_portraits_cm_empty_sm.png'}`,
			title: isMobile ? undefined : t('menu.player.import_player_data_ellipses'),
			customAction: () => props.requestPanel('player', 'input'),
			checkVisible: (data) => {
				return !globalContext.player.playerData;
			},
		},
		{
			title: globalContext.player.playerData?.player?.display_name ?? 'Player',
			checkVisible: (data) => {
				return !!globalContext.player.playerData && !isMobile;
			},
			customRender: (data) => {
				return (
					<PlayerMenu key={v4()}
						navConfig={{
							current: activeMenu,
							mobileCurrent: mobileActiveMenu,
							maxItems: MaxMenuItems,
							defaultOptions: DefaultOpts,
							defaultMobileOptions: DefaultOptsMobile,
							setCurrent: setActiveMenu,
							setMobileCurrent: setMobileActiveMenu,
							maxItemsMobile: MaxMobileItems,
							menu: pages
						}}
						requestPanel={
							props.requestPanel
						}
					/>
				);
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
						return !!globalContext.player.playerData && !isMobile;
					},
					customRender: (data) => {
						return (<PlayerMenu key={v4()}
							vertical
							requestPanel={props.requestPanel}
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
		{
			title: printLang(language),
			src: getLanguageIcon(language),
			tooltip: getLanguageFullName(language),
			sidebarRole: "heading",
			right: true,
			subMenu: [
				{
					src: getLanguageIcon('en'),
					title: "EN",
					tooltip: getLanguageFullName('en'),
					customAction: (e) => {
						setPreferredLanguage('en');
					}
				},
				{
					src: getLanguageIcon('de'),
					title: "DE",
					tooltip: getLanguageFullName('de'),
					customAction: (e) => {
						setPreferredLanguage('de');
					}
				},
				{
					src: getLanguageIcon('fr'),
					title: "FR",
					tooltip: getLanguageFullName('fr'),
					customAction: (e) => {
						setPreferredLanguage('fr');
					}
				},
				{
					src: getLanguageIcon('sp'),
					title: "ES",
					tooltip: getLanguageFullName('sp'),
					customAction: (e) => {
						setPreferredLanguage('sp');
					}
				},
				{
					sidebarRole: 'separator'
				},
				{	src: getLanguageIcon(getBrowserLanguage()),
					title: t('global.default'),
					customAction: (e) => {
						setPreferredLanguage(undefined);
					}
				}
			]
		},
		{ optionKey: '_option0', checkVisible: () => false },
		{ optionKey: '_option1', checkVisible: () => false },
		{ optionKey: '_option2', checkVisible: () => false },
		{ optionKey: '_option3', checkVisible: () => false },
		{ optionKey: '_option4', checkVisible: () => false },
		{
			title: t('menu.roster_title'),
            sidebarRole: 'heading',
			subMenu: [
				{ optionKey: 'crew', src: '/media/crew_icon.png', title: t('menu.roster.crew'), link: '/', sidebarRole: 'item' },
				{ optionKey: 'ship', src: '/media/ship_icon.png', title: t('menu.roster.ships'), link: '/ships', sidebarRole: 'item' },
				{ optionKey: 'items', src: '/media/equipment_icon.png', title: t('menu.roster.items'), link: '/items', sidebarRole: 'item' },
				{ optionKey: 'unneeded_items', src: '/media/equipment_icon.png', title: t('menu.roster.unneeded_items'), link: '/unneeded', sidebarRole: 'item' },
			]
		},
		{
			title: t('menu.tools_title'),
			sidebarRole: 'heading',
			subMenu: toolsSubMenu,
			checkVisible: () => !isMobile,
			customRender: (data) => renderColumnsMenu(data, 2)
		},
		{
			title: t('menu.tools_title'),
			sidebarRole: 'heading',
			subMenu: toolsSubMenu,
			checkVisible: () => isMobile
		},
		// {
		// 	title: 'Tools',
        //     sidebarRole: 'heading',
        //     subMenu: [
		// 		{
		// 			optionKey: 'crew_planning',
		// 			title: 'Crew Planning',
		// 			sidebarRole: 'heading',
		// 			src: '/media/crew_icon.png',
		// 			subMenu: [
		// 				{ optionKey: 'behold', src: '/media/portal.png',title: "Behold Helper", link: "/behold", sidebarRole: 'item' },	// Behold available at launch
		// 				{ optionKey: 'cite', src: `${process.env.GATSBY_ASSETS_URL}/atlas/star_reward.png`, title: "Citation Optimizer", link: "/cite-opt", sidebarRole: 'item' },	// Citations added 1.9
		// 				{ optionKey: 'collection', src: '/media/vault.png', title: "Collection Planner", link: "/collections", sidebarRole: 'item' },	// Collections added v4
		// 				{ optionKey: 'retrieval', src: '/media/retrieval.png', title: "Crew Retrieval", link: "/retrieval", sidebarRole: 'item' },	// Crew retrieval added v8
		// 			]
		// 		},

		// 		{
		// 			optionKey: 'game_play',
		// 			title: 'Game Play',
		// 			sidebarRole: 'heading',
		// 			src: '/media/event2.png',
		// 			subMenu: [
		// 				{ optionKey: 'faction', title: "Factions", src: '/media/faction.png', link: "/factions", sidebarRole: 'item' },	// Factions available at launch
		// 				{ optionKey: 'event', src: '/media/event.png', title: "Event Planner", link: "/eventplanner", sidebarRole: 'item' },	// Events added post-launch
		// 				{ optionKey: 'gauntlet', src: '/media/gauntlet.png', title: "Gauntlet", link: "/gauntlets", sidebarRole: 'item' },	// Gauntlet added v1.7
		// 				{ optionKey: 'fbb', src: '/media/fbb.png', title: "Fleet Boss Battles", link: "/fbb", sidebarRole: 'item' },	// Fleet boss battles added v9
		// 				{ optionKey: 'continuum', src: '/media/continuum.png', title: "Continuum Helper", link: "/continuum", sidebarRole: 'item' },	// Continuum missions added v10
		// 			]
		// 		},
		// 		{
		// 			optionKey: 'voyage_submenu',
		// 			title: 'Voyages',
		// 			sidebarRole: 'heading',
		// 			src: '/media/voyage.png',
		// 			subMenu: [
		// 				{ optionKey: 'voyage', src: "/media/voyage.png", title: "Voyage Calculator", link: "/voyage", sidebarRole: 'item' },	// Voyages added v3
		// 				{ optionKey: 'voyhist', src: "/media/voyagehist.png", title: "Voyage History", link: "/voyagehistory", sidebarRole: 'item' },	// Voyages added v3
		// 			]
		// 		},
		// 		// { optionKey: 'fleet', title: "Fleet", src: '/media/fleet_icon.png', link: "/fleet", sidebarRole: 'item' },	// Factions available at launch

		// 	]
		// },
		{
			title: t('menu.game_info_title'),
            sidebarRole: 'heading',
            subMenu: [
				{ title: t('menu.game_info.episodes'), link: '/episodes', sidebarRole: 'item' },
				{ title: t('menu.game_info.events'), link: '/events', sidebarRole: 'item' },
				{ title: t('menu.game_info.objective_events'), link: '/objective_events', sidebarRole: 'item' },
				{ title: t('menu.game_info.voyage_hof'), link: '/hall_of_fame', sidebarRole: 'item' },
				{ title: t('menu.game_info.ftm_hof'), link: '/ftmhof', sidebarRole: 'item' },
				{ title: t('menu.game_info.misc_game_stats'), link: "/stats", sidebarRole: 'item' },
				{ title: t('menu.game_info.bridge_crew_tool'), link: "/bridgecrew", sidebarRole: 'item' },
				{ title: t('menu.game_info.stat_trends'), link: "/stattrends", sidebarRole: 'item' },
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
		{
			title: <Icon name='bug' />,
			textTitle: t('menu.site_beta_switch'),
			right: true,
			customAction: (e, data) => {
				if (typeof window !== 'undefined') {
					if (window.location.href.includes("beta.datacore.app")) {
						window.location.href = "https://datacore.app/";
					}
					else {
						window.location.href = "https://beta.datacore.app/";
					}
				}
			},
			checkVisible: (data) => !isMobile
		},
	] as NavItem[];

	const popts = getAllMenuOptions(pages);

	const pc = pages.length;
	const actmnu = isMobile ? mobileActiveMenu : activeMenu;
	const cmax = isMobile ? MaxMobileItems : MaxMenuItems;

	for (let p = 0; p < pc; p++) {
		const page = pages[p];
		if (!page) continue;
		if (page.optionKey?.startsWith("_option")) {
			let xkey = Number.parseInt(page.optionKey.slice(7));

			if (xkey < actmnu.length && xkey < cmax) {
				let fopt = popts.find(o => o.optionKey === actmnu[xkey]);
				if (fopt) {
					pages[p] = {
						... fopt,
						title: undefined,
						optionKey: undefined,
						tooltip: fopt.textTitle ?? (typeof fopt.title === 'string' ? fopt.title : ''),
						sidebarRole: undefined
					}
				}
			}
		}
	}

	const otherPages = useOtherPages();
	const about = [
		{ title: 'About DataCore', link: '/about', sidebarRole: 'item' },
		{ title: 'Announcements', link: '/announcements', sidebarRole: 'item' }
	] as NavItem[];

	let now = new Date();
	if (now.getMonth() === 3 && now.getDate() === 1) {
		about.unshift({
			title: 'Toggle Acute Peripheral Reflective Inversion Loop',
			sidebarRole: 'item',
			customAction: (e, d) => {
				if (typeof localStorage !== undefined) {
					let b = localStorage.getItem("hahaDone");
					if (b && b === '1') {
						localStorage.removeItem("hahaDone");
					}
					else {
						localStorage.setItem("hahaDone", "1");
					}

					document.location = document.location;
				}
			}
		})
	}

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
		if (page.optionKey) {
			if (page.optionKey.startsWith("_option")) continue;
			if (isMobile && !mobileActiveMenu.includes(page.optionKey)) continue;
			else if (!isMobile && !activeMenu.includes(page.optionKey)) continue;
		}

		if (page.checkVisible && !page.checkVisible(page)) continue;
		if (isMobile) {
			if (page.sidebarRole === undefined) {
				if (page.customRender) {
					menuItems.push(page.customRender(page));
				}
				else if (page.subMenu) {
					menuItems.push(createSubMenu(page.textTitle ?? (typeof page.title === 'string' ? page.title : ''), page.subMenu));
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
					sidebarItems.push(createSubMenu(page.textTitle ?? (typeof page.title === 'string' ? page.title : ''), page.subMenu, true));
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
				menuItems.push(createSubMenu(page.textTitle ?? (typeof page.title === 'string' ? page.title : ''), page.subMenu));
			}
			else {
				menuItems.push(drawMenuItem(page));
			}
		}
	}

	for (let page of pages) {
		if (!page.right) continue;
		if (page.optionKey) {
			if (page.optionKey.startsWith("_option")) continue;
			if (isMobile && !mobileActiveMenu.includes(page.optionKey)) continue;
			else if (!isMobile && !activeMenu.includes(page.optionKey)) continue;
		}

		if (page.checkVisible && !page.checkVisible(page)) continue;
		if (page.customRender) {
			rightItems.push(page.customRender(page));
		}
		else if (page.subMenu) {
			rightItems.push(createSubMenu(page.textTitle ?? (typeof page.title === 'string' ? page.title : ''), page.subMenu));
		}
		else {
			rightItems.push(drawMenuItem(page));
		}
	}

	if (!isMobile) {
		rightItems.unshift(createSubMenu(t('menu.about_title'), about));

	}
	else {
		sidebarItems.push(createSubMenu(t('menu.about_title'), about, true));
	}

	if (typeof windowGlobal !== 'undefined') {
		windowGlobal.addEventListener('resize', (e) => {
			setIsMobile(typeof windowGlobal !== 'undefined' && windowGlobal.innerWidth < DEFAULT_MOBILE_WIDTH);
		});
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
						vertical="true"
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
