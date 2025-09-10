import React from 'react';
import { Step, Icon } from 'semantic-ui-react';

import { BorrowedCrew, CompletionState, PlayerCrew } from '../../model/player';

import { GlobalContext } from '../../context/globalcontext';

import CONFIG from '../../components/CONFIG';
import { applyCrewBuffs } from '../../utils/crewutils';

import { IRosterCrew } from './model';
import { TinyStore } from '../../utils/tiny';
import { CrewMember } from '../../model/crew';
import { QuipmentProspectsOptions } from '../qpconfig/options';
import { DefaultQuipmentConfig, QPContext, QuipmentProspectConfig } from '../qpconfig/provider';
import { useStateWithStorage } from '../../utils/storage';

type RosterPickerProps = {
	rosterType: string;
	setRosterType: (rosterType: string) => void;
	setRosterCrew: (rosterCrew: PlayerCrew[]) => void;
};

export const RosterPicker = (props: RosterPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const qpContext = React.useContext(QPContext);
	const { t } = globalContext.localized;
	const { playerData, ephemeral, buffConfig } = globalContext.player;
	const { rosterType, setRosterType, setRosterCrew } = props;

	const [allCrew, setAllCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [myCrew, setMyCrew] = React.useState<IRosterCrew[] | undefined>(undefined);

	const [qpConfig, setQpConfig, applyQp] = qpContext.useQPConfig();

	React.useEffect(() => {
		const rosterType = playerData ? 'myCrew' : 'allCrew';
		initializeRoster(rosterType, true);
		setRosterType(rosterType);
	}, [playerData, qpConfig]);

	React.useEffect(() => {
		initializeRoster(rosterType);
	}, [rosterType]);

	if (!playerData || !myCrew)
		return (<></>);

	return (
		<React.Fragment>
			<Step.Group fluid>
				<Step active={rosterType === 'myCrew'} onClick={() => setRosterType('myCrew')}>
					<Icon name='users' />
					<Step.Content>
						<Step.Title>{t('tool_roster_picker.owned_crew.title')}</Step.Title>
						<Step.Description>{t('tool_roster_picker.owned_crew.description')}</Step.Description>
					</Step.Content>
				</Step>
				<Step active={rosterType === 'allCrew'} onClick={() => setRosterType('allCrew')}>
					<Icon name='fire' />
					<Step.Content>
						<Step.Title>{t('tool_roster_picker.all_crew.title')}</Step.Title>
						<Step.Description>{t('tool_roster_picker.all_crew.description')}</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>
		</React.Fragment>
	);

	function initializeRoster(rosterType: string, forceReload: boolean = false): void {
		let rosterCrew = [] as IRosterCrew[];

		if (rosterType === 'myCrew' && playerData) {
			if (myCrew && !forceReload) {
				setRosterCrew([...myCrew]);
				return;
			}
			rosterCrew = rosterizeMyCrew();
			setMyCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
		else if (rosterType === 'allCrew') {
			if (allCrew && !forceReload) {
				setRosterCrew([...allCrew]);
				return;
			}
			rosterCrew = rosterizeAllCrew();
			setAllCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
	}

	function rosterizeMyCrew(): IRosterCrew[] {
		if (!playerData) return [];

		const activeCrewIds = (ephemeral?.activeCrew ?? []).map(ac => {
			return {
				id: ac.id,
				active_status: ac.active_status,
				active_id: ac.active_id,
				active_index: ac.active_index
			};
		});

		const rosterCrew = playerData.player.character.crew.map(crew => {
			let crewman = structuredClone(crew) as IRosterCrew;

			// Re-attach active_status, id, index properties
			crewman.active_status = 0;
			if (crew.immortal <= 0) {
				const activeCrewId = crew.id;
				const active = activeCrewIds.find(ac => ac.id === activeCrewId);
				if (active) {
					crewman.active_status = active.active_status ?? 0;
					crewman.active_id = active.active_id ?? 0;
					crewman.active_index = active.active_index ?? 0;
					active.id = 0;	// Clear this id so that dupes are counted properly
				}
			}

			// Add immortalized skill numbers to skill_data
			//	coreData crew stores immortalized numbers as base_skills,
			//	but playerData base_skills of unleveled crew are unbuffed skills at current level
			if (crew.immortal === CompletionState.NotComplete) {
				const ff = globalContext.core.crew.find((c) => c.symbol === crew.symbol);
				if (ff) {
					crewman.skill_data.push({
						rarity: crew.max_rarity,
						base_skills: ff.base_skills
					});
				}
			}

			crewman = applyQp(crewman) as IRosterCrew;
			return crewman;
		});

		// Add shared crew to roster
		const store = TinyStore.getStore(`eventData/${playerData.player.dbid}`);

		if (playerData.player.squad.rank !== 'LEADER' && !ephemeral?.borrowedCrew.length) {
			if (ephemeral?.events?.length) {
				let crewBorrow = store.getValue<BorrowedCrew>(`crewBorrow/${ephemeral.events[0].id}`);
				if (crewBorrow) {
					const sharedCrew = { ...globalContext.core.crew.find(c => c.symbol === crewBorrow.symbol), ...crewBorrow } as IRosterCrew;
					sharedCrew.id = rosterCrew.length + 1;
					sharedCrew.borrowed = true;
					sharedCrew.statusIcon = 'share alternate';
					sharedCrew.have = false;
					if (buffConfig) applyCrewBuffs(sharedCrew, buffConfig);
					rosterCrew.push(sharedCrew);
				}
				else {
					store.clear();
				}
			}
			else {
				store.clear();
			}
		}
		else {
			store.clear();
			ephemeral?.borrowedCrew.forEach((crewBorrow, idx) => {
				if (ephemeral?.events?.length) {
					store.setValue<BorrowedCrew>(`crewBorrow/${ephemeral.events[0].id}`, crewBorrow, true);
				}
				const sharedCrew = { ...globalContext.core.crew.find(c => c.symbol === crewBorrow.symbol), ...crewBorrow } as IRosterCrew;
				sharedCrew.id = rosterCrew.length + idx + 1;
				sharedCrew.borrowed = true;
				sharedCrew.statusIcon = 'share alternate';
				sharedCrew.have = false;
				if (buffConfig) applyCrewBuffs(sharedCrew, buffConfig);
				rosterCrew.push(sharedCrew);
			});
		}

		return rosterCrew;
	}

	function rosterizeAllCrew(): IRosterCrew[] {
		let crewmanId = 1;

		const rosterCrew = globalContext.core.crew.map(crew => {
			let crewman = structuredClone(crew) as IRosterCrew;
			crewman.id = crewmanId++;
			CONFIG.SKILLS_SHORT.forEach((skill) => {
				crewman[skill.name] = {
					core: crewman.base_skills[skill.name]?.core ?? 0,
					max: crewman.base_skills[skill.name]?.range_max ?? 0,
					min: crewman.base_skills[skill.name]?.range_min ?? 0
				}
			});
			if (globalContext.maxBuffs) applyCrewBuffs(crewman, globalContext.maxBuffs);
			crewman = applyQp(crewman) as IRosterCrew;
			return crewman;
		});

		return rosterCrew;
	}
};
