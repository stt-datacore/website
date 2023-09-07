import React from 'react';
import { Link, withPrefix, StaticQuery, graphql, navigate } from 'gatsby';
import { Helmet } from 'react-helmet';

import { GlobalContext } from '../../context/globalcontext';
import { ValidDemands } from '../../context/datacontext';

import { PlayerMenu } from '../playerdata/playermenu';
import PlayerHeader from '../playerdata/playerheader';
import { Container, Dropdown, Icon, Menu, MenuItem, SemanticICONS } from 'semantic-ui-react';
import { useOtherPages } from '../otherpages';
import { v4 } from 'uuid';

export interface DataPageLayoutProps {
	children: JSX.Element;

    pageId?: string;

    /**
     * Page title, header property is used if undefined
     */
    pageTitle?: string;
	header?: string;

    /**
     * Default demands are crew, items, ship_schematics, and all_buffs.
     */
	demands?: ValidDemands[]

    notReadyMessage?: string;

	narrowLayout?: boolean;

	/** default is true */
	initPlayerData?: boolean;

	playerPromptType?: 'require' | 'recommend' | 'none';
};

const MainContent = ({ children, narrowLayout }) =>
	narrowLayout ? (
		<Container text style={{ marginTop: '4em', paddingBottom: '2em', marginBottom: '2em' }}>{children}</Container>
	) : (
		<Container style={{ marginTop: '4em', marginBottom: '2em' }}>{children}</Container>
	);

const DataPageLayout = <T extends DataPageLayoutProps>(props: T) => {
	const globalContext = React.useContext(GlobalContext);
	const { core, player } = globalContext;
	const { children, pageId, pageTitle, header, notReadyMessage, narrowLayout, playerPromptType } = props;

    const demands = props.demands ?? [] as ValidDemands[];
    (['crew', 'items', 'ship_schematics', 'all_buffs', 'cadet'] as ValidDemands[]).forEach(required => {
        if (!demands.includes(required))
            demands.push(required);
    });
    const isReady = !!core.ready && !!core.ready(demands);

	const [playerPanel, setPlayerPanel] = React.useState<string | undefined>(undefined);
	const clearPlayerData = () => { if (player.reset) player.reset(); };

	return (
		<React.Fragment>
			<DataPageHelmet title={pageTitle ?? header} />
			<Navigation
				requestPlayerPanel={setPlayerPanel}
				requestClearPlayerData={clearPlayerData}
			/>
			<MainContent narrowLayout={narrowLayout}>
			<PlayerHeader
				promptType={playerPromptType ?? 'none'}
				activePanel={playerPanel}
				setActivePanel={setPlayerPanel}
			/>
			{renderContents()}
			</MainContent>
		</React.Fragment>
	);

	function renderContents(): JSX.Element {
		return (
			<React.Fragment>
				{!isReady &&
					<div className='ui medium centered text active inline loader'>{notReadyMessage ?? 'Loading data...'}</div>
				}
				{isReady &&
					<React.Fragment>
						{children}
					</React.Fragment>
				}
			</React.Fragment>
		);
	}
};

// Use Gatsby Head on each page instead of ReactHelmet in layout with Gatsby 4?
const DataPageHelmet = (props: { title: string | undefined}) => {
	const { title } = props;
	return (
		<StaticQuery
			query={query}
			render={(data) => (
				<Helmet titleTemplate={data.site.siteMetadata.titleTemplate} defaultTitle={data.site.siteMetadata.defaultTitle}>
					{title && <title>{title}</title>}
					<meta property='og:type' content='website' />
					<meta property='og:title' content={`${title ? `${title} - ` : ''}${data.site.siteMetadata.defaultTitle}`} />
					<meta property='og:site_name' content='DataCore' />
					<meta property='og:image' content={`${data.site.siteMetadata.baseUrl}/media/logo.png`} />
					<meta property='og:description' content={data.site.siteMetadata.defaultDescription} />
					<link id='defaultThemeCSS' rel='stylesheet' type='text/css' href={withPrefix('styles/semantic.slate.css')} />
					<link rel='stylesheet' type='text/css' href={withPrefix('styles/easymde.min.css')} />
					<script src={withPrefix('styles/theming.js')} type='text/javascript' />
					<script src={withPrefix('polyfills.js')} type='text/javascript' />
				</Helmet>
			)}
		/>
	);
};

type NavigationProps = {
	requestPlayerPanel: (panel: string | undefined) => void;
	requestClearPlayerData: () => void;
};


interface NavItem {
	title?: string,
	link?: string,
	tooltip?: string,
	src?: string,
	right?: boolean;
	icon?: SemanticICONS;
	subMenu?: NavItem[];
	customAction?: (data: NavItem) => void;
}

