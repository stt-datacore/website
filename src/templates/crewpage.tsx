import React, { Component } from 'react';
import { Helmet as HelmetDep } from 'react-helmet';
import { Image, Divider, Rating, Button, Icon } from 'semantic-ui-react';
import { graphql, navigate } from 'gatsby';

import { ClassicPresenter } from '../components/item_presenters/classic_presenter';

import { CompletionState, PlayerCrew } from '../model/player';
import { TinyStore } from '../utils/tiny';
import { BuffStatTable } from '../utils/voyageutils';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { EquipmentBuilds } from '../components/crewpage/equipmentbuilds';
import { Polestars } from '../components/crewpage/polestars';
import { CrewVariants } from '../components/crewpage/crewvariants';
import { CrewQuipment } from '../components/crewpage/crewquipment';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';

const DEFAULT_MOBILE_WIDTH = 768;

export interface CrewPageOptions {
	key: string;
	text: string;
	value: string;
	content: JSX.Element;
}

type StaticCrewPageProps = {
	data: {
		site: {
			siteMetadata: {
				titleTemplate: string;
				defaultTitle: string;
				defaultDescription: string;
				baseUrl: string;
			}
		};
		markdownRemark: {
			html: string;
			frontmatter: {
				name: string;
				memory_alpha: string;
				bigbook_tier?: number;
				events?: number;
				in_portal?: boolean;
				published: boolean;
			};
			rawMarkdownBody: string;
		};
		crewJson: any;
	};
	location: {
		pathname: string;
	}
};

const StaticCrewPage = (props: StaticCrewPageProps) => {

	return (
		<DataPageLayout pageTitle={''} demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet', 'keystones']} narrowLayout={false}>
			<StaticCrewComponent props={props} />
		</DataPageLayout>
	);
};

type StaticCrewComponentState = {
	commentMarkdown: string;
	comments: any[];
	itemBig: boolean;
};

interface StaticCrewComponentProps {
	props: StaticCrewPageProps;
}

