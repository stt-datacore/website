import React, { useRef, useState } from 'react';
import { Dropdown, Grid, Header, Table, Icon, Rail, Rating, Popup, Pagination, Segment, Tab, Label, Accordion } from 'semantic-ui-react';
import Layout from '../components/layout';
import CONFIG from './CONFIG';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { calculateBuffConfig } from '../utils/voyageutils';
import { useStateWithStorage } from '../utils/storage';
import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';
import CommonCrewData, { StatLabelProps } from './commoncrewdata';
import marked from 'marked';
import CrewStat from './crewstat';
import { formatTierLabel } from '../utils/crewutils';
import { CrewMember } from '../model/crew';
import { PlayerCrew, PlayerData } from '../model/player';

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

type CiteOptimizerProps = {
	playerData: PlayerData;
	allCrew: CrewMember[];
};

type CiteOptimizerState = {
	citePage: number;
	trainingPage: number;
	paginationRows: number;
	citeData: any;
	currentCrew: CrewMember | null | undefined;
	touchCrew: CrewMember | null | undefined;
	touchToggled: boolean;
};
class StatLabel extends React.Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		return (
			<Label size="small" style={{ marginBottom: '0.5em', width: "12em" }}>
				{title}
				<Label.Detail>{value}</Label.Detail>
			</Label>
		);
	}
}
class CiteOptimizer extends React.Component<CiteOptimizerProps, CiteOptimizerState> {
	constructor(props: CiteOptimizerProps | Readonly<CiteOptimizerProps>) {
		super(props);
		
		this.state = {
			citePage: 1,
			trainingPage: 1,
			paginationRows: 20,
			citeData: undefined,
			currentCrew: undefined,
			touchCrew: undefined,
			touchToggled: false
		};
	}
	gradeToColor(grade: string) {
		switch(grade) {
			case "A":
			case "A-":
			case "A+":
				return "lightgreen";

			case "B":
			case "B-":
			case "B+":
				return "aquamarine";

			case "C":
			case "C-":
			case "C+":
				return "yellow";

			case "D":
			case "D-":
			case "D+":
				return "orange";

			case "E":
			case "E-":
			case "E+":
				return "tomato";

			case "F":
			case "F-":
			case "F+":
				return "tomato";

						
		}
	}

	componentDidMount() {
		const worker = new UnifiedWorker();
		const { playerData, allCrew } = this.props;
		worker.addEventListener('message', (message: { data: { result: any; }; }) => this.setState({ citeData: message.data.result }));
		worker.postMessage({
			worker: 'citeOptimizer',
			playerData,
			allCrew
		})
	}
	cc = false;
	
	renderTable(data: PlayerCrew[], training = true) {
		const createStateAccessors = (name) => [
			this.state[name],
			(value: any) => this.setState((prevState) => { prevState[name] = value; return prevState; })
		];
		const [paginationPage, setPaginationPage] = createStateAccessors(training ? 'trainingPage' : 'citePage');
		const [otherPaginationPage, setOtherPaginationPage] = createStateAccessors(training ? 'citePage' : 'trainingPage');
		const [paginationRows, setPaginationRows] = createStateAccessors('paginationRows');
		const [currentCrew, setCurrentCrew] = createStateAccessors('currentCrew');
		const [touchToggled, setTouchToggled] = createStateAccessors('touchToggled');
		const [touchCrew, setTouchCrew] = createStateAccessors('touchCrew');

		const baseRow = (paginationPage - 1) * paginationRows;
		const totalPages = Math.ceil(data.length / paginationRows);
		const resizer = (e: any) => {
			setCurrentCrew(currentCrew);
		}	
		const activate = (target: HTMLElement, data: CrewMember) => {
			let el = document.getElementById("ttref_id");
			if (el) {
				if (target.tagName != "IMG") return;
				while (target && (target.tagName != "TD")) {
					if (target.parentElement == null) break;
					target = target.parentElement;
				}
				
				if (target.tagName != "TD") return;

				console.log(target);
				console.log(data);
				let x = target.offsetLeft + 72;
				let y = target.offsetTop - 72;
				if (!x && !y) return;

				el.style.position = "absolute";
				el.style.left = x + "px";
				el.style.top = y + "px";
				el.style.display = "block";
				el.style.zIndex = "100";
				
				window.addEventListener("resize", resizer);
				setCurrentCrew(this.props.allCrew?.filter(x=>x.symbol == data.symbol)[0]);
			}
		}
		const deactivate = (target: HTMLElement | null) => {
			let el = document.getElementById("ttref_id");
			if (el) {
				if (target && target.tagName != "IMG") return;
				console.log("Out");

				el.style.display = "none";
				el.style.zIndex = "-1000";

				window.removeEventListener("resize", resizer);
				setCurrentCrew(null);
			}
		}

		const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
			console.log("imageClick");
			// if (matchMedia('(hover: hover)').matches) {
			// 	window.location.href = "/crew/" + data.symbol;
			// }
		}