const Navigation = (props: NavigationProps) => {
	const pages = [
		{ title: 'Home', link: '/home', src: '/media/logo.png' },
		{ link: "/playertools?tool=fleetbossbattles", src: '/media/fbb.png', tooltip: "Fleet Boss Battles" },
		{ link: "/gauntlets", src: '/media/gauntlet.png', tooltip: "Gauntlets" },
		{ link: "/playertools?tool=voyage", src: '/media/voyage.png', tooltip: "Voyage Calculator" },
		{ title: 'Behold', link: '/behold' },
		{ title: 'Roster',
			subMenu: [
				{ title: 'Crew', link: '/' },
				{ title: 'Ships', link: '/playertools?tool=ships' },
				{ title: 'Owned Items', link: '/playertools?tool=items' },
				{ title: 'All Items', link: '/items' },
				{ title: 'Unneeded Items', link: '/playertools?tool=unneeded' },
			]
		},
		{ title: 'Game Info',
			subMenu: [
				{ title: 'Collections', link: '/collections' },
				{ title: 'Events', link: '/events' },
				{ title: 'Episodes', link: '/episodes' }
			]
		},
		{ title: 'Game Play',
			subMenu: [
				{ title: "Gauntlet", link: "/gauntlets" },
				{ title: "Fleet Boss Battles", link: "/playertools?tool=fleetbossbattles" },
				{ title: "Voyage Calculator", link: "/playertools?tool=voyage" },
				{ title: "Event Planner", link: "/playertools?tool=event-planner" },
				{ title: "Crew Retrieval", link: "/playertools?tool=crew-retrieval" },
				{ title: "Citation Optimizer", link: "/playertools?tool=cite-optimizer" },
				{ title: "Collections", link: "/playertools?tool=collections" },
				{ title: "Factions", link: "/playertools?tool=factions" },
			]
		},
		{ title: 'Stats',
			subMenu: [
				{ title: "Player Stats", link: "/playertools?tool=other" },
				{ title: "Charts & Stats", link: "/playertools?tool=charts" },
				{ title: "Misc Stats", link: "/stats" },
			]
		},
		{ title: 'Hall of Fame', link: '/hall_of_fame' },
		{ title: 'Worfle', link: '/crewchallenge' },
	] as NavItem[];


	const createSubMenu = (title: string, children: NavItem[], verticalLayout: boolean = false) => {
		const menuKey = title.toLowerCase().replace(/[^a-z0-9_]/g, '');
		if (verticalLayout) {
			return (
				<Menu.Item key={`/${menuKey}`}>
					<Menu.Header>{title}</Menu.Header>
					<Menu.Menu>
						{children.map(item => (
							<Menu.Item key={`${menuKey}${item.link}`} onClick={() => navigate(item.link ?? '')}>
								{item.title}
							</Menu.Item>
						))}
					</Menu.Menu>
				</Menu.Item>
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
			<Menu.Item key={'menu_'+idx+menuKey} style={{ padding: (!!page.src && !page.title) ? "0 0.5em" : "0 1.25em", height: "48px" }} className='link item'  onClick={() => navigate(page.link ?? '')}>
				<div title={page.tooltip ?? page.title} style={{display: 'flex', flexDirection: 'row', justifyContent: "center", alignItems: "center", margin: 0, padding: 0}}>
					{page.src && <img style={{height:'32px', margin: "0.5em", padding: 0}} alt={page.tooltip ?? page.title} src={page.src} />}
					{page.icon && <Icon name={page.icon} size={'small'} />}
					{page.title && <div>{page.title}</div>}
				</div>
			</Menu.Item>)
	}

	const menuItems = [] as JSX.Element[];
	const rightItems = [] as JSX.Element[];

	for (let page of pages) {
		if (page.right) continue;
		if (page.subMenu) {
			menuItems.push(createSubMenu(page.title ?? '', page.subMenu));
		}
		else {
			menuItems.push(drawMenuItem(page));
		}
	}
	for (let page of pages) {
		if (!page.right) continue;
		if (page.subMenu) {
			rightItems.push(createSubMenu(page.title ?? '', page.subMenu));
		}
		else {
			rightItems.push(drawMenuItem(page));
		}
	}
	const otherPages = useOtherPages();
	const about = [
		{ title: 'About DataCore', link: '/about' },
		{ title: 'Announcements', link: '/announcements' }
	] as NavItem[];

	otherPages.map((page) => {
		about.push(
			{ title: page.title, link: page.slug }
		);
	});

	menuItems.push(createSubMenu('About', about));


	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<Menu>
				{menuItems}
				<PlayerMenu
					requestPanel={props.requestPlayerPanel}
					requestClearData={props.requestClearPlayerData}
				/>
				<Menu.Menu position={'right'}>
					{rightItems}
				</Menu.Menu>
			</Menu>
		</div>
	);
};

export default DataPageLayout;

export const query = graphql`
	query {
		site {
			siteMetadata {
				defaultTitle: title
				titleTemplate
				defaultDescription: description
				baseUrl
			}
		}
	}
`;
