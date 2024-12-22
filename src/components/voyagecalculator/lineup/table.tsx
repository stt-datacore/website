import React from "react";
import { ViewProps } from "./context";
import { Grid, Table, Popup, Icon, SemanticICONS } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { PlayerCrew } from "../../../model/player";
import { isQuipped } from "../../../utils/crewutils";
import { AvatarView } from "../../item_presenters/avatarview";
import { renderKwipmentBonus } from "../../item_presenters/item_presenter";
import { getCrewTraitBonus, getCrewVP } from "../utils";
import { AssignmentCard } from "./card";
import { ViewContext, SHOW_SHIP_FINDER, POPUP_DELAY } from "./context";
import { CrewFinder } from "./crewfinder";
import { Aggregates } from "./aggregates";

export const TableView = (props: ViewProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES, t } = globalContext.localized;
	const { voyageConfig, rosterType, ship, shipData, assignments } = React.useContext(ViewContext);
	const { layout } = props;

	const compact = layout === 'table-compact';

	return (
		<Grid columns={2} stackable>
			<Grid.Column>
				{renderShip()}
				<React.Fragment>
					{[0, 2, 4, 6, 8, 10].map(index => renderSkillAssignments(index))}
				</React.Fragment>
			</Grid.Column>
			<Grid.Column verticalAlign='middle'>
				<Aggregates layout={layout} />
			</Grid.Column>
		</Grid>
	);

	function renderShip(): JSX.Element {
		if (!ship) return (<></>);
		return (
			<Table celled selectable striped unstackable compact='very' className={`voyageLineup ${compact ? 'compactView' : ''}`}>
				<Table.Body>
					<Table.Row>
						<Table.Cell width={5}>{t('ship.ship')}</Table.Cell>
						<Table.Cell width={8} style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							<b>{ship.name}</b>
						</Table.Cell>
						<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							{SHOW_SHIP_FINDER && voyageConfig.state === 'pending' && rosterType === 'myCrew' &&
								<span style={{ cursor: 'help' }}>
									<Popup content={`On voyage selection screen, tap ${shipData.direction} ${shipData.index} times to select ship`} mouseEnterDelay={POPUP_DELAY} trigger={
										<span style={{ whiteSpace: 'nowrap' }}>
											<Icon name={`arrow ${shipData.direction}` as SemanticICONS} />{shipData.index}
										</span>
									} />
								</span>
							}
						</Table.Cell>
						<Table.Cell width={1} className='iconic'>
							{ship.traits?.includes(voyageConfig.ship_trait) &&
								<span style={{ cursor: 'help' }}>
									<Popup content='+150 AM' mouseEnterDelay={POPUP_DELAY} trigger={<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />} />
								</span>
							}
						</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table>
		);
	}

	function renderSkillAssignments(index: number): JSX.Element {
		const seated = assignments.slice(index, index+2);
		return (
			<Table celled selectable striped unstackable compact='very' key={index} className={`voyageLineup ${compact ? 'compactView' : ''}`}>
				<Table.Body>
					{seated.map((assignment, idx) => {
						const { crew, name, trait, bestRank } = assignment;
						return (
							<Table.Row key={idx}>
								<Table.Cell width={5}>{name}</Table.Cell>
								<Table.Cell width={7}>
									<Popup mouseEnterDelay={POPUP_DELAY} trigger={
										<div style={{ cursor: 'help', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
											{!compact &&
												<span style={{ paddingRight: '.3em' }}>
													<AvatarView
														mode='crew'
														item={crew}
														partialItem={true}
														size={32}
														style={{ verticalAlign: 'middle' }}
													/>
												</span>
											}
											<span style={{ marginLeft: '0.25em', fontSize: `${compact ? '1em' : '1.1em'}`, fontWeight: 'bolder' }}>{crew.name}</span>
										</div>
									}>
										<Popup.Content>
											<AssignmentCard assignment={assignment} showSkills={true} />
										</Popup.Content>
									</Popup>
								</Table.Cell>
								<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									{voyageConfig.state === 'pending' && <CrewFinder crew={crew} bestRank={bestRank} />}
								</Table.Cell>
								<Table.Cell width={1} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									<div style={{display:'flex', flexDirection:'row', gap: "0.5em", alignItems: "center", justifyContent: "right", marginRight: "0.5em"}}>
										{isQuipped(crew) &&
										<>
										<Popup wide content={renderKwipmentBonus((crew.kwipment as number[][]).map(q => typeof q === 'number' ? q : q[1]), globalContext.core.items, crew.kwipment_prospects, t)} mouseEnterDelay={POPUP_DELAY} trigger={
												<span style={{ cursor: 'help' }}>
													<img src={`${process.env.GATSBY_ASSETS_URL}atlas/ContinuumUnlock.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
												</span>
											} />
										</>}
										{renderVPBonus(crew)}
										{renderTraitBonus(crew, trait)}
									</div>
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
		);
	}

	function renderTraitBonus(crew: PlayerCrew, trait: string): JSX.Element {
		const traitBonus: number = getCrewTraitBonus(voyageConfig, crew, trait);
		if (traitBonus === 0) return <></>;
		let bonusText: string = '';
		if (traitBonus === 25)
			bonusText = `${TRAIT_NAMES[trait]} +25 AM`;
		else
			bonusText = `+${traitBonus} AM`;
		return (
			<Popup content={bonusText} mouseEnterDelay={POPUP_DELAY} trigger={
				<span style={{ cursor: 'help' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				</span>
			} />
		);
	}

	function renderVPBonus(crew: PlayerCrew): JSX.Element {
		if (voyageConfig.voyage_type !== 'encounter') return <></>;
		const crewVP: number = getCrewVP(voyageConfig, crew);
		if (crewVP === 0) return <></>;
		let bonusText = `+${crewVP} VP`;
		return (
			<Popup content={bonusText} mouseEnterDelay={POPUP_DELAY} trigger={
				<span style={{ cursor: 'help' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				</span>
			} />
		);
	}
};
