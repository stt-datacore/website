import React from 'react';
import {
	Button,
	Checkbox,
	Message,
	SemanticICONS
} from 'semantic-ui-react';

import { downloadData } from '../../utils/crewutils';

import { HistoryContext } from './context';
import { getTrackedData, NEW_TRACKER_ID, postTrackedData, SyncState } from './utils';
import { IFullPayloadAssignment, ITrackedAssignment, ITrackedVoyage } from '../../model/voyage';

const IMPORT_ONLY = true;

type ManageRemoteSyncProps = {
	postRemote: boolean;
	setPostRemote: (postRemote: boolean) => void;
	setSyncState: (syncState: SyncState) => void;
};

export const DataManagement = (props: ManageRemoteSyncProps) => {
	const { syncState } = React.useContext(HistoryContext);

	if (IMPORT_ONLY) {
		return (
			<DataManagementPlaceholder
				postRemote={props.postRemote}
				setPostRemote={props.setPostRemote}
				setSyncState={props.setSyncState}
			/>
		);
	}

	if (syncState === SyncState.ReadOnly) {
		return (
			<Message content='Voyage history is disabled because it cannot connect to remote sync. Please reload this page to try synchronizing again.' />
		);
	}

	return (
		<React.Fragment>
			<RemoteSyncOptions
				postRemote={props.postRemote}
				setPostRemote={props.setPostRemote}
				setSyncState={props.setSyncState}
			/>
			<AdvancedOptions />
		</React.Fragment>
	)
};

const RemoteSyncOptions = (props: ManageRemoteSyncProps) => {
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);
	const { postRemote, setPostRemote, setSyncState } = props;

	let syncStatus: string = 'Disabled';
	if (syncState === SyncState.RemoteReady) syncStatus = 'Enabled';

	return (
		<Message>
			<Message.Content>
				<Message.Header>
					Remote Sync{` `}{syncStatus}
				</Message.Header>
				{syncState === SyncState.LocalOnly && (
					<p>Voyage history is currently not synchronizing with DataCore. You can only view and update past voyages on the device where you initially tracked them.</p>
				)}
				{syncState === SyncState.RemoteReady && (
					<p>Voyage history is currently synchronizing with DataCore. You can view and update voyages on all devices with synchronization enabled.</p>
				)}
				<p>Describe remote sync and relevant data policies here.</p>
				<div style={{ marginTop: '1em' }}>
					<Checkbox
						label='Enable remote sync (experimental)'
						checked={postRemote}
						onClick={(e, data) => toggleRemoteSync(data.checked as boolean)}
					/>
				</div>
			</Message.Content>
		</Message>
	);

	function toggleRemoteSync(requestEnable: boolean): void {
		if (requestEnable) {
			tryEnableSync();
		}
		else {
			// TODO: Delete all from remote?
			setSyncState(SyncState.LocalOnly);
			setPostRemote(false);
		}
	}

	function tryEnableSync(): void {
		getTrackedData(dbid).then(async (remoteHistory) => {
			if (remoteHistory) {
				const voyagesToPost: ITrackedVoyage[] = discoverVoyages(remoteHistory.voyages, history.voyages);
				if (voyagesToPost.length > 0) {
					let voyagesPosted: number = 0;
					Promise.all(
						voyagesToPost.map(voyageToSync => tryPostVoyage(voyageToSync))
					).then(postedIds => {
						voyagesPosted = postedIds.length;
					});
					if (voyagesPosted === 0)
						throw('Failed tryEnableSync -> 0 voyages posted to remote sync!');
					if (voyagesToPost.length > voyagesPosted)
						console.warn('Warning: not all voyages posted to remote sync!');
				}
				getTrackedData(dbid).then(async (remoteHistory) => {
					if (!!remoteHistory) setHistory(remoteHistory);
					setSyncState(SyncState.RemoteReady);
					setPostRemote(true);
				});
			}
			else {
				throw('Failed tryEnableSync -> getTrackedData');
			}
		}).catch(e => {
			setMessageId('voyage.history_msg.failed_transition');
			console.log(e);
		});
	}

	async function tryPostVoyage(trackableVoyage: ITrackedVoyage): Promise<number> {
		const oldTrackerId: number = trackableVoyage.tracker_id;
		trackableVoyage.tracker_id = NEW_TRACKER_ID;
		const trackableCrew: IFullPayloadAssignment[] = [];
		Object.keys(history.crew).forEach(crewSymbol => {
			const assignment: ITrackedAssignment | undefined = history.crew[crewSymbol].find(assignment =>
				assignment.tracker_id === oldTrackerId
			);
			if (assignment) {
				trackableCrew.push({
					...assignment,
					crew: crewSymbol,
					tracker_id: NEW_TRACKER_ID
				});
			}
		});
		return postTrackedData(dbid, trackableVoyage, trackableCrew).then(result => {
			if (result.status < 300 && result.trackerId && result.inputId === NEW_TRACKER_ID) {
				return result.trackerId;
			}
			else {
				throw('Failed tryPostVoyage -> postTrackedData');
			}
		});
	}

	function discoverVoyages(hv1: ITrackedVoyage[], hv2: ITrackedVoyage[]): ITrackedVoyage[] {
		const newVoyages: ITrackedVoyage[] = [];
		hv2.forEach(v2 => {
			let isV2New: boolean = true;
			hv1.forEach(v1 => {
				if (compareTrackedVoyages(v1, v2)) {
					isV2New = false;
				}
			});
			if (isV2New)
				newVoyages.push(JSON.parse(JSON.stringify(v2)));
		});
		return newVoyages;
	}

	function compareTrackedVoyages(v1: ITrackedVoyage, v2: ITrackedVoyage): boolean {
		if (v1.voyage_id === v2.voyage_id) return true;

		const obj1 = {
			skills: v1.skills,
			ship: v1.ship,
			ship_trait: v1.ship_trait,
			max_hp: v1.max_hp,
			skill_aggregates: v1.skill_aggregates
		};

		const obj2 = {
			skills: v2.skills,
			ship: v2.ship,
			ship_trait: v2.ship_trait,
			max_hp: v2.max_hp,
			skill_aggregates: v2.skill_aggregates
		};

		return JSON.stringify(obj1) === JSON.stringify(obj2);
	}
};

