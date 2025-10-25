import React from 'react';
import {
	Button,
	Card,
	Header,
	Image,
	Label,
	Table
} from 'semantic-ui-react';

import { RarityStyle } from '../../model/boss';
import { CrewMember } from '../../model/crew';
import { Voyage } from '../../model/player';
import { Ship } from '../../model/ship';
import { Estimate, IFullPayloadAssignment, ITrackedCheckpoint, ITrackedVoyage, IVoyageCalcConfig, IVoyageInputConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import { formatTime } from '../../utils/voyageutils';

import CONFIG from '../CONFIG';

import { HistoryContext } from '../voyagehistory/context';
import { addCrewToHistory, addVoyageToHistory, createTrackableCrew, createCheckpoint, createTrackableVoyage, estimateTrackedVoyage, getRuntime, NEW_TRACKER_ID, SyncState, postTrackedData } from '../voyagehistory/utils';

type ConfigCardProps = {
	configSource: 'player' | 'custom';
	voyageConfig: IVoyageInputConfig;
	renderToggle: () => JSX.Element;
};

export const ConfigCard = (props: ConfigCardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData, ephemeral } = globalContext.player;
	const { configSource, voyageConfig, renderToggle } = props;

	let voyageType: string = '';
	switch (voyageConfig.voyage_type) {
		case 'dilemma': voyageType = t('voyage.type_names.test_voyage_1'); break;
		case 'encounter': voyageType = t('voyage.type_names.encounter_voyage'); break;
	}

	const runningVoyage: Voyage | undefined = ephemeral?.voyage?.find(voyage =>
		configSource === 'player' && voyage.voyage_type === voyageConfig.voyage_type
	);

	let runningShip: Ship | undefined;
	if (runningVoyage && playerData) {
		runningShip = playerData.player.character.ships.find(s => s.id === runningVoyage.ship_id);
	}

	let header: string = '';
	if (runningVoyage?.ship_name) {
		header = `${runningVoyage.ship_name} (${voyageType})`;
	}
	else if (configSource === 'custom') {
		header = t('voyage.custom_voyage_x', { x: voyageType });
	}
	else {
		header = voyageType;
	}

	return (
		<Card fluid>
			<Card.Content>
				{runningShip && <RunningShipIcon ship={runningShip} />}
				<Card.Header style={{ marginBottom: '.5em' }}>
					{header}
				</Card.Header>
				<ConfigSkills voyageConfig={voyageConfig} />
				{voyageConfig.voyage_type === 'encounter' && (
					<div>
						<EncounterBonuses voyageConfig={voyageConfig} />
					</div>
				)}
				<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'end', rowGap: '.5em' }}>
					<div>
						{runningVoyage && (
							<p style={{ marginTop: '1em' }}>
								<RunningStatus voyage={runningVoyage} />
								<RunningTracker voyage={runningVoyage} ship={runningShip!} />
							</p>
						)}
						{!runningVoyage && configSource === 'player' && (
							<p style={{ marginTop: '1em' }}>
								{t('voyage.awaiting_crew')}
							</p>
						)}
					</div>
					<div style={{ textAlign: 'right' }}>
						{renderToggle()}
					</div>
				</div>
			</Card.Content>
		</Card>
	);
};

type RunningShipIconProps = {
	ship: Ship;
};

const RunningShipIcon = (props: RunningShipIconProps) => {
	const { ship } = props;

	const shipIcon: string = ship?.icon ? `${ship.icon.file.slice(1).replace('/', '_')}.png` : '';
	if (shipIcon === '') return <></>;

	return (
		<Image floated='left' size='tiny' src={`${process.env.GATSBY_ASSETS_URL}${shipIcon}`} />
	);
};

type ConfigSkillsProps = {
	voyageConfig: IVoyageInputConfig;
};

