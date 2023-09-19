import React from 'react';
import { Dropdown, Message } from 'semantic-ui-react';

import ChainSolver from '../components/fleetbossbattles/chainsolver';

import { useStateWithStorage } from '../utils/storage';
import { PlayerCrew, PlayerData } from '../model/player';
import { CrewMember } from '../model/crew';
import { NumericOptions } from '../model/game-elements';
import { BossBattlesRoot, Chain } from '../model/boss';
import { IDefaultGlobal, GlobalContext } from '../context/globalcontext';

export const DIFFICULTY_NAME = {
	1: 'Easy',
	2: 'Normal',
	3: 'Hard',
	4: 'Brutal',
	5: 'Nightmare',
	6: 'Ultra-Nightmare'
};

export interface BossData extends IDefaultGlobal {
	fleetBossBattlesRoot: BossBattlesRoot;
}

export const BossDataContext = React.createContext<BossData | null>(null);

export const FleetBossBattles = () => {
	const context = React.useContext(GlobalContext);
	const { ephemeral, playerData } = context.player;
	const { crew } = context.core;
	
	const allCrew = JSON.parse(JSON.stringify(crew)) as PlayerCrew[];

	// Calculate highest owned rarities
	allCrew.forEach(ac => {
		const owned = playerData?.player.character.crew.filter(oc => oc.symbol === ac.symbol) ?? [];
		ac.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
		ac.only_frozen = owned.length > 0 && owned.filter(oc => oc.immortal > 0).length === owned.length;
	});

	const allData: BossData = {
		... context,
		core: {
			... context.core,
			crew: allCrew,
		},
		fleetBossBattlesRoot: ephemeral?.fleetBossBattlesRoot ?? {} as BossBattlesRoot
	};

	return (
		<BossDataContext.Provider value={allData}>
			<p>Use this tool to help activate combo chain bonuses in a fleet boss battle.</p>
			<ChainPicker />
		</BossDataContext.Provider>
	);
};

const ChainPicker = () => {
	const allData = React.useContext(BossDataContext);	
	const { playerData } = allData?.player ?? {} as PlayerData;

	const [activeBoss, setActiveBoss] = useStateWithStorage<number | undefined>('fbb/active', undefined);
	const [chain, setChain] = React.useState<Chain | undefined>(undefined);

	const describeChain = (boss) => {
		const bossName = allData?.fleetBossBattlesRoot?.groups?.find(group => group.symbol === boss.group)?.name;
		return `${bossName}, ${DIFFICULTY_NAME[boss.difficulty_id]}, Chain #${boss.combo.previous_node_counts.length+1}`;
	};

	React.useEffect(() => {
		if (activeBoss && allData) {
			const boss = allData.fleetBossBattlesRoot?.statuses.find(b => b.id === activeBoss);
			if (!boss || !boss.combo) return;
			const chainIndex = boss.combo.previous_node_counts.length;
			const chain = {
				id: `${boss.id}-${chainIndex}`,
				source: 'playerdata',
				difficultyId: boss.difficulty_id,
				traits: boss.combo.traits,
				nodes: boss.combo.nodes,
				description: describeChain(boss)
			} as Chain;
			setChain({...chain});
		}
	}, [activeBoss, playerData]);

	if (!allData || !allData.fleetBossBattlesRoot)
		return <Message>No boss data found. Please upload a more recent version of your player data.</Message>;

	const chainOptions = [] as NumericOptions[];
	allData.fleetBossBattlesRoot.statuses.forEach(boss => {
		if (boss.id && boss.combo && boss.ends_in) {
			const unlockedNodes = boss.combo.nodes.filter(node => node.unlocked_character);
			if (boss.combo.nodes.length - unlockedNodes.length > 0) {
				chainOptions.push(
					{
						key: boss.id,
						value: boss.id,
						text: `${describeChain(boss)} (${unlockedNodes.length}/${boss.combo.nodes.length})`
					}
				);
			}
		}
	});

	if (!activeBoss && chainOptions.length === 1)
		setActiveBoss(chainOptions[0].value);

	return (
		<React.Fragment>
			{chainOptions.length > 0 &&
				<Dropdown fluid selection
					placeholder='Select a difficulty'
					options={chainOptions}
					value={activeBoss}
					onChange={(e, { value }) => setActiveBoss(value as number)}
				/>
			}
			{chainOptions.length === 0 && <Message>You have no open fleet boss battles.</Message>}
			{chain && <ChainSolver key={chain.id} chain={chain} allCrew={allData.core.crew as PlayerCrew[]} dbid={`${allData.player.playerData?.player.dbid}`} />}
		</React.Fragment>
	);
};

export default FleetBossBattles;
