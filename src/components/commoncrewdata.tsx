import React, { Component } from 'react';
import { Header, Segment, Accordion, Statistic, Grid, Image, Label, Rating, StatisticGroup, Divider } from 'semantic-ui-react';

import { graphql, Link, navigate } from 'gatsby';

import CrewStat from '../components/crewstat';
import CONFIG from '../components/CONFIG';

import { getCoolStats } from '../utils/misc';
import { formatTierLabel, gradeToColor, prettyObtained, printPortalStatus } from '../utils/crewutils';
import CABExplanation from './cabexplanation';
import { CrewMember } from '../model/crew';
import { PlayerCrew } from '../model/player';
import { ShipSkill } from './item_presenters/shipskill';
import { DEFAULT_MOBILE_WIDTH } from './hovering/hoverstat';

const isWindow = typeof window !== 'undefined';

export type StatLabelProps = {
	title: string;
	value: number | string | JSX.Element;
	size?: 'small' | 'medium' | 'large' | 'jumbo'
};

class StatLabel extends Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		const size = this.props.size ?? 'medium';

		const getPadding = () => {
			if (isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH) {
				if (size === 'jumbo') {
					return "0.5em";
				}
				return undefined;
			}
			else {
				switch (size) {
					case "small": 
						return "0.27em";
					case "medium":
						return "0.65em";
					case "large":
						return "0.7em";
					case "jumbo":
						return "1em";
					default:
						return "0.65em";
				}
			}
		}

		const getFontSize = () => {
			if (isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH) {
				if (size === 'jumbo') {
					return "14pt";
				}
				return undefined;
			}
			else {
				switch (size) {
					case "small": 
						return "10pt";
					case "medium":
						return "12pt";
					case "large":
						return "14pt";
					case "jumbo":
						return "16pt";
					default:
						return "12pt";
				}
			}
		}

		return (
			<Label size="large" style={{ 
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexDirection: "row", 
					marginBottom: '0.5em', 
					width: 'calc(50% - 4px)', 
					marginLeft: 0, 
					marginRight: 0, 
					fontSize: getFontSize(),
					padding: getPadding(),					
					marginTop: 0 }}>
				{title}
				<div>
					<Label.Detail>{<div style={{fontSize: size === 'jumbo' && isWindow && window.innerWidth >= DEFAULT_MOBILE_WIDTH ? '2em' : undefined}}> {value}</div>}</Label.Detail>
				</div>
			</Label>
		);
	}
}

type CommonCrewDataProps = {
	crew: CrewMember | PlayerCrew;
	markdownRemark?: any;
	compact?: boolean;
	ultraCompact?: boolean;
	crewDemands?: any;
	roster?: PlayerCrew[];
};

