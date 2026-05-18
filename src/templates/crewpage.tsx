import React from 'react';
import { Helmet as HelmetDep } from 'react-helmet';
import { Divider, Image, Rating } from 'semantic-ui-react';

import { ClassicPresenter } from '../components/item_presenters/classic_presenter';

import DataPageLayout from '../components/page/datapagelayout';
import { GlobalContext } from '../context/globalcontext';
import { CompletionState, PlayerCrew } from '../model/player';
import { BuffStatTable } from '../utils/voyageutils';

import { useParams } from 'react-router-dom';
import { CrewQuipment } from '../components/crewpage/crewquipment';
import { CrewVariants } from '../components/crewpage/crewvariants';
import { EquipmentBuilds } from '../components/crewpage/equipmentbuilds';
import { Polestars } from '../components/crewpage/polestars';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { useStateWithStorage } from '../utils/storage';

const DEFAULT_MOBILE_WIDTH = 768;

export interface CrewPageOptions {
	key: string;
	text: string;
	value: string;
	content: React.ReactNode;
}

const CrewDetailsPage = () => {
	const { crew_symbol } = useParams();

	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			window.scrollTo(0, 0);
		}
	}, [crew_symbol]);

	return (
		<DataPageLayout pageTitle={''} demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet', 'keystones', 'event_instances']} narrowLayout={false}>
			<StaticCrewContent crew_symbol={crew_symbol} />
		</DataPageLayout>
	);
};

interface StaticCrewComponentProps {
	crew_symbol: string | undefined;
}

const StaticCrewContent = (props: StaticCrewComponentProps) => {
	let ownedCrew: PlayerCrew[] | undefined = undefined;
	let buffs: BuffStatTable | undefined = undefined;

	const [itemBig, setItemBig] = useStateWithStorage<boolean>('crew_item_big', false, { rememberForever: true });

	const context = React.useContext(GlobalContext);

	const location = `${document.location}`;

	if (context.player.playerData?.player?.character?.crew?.length) {
		ownedCrew = context.player.playerData.player.character.crew;
	}
	if (context.player.buffConfig) {
		buffs = context.player.buffConfig;
	}
	const { crew_symbol } = props;
	const { TRAIT_NAMES, CREW_ARCHETYPES } = context.localized;

	const symbol = crew_symbol;
	const crew = (context.core.crew.find(c => c.symbol === symbol)) as PlayerCrew;

	crew.immortal = CompletionState.DisplayAsImmortalStatic;

	crew.traits_named = crew.traits.map(t => TRAIT_NAMES[t]);
	crew.name = CREW_ARCHETYPES[crew.symbol]?.name ?? crew.name;
	crew.short_name = CREW_ARCHETYPES[crew.symbol]?.short_name ?? crew.short_name;

	if (ownedCrew) {
		let discovered = ownedCrew.filter(item => item.symbol === crew.symbol);
		if (discovered?.length) {
			let immortal = 0;
			for (let c of discovered) {
				if (c.immortal) {
					immortal = c.immortal;
					break;
				}
			}
			crew.immortal = immortal;
		}
	}

	const imageDoubleClick = () => {
		if (window.innerWidth < DEFAULT_MOBILE_WIDTH) return;
		setItemBig(!itemBig);

	}
	const Helmet = HelmetDep as any;

	return (
		<>
			<Helmet titleTemplate={`STT DataCore - ${crew.name}`} defaultTitle={`STT DataCore`}>
				<title>{crew.name}</title>
				<meta property='og:type' content='website' />
				<meta property='og:title' content={`${crew.name} - ${`STT`}`} />
				<meta property='og:site_name' content='DataCore' />
				<meta property='og:image' content={`${process.env.VITE_ASSETS_URL}${crew.imageUrlPortrait}`} />
				<meta property='og:description' content={`${crew.name} - ${`STT`}`} />
				<meta property='og:url' content={`${location}`} />
			</Helmet>
			<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
				<h2 style={{ display: "flex", flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row", alignItems: "center" }}>
					<div>{crew.name}</div>
					<div style={{ display: "block", marginRight: "0.5em", marginLeft: "0.5em" }}>
						<Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='large' disabled />
					</div>
				</h2>

				<div
					id='static_avatar'
					style={{
						display: "flex",
						width: '100%',
						gap: '1em',
						justifyContent: window.innerWidth < DEFAULT_MOBILE_WIDTH || itemBig ? "center" : "space-evenly",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH || itemBig ? "column" : "row",
						alignItems: window.innerWidth < DEFAULT_MOBILE_WIDTH || itemBig ? "center" : "flex-start"
					}}>
					<div style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "100%" : "24em"
					}}>
						<div>
							{crew.series && <Image src={`/media/series/${crew.series}.png`} size={window.innerWidth < DEFAULT_MOBILE_WIDTH || itemBig ? 'small' : 'small'} />}
						</div>
						<div style={{
							flexGrow: 1,
							display: "flex",
							flexDirection: window.innerWidth >= DEFAULT_MOBILE_WIDTH && !itemBig ? "column" : "row",
							justifyContent: "center"
						}}
							onDoubleClick={(e) => imageDoubleClick()}
							title={crew.name}
						>
							<img style={{
								cursor:
									window.innerWidth < DEFAULT_MOBILE_WIDTH ?
										"default" :
										itemBig ?
											"zoom-out" :
											"zoom-in",
								width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "75%" : "100%",
								marginRight: window.innerWidth >= DEFAULT_MOBILE_WIDTH ? "0.5em" : undefined
							}}
								src={`${process.env.VITE_ASSETS_URL}${crew.imageUrlFullBody}`}
								alt={crew.name}
							/>
							{(window.innerWidth >= DEFAULT_MOBILE_WIDTH && !itemBig) && (<i style={{ textAlign: "center", fontSize: "0.8em", color: "gray" }}>{"(double-click to enlarge)"}</i>)}
						</div>
					</div>
					<div style={{
						display: "flex",
						maxWidth: window.innerWidth < DEFAULT_MOBILE_WIDTH || itemBig ? '700px' : '500px',
						flexGrow: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : 1,
						flexDirection: "column",
					}}>
						<ClassicPresenter crew={crew} markdownRemark={``} />
					</div>
				</div>
			</div>
			<Divider horizontal hidden />
			<ItemHoverStat targetGroup={'crew_quipment'} />
			<Divider horizontal hidden style={{ marginTop: '4em' }} />
			<EquipmentBuilds crew={crew} />
			<Polestars crew={crew} />
			<CrewQuipment crew={crew} />
			<CrewVariants traits_hidden={crew.traits_hidden} short_name={crew.short_name} />
		</>
	);
}

export default CrewDetailsPage;
