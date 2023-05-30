import React from 'react';
import { Header, Dropdown, Message, Form } from 'semantic-ui-react';

import ComboSolver from '../components/fleetbossbattles/combosolver';

import { useStateWithStorage } from '../utils/storage';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { CrewMember } from '../model/crew';
import { FuseOptions } from '../model/game-elements';
import { BossBattlesRoot, Combo } from '../model/boss';

const DIFFICULTY_NAME = {
	1: 'Easy',
	2: 'Normal',
	3: 'Hard',
	4: 'Brutal',
	5: 'Nightmare',
	6: 'Ultra-Nightmare'
};

interface FleetBossBattlesProps {
	playerData: PlayerData;
	allCrew: PlayerCrew[];
};

interface AllData extends FleetBossBattlesProps {
	bossData: BossBattlesRoot;
}

const AllDataContext = React.createContext<AllData | null>(null);

const FleetBossBattles = (props: FleetBossBattlesProps) => {
	const { playerData } = props;

	const [fleetbossData, ] = useStateWithStorage<BossBattlesRoot | undefined>('tools/fleetbossData', undefined);

	const allCrew = JSON.parse(JSON.stringify(props.allCrew)) as PlayerCrew[];

	// Calculate highest owned rarities
	allCrew.forEach(ac => {
		const owned = playerData.player.character.crew.filter(oc => oc.symbol === ac.symbol);
		ac.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
		ac.only_frozen = owned.length > 0 && owned.filter(oc => oc.immortal > 0).length === owned.length;
	});

	const allData: AllData = {
		playerData,
		allCrew,
		bossData: fleetbossData ?? {} as BossBattlesRoot
	};

	return (
		<AllDataContext.Provider value={allData}>
			<p>Use this tool to help activate combo chain bonuses in a fleet boss battle.</p>
			<ComboPicker />
		</AllDataContext.Provider>
	);
};

const ComboPicker = () => {
	const allData = React.useContext(AllDataContext);

	const [activeBoss, setActiveBoss] = React.useState<number | undefined>(undefined);
	const [combo, setCombo] = React.useState<Combo | undefined>(undefined);

	React.useEffect(() => {
		if (activeBoss && allData) {
			const boss = allData.bossData.statuses.find(b => b.id === activeBoss);
			if (boss && boss.combo) {
				const comboIndex = boss.combo?.previous_node_counts.length;
				const combo: Combo = {
					... boss.combo,
					id: `${boss.id}-${comboIndex}`,
					source: 'playerdata',
					difficultyId: boss.difficulty_id,
					traits: boss.combo?.traits ?? [],
					nodes: boss.combo?.nodes ?? []
				};
				setCombo({...combo});
			}
		}
	}, [activeBoss]);

	if (!allData?.bossData)
		return <Message>No boss data found. Please upload a more recent version of your player data.</Message>;

	const bossOptions: FuseOptions[] = [];
	const getBossName = (bossSymbol) => {
		return allData?.bossData?.groups?.find(group => group.symbol === bossSymbol)?.name;
	};
	allData?.bossData.statuses.forEach(boss => {
		if (boss.ends_in) {
			const unlockedNodes = boss.combo?.nodes.filter(node => node.unlocked_character) ?? [];
			if (boss.combo?.nodes && boss.combo.nodes.length - unlockedNodes.length > 0) {
				bossOptions.push(
					{
						key: boss.id as number,
						value: boss.id as number,
						text: `${getBossName(boss.group)}, ${DIFFICULTY_NAME[boss.difficulty_id]}, Chain #${boss.combo.previous_node_counts.length+1} (${unlockedNodes.length}/${boss.combo.nodes.length})`
					}
				);
			}
		}
	});

	if (!activeBoss && bossOptions.length === 1)
		setActiveBoss(bossOptions[0].value);

	return (
		<React.Fragment>
			<div style={{ margin: '2em 0' }}>
				{bossOptions.length > 0 &&
					<Dropdown fluid selection
						placeholder='Select a difficulty'
						options={bossOptions}
						value={activeBoss}
						onChange={(e, { value }) => setActiveBoss(value as number)}
					/>
				}
				{bossOptions.length === 0 && <Message>You have no open fleet boss battles.</Message>}
			</div>
			{combo && <ComboSolver allCrew={allData.allCrew} combo={combo} />}
		</React.Fragment>
	);
};

export default FleetBossBattles;
