import React from 'react';
import { withPrefix, StaticQuery, graphql } from 'gatsby';
import { Helmet } from 'react-helmet';

import { GlobalContext } from '../../context/globalcontext';
import { ValidDemands } from '../../context/datacontext';

import { Container, Header } from 'semantic-ui-react';
import { Navigation } from './navigation';
import Dashboard from './dashboard';
import PlayerHeader from '../../components/playerdata/playerheader';

export interface DataPageLayoutProps {
	children: JSX.Element;

	pageId?: string;

	/**
	 * Title of the page, for use in both datapage header, title, and meta tags
	 */
	pageTitle?: string;

	/**
	 * One or two-sentence description of the page, for use in both datapage header and meta tags
	 */
	pageDescription?: string;

	/**
	 * Default demands are crew, items, ship_schematics, all_buffs, and cadet
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
	const { children, pageId, pageTitle, pageDescription, notReadyMessage, narrowLayout, playerPromptType } = props;

	const demands = props.demands ?? [] as ValidDemands[];
	(['crew', 'items', 'ship_schematics', 'all_buffs', 'cadet'] as ValidDemands[]).forEach(required => {
		if (!demands.includes(required))
			demands.push(required);
	});
	const isReady = !!globalContext.core.ready && !!globalContext.core.ready(demands);

	const [dashboardPanel, setDashboardPanel] = React.useState<string | undefined>(undefined);
	const [playerPanel, setPlayerPanel] = React.useState<string | undefined>(undefined);

	// topAnchor div styled to scroll properly with a fixed header
	const topAnchor = React.useRef<HTMLDivElement>(null);
	const contentAnchor = React.useRef<HTMLDivElement>(null);
	return (
		<div ref={topAnchor} style={{ paddingTop: '60px', marginTop: '-60px' }}>
			<DataPageHelmet
				title={pageTitle}
				description={pageDescription}
			/>
			<Navigation
				sidebarTarget={topAnchor}
				requestPanel={(target: string, panel: string | undefined) => {
					if (target === 'player') {
						setPlayerPanel(panel);
						if (panel) scrollTo(contentAnchor);
					}
					else if (target === 'dashboard') {
						setDashboardPanel(panel);
						if (panel) scrollTo(topAnchor);
					}
				}}
			>
				<MainContent narrowLayout={narrowLayout}>
					<Dashboard
						activePanel={dashboardPanel}
						setActivePanel={setDashboardPanel}
					/>
					<div ref={contentAnchor} style={{ paddingTop: '60px', marginTop: '-60px' }}>
						{pageTitle && (
							<React.Fragment>
								<Header as='h2'>{pageTitle}</Header>
								{pageDescription && <p>{pageDescription}</p>}
							</React.Fragment>
						)}
						<PlayerHeader
							promptType={playerPromptType ?? 'none'}
							activePanel={playerPanel}
							setActivePanel={setPlayerPanel}
						/>
						{renderContents()}
					</div>
				</MainContent>
			</Navigation>
		</div>
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

	function scrollTo(anchorDiv: React.RefObject<HTMLDivElement>): void {
		if (!anchorDiv.current) return;
		anchorDiv.current.scrollIntoView({
			behavior: 'smooth'
		});
	}
};

// Use Gatsby Head on each page instead of ReactHelmet in layout with Gatsby 4?
type DataPageHelmetProps = {
	title: string | undefined;
	description: string | undefined;
};

const DataPageHelmet = (props: DataPageHelmetProps) => {
	const { title, description } = props;
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
					<meta property='og:description' content={description ?? data.site.siteMetadata.defaultDescription} />
					<link id='defaultThemeCSS' rel='stylesheet' type='text/css' href={withPrefix('styles/semantic.slate.css')} />
					<link rel='stylesheet' type='text/css' href={withPrefix('styles/easymde.min.css')} />
					<script src={withPrefix('styles/theming.js')} type='text/javascript' />
					<script src={withPrefix('polyfills.js')} type='text/javascript' />
				</Helmet>
			)}
		/>
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
