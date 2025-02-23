import React from 'react';
import {
	Button,
	Card, CardContent, CardHeader,
	Image,
	Label, LabelGroup
} from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { Voyage } from '../../model/player';
import { Ship } from '../../model/ship';
import { Estimate, IFullPayloadAssignment, ITrackedCheckpoint, ITrackedVoyage, IVoyageCalcConfig, IVoyageInputConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';
import { formatTime } from '../../utils/voyageutils';

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

	const running: Voyage | undefined = ephemeral?.voyage?.find(voyage =>
		configSource === 'player' && voyage.voyage_type === voyageConfig.voyage_type
	);

	let runningShip: Ship | undefined;
	if (running && playerData) {
		runningShip = playerData.player.character.ships.find(s => s.id === running.ship_id);
	}

	let header: string = '';
	if (running?.ship_name) {
		header = `${running.ship_name} (${voyageType})`;
	}
	else if (configSource === 'custom') {
		header = t('voyage.custom_voyage_x', { x: voyageType });
	}
	else {
		header = voyageType;
	}

	return (
		<Card fluid>
			<CardContent>
				{runningShip && <RunningShipIcon ship={runningShip} />}
				<CardHeader>
					{header}
				</CardHeader>
				<div style={{ marginTop: '.5em', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'end', rowGap: '1em' }}>
					<div>
						<ConfigSkills voyageConfig={voyageConfig} />
						{voyageConfig.voyage_type === 'encounter' && <EncounterBonuses voyageConfig={voyageConfig} />}
						{running && (
							<p style={{ marginTop: '1em' }}>
								<RunningStatus voyage={running} />
								<RunningTracker voyage={running} ship={runningShip!} />
							</p>
						)}
						{!running && configSource === 'player' && (
							<p style={{ marginTop: '1em' }}>
								{t('voyage.awaiting_crew')}
							</p>
						)}
					</div>
					<div>
						{renderToggle()}
					</div>
				</div>
			</CardContent>
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
		<LabelGroup size='big'>
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
		</LabelGroup>
	);
};

interface IBonusLabel {
	key: string;
	content: string;
};

type EncounterBonusesProps = {
	voyageConfig: IVoyageInputConfig;
};

const EncounterBonuses = (props: EncounterBonusesProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES, TRAIT_NAMES, t } = globalContext.localized;
	const { voyageConfig } = props;

	if (!voyageConfig.event_content) return <></>;

	const bonusShips: IBonusLabel[] = [];
	voyageConfig.event_content.featured_ships.forEach(shipSymbol => {
		const featuredShip: Ship | undefined = globalContext.core.ships.find(ship => ship.symbol === shipSymbol);
		if (featuredShip) {
			bonusShips.push({
				key: featuredShip.symbol,
				content: featuredShip.name ?? featuredShip.symbol
			})
		}
	});
	voyageConfig.event_content.antimatter_bonus_ship_traits.forEach(shipTrait => {
		bonusShips.push({
			key: shipTrait,
			content: SHIP_TRAIT_NAMES[shipTrait] ?? shipTrait
		});
	});

	const bonusCrew: IBonusLabel[] = [];
	voyageConfig.event_content.featured_crews.forEach(crewSymbol => {
		const featuredCrew: CrewMember | undefined = globalContext.core.crew.find(crew => crew.symbol === crewSymbol);
		if (featuredCrew) {
			bonusCrew.push({
				key: featuredCrew.symbol,
				content: featuredCrew.name
			})
		}
	});
	voyageConfig.event_content.antimatter_bonus_crew_traits.forEach(crewTrait => {
		bonusCrew.push({
			key: crewTrait,
			content: TRAIT_NAMES[crewTrait] ?? crewTrait
		});
	});

	const encounterBonus: IBonusLabel[] = [];
	voyageConfig.event_content.encounter_traits?.forEach(eTrait => {
		encounterBonus.push({
			key: eTrait,
			content: TRAIT_NAMES[eTrait] ?? eTrait
		});
	})

	return (
		<React.Fragment>
			{[bonusShips, bonusCrew].map((bonusGroup, idx) => (
				<LabelGroup key={idx}>
					{bonusGroup.map(bonus =>
						<Label key={bonus.key}>
							{bonus.content}
						</Label>
					)}
				</LabelGroup>
			))}
			{!!encounterBonus?.length && (
				<LabelGroup>
					<span style={{ fontWeight: 'bold', fontSize: '.9em', paddingRight: '1em' }}>
						{t('voyage.encounter_traits')}:
					</span>
					{encounterBonus.map(bonus =>
						<Label key={bonus.key}>
							{bonus.content}
						</Label>
					)}
				</LabelGroup>
			)}
		</React.Fragment>
	);
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
				const trackableCrew: IFullPayloadAssignment[] = createTrackableCrew(voyage as IVoyageCalcConfig, NEW_TRACKER_ID);
				if (syncState === SyncState.RemoteReady) {
					postTrackedData(dbid, trackableVoyage, trackableCrew).then(result => {
						if (result.status < 300 && result.trackerId && result.inputId === NEW_TRACKER_ID) {
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
