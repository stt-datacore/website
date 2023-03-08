import React from 'react';
import { Header, Dropdown, Message, Form } from 'semantic-ui-react';

import ChainSpotter from '../components/fleetbossbattles/chainspotter';

import { useStateWithStorage } from '../utils/storage';

const DIFFICULTY_NAME = {
	1: 'Easy',
	2: 'Normal',
	3: 'Hard',
	4: 'Brutal',
	5: 'Nightmare',
	6: 'Ultra-Nightmare'
};

const AllDataContext = React.createContext();

type FleetBossBattlesProps = {
	playerData: any;
	allCrew: any[];
};

const FleetBossBattles = (props: FleetBossBattlesProps) => {
	const { playerData } = props;

	const [fleetbossData, ] = useStateWithStorage('tools/fleetbossData', undefined);

	const allCrew = JSON.parse(JSON.stringify(props.allCrew));

	// Calculate highest owned rarities
	allCrew.forEach(ac => {
		const owned = playerData.player.character.crew.filter(oc => oc.symbol === ac.symbol);
		ac.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
		ac.only_frozen = owned.length > 0 && owned.filter(oc => oc.immortal === 0).length === 0;
	});

	const allData = {
		playerData,
		allCrew,
		bossData: fleetbossData
	};

	return (
		<AllDataContext.Provider value={allData}>
			<p>Use this tool to help activate combo chain bonuses in a fleet boss battle.</p>
			<ChainPicker />
		</AllDataContext.Provider>
	);
};

const ChainPicker = () => {
	const allData = React.useContext(AllDataContext);

	const [activeBoss, setActiveBoss] = useStateWithStorage('fbb/active', undefined);
	const [chain, setChain] = React.useState(undefined);

	const describeChain = (boss) => {
		const bossName = allData.bossData.groups.find(group => group.symbol === boss.group).name;
		return `${bossName}, ${DIFFICULTY_NAME[boss.difficulty_id]}, Chain #${boss.combo.previous_node_counts.length+1}`;
	};

	React.useEffect(() => {
		if (activeBoss) {
			const boss = allData.bossData.statuses.find(b => b.id === activeBoss);
			if (!boss) return;
			const chainIndex = boss.combo.previous_node_counts.length;
			const chain = {
				id: `${boss.id}-${chainIndex}`,
				source: 'playerdata',
				dbid: allData.playerData.player.dbid,
				difficultyId: boss.difficulty_id,
				traits: boss.combo.traits,
				nodes: boss.combo.nodes,
				description: describeChain(boss)
			};
			setChain({...chain});
		}
	}, [activeBoss]);

	if (!allData.bossData)
		return <Message>No boss data found. Please upload a more recent version of your player data.</Message>;

	const chainOptions = [];
	allData.bossData.statuses.forEach(boss => {
		if (boss.ends_in) {
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
			<div style={{ margin: '2em 0' }}>
				{chainOptions.length > 0 &&
					<Dropdown fluid selection
						placeholder='Select a difficulty'
						options={chainOptions}
						value={activeBoss}
						onChange={(e, { value }) => setActiveBoss(value)}
					/>
				}
				{chainOptions.length === 0 && <Message>You have no open fleet boss battles.</Message>}
			</div>
			{chain && <ChainSpotter chain={chain} allCrew={allData.allCrew} />}
		</React.Fragment>
	);
};

export default FleetBossBattles;