const ConfigSkills = (props: ConfigSkillsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES } = globalContext.localized;
	const { voyageConfig } = props;

	return (
		<Label.Group size='big'>
			<Label>
				<Image size='mini' spaced='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.primary_skill}.png`} />
				{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}
			</Label>
			<Label>
				<Image size='mini' spaced='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.secondary_skill}.png`} />
				{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}
			</Label>
			{voyageConfig.ship_trait !== '' && (
				<Label>
					{SHIP_TRAIT_NAMES[voyageConfig.ship_trait] ?? voyageConfig.ship_trait}
				</Label>
			)}
		</Label.Group>
	);
};

interface IBonusLabel {
	key: string;
	content: string;
	rarity: number;
};

interface IBonusGroup {
	key: string;
	header: string;
	bonuses: IBonusLabel[];
};

type EncounterBonusesProps = {
	voyageConfig: IVoyageInputConfig;
};

const EncounterBonuses = (props: EncounterBonusesProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES, TRAIT_NAMES, t } = globalContext.localized;
	const { voyageConfig } = props;

	if (!voyageConfig.event_content) return <></>;

	const sortLabels = (a: IBonusLabel, b: IBonusLabel) => {
		if (a.rarity === b.rarity)
			return a.content.localeCompare(b.content);
		return b.rarity - a.rarity;
	};

	const bonusShips: IBonusLabel[] = [];
	voyageConfig.event_content.featured_ships.forEach(shipSymbol => {
		const featuredShip: Ship | undefined = globalContext.core.ships.find(ship => ship.symbol === shipSymbol);
		if (featuredShip) {
			bonusShips.push({
				key: featuredShip.symbol,
				content: featuredShip.name ?? featuredShip.symbol,
				rarity: featuredShip.rarity
			})
		}
	});
	voyageConfig.event_content.antimatter_bonus_ship_traits.forEach(shipTrait => {
		bonusShips.push({
			key: shipTrait,
			content: SHIP_TRAIT_NAMES[shipTrait] ?? shipTrait,
			rarity: 0
		});
	});

	const bonusCrew: IBonusLabel[] = [];
	voyageConfig.event_content.featured_crews.forEach(crewSymbol => {
		const featuredCrew: CrewMember | undefined = globalContext.core.crew.find(crew => crew.symbol === crewSymbol);
		if (featuredCrew) {
			bonusCrew.push({
				key: featuredCrew.symbol,
				content: featuredCrew.name,
				rarity: featuredCrew.max_rarity
			})
		}
	});
	voyageConfig.event_content.antimatter_bonus_crew_traits.forEach(crewTrait => {
		bonusCrew.push({
			key: crewTrait,
			content: TRAIT_NAMES[crewTrait] ?? crewTrait,
			rarity: 0
		});
	});

	const encounterBonus: IBonusLabel[] = [];
	voyageConfig.event_content.encounter_traits?.forEach(eTrait => {
		encounterBonus.push({
			key: eTrait,
			content: TRAIT_NAMES[eTrait] ?? eTrait,
			rarity: 0
		});
	})

	const groups: IBonusGroup[] = [
		{	/* Event Ships */
			key: 'ships',
			header: t('base.event_ships'),
			bonuses: bonusShips
		},
		{	/* Event Crew */
			key: 'crew',
			header: t('base.event_crew'),
			bonuses: bonusCrew
		}
	];

	if (encounterBonus.length > 0) {
		groups.push(
			{	/* Encounter Crit Traits */
				key: 'crits',
				header: t('voyage.encounter_traits'),
				bonuses: encounterBonus
			}
		);
	}

	return (
		<Table basic='very' collapsing compact='very'>
			<Table.Body>
				{groups.map(group => (
					<Table.Row key={group.key}>
						<Table.Cell>
							<Header as='h5'>
								{group.header}{t('global.colon')}
							</Header>
						</Table.Cell>
						<Table.Cell>
							<Label.Group>
								{group.bonuses.sort(sortLabels).map(bonus =>
									<Label key={bonus.key} style={getStyleByRarity(bonus.rarity)}>
										{bonus.content}
									</Label>
								)}
							</Label.Group>
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);

	function getStyleByRarity(rarity: number): RarityStyle | undefined {
		if (rarity === 0) return undefined
		let background = 'grey', color = 'white';
		if (rarity === 1) {
			background = '#9b9b9b';
		}
		else if (rarity === 2) {
			background = '#50aa3c';
		}
		else if (rarity === 3) {
			background = '#5aaaff';
		}
		else if (rarity === 4) {
			background = '#aa2deb';
		}
		else if (rarity === 5) {
			background = '#fdd26a';
			color = 'black';
		}
		return { background, color };
	}
};

type RunningStatusProps = {
	voyage: Voyage;
};

const RunningStatus = (props: RunningStatusProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { voyage } = props;

	const msgTypes = {
		started: 'voyage.calc.msg_type.started',	// has been running for
		failed: 'voyage.calc.msg_type.failed',		// failed at
		recalled: 'voyage.calc.msg_type.recalled',	// ran for
		completed: 'voyage.calc.msg_type.completed'	// ran for
	};

	const voyageDuration: string = formatTime(getRuntime(voyage), t);

	return (
		<span>
			{tfmt(msgTypes[voyage.state], {
				time: <b><span style={{ whiteSpace: 'nowrap' }}>{voyageDuration}</span></b>
			})}
		</span>
	);
};

type RunningTrackerProps = {
	voyage: Voyage;
	ship: Ship;
};

const RunningTracker = (props: RunningTrackerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);
	const { voyage, ship } = props;

	React.useEffect(() => {
		return function cleanup() {
			// Cancel active calculations when leaving page (TODO)
		}
	}, []);

	// Restrict tracking to dilemma voyages only (for now)
	if (voyage.voyage_type !== 'dilemma') return <></>;

	const tracked: ITrackedVoyage | undefined = history.voyages.find(tracked => tracked.voyage_id === voyage.id);
	if (tracked) return (
		<span>
			{` `}
			{tfmt('voyage.calc.other_msg.initial_estimate', {
				time: <b><span style={{ whiteSpace: 'nowrap' }}>{formatTime(tracked.estimate.median)}</span></b>
			})}
		</span>
	);

	return (
		<span>
			{` `}{t('voyage.tracking.not_tracking')}
			{` `}<Button compact content={t('voyage.tracking.start_tracking')} onClick={() => initializeTracking()} disabled={syncState === SyncState.ReadOnly} />
		</span>
	);

	function initializeTracking(): void {
		// Add to history with both initial and checkpoint estimates
		estimateTrackedVoyage(voyage, 0, voyage.max_hp).then((initial: Estimate) => {
			createCheckpoint(voyage).then((checkpoint: ITrackedCheckpoint) => {
				const trackableVoyage: ITrackedVoyage = createTrackableVoyage(
					voyage as IVoyageCalcConfig, ship.symbol, initial, NEW_TRACKER_ID, voyage, checkpoint
				);
				trackableVoyage.lootcrew = voyage.pending_rewards.loot.filter(f => f.type === 1).map(m => m.symbol);
				const trackableCrew: IFullPayloadAssignment[] = createTrackableCrew(voyage as IVoyageCalcConfig, NEW_TRACKER_ID);
				if (syncState === SyncState.RemoteReady) {
					postTrackedData(dbid, trackableVoyage, trackableCrew).then(result => {
						if ((!result.status || result.status < 300) && result.trackerId && result.inputId === NEW_TRACKER_ID) {
							const newRemoteId: number = result.trackerId;
							addVoyageToHistory(history, newRemoteId, trackableVoyage);
							addCrewToHistory(history, newRemoteId, trackableCrew);
							setHistory({...history});
						}
						else {
							throw('Failed initializeTracking -> postTrackedData');
						}
					});
				}
				else if (syncState === SyncState.LocalOnly) {
					const newLocalId: number = history.voyages.reduce((prev, curr) => Math.max(prev, curr.tracker_id), 0) + 1;
					addVoyageToHistory(history, newLocalId, trackableVoyage);
					addCrewToHistory(history, newLocalId, trackableCrew);
					setHistory({...history});
				}
				else {
					throw(`Failed initializeTracking (invalid syncState: ${syncState})`);
				}
			});
		}).catch(e => {
			setMessageId('voyage.history_msg.failed_to_track');
			console.log(e);
		});
	}
};