interface IManageButton {
	key: string;
	icon: SemanticICONS;
	content: string;
	show: boolean;
	disabled?: boolean;
	onClick: () => void;
};

const AdvancedOptions = () => {
	const { history, syncState } = React.useContext(HistoryContext);
	const buttons: IManageButton[] = [
		{
			key: 'voyage.tracking.export',
			icon: 'download',
			content: 'Save history to device',	// Save history to device
			show: history.voyages.length > 0,
			onClick: () => exportHistory()
		},
		{
			key: 'voyage.tracking.import',
			icon: 'upload',
			content: 'Import history',	// Import history
			show: syncState === SyncState.LocalOnly,
			disabled: true || syncState === SyncState.ReadOnly,	// Non-functional
			onClick: () => importHistory()
		},
		{
			key: 'voyage.tracking.delete_all',
			icon: 'trash',
			content: 'Delete all history',	// Delete all history
			show: history.voyages.length > 0 && syncState === SyncState.LocalOnly,
			disabled: true || syncState === SyncState.ReadOnly,	// Non-functional
			onClick: () => deleteHistory()
		}
	];

	return (
		<Message>
			<Message.Content>
				<Message.Header>
					Advanced Options
				</Message.Header>
				<div style={{ marginTop: '1em' }}>
					{buttons.filter(button => button.show).map(button => (
						<Button key={button.key}
							icon={button.icon}
							content={button.content}
							disabled={button.disabled}
							onClick={button.onClick}
						/>
					))}
				</div>
			</Message.Content>
		</Message>
	);

	function exportHistory(clipboard?: boolean): void {
		const text: string = JSON.stringify(history);
		if (clipboard) {
			navigator.clipboard.writeText(text);
			return;
		}
		downloadData(`data:text/json;charset=utf-8,${encodeURIComponent(text)}`, 'voyagehistory.json');
	}

	function importHistory(): void {
		// TODO
	}

	function deleteHistory(): void {
		// TODO
	}
};

const DataManagementPlaceholder = (props: ManageRemoteSyncProps) => {
	const button: IManageButton = {
		key: 'voyage.tracking.export',
		icon: 'download',
		content: 'Save history to device',
		show: true,
		onClick: () => exportHistory()
	};

	return (
		<Message>
			<Message.Content>
				<p>Remote sync and other history management options are in development.</p>
				<Button key={button.key}
					icon={button.icon}
					content={button.content}
					disabled={button.disabled}
					onClick={button.onClick}
				/>
			</Message.Content>
		</Message>
	);

	function exportHistory(clipboard?: boolean): void {
		const text: string = JSON.stringify(history);
		if (clipboard) {
			navigator.clipboard.writeText(text);
			return;
		}
		downloadData(`data:text/json;charset=utf-8,${encodeURIComponent(text)}`, 'voyagehistory.json');
	}
}
