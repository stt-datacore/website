import React from 'react';

import { ValidDemands } from '../../context/datacontext';
import { GlobalContext } from '../../context/globalcontext';

import { Container, Header } from 'semantic-ui-react';
import PlayerHeader from '../../components/playerdata/playerheader';
import { EnergyLogContextProvider } from '../../context/energylogcontext';
import { AlertProvider } from '../alerts/alertprovider';
import Dashboard from './dashboard';
import { Navigation } from './navigation';

const DEBUG_MODE = false;

export interface DataPageLayoutProps {
	children: React.ReactNode;

	pageId?: string;

	/**
	 * Title of the page, for use in both datapage header, title, and meta tags
	 */
	pageTitle?: string;
	pageTitleJSX?: React.ReactNode;

	/**
	 * One or two-sentence description of the page, for use in both datapage header and meta tags
	 */
	pageDescription?: string;
	pageDescriptionJSX?: React.ReactNode;

	/**
	 * Default demands are crew, items, all_ships, all_buffs, and cadet
	 */
	demands?: ValidDemands[]

	notReadyMessage?: string;

	narrowLayout?: boolean;

	/** default is true */
	initPlayerData?: boolean;

	suppressTitleDisplay?: boolean;
	suppressPlayerHeader?: boolean;
	suppressMetaTags?: boolean;
	playerPromptType?: 'require' | 'recommend' | 'none';
};

const MainContent = ({ children, narrowLayout }) => {
	if (DEBUG_MODE) console.log("MainContent component render");

	return (<>
		{narrowLayout ? (
			<Container text style={{ marginTop: '4em', paddingBottom: '2em', marginBottom: '2em' }}>{children}</Container>
		) : (
			<Container style={{ marginTop: '4em', marginBottom: '2em' }}>{children}</Container>
		)}
	</>);

}

// const getNavigatorLanguage = () => {
// 	let lang = 'en';
// 	if (typeof navigator !== 'undefined') {
// 		lang = navigator.language.slice(0, 2).toLowerCase();
// 		if (lang === 'es') lang = 'sp';
// 	}
// 	return 'en';
// 	// if (!['sp', 'en', 'fr', 'de'].includes(lang)) lang = 'en';
// 	// return lang;
// }

const DataPageLayout = <T extends DataPageLayoutProps>(props: T) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;

	const { children, pageTitle, pageTitleJSX, pageDescriptionJSX, pageDescription, notReadyMessage, narrowLayout, playerPromptType, suppressTitleDisplay, suppressPlayerHeader, suppressMetaTags } = props;

	const [isReady, setIsReady] = React.useState(false);
	const [dashboardPanel, setDashboardPanel] = React.useState<string | undefined>(undefined);
	const [playerPanel, setPlayerPanel] = React.useState<string | undefined>(undefined);

	React.useEffect(() => {
		const demands: ValidDemands[] = props.demands ?? [];
		(['crew', 'collections', 'items', 'all_ships', 'all_buffs', 'cadet'] as ValidDemands[]).forEach(required => {
			if (!demands.includes(required))
				demands.push(required);
		});
		if (DEBUG_MODE) console.log("Invoke readyLocalizedCore");
		// Fetch core data AND localize it before datapage can access it
		globalContext.readyLocalizedCore(demands, () => {
			if (DEBUG_MODE) console.log("setIsReady(true)");
			setIsReady(true);
		});
	}, []);

	// topAnchor div styled to scroll properly with a fixed header
	const topAnchor = React.useRef<HTMLDivElement>(null);
	const contentAnchor = React.useRef<HTMLDivElement>(null);

	if (DEBUG_MODE) console.log("DataPageLayout component render");

	return (
		<AlertProvider>
			<div ref={topAnchor} style={{ paddingTop: '60px', marginTop: '-60px' }}>

				{!suppressMetaTags && (
					<DataPageMeta
						title={pageTitle}
						description={pageDescription}
					/>
				)}
				<Navigation
					sidebarTarget={topAnchor as any}
					requestPanel={(target: string, panel: string | undefined) => {
						if (target === 'player') {
							setPlayerPanel(panel);
							if (panel) scrollTo(contentAnchor as any);
						}
						else if (target === 'dashboard') {
							setDashboardPanel(panel);
							if (panel) scrollTo(topAnchor as any);
						}
					}}
				>
					<EnergyLogContextProvider>
						<MainContent narrowLayout={narrowLayout}>
							{!suppressPlayerHeader && <Dashboard
								openInputPanel={() => {
									setPlayerPanel('input');
									scrollTo(contentAnchor as any);
								}}
								narrow={narrowLayout ?? false}
								activePanel={dashboardPanel}
								setActivePanel={setDashboardPanel}
							/>}
							<div ref={contentAnchor} style={{ paddingTop: '60px', marginTop: '-60px' }}>
								{(!!pageTitleJSX || !!pageTitle) && !suppressTitleDisplay && (
									<React.Fragment>
										<Header as='h2'>{pageTitleJSX || pageTitle}</Header>
										{(!!pageDescriptionJSX || !!pageDescription) && <p>{pageDescriptionJSX || pageDescription}</p>}
									</React.Fragment>
								)}
								{!!isReady && !suppressPlayerHeader && <PlayerHeader
									promptType={playerPromptType ?? 'none'}
									activePanel={playerPanel}
									setActivePanel={setPlayerPanel}
								/>}
								{renderContents()}
							</div>
						</MainContent>
					</EnergyLogContextProvider>
				</Navigation>
			</div>
		</AlertProvider>
	);

	function renderContents(): React.ReactNode {
		if (DEBUG_MODE) console.log("renderContents()");
		return (
			<React.Fragment>
				{!isReady &&
					<div className='ui medium centered text active inline loader'>{notReadyMessage ?? t('spinners.default')}</div>
				}
				{isReady &&
					<React.Fragment>
						{children}
					</React.Fragment>
				}
			</React.Fragment>
		);
	}

	function scrollTo(anchorDiv: React.RefObject<HTMLDivElement>): void {
		if (!anchorDiv.current) return;
		anchorDiv.current.scrollIntoView({
			behavior: 'smooth'
		});
	}
};

type DataPageMetaProps = {
	title: string | undefined;
	description: string | undefined;
};

const DataPageMeta = (props: DataPageMetaProps) => {
	const { title, description } = props;
	const baseUrl = `${document.location.origin}`;

	const pageTitle = title ? `STT DataCore - ${title}` : 'STT DataCore';
	return (
		<>
			{title && <title>{pageTitle}</title>}
			<meta property='og:type' content='website' />
			<meta property='og:title' content={pageTitle} />
			<meta property='og:site_name' content='Star Trek Timelines DataCore' />
			<meta property='og:image' content={`${baseUrl}/media/logo.png`} />
			{description && <meta property='og:description' content={description} />}
		</>
	);
};

export default DataPageLayout;
