import React from 'react';

import ProfileCrew from '../components/profile_crew';
import ProfileCrewMobile from '../components/profile_crew2';
import ProfileShips from '../components/profile_ships';
import ProfileItems from '../components/profile_items';
import ProfileOther from '../components/profile_other';
import ProfileCharts from '../components/profile_charts';

import CiteOptimizer from '../components/citeoptimizer';

import CrewRetrieval from '../components/crewretrieval';
import FactionInfo from '../components/factions';
import UnneededItems from '../components/unneededitems';
import FleetBossBattles from '../components/fleetbossbattles';

import { useStateWithStorage } from '../utils/storage';
import { PlayerCrew } from '../model/player';
import ShipProfile from '../components/ship_profile';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { navigate } from 'gatsby';
import { v4 } from 'uuid';

export interface PlayerTool {
	title: string;
	render: (props: { rand?: string, crew?: PlayerCrew, ship?: string, location?: any }) => JSX.Element;
	noMenu?: boolean;
}

export interface PlayerTools {
	[key: string]: PlayerTool;
}

export const playerTools: PlayerTools = {
	'crew': {
		title: 'Crew',
		render: ({ location }) => <ProfileCrew isTools={true} location={location} />
	},
	'crew-mobile': {
		title: 'Crew (mobile)',
		render: () => <ProfileCrewMobile isMobile={false} />
	},
	'crew-retrieval': {
		title: 'Crew Retrieval',
		render: () => <CrewRetrieval />
	},
	'cite-optimizer': {
		title: 'Citation Optimizer',
		render: () => <CiteOptimizer />
	},
	'fleetbossbattles': {
		title: 'Fleet Boss Battles',
		render: () => <FleetBossBattles />
	},
	'ships': {
		title: 'Ships',
		render: () => <ProfileShips />
	},
	'ship': {
		title: 'Ship Details',
		render: () => <ShipProfile />,
		noMenu: true
	},
	'factions': {
		title: 'Factions',
		render: () => <FactionInfo />
	},
	'items': {
		title: 'Items',
		render: () => <ProfileItems />
	},
	'unneeded': {
		title: 'Unneeded Items',
		render: () => <UnneededItems />
	},
	'other': {
		title: 'Other',
		render: () => <ProfileOther />
	},
	'charts': {
		title: 'Charts & Stats',
		render: () => <ProfileCharts />
	},
	'fwdgaunt': {
		title: "Gauntlets",
		render: () => <>{navigate("/gauntlets")}</>,
		noMenu: true
	}
};


const PlayerToolsPage = (props: any) => {

	const [pageTitle, setPageTitle] = React.useState("Player Tools");

	return (
		<DataPageLayout pageTitle={pageTitle} demands={['ship_schematics', 'crew', 'items', 'skill_bufs','cadet']} playerPromptType='require'>
				<PlayerToolsComponent pageTitle={pageTitle} setPageTitle={setPageTitle} location={props.location} />
		</DataPageLayout>
	);
};

export interface PlayerToolsProps {
	location: any;
	setPageTitle: (value: string) => void;
	pageTitle: string;
}

const PlayerToolsComponent = (props: PlayerToolsProps) => {
	const mergedContext = React.useContext(GlobalContext);
	// The context above

	const { playerShips, playerData } = mergedContext.player;
	const { dataSource, ephemeral } = mergedContext.player;

	const [rand, setRand] = React.useState(v4());

	React.useEffect(() => {
		setRand(v4());
	}, [playerData, ephemeral]);

	// Profile data ready, show player tool panes
	if (playerData && dataSource && dataSource && ephemeral && playerShips && !!rand) {
		return (<PlayerToolsPanes pageProps={props} rand={rand} />);
	}
	else {
		return <></>
	}
}

type PlayerToolsPanesProps = {
	rand: string;
	pageProps: PlayerToolsProps;
};

const PlayerToolsPanes = (props: PlayerToolsPanesProps) => {
	const context = React.useContext(GlobalContext);

	const { playerShips } = context.player;
	const { pageTitle, setPageTitle } = props.pageProps;

	const [activeTool, setActiveTool] = React.useState('');
	const [selectedShip, setSelectedShip] = useStateWithStorage<string | undefined>('tools/selectedShip', undefined);
	const { rand } = props;

	const tools = playerTools;
	React.useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('tool') && tools[urlParams.get('tool') as string])
			setActiveTool(urlParams.get('tool') as string);

		if (urlParams.has('ship')) {
			setSelectedShip(urlParams.get('ship') ?? undefined);
		}
		else {
			setSelectedShip(undefined);
		}
	}, [window.location.search]);

	let tt: string | undefined = undefined;

	React.useEffect(() => {
		if ((activeTool != '') && tools[activeTool].title !== pageTitle) {
			setPageTitle(tools[activeTool].title);		
		}
	}, [activeTool]);
	
	if ((activeTool != '') && tools[activeTool].title === 'Ship Page' && selectedShip) {
		let s = playerShips?.find((sp) => sp.symbol === selectedShip);
		if (s) {
			tt = s.name;
		}
	}

	return (
		<>
			<React.Fragment>
				{((activeTool ?? "") != "") ? tools[activeTool].render({ rand }) : ""}
			</React.Fragment>
		</>
	);
}

export default PlayerToolsPage;
