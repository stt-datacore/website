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
import { getRemoteHistory, SyncState } from './utils';
import { ITrackedVoyage, IVoyageHistory } from '../../model/voyage';

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
	const { dbid, history, syncState, setMessageId } = React.useContext(HistoryContext);
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
			tryEnableSync().then((success: boolean) => {
				if (success) {
					setPostRemote(true);
					setSyncState(SyncState.RemoteReady);
				}
			});
		}
		else {
			// Delete all from remote
			setPostRemote(false);
		}
	}

	async function tryEnableSync(): Promise<boolean> {
		return getRemoteHistory(dbid).then(async (remoteHistory) => {
			if (remoteHistory) {
				const newHistory: IVoyageHistory = JSON.parse(JSON.stringify(remoteHistory));
				const voyagesToAdd: ITrackedVoyage[] = discoverVoyages(newHistory.voyages, history.voyages);
				// TODO
			}
			throw('Failed tryEnableSync');
		}).catch(e => {
			setMessageId('voyage.history_msg.failed_to_connect');
			console.log(e);
			return false;
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

	// async function mergeLocalRemote(dbid: string, local: IVoyageHistory, remote: IVoyageHistory): Promise<IVoyageHistory> {
	// 	let c = local.voyages.length;
	// 	let d = remote.voyages.length;
	// 	let safeId = remote.voyages.map(m => m.tracker_id).reduce((p, n) => p > n ? p : n, 0) + 1;
	// 	let goodLocals = [] as number[];

	// 	for (let i = 0; i < c; i++) {
	// 		let pass = true;
	// 		for (let j = 0; j < d; j++) {
	// 			if (compareTrackedVoyages(local.voyages[i], remote.voyages[j])) {
	// 				pass = false;
	// 				break;
	// 			}
	// 			else if (local.voyages[i].tracker_id === remote.voyages[i].tracker_id) {
	// 				let oldId = local.voyages[i].tracker_id;
	// 				let newId = safeId++;

	// 				local.voyages[i].tracker_id = newId;

	// 				Object.keys(local.crew).forEach((symbol) => {
	// 					for (let assignment of local.crew[symbol]) {
	// 						if (assignment.tracker_id === oldId) {
	// 							assignment.tracker_id = newId;
	// 						}
	// 					}
	// 				});
	// 			}
	// 		}

	// 		if (pass) {
	// 			goodLocals.push(local.voyages[i].tracker_id);
	// 		}
	// 	}

	// 	for (let trackerId of goodLocals) {
	// 		let voyage = local.voyages.find(f => f.tracker_id === trackerId)!;
	// 		let result = await postRemoteVoyage(dbid, voyage);
	// 		if (result?.trackerId) {
	// 			const crewForPost = {} as { [key: string]: ITrackedAssignment[] };
	// 			voyage.tracker_id = result.trackerId;
	// 			for (let symbol in local.crew) {
	// 				let crewTrack = local.crew[symbol].find(f => f.tracker_id === trackerId);
	// 				if (crewTrack) {
	// 					crewTrack.tracker_id = voyage.tracker_id;
	// 					crewForPost[symbol] ??= [];
	// 					crewForPost[symbol].push(crewTrack);
	// 				}
	// 			}
	// 			await postRemoteCrew(dbid, crewForPost);
	// 		}
	// 	}

	// 	return (await getRemoteHistory(dbid))!
	// }

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
			content: 'Save history to device',
			show: history.voyages.length > 0,
			onClick: () => exportHistory()
		},
		{
			key: 'voyage.tracking.import',
			icon: 'upload',
			content: 'Import history',
			show: syncState === SyncState.LocalOnly,
			disabled: true || syncState === SyncState.ReadOnly,	// Non-functional
			onClick: () => importHistory()
		},
		{
			key: 'voyage.tracking.delete_all',
			icon: 'trash',
			content: 'Delete all history',
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