class CommonCrewData extends Component<CommonCrewDataProps> {
	render() {
		const { markdownRemark, crew, compact, crewDemands, roster, ultraCompact } = this.props;

		let panels = [
			{
				index: 0,
				key: 0,
				title: getCoolStats(crew, false),
				content: { content: <div style={{ paddingBottom: '1em' }}>{this.renderOtherRanks(crew)}</div> }
			}
		];

		if (roster && roster.length > 0) {
			panels.push(
				{
					index: 1,
					key: 1,
					title: this.rosterComparisonTitle(crew, roster),
					content: { content: <div style={{ paddingBottom: '1em' }}>{this.renderOtherRanks(crew, roster)}</div> }
				});
		}

		return (
			<React.Fragment>
				{!ultraCompact &&
				((compact) ? (
					<div style={{display:"flex", width: "100%", flexDirection: "row", justifyContent: "space-evenly", alignItems: "center"}}>
					<Segment>
						<Grid columns={2}>
							<Grid.Column width={4}>
								<Image src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`} size="tiny" />
							</Grid.Column>
							<Grid.Column width={12}>
								<CrewStat
									skill_name="security_skill"
									data={crew.base_skills.security_skill}
									scale={compact ? 0.75 : 1}
								/>
								<CrewStat 
									skill_name="command_skill" 
									data={crew.base_skills.command_skill} 
									scale={compact ? 0.75 : 1} />
								<CrewStat
									skill_name="diplomacy_skill"
									data={crew.base_skills.diplomacy_skill}
									scale={compact ? 0.75 : 1}
								/>
								<CrewStat 
									skill_name="science_skill" 
									data={crew.base_skills.science_skill} 
									scale={compact ? 0.75 : 1} />
								<CrewStat
									skill_name="medicine_skill"
									data={crew.base_skills.medicine_skill}
									scale={compact ? 0.75 : 1}
								/>
								<CrewStat
									skill_name="engineering_skill"
									data={crew.base_skills.engineering_skill}
									scale={compact ? 0.75 : 1}
								/>
							</Grid.Column>
						</Grid>
					</Segment>
					</div>
				) : (
						<Segment>
						<div style={{
								display:"flex", 
								width: "100%", 
								flexDirection: isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row", 
								justifyContent: "space-evenly",
								}}>
							{crew.base_skills.security_skill && 
							<CrewStat 
								skill_name="security_skill" 
								data={crew.base_skills.security_skill} 
								scale={compact ? 0.75 : 1} />
							}
							{crew.base_skills.command_skill && 
							<CrewStat 
								skill_name="command_skill" 
								data={crew.base_skills.command_skill} 
								scale={compact ? 0.75 : 1} />
							}
							{crew.base_skills.diplomacy_skill && 
							<CrewStat 
								skill_name="diplomacy_skill" 
								data={crew.base_skills.diplomacy_skill} 
								scale={compact ? 0.75 : 1} />
							}
							{crew.base_skills.science_skill && 
							<CrewStat 
								skill_name="science_skill" 
								data={crew.base_skills.science_skill} 
								scale={compact ? 0.75 : 1} />
							}
							{crew.base_skills.medicine_skill && 
							<CrewStat 
								skill_name="medicine_skill" 
								data={crew.base_skills.medicine_skill} 
								scale={compact ? 0.75 : 1} />
							}
							{crew.base_skills.engineering_skill && 
							<CrewStat
								skill_name="engineering_skill"
								data={crew.base_skills.engineering_skill}
								scale={compact ? 0.75 : 1}
							/>
							}
						</div>
						</Segment>
					))}

				{crew.skill_data && crew.skill_data.length > 0 && (
					<Accordion
						defaultActiveIndex={-1}
						panels={[
							{
								index: 0,
								key: 0,
								title: 'Other fuse levels',
								content: {
									content: (
										<Segment.Group raised>
											{crew.skill_data.map((sk: any, idx: number) => (
												<Segment key={idx}>
													<div style={{
														display:"flex", 
														width: "100%", 
														flexDirection: isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row", 
														justifyContent: "space-between",
														flexWrap: "wrap",								
														}}>
													<div style={{display:"block"}}>
													<Rating
														defaultRating={sk.rarity}
														maxRating={crew.max_rarity}
														icon="star"
														size="small"
														disabled
													/>
													</div>
													<CrewStat skill_name="security_skill" data={sk.base_skills.security_skill} scale={0.75} />
													<CrewStat skill_name="command_skill" data={sk.base_skills.command_skill} scale={0.75} />
													<CrewStat skill_name="diplomacy_skill" data={sk.base_skills.diplomacy_skill} scale={0.75} />
													<CrewStat skill_name="science_skill" data={sk.base_skills.science_skill} scale={0.75} />
													<CrewStat skill_name="medicine_skill" data={sk.base_skills.medicine_skill} scale={0.75} />
													<CrewStat
														skill_name="engineering_skill"
														data={sk.base_skills.engineering_skill}
														scale={0.75}
													/>
													</div>
												</Segment>
											))}
										</Segment.Group>
									)
								}
							}
						]}
					/>
				)}

				{crew.flavor && !compact && <p>{crew.flavor}</p>}

				{!compact && 
				
				<div style={{fontSize: "10pt", marginTop: "1em"}}>
					<h4 style={{ marginBottom: '.25em' }}>Ship Ability</h4>
					<hr></hr>
					<ShipSkill context={crew} />
				</div>

				}

				{(compact && !ultraCompact) && (
					<div style={{ textAlign: 'center' }}>
						<StatLabel title="Voyage rank" value={crew.ranks.voyRank} />
						<StatLabel title="Gauntlet rank" value={crew.ranks.gauntletRank} />
						<StatLabel title="Big book tier" value={formatTierLabel(crew)} />
						{markdownRemark && markdownRemark.frontmatter.events !== null && (
							<StatLabel title="Events" value={markdownRemark.frontmatter.events} />
						)}
					</div>
				)}
				{!compact && (
					<>
					
						<div style={{
							display: "flex", 
							flexDirection: "row", 
							justifyContent:"space-between", 
							alignItems: "center",
							margin: "0.25em",
							marginBottom: 0,
							marginRight: 0,
							marginLeft: 0,
							flexWrap: "wrap"}}>
							<StatLabel
                                title="Big Book Tier"
								size='jumbo'
                                value={<div
                                    style={{
                                        fontWeight: "bold",
                                        color: gradeToColor(
                                            crew.bigbook_tier
                                        ) ?? undefined,
                                    }}
                                >
                                    {formatTierLabel(crew)}
                                </div>}
                            />
							<StatLabel
                                title="CAB Grade"
								size='jumbo'
                                value={
                                    <div
                                        style={{
                                            fontWeight: "bold",
                                            color: gradeToColor(
                                                crew.cab_ov_grade as string
                                            ) ?? undefined,
                                        }}
                                    >
                                        {crew.cab_ov_grade ?? '?'}
                                    </div>
                                }
                            />
							<StatLabel title="Voyage Rank"
								value={rankLinker(false, crew.ranks.voyRank, crew.symbol, 'ranks.voyRank')}/>
							<StatLabel title="Gauntlet Rank"
								value={rankLinker(false, crew.ranks.gauntletRank, crew.symbol, 'ranks.gauntletRank')}/>
						</div>
						
						<div style={{
							display: "flex", 
							margin: "0.25em",
							marginTop: 0,
							marginRight: 0,
							marginLeft: 0,
							flexDirection: "row", 
							justifyContent:"space-between", 
							alignItems: "center",
							flexWrap: "wrap"}}>
							
							<StatLabel 
									title="CAB Rank"
									value={crew.cab_ov_rank ? rankLinker(false, crew.cab_ov_rank, crew.symbol, 'cab_ov', 'descending', 'rarity:'+crew.max_rarity) : '?'}
									/>
							<StatLabel title="CAB Rating" value={crew.cab_ov ?? '?'} />
							<StatLabel title="Portal" 
								value={<>
									<div style={{color: crew.in_portal ? 'lightgreen': undefined, fontWeight: crew.in_portal ? 'bold' : undefined}}>
										{printPortalStatus(crew, true, false)}
									</div>								
								</>} />
							{markdownRemark.frontmatter.events !== null && (
								<StatLabel title="Events" value={markdownRemark.frontmatter.events} />
							)}
						</div>
					</>
				)}
				{crewDemands && (
					<p>
						<b>{crewDemands.factionOnlyTotal}</b>
						{' faction items, '}
						<span style={{ display: 'inline-block' }}>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} height={14} />
						</span>{' '}
						<b>{crewDemands.totalChronCost}</b>
						{', '}
						<span style={{ display: 'inline-block' }}>
							<img src={`${process.env.GATSBY_ASSETS_URL}currency_sc_currency_0.png`} height={16} />
						</span>{' '}
						<b>{crewDemands.craftCost}</b>
					</p>
				)}

				<Accordion
					exclusive={false}
					panels={panels}
				/>

				<p>
					<b>Traits: </b>
					{crew.traits_named
						.map(trait => (
							<a key={trait} href={`/?search=trait:${trait}`}>
								{trait}
							</a>
						))
						.reduce((prev, curr) => <>{prev}, {curr}</>)}
					{', '}
					{crew.traits_hidden
						.map(trait => (
							<a style={{ color: 'lightgray' }} key={trait} href={`/?search=trait:${trait}`}>
								{trait}
							</a>
						))
						.reduce((prev, curr) => <>{prev}, {curr}</>)}
				</p>

				{crew.cross_fuse_targets && "symbol" in crew.cross_fuse_targets && crew.cross_fuse_targets.symbol && (
					<p>
						Can cross-fuse with{' '}
						<Link to={`/crew/${crew.cross_fuse_targets.symbol}/`}>{crew.cross_fuse_targets.name}</Link>.
					</p>
				)}

				{crew.collections.length > 0 && (
					<p>
						<b>Collections: </b>
						{crew.collections
							.map(col => (
								<Link key={col} to={`/collections/#${encodeURIComponent(col)}`}>
									{col}
								</Link>
							))
							.reduce((prev, curr) => <>{prev}, {curr}</>)}
					</p>
				)}

