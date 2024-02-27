import React from 'react';
import { Step, Icon } from 'semantic-ui-react';

import { PlayerCrew, CompactCrew, CompletionState, PlayerBuffMode } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';
import { oneCrewCopy, applyCrewBuffs, getSkills } from '../../utils/crewutils';

import { IRosterCrew, RosterType } from './model';
import { CrewMember } from '../../model/crew';

type RosterPickerProps = {
	rosterType: string;
	setRosterType: (rosterType: RosterType) => void;
	setRosterCrew: (rosterCrew: IRosterCrew[]) => void;
	buffMode?: PlayerBuffMode;
};

export const RosterPicker = (props: RosterPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { maxBuffs } = globalContext;
	const { playerData, buffConfig: playerBuffs, ephemeral } = globalContext.player;
	const { rosterType, setRosterType, setRosterCrew, buffMode } = props;

	const [allCrew, setAllCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [buyBackCrew, setBuyBackCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [myCrew, setMyCrew] = React.useState<IRosterCrew[] | undefined>(undefined);

	React.useEffect(() => {
		const rosterType = playerData ? 'myCrew' : 'allCrew';
		if (!playerData) setBuyBackCrew(undefined);
		initializeRoster(rosterType, true);
		setRosterType(rosterType);
	}, [playerData]);

	React.useEffect(() => {
		initializeRoster(rosterType);
	}, [rosterType]);

	React.useEffect(() => {
		initializeRoster(rosterType, true);
	}, [buffMode]);

	if (!playerData)
		return (<></>);
	const hasBuyBack = !!playerData.buyback_well?.length;

	return (
		<Step.Group fluid widths={hasBuyBack ? 3 : 2}>
			<Step active={rosterType === 'myCrew'} onClick={() => setRosterType('myCrew')}>
				<img src='/media/crew_icon.png' style={{ width: '3em', marginRight: '1em' }} />
				<Step.Content>
					<Step.Title>Owned Crew</Step.Title>
					<Step.Description>View only your owned crew</Step.Description>
				</Step.Content>
			</Step>
			{hasBuyBack && 
			<Step active={rosterType === 'buyBack'} onClick={() => setRosterType('buyBack')}>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/honor_currency.png`} style={{ width: '3em', marginRight: '1em' }} /> 
				<Step.Content>
					<Step.Title>Buy-Back Well</Step.Title>
					<Step.Description>View crew in the buy-back well</Step.Description>
				</Step.Content>
			</Step>}
			<Step active={rosterType === 'allCrew'} onClick={() => setRosterType('allCrew')}>
				<Icon name='game' />
				<Step.Content>
					<Step.Title>Game Roster</Step.Title>
					<Step.Description>Overview of all crew in the game</Step.Description>
				</Step.Content>
			</Step>
		</Step.Group>
	);

	function initializeRoster(rosterType: string, forceReload: boolean = false): void {
		let rosterCrew = [] as IRosterCrew[];

		if (rosterType === 'myCrew' && playerData) {
			if (myCrew && !forceReload) {
				setRosterCrew([...myCrew]);
				return;
			}
			rosterCrew = rosterizeMyCrew(playerData.player.character.crew, ephemeral?.activeCrew ?? []);
			setMyCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
		else if (rosterType === 'buyBack' && playerData) {
			if (buyBackCrew && !forceReload) {
				setRosterCrew([...buyBackCrew]);
				return;
			}
			const crewMap = playerData.buyback_well?.map(b => globalContext.core.crew.find(f => f.symbol === b) as IRosterCrew);			
			rosterCrew = rosterizeAllCrew(crewMap);
			setBuyBackCrew([...rosterCrew]);
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

	function rosterizeMyCrew(myCrew: PlayerCrew[], activeCrew: CompactCrew[]): IRosterCrew[] {
		const rosterCrew = [] as IRosterCrew[];

		// Create fake ids for active crew based on rarity, level, and equipped status
		const activeCrewIds = activeCrew.map(ac => {
			return {
				id: ac.id,
				active_status: ac.active_status
			};
		});

		let crewmanId = 1;
		myCrew.forEach(crew => {
			const crewman = {
				... oneCrewCopy(crew),
				//id: crewmanId++,
				have: true
			} as IRosterCrew;

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

			rosterCrew.push(crewman);
		});

		return rosterCrew;
	}

	function rosterizeAllCrew(alternativeCrew?: CrewMember[]): IRosterCrew[] {
		const rosterCrew = [] as IRosterCrew[];

		let crewmanId = 1;
		(alternativeCrew ?? globalContext.core.crew).forEach(crew => {
			const crewman = {
				... oneCrewCopy(crew),
				id: crewmanId++,
				immortal: CompletionState.DisplayAsImmortalStatic,
				level: playerData?.player.character.max_level ?? 100, // crew.max_level,   /* this property does not exist on core.crew!!! */,
				rarity: crew.max_rarity,
				have: false,
				command_skill: { core: 0, min: 0, max: 0 },
				medicine_skill: { core: 0, min: 0, max: 0 },
				security_skill: { core: 0, min: 0, max: 0 },
				diplomacy_skill: { core: 0, min: 0, max: 0 },
				engineering_skill: { core: 0, min: 0, max: 0 },
				science_skill: { core: 0, min: 0, max: 0 },
			} as IRosterCrew;

			if (playerData) {
				const owned = playerData.player.character.crew.filter(crew => crew.symbol === crewman.symbol);
				crewman.have = owned.length > 0;
				crewman.highest_owned_rarity = owned.length > 0 ? owned.reduce((prev, curr) => Math.max(curr.rarity, prev), 0) : 0;
				crewman.any_immortal = owned.length > 0 ? owned.some(crew => crew.immortal > 0 || crew.immortal === CompletionState.Immortalized) : false;
			}

			for (let skill of getSkills(crew)) {
				if (!(skill in crewman) || !crewman[skill].core) crewman[skill] = {
					core: crew.base_skills[skill].core,
					max: crew.base_skills[skill].range_max,
					min: crew.base_skills[skill].range_min,
				}
				crewman.skills ??= {};
				if (!(skill in crewman.skills)) crewman.skills[skill] = { ... crew.base_skills[skill] };
			}

			if (buffMode === 'player' && playerData && playerBuffs) {
				applyCrewBuffs(crewman, playerBuffs);
			}
			else if (buffMode === 'max' && maxBuffs) {
				applyCrewBuffs(crewman, maxBuffs);
			}

			rosterCrew.push(crewman);
		});

		return rosterCrew;
	}
};
