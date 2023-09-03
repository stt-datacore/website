import React from 'react';
import { Link, withPrefix, StaticQuery, graphql } from 'gatsby';
import { Helmet } from 'react-helmet';

import { GlobalContext } from '../context/globalcontext';
import { ValidDemands } from '../context/datacontext';

import { PlayerMenu } from './playerdata/playermenu';
import PlayerHeader from './playerdata/playerheader';
import { Container } from 'semantic-ui-react';

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
			<PlayerHeader
				promptType={playerPromptType ?? 'none'}
				playerPanel={playerPanel}
				setPlayerPanel={setPlayerPanel}
			/>
			{renderContents()}
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
						<MainContent narrowLayout={narrowLayout}>
							{children}
						</MainContent>
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

const Navigation = (props: NavigationProps) => {
	const pages = [
		{ title: 'Home', link: '/' },
		{ title: 'Behold', link: '/behold' },
		{ title: 'Events', link: '/events' },
		{ title: 'Collections', link: '/collections' },
		{ title: 'Items', link: '/items' },
		{ title: 'Gauntlets', link: '/gauntlets' },
		{ title: 'Misc stats', link: '/stats' },
		{ title: 'Episodes', link: '/episodes' },
		{ title: 'Hall of Fame', link: '/hall_of_fame' },
		{ title: 'Worfle', link: '/crewchallenge' }
	];

	return (
		<div style={{ display: 'flex', flexDirection: 'row' }}>
			<ul>
				{pages.map(page => <li key={page.link}><Link to={page.link}>{page.title}</Link></li>)}
			</ul>
			<PlayerMenu
				requestPanel={props.requestPlayerPanel}
				requestClearData={props.requestClearPlayerData}
			/>
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