				<p>
					<b>Date added: </b>{new Date(crew.date_added).toLocaleDateString("en-US")}
				</p>

				{crew.nicknames && crew.nicknames.length > 0 && (
					<p>
						<b>Also known as: </b>
						{crew.nicknames
							.map((nick, idx) => (
							<span key={idx}>{nick.cleverThing}{nick.creator ? <> (coined by <i>{nick.creator}</i>)</> : ''}</span>
						))
						.reduce((prev, curr) => <>{prev}, {curr}</>)}
					</p>
				)}
			</React.Fragment>
		);
	}

	rosterComparisonTitle(crew: CrewMember, roster: PlayerCrew[]) {
		let skillCount = Object.entries(crew.base_skills).length;
		const rankHandler = (prefix: string) => {
			let [name, rank] = Object.entries(crew.ranks)
				.filter(([k, v]) => k.startsWith(prefix))
				.map(([k, v]) => [k, roster.filter((c) => c.ranks[k] < crew.ranks[k]).length + 1])
				.sort(([k1, v1], [k2, v2]) => (v1 as number) - (v2 as number))[0];
			return [
				(name as string).slice(2).replace('_', '/'),
				rank
			];
		}

		if (skillCount == 3) {
			let rank = roster.filter((c) =>
				c.ranks.voyTriplet &&
				c.ranks.voyTriplet.name == crew.ranks.voyTriplet?.name &&
				crew.ranks.voyTriplet.rank > c.ranks.voyTriplet.rank).length + 1

			return `#${rank} ${crew.ranks.voyTriplet?.name} on your roster`;
		} else if (skillCount == 2) {
			let [voyRankName, voyRank] = rankHandler('V');
			let [gauntRankName, gauntRank] = rankHandler('G');

			if (voyRank < gauntRank)
				return `#${voyRank} ${voyRankName} voyage pair in your roster`;
			else if (voyRank > gauntRank)
				return `#${gauntRank} ${gauntRankName} gauntlet pair in your roster`;
			else
				return `#${voyRank} ${voyRankName} voyage/gauntlet pair in your roster`;
		} else {
			let [baseName, baseRank] = rankHandler('B');
			return `#${baseRank} ${baseName} base in your roster`;
		}
	}

	renderOtherRanks(crew: CrewMember, roster: CrewMember[] | false = false) {
		let v = [] as JSX.Element[];
		let g = [] as JSX.Element[];
		let b = [] as JSX.Element[];


		const skillName = (shortName: string) => {
			let ns = CONFIG?.SKILLS_SHORT?.find(c => c.short === shortName)?.name;
			if (ns) return CONFIG.SKILLS[ns];
			else return null;
		}

		const rankHandler = (rank: string) => roster
			? roster.filter(c => c.ranks[rank] && crew.ranks[rank] > c.ranks[rank]).length + 1
			: crew.ranks[rank];

		const tripletHandler = (rank: string) => roster
			? roster.filter(c => c.ranks[rank] &&
			c.ranks[rank].name == crew.ranks[rank].name &&
			crew.ranks[rank].rank > c.ranks[rank].rank).length + 1
			: crew.ranks[rank].rank;

		// Need to filter by skills first before sorting by voyage triplet
		const tripletFilter = crew.ranks.voyTriplet
								? crew.ranks.voyTriplet.name.split('/')
									.map((s: string) => 'skill:'+s.trim())
									.reduce((prev: string, curr: string) => prev+' '+curr)
								: '';

		for (let rank in crew.ranks) {
			if (rank.startsWith('V_')) {
				v.push(
					<Statistic key={rank}>
						<Statistic.Label>{rank.substr(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{rankLinker(roster !== false, rankHandler(rank), crew.symbol, 'ranks.'+rank)}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('G_')) {
				g.push(
					<Statistic key={rank}>
						<Statistic.Label>{rank.substr(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{rankLinker(roster !== false, rankHandler(rank), crew.symbol, 'ranks.'+rank)}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('B_') && crew.ranks[rank]) {
				b.push(
					<Statistic key={rank}>
						<Statistic.Label>{skillName(rank.substr(2))}</Statistic.Label>
						<Statistic.Value>{rankLinker(roster !== false, rankHandler(rank), crew.symbol, CONFIG.SKILLS_SHORT.find(c => c.short === rank.slice(2))?.name ?? "", 'descending')}</Statistic.Value>
					</Statistic>
				);
			}
		}

		return (
			<React.Fragment>
				<Segment>
					<Header as="h5">Base ranks</Header>
					<Statistic.Group widths="three" size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{b}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as="h5">Voyage skill ranks</Header>
					{crew.ranks.voyTriplet && (
						<React.Fragment>
							<Statistic.Group widths="one" size={'mini'}>
								<Statistic>
									<Statistic.Label>{crew.ranks.voyTriplet.name}</Statistic.Label>
									<Statistic.Value>{rankLinker(roster !== false, tripletHandler('voyTriplet'), crew.symbol, 'ranks.voyRank', 'ascending', tripletFilter)}</Statistic.Value>
								</Statistic>
							</Statistic.Group>
							<Divider />
						</React.Fragment>
				)}
					<Statistic.Group widths="three" size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{v}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as="h5">Gauntlet pair ranks</Header>
					<Statistic.Group widths="three" size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{g}
					</Statistic.Group>
				</Segment>
			</React.Fragment>
		);
	}
}

const rankLinker = (roster: boolean, rank: number, symbol: string, column: string, direction: string = 'ascending', search: string | undefined = undefined) => {
	if (roster) return (<>{rank}</>);
	const linkState = {
		search: search ?? '',
		column: column,
		direction: direction ?? 'ascending',
		highlight: symbol ?? ''
	};
	const baseUrl = '/';
	let params = '';
	Object.entries(linkState).forEach(entry => {
		if (entry[1] !== '') {
			if (params !== '') params += '&';
			params += entry[0]+'='+encodeURI(entry[1]);
		}
	});
	const url = params !== '' ? baseUrl+'?'+params : baseUrl;
	return (
		<Link to={url} onClick={(event) => clickLink(event)}>{rank}</Link>
	);

	// On left clicks, use state instead of URL params because it's a little faster and cleaner
	function clickLink(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
		if (e.button === 0) {
			e.preventDefault();
			navigate(baseUrl, { state: linkState });
		}
	}
};

export default CommonCrewData;

export const query = graphql`
	fragment RanksFragment on CrewJson {
		cab_ov
		cab_ov_rank
		cab_ov_grade
		ranks {
			voyRank
			gauntletRank
			voyTriplet {
				name
				rank
			}
			V_CMD_SCI
			V_CMD_SEC
			V_CMD_ENG
			V_CMD_DIP
			V_CMD_MED
			V_SCI_SEC
			V_SCI_ENG
			V_SCI_DIP
			V_SCI_MED
			V_SEC_ENG
			V_SEC_DIP
			V_SEC_MED
			V_ENG_DIP
			V_ENG_MED
			V_DIP_MED
			G_CMD_SCI
			G_CMD_SEC
			G_CMD_ENG
			G_CMD_DIP
			G_CMD_MED
			G_SCI_SEC
			G_SCI_ENG
			G_SCI_DIP
			G_SCI_MED
			G_SEC_ENG
			G_SEC_DIP
			G_SEC_MED
			G_ENG_DIP
			G_ENG_MED
			G_DIP_MED
			B_SCI
			B_SEC
			B_ENG
			B_DIP
			B_CMD
			B_MED
		}
	}
`;
