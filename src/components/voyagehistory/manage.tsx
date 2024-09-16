import React from 'react';
import {
	Accordion,
	Button,
	Checkbox,
	Message,
	SemanticICONS
} from 'semantic-ui-react';

import { downloadData } from '../../utils/crewutils';

import { HistoryContext } from './context';
import { getTrackedData, NEW_TRACKER_ID, postTrackedData, SyncState } from './utils';
import { IFullPayloadAssignment, ITrackedAssignment, ITrackedVoyage } from '../../model/voyage';

type ManageRemoteSyncProps = {
	postRemote: boolean;
	setPostRemote: (postRemote: boolean) => void;
	setSyncState: (syncState: SyncState) => void;
};

export const DataManagement = (props: ManageRemoteSyncProps) => {
	const { history, syncState } = React.useContext(HistoryContext);

	const [activePanel, setActivePanel] = React.useState<string>('');

	let syncStatus: string = 'Disabled';
	if (syncState === SyncState.RemoteReady) syncStatus = 'Enabled';

	return (
		<Message style={{ marginTop: '3em' }}>
			<Message.Content>
				<Message.Header>Manage Voyage History</Message.Header>
				{history.voyages.length > 0 && (
					<p>Manage your voyage history here.</p>
				)}
				{history.voyages.length === 0 && (
					<p>You don't have any voyage history yet. Start tracking voyages from the calculator. You can also import voyage history from remote sync or from a saved file.</p>
				)}
				{syncState === SyncState.ReadOnly && (
					<p>Note: voyage history is currently disabled. Please reload this page to try synchronizing again.</p>
				)}
				<Accordion>
					<Accordion.Panel
						active={activePanel === 'remotesync'}
						onTitleClick={() => setActivePanel(activePanel === 'remotesync' ? '' : 'remotesync')}
						title={{ content: `Remote Sync ${syncStatus}`, icon: `caret ${activePanel === 'remotesync' ? 'down' : 'right'}` }}
						content={{ children: () => renderPanel('remotesync') }}
					/>
					<Accordion.Panel
						active={activePanel === 'advanced'}
						onTitleClick={() => setActivePanel(activePanel === 'advanced' ? '' : 'advanced')}
						title={{ content: 'Advanced Options', icon: `caret ${activePanel === 'advanced' ? 'down' : 'right'}` }}
						content={{ children: () => renderPanel('advanced') }}
					/>
				</Accordion>
			</Message.Content>
		</Message>
	);

	function renderPanel(panel: string): JSX.Element {
		if (activePanel !== panel) return <></>;
		return (
			<div style={{ margin: '0 .5em', padding: '0 1em', borderLeft: '3px solid gray' }}>
				{activePanel === 'remotesync' && (
					<ManageRemoteSync
						postRemote={props.postRemote}
						setPostRemote={props.setPostRemote}
						setSyncState={props.setSyncState}
					/>
				)}
				{activePanel === 'advanced' && <ManageAdvanced />}
			</div>
		);
	}
};

const ManageRemoteSync = (props: ManageRemoteSyncProps) => {
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);
	const { postRemote, setPostRemote, setSyncState } = props;

	return (
		<React.Fragment>
			{syncState === SyncState.LocalOnly && (
				<p>Voyage history is currently not synchronizing with DataCore. You can only view and update past voyages on the device where you initially tracked them.</p>
			)}
			{syncState === SyncState.RemoteReady && (
				<p>Voyage history is currently synchronizing with DataCore. You can view and update voyages on all devices with synchronization enabled.</p>
			)}
			<p>Describe remote sync and relevant data policies here.</p>
			<div style={{ margin: '1em 0' }}>
				<Checkbox
					label='Enable remote sync (experimental)'
					checked={postRemote}
					onClick={(e, data) => toggleRemoteSync(data.checked as boolean)}
				/>
			</div>
		</React.Fragment>
	);

	function toggleRemoteSync(requestEnable: boolean): void {
		if (requestEnable) {
			tryEnableSync();
		}
		else {
			// Delete all from remote
			setPostRemote(false);
		}
	}

	function tryEnableSync(): void {
		getTrackedData(dbid).then(async (remoteHistory) => {
			if (remoteHistory) {
				const voyagesToPost: ITrackedVoyage[] = discoverVoyages(remoteHistory.voyages, history.voyages);
				let voyagesPosted: number = 0;
				Promise.all(
					voyagesToPost.map(voyageToSync => tryPostVoyage(voyageToSync))
				).then(postedIds => {
					voyagesPosted = postedIds.length;
				});
				if (voyagesToPost.length > voyagesPosted)
					console.warn('Warning: not all voyages posted to remote sync!');
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

const ManageAdvanced = () => {
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
		<React.Fragment>
			{buttons.filter(button => button.show).map(button => (
				<Button key={button.key}
					icon={button.icon}
					content={button.content}
					disabled={button.disabled}
					onClick={button.onClick}
				/>
			))}
		</React.Fragment>
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

export const DataManagementPlaceholder = (props: ManageRemoteSyncProps) => {
	const button: IManageButton = {
		key: 'voyage.tracking.export',
		icon: 'download',
		content: 'Save history to device',
		show: true,
		onClick: () => exportHistory()
	};

	return (
		<Message style={{ marginTop: '3em' }}>
			<Message.Content>
				<Message.Header>Manage Voyage History</Message.Header>
				<p>Manage your voyage history here.</p>
				<p>Remote sync and import options are in development.</p>
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
