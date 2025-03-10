import React from 'react';
import { Modal, Message, Checkbox, Button } from 'semantic-ui-react';

import { PlayerCrew, VoyageCrewSlot } from '../../model/player';
import { IVoyageCalcConfig, ITrackedVoyage } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';

import CONFIG from '../CONFIG';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { LineupViewer } from '../voyagecalculator/lineupviewer/lineup_accordion';

import { HistoryContext } from './context';
import { postVoyage, SyncState, updateVoyageInHistory } from './utils';

type VoyageModalProps = {
	voyage: ITrackedVoyage;
	onClose: () => void;
	onRemove?: (trackerId: number) => void;
};

export const VoyageModal = (props: VoyageModalProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES, t } = globalContext.localized;
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);
	const { voyage } = props;

	const [isRevived, setIsRevived] = React.useState<boolean>(voyage.revivals > 0);

	const dtCreated = new Date(voyage.created_at);

	return (
		<Modal
			open={true}
			onClose={() => props.onClose()}
			size='large'
			closeIcon
		>
			<Modal.Header>
				{CONFIG.SKILLS[voyage.skills.primary_skill]} / {CONFIG.SKILLS[voyage.skills.secondary_skill]} / {SHIP_TRAIT_NAMES[voyage.ship_trait] ?? voyage.ship_trait} <span style={{ marginLeft: '2em' }}>({dtCreated.toLocaleDateString()})</span>
			</Modal.Header>
			<Modal.Content scrolling>
				<CrewHoverStat targetGroup='voyageLineupHover' modalPositioning={true} />

				{renderLineup()}
				{props.onRemove && (
					<div style={{ marginTop: '3em' }}>
						<Message>
							<p>{t('voyage.unable_to_track_revivals')}</p>
							<Checkbox	/* This voyage was revived. */
								label={t('voyage.voyage_history.revived')}
								checked={isRevived}
								onChange={(e, data) => noteRevival(data.checked as boolean)}
								disabled={syncState === SyncState.ReadOnly}
							/>
						</Message>
						<Message style={{ marginTop: '1em' }}>
							<Button /* Delete voyage from history */
								content={t('voyage.voyage_history.delete_from_history')}
								color='red'
								icon='trash'
								onClick={removeVoyage}
								disabled={syncState === SyncState.ReadOnly}
							/>
							{` `}{t('base.global_warn_permanent')}
						</Message>
					</div>
				)}
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={props.onClose}>
					{t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderLineup(): JSX.Element {
		const { t } = globalContext.localized;
		// Maybe get this from player voyageData, if name is localized
		const VOYAGE_SLOTS = {
			captain_slot: { name: t('voyage.seats.captain_slot'), skill: 'command_skill' },
			first_officer: { name: t('voyage.seats.first_officer'), skill: 'command_skill' },
			chief_communications_officer: { name: t('voyage.seats.chief_communications_officer'), skill: 'diplomacy_skill' },
			communications_officer: { name: t('voyage.seats.communications_officer'), skill: 'diplomacy_skill' },
			chief_security_officer: { name: t('voyage.seats.chief_security_officer'), skill: 'security_skill' },
			security_officer: { name: t('voyage.seats.security_officer'), skill: 'security_skill' },
			chief_engineering_officer: { name: t('voyage.seats.chief_engineering_officer'), skill: 'engineering_skill' },
			engineering_officer: { name: t('voyage.seats.engineering_officer'), skill: 'engineering_skill' },
			chief_science_officer: { name: t('voyage.seats.chief_science_officer'), skill: 'science_skill' },
			science_officer: { name: t('voyage.seats.science_officer'), skill: 'science_skill' },
			chief_medical_officer: { name: t('voyage.seats.chief_medical_officer'), skill: 'medicine_skill' },
			medical_officer: { name: t('voyage.seats.medical_officer'), skill: 'medicine_skill' }
		};
		if (!history.crew) return <></>;
		// Reconstruct voyageCrewSlots for this tracked voyage
		const voyageCrewSlots = [] as VoyageCrewSlot[];
		Object.entries(history.crew).forEach(([crewSymbol, assignments]) => {
			const assigned = assignments.find(assignment => assignment.tracker_id === voyage.tracker_id);
			if (assigned) {
				const crewSlot = CONFIG.VOYAGE_CREW_SLOTS[assigned.slot];
				const voyageCrewSlot = {
					symbol: crewSlot,
					trait: assigned.trait,
					name: t(`voyage.seats.${crewSlot}`),
					skill: VOYAGE_SLOTS[crewSlot].skill
				} as VoyageCrewSlot;
				voyageCrewSlot.trait = assigned.trait;
				// Use coreCrew instead of playerCrew, as current playerCrew may not reflect crew at voyage time
				const coreCrew = globalContext.core.crew.find(ac => ac.symbol === crewSymbol);
				if (coreCrew) voyageCrewSlot.crew = coreCrew as PlayerCrew;
				voyageCrewSlots.push(voyageCrewSlot);
			}
		});

		if (!voyageCrewSlots.length) return <></>;

		const voyageConfig = {
			crew_slots: voyageCrewSlots,
			ship_trait: voyage.ship_trait,
			max_hp: voyage.max_hp,
			state: '',
			skill_aggregates: voyage.skill_aggregates,
			skills: voyage.skills
		} as IVoyageCalcConfig;

		const ship = globalContext.core.ships.find(ship => ship.symbol === voyage.ship);

		return (
			<LineupViewer voyageConfig={voyageConfig} ship={ship} />
		);
	}

	function noteRevival(isRevived: boolean): void {
		const updatedVoyage: ITrackedVoyage = JSON.parse(JSON.stringify(voyage));
		updatedVoyage.revivals = isRevived ? 1 : 0;
		if (syncState === SyncState.RemoteReady) {
			postVoyage(dbid, updatedVoyage).then(result => {
				if (result.status < 300 && result.trackerId && result.inputId === updatedVoyage.tracker_id) {
					updateVoyageInHistory(history, updatedVoyage);
					setHistory({...history});
					setIsRevived(isRevived);
				}
				else {
					throw('Failed noteRevival -> postVoyage');
				}
			}).catch(e => {
				setMessageId('voyage.history_msg.failed_to_update');
				console.log(e);
			});
		}
		else if (syncState === SyncState.LocalOnly) {
			updateVoyageInHistory(history, updatedVoyage);
			setHistory({...history});
			setIsRevived(isRevived);
		}
		else {
			setMessageId('voyage.history_msg.invalid_sync_state');
			console.log(`Failed noteRevival (invalid syncState: ${syncState})`);
		}
	}

	function removeVoyage(): void {
		if (props.onRemove) props.onRemove(voyage.tracker_id);
		props.onClose();
	}
};