class StaticCrewComponent extends Component<StaticCrewComponentProps, StaticCrewComponentState> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;

	constructor(props: StaticCrewComponentProps | Readonly<StaticCrewComponentProps>) {
		super(props);
		this.state = {
			commentMarkdown: '', // TODO: load
			comments: [],
			itemBig: this.stash.getValue('crew_static_big', false) ?? false
		};
	}

	owned: PlayerCrew[] | undefined = undefined;
	ownedCrew: PlayerCrew[] | undefined = undefined;
	buffs: BuffStatTable | undefined = undefined;
	readonly stash = TinyStore.getStore('staticStash', false, true);

	componentWillUnmount(): void {
		window.removeEventListener('keydown', (e) => this._windowKey(e))
		window.removeEventListener('resize', (e) => this._windowSize(e))
	}

	componentDidMount() {
		window.addEventListener('keydown', (e) => this._windowKey(e))
		window.addEventListener('resize', (e) => this._windowSize(e))
	}
	_getCurrentUsername() {
		const windowGlobal = typeof window !== 'undefined' && window;
		let isLoggedIn = windowGlobal && window.localStorage && window.localStorage.getItem('token') && window.localStorage.getItem('username');
		return isLoggedIn ? window.localStorage.getItem('username') : '';
	}

	_windowKey = (e: KeyboardEvent) => {

		if (e.key === "Escape") {
			if (this.state.itemBig) {
				this.setState({ ...this.state, itemBig: !this.state.itemBig });
			}
		}
	}

	_windowSize = (e: Event) => {
		this.setState({ ... this.state });
	}

	render() {
		const { location } = this.props.props;
		const { markdownRemark, site: { siteMetadata } } = this.props.props.data;


		if (this.context.player.playerData?.player?.character?.crew?.length) {
			this.ownedCrew = this.context.player.playerData.player.character.crew;
		}
		if (this.context.player.buffConfig) {
			this.buffs = this.context.player.buffConfig;
		}

		// if (crewJson.edges.length === 0) {
		// 	return <span>Crew not found!</span>;
		// }

		const { comments } = this.state;
		const { TRAIT_NAMES, CREW_ARCHETYPES } = this.context.localized;
		let hasBigBookEntry = markdownRemark && markdownRemark.frontmatter && markdownRemark.frontmatter.published;

		const userName = this._getCurrentUsername();

		const symbol = this.props.props.location.pathname.replace("/crew/", "").replace("/", "");

		const crew = (this.context.core.crew.find(c => c.symbol === symbol)) as PlayerCrew;
		//const crewFind = this.context.core.crew.find(f => f.symbol === crew.symbol);

		//crew.obtained = crewFind?.obtained ?? "Unknown";
		crew.immortal = CompletionState.DisplayAsImmortalStatic;

		crew.traits_named = crew.traits.map(t => TRAIT_NAMES[t]);
		crew.name = CREW_ARCHETYPES[crew.symbol]?.name ?? crew.name;
		crew.short_name = CREW_ARCHETYPES[crew.symbol]?.short_name ?? crew.short_name;

		if (this.ownedCrew) {
			let discovered = this.ownedCrew.filter(item => item.symbol === crew.symbol);
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

		// if (markdownRemark && markdownRemark.frontmatter) {
		// 	crew.bigbook_tier = markdownRemark.frontmatter.bigbook_tier ?? 0;
		// }


		const imageDoubleClick = () => {
			if (window.innerWidth < DEFAULT_MOBILE_WIDTH) return;
			this.stash.setValue('crew_static_big', !this.state.itemBig, true);
			this.setState({ ...this.state, itemBig: !this.state.itemBig });
		}
		const Helmet = HelmetDep as any;
		return (
			<>
				<Helmet titleTemplate={siteMetadata.titleTemplate} defaultTitle={siteMetadata.defaultTitle}>
					<title>{crew.name}</title>
					<meta property='og:type' content='website' />
					<meta property='og:title' content={`${crew.name} - ${siteMetadata.defaultTitle}`} />
					<meta property='og:site_name' content='DataCore' />
					<meta property='og:image' content={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
					<meta property='og:description' content={markdownRemark.rawMarkdownBody.trim() || siteMetadata.defaultDescription} />
					<meta property='og:url' content={`${siteMetadata.baseUrl}${location.pathname}`} />
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
							//maxWidth: "700px",
							width: '100%',
							gap: '1em',
							justifyContent: window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? "center" : "space-evenly",
							flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? "column" : "row",
							alignItems: window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? "center" : "flex-start"
						}}>
						<div style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "100%" : "24em"
						}}>
							<div>
								{crew.series && <Image src={`/media/series/${crew.series}.png`} size={window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? 'small' : 'small'} />}
							</div>
							<div style={{
								flexGrow: 1,
								display: "flex",
								flexDirection: window.innerWidth >= DEFAULT_MOBILE_WIDTH && !this.state.itemBig ? "column" : "row",
								justifyContent: "center"
							}}
								onDoubleClick={(e) => imageDoubleClick()}
								title={crew.name}
							>
								<img style={{
									cursor:
										window.innerWidth < DEFAULT_MOBILE_WIDTH ?
											"default" :
											this.state.itemBig ?
												"zoom-out" :
												"zoom-in",
									width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "75%" : "100%",
									marginRight: window.innerWidth >= DEFAULT_MOBILE_WIDTH ? "0.5em" : undefined
								}}
									src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`}
									alt={crew.name}
								/>
								{(window.innerWidth >= DEFAULT_MOBILE_WIDTH && !this.state.itemBig) && (<i style={{ textAlign: "center", fontSize: "0.8em", color: "gray" }}>{"(double-click to enlarge)"}</i>)}
							</div>
						</div>
						<div style={{
							display: "flex",
							maxWidth: window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? '700px' : '500px',
							flexGrow: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : 1,
							flexDirection: "column",
						}}>
							<ClassicPresenter crew={crew} markdownRemark={markdownRemark} />
							{false &&
								<div style={{ margin: '1em 0', textAlign: 'right' }}>
									{(crew.immortal !== undefined && crew.immortal !== CompletionState.DisplayAsImmortalStatic) &&
										(<h3><a style={{ color: 'lightgreen', cursor: "pointer" }} onClick={(e) => navigate("/playertools?tool=crew&search=" + crew.name)} title="Click to see crew in roster">OWNED</a></h3>)
										||
										<Button fluid onClick={() => { this._addProspect(crew); }}>
											<Icon name='add user' color='green' />
											Preview {crew.short_name} in your roster
										</Button>
									}
								</div>
							}
						</div>
					</div>
				</div>
				<Divider horizontal hidden />
				{hasBigBookEntry && (
					<React.Fragment>
						<div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />
						{/* {!!crew.markdownInfo &&
							<div style={{ textAlign: "right" }}>
								<i style={{ fontSize: "0.85em" }}>- {crew.markdownInfo.author} ({(new Date(crew.markdownInfo.modified)).toLocaleDateString()})</i>
							</div>} */}
						{/* <div style={{ marginTop: '1em', textAlign: 'right' }}>
							— <a href={`https://www.bigbook.app/crew/${crew.symbol}`}>The Big Book of Behold Advice</a>
						</div> */}
					</React.Fragment>
				)}
				<ItemHoverStat targetGroup={'crew_quipment'} />
				<Divider horizontal hidden style={{ marginTop: '4em' }} />
				<EquipmentBuilds crew={crew} />
				<Polestars crew={crew} />
				<CrewQuipment crew={crew} />
				<CrewVariants traits_hidden={crew.traits_hidden} short_name={crew.short_name} />
			</>
		);
	}

	_handleMarkDownChange(value: string) {
		this.setState({ commentMarkdown: value });
	}

	async _saveComment(symbol: string, token: string) {
		const { commentMarkdown } = this.state;

		fetch(`${process.env.GATSBY_DATACORE_URL}api/savecomment`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ token, symbol, markdown: commentMarkdown })
		})
			.then(response => response.json())
			.then(res => {
				console.log(res);
			})
			.catch(err => {
				console.error(err);
			});
	}

	_addProspect(crew: any): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: [crew.symbol]
		};
		navigate(linkUrl, { state: linkState });
	}
}

export default StaticCrewPage;

export const query = graphql`
	query($slug: String!) {
		site {
			siteMetadata {
				defaultTitle: title
				titleTemplate
				defaultDescription: description
				baseUrl
			}
		}
		markdownRemark(fields: { slug: { eq: $slug } }) {
			rawMarkdownBody
			html
			frontmatter {
				name
				memory_alpha
				bigbook_tier
				events
				in_portal
				published
			}
		}
	}
`;