		const touchEnd = (e: React.TouchEvent<HTMLImageElement>, data: CrewMember) => {
			console.log("touchEnd");
			let el = document.getElementById("ttref_id");
			if (el) {
				let target: HTMLElement | null = e.target as HTMLElement;
				if (target && target.tagName != "IMG") return;

				if (touchToggled && data.symbol === touchCrew?.symbol) {					
					deactivate(target);
					setTouchToggled(false);
					setTouchCrew(null);
				}
				else {
					if (target) activate(target, data);
					setTouchToggled(true);
					setTouchCrew(data);
				}		
			}
		}

		const hoverIn = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, data: CrewMember) => {			
			console.log("hoverIn");
			e.nativeEvent.stopPropagation();
			e.nativeEvent.preventDefault();
			let el = document.getElementById("ttref_id");
			if (el) {
				let target: HTMLElement | null = e.target as HTMLElement;				
				if (target) activate(target, data);
			}
		};

		const hoverOut = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, data: CrewMember) => {
			console.log("hoverOut");
			e.nativeEvent.stopPropagation();
			e.nativeEvent.preventDefault();
			let el = document.getElementById("ttref_id");
			if (el) {
				let target: HTMLElement | null = e.target as HTMLElement;				
				if (target) deactivate(target);
			}
		};

		return (<div style={{overflowX: "auto"}}>			
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Rank</Table.HeaderCell>
						<Table.HeaderCell>Crew</Table.HeaderCell>
						<Table.HeaderCell>Rarity</Table.HeaderCell>
						<Table.HeaderCell>Final EV</Table.HeaderCell>
						{!training &&
						<React.Fragment>
							<Table.HeaderCell>Remaining EV</Table.HeaderCell>
							<Table.HeaderCell>EV Per Citation</Table.HeaderCell>
						</React.Fragment>
						}
						<Table.HeaderCell>Voyages Improved</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.slice(baseRow, baseRow + paginationRows).map((row, idx: number) => {
						const crew = this.props.playerData.player.character.crew.find(c => c.name == row.name);

						return (crew &&
							<Table.Row key={idx} onTouchStart={(e) => deactivate(null)}
							>
								<Table.Cell>{baseRow + idx + 1}</Table.Cell>
								<Table.Cell>
									<div										
										style={{
											display: 'grid',
											gridTemplateColumns: '60px auto',
											gridTemplateAreas: `'icon stats' 'icon description'`,
											gridGap: '1px'
										}}>
										<div style={{ gridArea: 'icon' }}
											
										>
											<img 
												onTouchEnd={(e) => touchEnd(e, crew)}
												onMouseEnter={(e) => hoverIn(e, crew)}
												onMouseLeave={(e) => hoverOut(e, crew)}
												onClick={(e) => imageClick(e, crew)}
												width={48} 
												src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} 
												/>
										</div>
										<div style={{ gridArea: 'stats' }}>
											<a href={"/crew/" + crew.symbol}>
												<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
											</a>											
										</div>
										
									</div>
								</Table.Cell>
								<Table.Cell>
									<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
								</Table.Cell>
								<Table.Cell>
									{Math.ceil(training ? (row.addedEV ?? 0) : (row.totalEVContribution ?? 0))}
								</Table.Cell>
								{
									!training &&
									<React.Fragment>
										<Table.Cell>
											{Math.ceil(row.totalEVRemaining ?? 0)}
										</Table.Cell>
										<Table.Cell>
											{Math.ceil(row.evPerCitation ?? 0)}
										</Table.Cell>
									</React.Fragment>
								}
								<Table.Cell>
									<Popup trigger={<b>{row.voyagesImproved?.length}</b>} content={row.voyagesImproved?.join(', ')} />
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={9}>
							<Pagination
								totalPages={totalPages}
								activePage={paginationPage}
								onPageChange={(event, { activePage }) => setPaginationPage(activePage as number)}
							/>
							<span style={{ paddingLeft: '2em' }}>
								Rows per page:{' '}
								<Dropdown
									inline
									options={pagingOptions}
									value={paginationRows}
									onChange={(event, { value }) => {
										setPaginationPage(1);
										setOtherPaginationPage(1);
										setPaginationRows(value as number);
									}}
								/>
							</span>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			</div>);
	}

	get crew(): CrewMember | null {
		return this.state.currentCrew ?? null;
	}
	
	render() {
		let { citeData } = this.state;
		let compact = true;
		return (
			<>
				<Accordion
					defaultActiveIndex={-1}
					panels={[
						{
							index: 0,
							key: 0,
							title: 'Explanation',
							content: {
								content: (
									<div>
										{/* <h3>Explanation</h3> */}
										<p>
											A crew's Expected Value (EV) is the average you can expect a crew to contribute to all voyages. EV Final accounts for the crew fully fused. EV Left, while less important, calculates the difference in contribution between fully fused and their current rank. Voyages Improved is how many of the voyage combinations the crew contributes to. Primary and secondary are taken into account, because CMD/DIP voyage will yield different results than DIP/CMD.
										</p>
										<p>
											A crew's EV for a voyage is found by finding the crew's average for the skill "Base + (Min + Max) / 2", multiplying that by 0.35 if the skill is the primary for the voyage, 0.25 if it is secondary, and 0.1 otherwise. To find how much the crew contributes to the total voyage, we find the best crew for the voyage that are fully leveled and equipped.
										</p>
										<p>
											"Training" is considered simply leveling and equipping the considered crew <u>at their current rarity</u>. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>at current rarity</u>.
										</p>
										<p>
											"Citing" considered <u>fully fusing</u>, leveling and equipping the considered crew. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>and fused</u>.
										</p>
									</div>
								)
							}
						}
					]}
				/>					

				<Segment>
					{!citeData &&
						<>
							<Icon loading name='spinner' /> Loading citation optimizer ...
						</>
					}

					{citeData &&
						<Tab						
						 	panes={[
							{ menuItem: 'Crew To Cite', render: () => this.renderTable(citeData.crewToCite, false) },
							{ menuItem: 'Crew To Train', render: () => this.renderTable(citeData.crewToTrain, true) }
						]} />
					}

					{<div id='ttref_id' className='ui segment' style={{position: "absolute", zIndex: -1000, display: "none", padding: "8px", borderRadius: "8px"}}>
							{this.state.currentCrew && this.crew &&
								<div style={{display: "flex", flexDirection:"row"}}>
									<img src={`${process.env.GATSBY_ASSETS_URL}${this.state.currentCrew?.imageUrlFullBody}`} style={{height: "9.5em", marginRight: "8px"}} />
				
									<div style={{display: "flex", flexDirection:"column", minHeight: "8em", justifyContent: "space-between", width: window.innerWidth <= 768 ? "15m" : "32em"}}>	
										<div>
											<h3>{this.crew.name}</h3>
										</div>
										<div style={{
											display: "flex", 
											flexWrap: "wrap", 
											flexDirection: window.innerWidth <= 512 ? "column" : "row", 
											justifyContent: "flex-start", 
											marginTop: "4px", 
											marginBottom: "2px"}}>

											<CrewStat												
												skill_name="security_skill"
												data={this.crew.base_skills.security_skill}
												scale={compact ? 0.75 : 1}
											/>
											<div style={{width: "4px"}} />
											<CrewStat 
												skill_name="command_skill" 
												data={this.crew.base_skills.command_skill} 
												scale={compact ? 0.75 : 1} />
											<div style={{width: "4px"}} />
											<CrewStat
												skill_name="diplomacy_skill"
												data={this.crew.base_skills.diplomacy_skill}
												scale={compact ? 0.75 : 1}
											/>
											<div style={{width: "4px"}} />
											<CrewStat 
												skill_name="science_skill" 
												data={this.crew.base_skills.science_skill} 
												scale={compact ? 0.75 : 1} />
											<div style={{width: "4px"}} />
											<CrewStat
												skill_name="medicine_skill"
												data={this.crew.base_skills.medicine_skill}
												scale={compact ? 0.75 : 1}
											/>
											<div style={{width: "4px"}} />
											<CrewStat
												skill_name="engineering_skill"
												data={this.crew.base_skills.engineering_skill}
												scale={compact ? 0.75 : 1}
											/>
											<div style={{width: "4px"}} />
										</div>
										<div style={{textAlign: "left", fontStyle: "italic", fontSize: "0.85em", marginTop: "2px", marginBottom: "4px"}}>
											{this.crew.traits_named.join(", ")}
										</div>
										<div>
											<div style={{ textAlign: 'center', display: "flex", flexWrap: "wrap", flexDirection: "row", justifyContent: "space-between" }}>
												<StatLabel title="CAB Rating" value={this.crew.cab_ov} />
												<StatLabel title="CAB Grade" value={(<div style={{fontWeight: "bold", color: this.gradeToColor(this.crew.cab_ov_grade)}}>{this.crew.cab_ov_grade}</div>)} />
												<StatLabel title="CAB Rank" value={"" + this.crew.cab_ov_rank} />
											</div>
										</div>
										<div>
											<div style={{ textAlign: 'center', display: "flex", flexWrap: "wrap", flexDirection: "row", justifyContent: "space-between" }}>
												<StatLabel title="Voyage Rank" value={"" + this.crew.ranks.voyRank} />
												<StatLabel title="Gauntlet Rank" value={"" + this.crew.ranks.gauntletRank} />
												<StatLabel title="Big Book Tier" value={formatTierLabel(this.crew)} />
											</div>
										</div>
										
									</div>

								</div>
						
								}
						</div>
					}	
				</Segment>
			</>
		);
	}
}

export default CiteOptimizer;