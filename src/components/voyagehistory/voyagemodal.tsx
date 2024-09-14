import React from 'react';
import { Modal, Message, Checkbox, Button } from 'semantic-ui-react';

import { PlayerCrew, VoyageCrewSlot } from '../../model/player';
import { IVoyageCalcConfig, ITrackedVoyage } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';
import { LineupViewer } from '../../components/voyagecalculator/lineupviewer';

import { HistoryContext } from './context';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { putRemoteVoyage, SyncState, updateVoyageInHistory } from './utils';

type VoyageModalProps = {
	voyage: ITrackedVoyage;
	onClose: () => void;
	onRemove?: (trackerId: number) => void;
};

export const VoyageModal = (props: VoyageModalProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES } = globalContext.localized;
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
							<p>DataCore cannot automatically track when a voyage has been revived, but you can manually note the revival here.</p>
							<Checkbox label='This voyage was revived.' checked={isRevived} onChange={(e, data) => noteRevival(data.checked as boolean)} />
						</Message>
						{syncState === SyncState.LocalOnly && (
							<Message style={{ marginTop: '1em' }}>
								<Button color='red' icon='trash' content='Delete voyage from history' onClick={removeVoyage} />
								{` `}Warning: this action cannot be undone.
							</Message>
						)}
					</div>
				)}
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={props.onClose}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderLineup(): JSX.Element {
		// Maybe get this from player voyageData, if name is localized
		const VOYAGE_SLOTS = {
			captain_slot: { name: 'First Officer', skill: 'command_skill' },
			first_officer: { name: 'Helm Officer', skill: 'command_skill' },
			chief_communications_officer: { name: 'Communications Officer', skill: 'diplomacy_skill' },
			communications_officer: { name: 'Diplomat', skill: 'diplomacy_skill' },
			chief_security_officer: { name: 'Chief Security Officer', skill: 'security_skill' },
			security_officer: { name: 'Tactical Officer', skill: 'security_skill' },
			chief_engineering_officer: { name: 'Chief Engineer', skill: 'engineering_skill' },
			engineering_officer: { name: 'Engineer', skill: 'engineering_skill' },
			chief_science_officer: { name: 'Chief Science Officer', skill: 'science_skill' },
			science_officer: { name: 'Deputy Science Officer', skill: 'science_skill' },
			chief_medical_officer: { name: 'Chief Medical Officer', skill: 'medicine_skill' },
			medical_officer: { name: 'Ship\'s Counselor', skill: 'medicine_skill' }
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
					name: VOYAGE_SLOTS[crewSlot].name,
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
			putRemoteVoyage(dbid, voyage.tracker_id, updatedVoyage).then((success: boolean) => {
				if (success) {
					updateVoyageInHistory(history, voyage.tracker_id, updatedVoyage);
					setHistory({...history});
					setIsRevived(isRevived);
				}
				else {
					throw('Failed noteRevival -> putRemoteVoyage');
				}
			}).catch(e => {
				setMessageId('voyage.history_msg.failed_to_update');
				console.log(e);
			});
		}
		else if (syncState === SyncState.LocalOnly) {
			updateVoyageInHistory(history, voyage.tracker_id, updatedVoyage);
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
