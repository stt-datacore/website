import React from 'react';
import { Step, Icon } from 'semantic-ui-react';

import { CompletionState, PlayerCrew } from '../../model/player';

import { GlobalContext } from '../../context/globalcontext';

import CONFIG from '../../components/CONFIG';
import { applyCrewBuffs } from '../../utils/crewutils';

import { IRosterCrew } from './model';

type RosterPickerProps = {
	rosterType: string;
	setRosterType: (rosterType: string) => void;
	setRosterCrew: (rosterCrew: PlayerCrew[]) => void;
};

export const RosterPicker = (props: RosterPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral, buffConfig } = globalContext.player;
	const { rosterType, setRosterType, setRosterCrew } = props;

	const [allCrew, setAllCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [myCrew, setMyCrew] = React.useState<IRosterCrew[] | undefined>(undefined);

	React.useEffect(() => {
		const rosterCrew = [] as IRosterCrew[];
		if (rosterType === 'myCrew' && playerData) {
			if (myCrew) {
				setRosterCrew([...myCrew]);
				return;
			}

			// Create fake ids for active crew based on rarity, level, and equipped status
			const activeCrewIds = (ephemeral?.activeCrew ?? []).map(ac => {
				return {
					id: ac.id,
					active_status: ac.active_status
				};
			});

			let crewmanId = 1;
			playerData.player.character.crew.forEach(crew => {
				const crewman = JSON.parse(JSON.stringify(crew)) as IRosterCrew;
				//crewman.id = crewmanId++;

				// Re-attach active_status property
				crewman.active_status = 0;
				if (crew.immortal <= 0) {
					const activeCrewId = crew.id;
					const active = activeCrewIds.find(ac => ac.id === activeCrewId);
					if (active) {
						crewman.active_status = active.active_status ?? 0;
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
				rosterCrew.push(crewman);
			});

			// Add shared crew to roster
			if (playerData.player.character.crew_borrows?.length && playerData.player.squad.rank !== 'LEADER') {
				playerData.player.character.crew_borrows.forEach((crewBorrow, idx) => {
					const sharedCrew = { ...globalContext.core.crew.find(c => c.symbol === crewBorrow.symbol), ...crewBorrow } as IRosterCrew;
					sharedCrew.id = rosterCrew.length + idx + 1;
					sharedCrew.shared = true;
					sharedCrew.statusIcon = 'share alternate';
					sharedCrew.have = false;
					if (buffConfig) applyCrewBuffs(sharedCrew, buffConfig);
					rosterCrew.push(sharedCrew);
				});
			}

			setMyCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
		else {
			if (allCrew) {
				setRosterCrew([...allCrew]);
				return;
			}
			let crewmanId = 1;
			globalContext.core.crew.forEach(crew => {
				const crewman = JSON.parse(JSON.stringify(crew)) as IRosterCrew;
				crewman.id = crewmanId++;
				CONFIG.SKILLS_SHORT.forEach((skill) => {
					crewman[skill.name] = {
						core: crewman.base_skills[skill.name]?.core ?? 0,
						max: crewman.base_skills[skill.name]?.range_max ?? 0,
						min: crewman.base_skills[skill.name]?.range_min ?? 0
					}
				});
				if (globalContext.maxBuffs) applyCrewBuffs(crewman, globalContext.maxBuffs);
				rosterCrew.push(crewman);
			});
			setAllCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
	}, [rosterType, playerData]);

	if (!playerData || !myCrew)
		return (<></>);

	return (
		<Step.Group fluid>
			<Step active={rosterType === 'myCrew'} onClick={() => setRosterType('myCrew')}>
				<Icon name='users' />
				<Step.Content>
					<Step.Title>Owned Crew</Step.Title>
					<Step.Description>Only consider your owned crew</Step.Description>
				</Step.Content>
			</Step>
			<Step active={rosterType === 'allCrew'} onClick={() => setRosterType('allCrew')}>
				<Icon name='fire' />
				<Step.Content>
					<Step.Title>Best Possible Crew</Step.Title>
					<Step.Description>Consider all crew in the game</Step.Description>
				</Step.Content>
			</Step>
		</Step.Group>
	);
};
