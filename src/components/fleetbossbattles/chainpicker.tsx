import React from 'react';
import { Dropdown, Message } from 'semantic-ui-react';

import { NumericOptions } from '../../model/game-elements';
import { Chain, FleetBoss } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';

import ChainSolver from '../../components/fleetbossbattles/chainsolver';

export const DIFFICULTY_NAME = {
	1: 'Easy',
	2: 'Normal',
	3: 'Hard',
	4: 'Brutal',
	5: 'Nightmare',
	6: 'Ultra-Nightmare'
};

export const ChainPicker = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [activeBoss, setActiveBoss] = useStateWithStorage<number | undefined>('fbb/active', undefined);
	const [collaborate, setCollaborate] = React.useState(false);
	const [chain, setChain] = React.useState<Chain | undefined>(undefined);

	const describeChain = (boss: FleetBoss) => {
		const description = [] as string[];
		const bossName = ephemeral?.fleetBossBattlesRoot?.groups?.find(group => group.symbol === boss.group)?.name;
		if (bossName) description.push(bossName);
		description.push(`${DIFFICULTY_NAME[boss.difficulty_id]}`);
		const chainNumber = boss.combo?.previous_node_counts ? boss.combo.previous_node_counts.length + 1 : undefined;
		if (chainNumber) description.push(`Chain #${chainNumber}`);
		return description.join(', ');
	};

	React.useEffect(() => {
		if (activeBoss && ephemeral?.fleetBossBattlesRoot) {
			const boss = ephemeral.fleetBossBattlesRoot.statuses.find(b => b.id === activeBoss);
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

	if (!ephemeral || !ephemeral.fleetBossBattlesRoot)
		return <Message>No boss data found. Please upload a more recent version of your player data.</Message>;

	const chainOptions = [] as NumericOptions[];
	ephemeral.fleetBossBattlesRoot.statuses.forEach(boss => {
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
				<div style={{ display: 'flex', flexFlow: 'row wrap', alignItems: 'center', columnGap: '1em' }}>
					<Dropdown fluid selection
						placeholder='Select a difficulty'
						options={chainOptions}
						value={activeBoss}
						onChange={(e, { value }) => setActiveBoss(value as number)}
					/>
				</div>
			}
			{chainOptions.length === 0 && <Message>You have no open fleet boss battles.</Message>}
			{chain && <ChainSolver key={chain.id} chain={chain} />}
		</React.Fragment>
	);
};
