import React from 'react';
import {
	Accordion,
	Icon,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { Skill } from '../../../model/crew';
import { PlayerCrew, Voyage, VoyageCrewSlot } from '../../../model/player';
import { Ship } from '../../../model/ship';
import { IVoyageCalcConfig } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { useStateWithStorage } from '../../../utils/storage';

import CONFIG from '../../CONFIG';

import { getShipTraitBonus, voySkillScore } from '../utils';
import { ILineupEditorTrigger } from '../lineupeditor/lineupeditor';

import { ISkillsRankings, IAssignment, ISkillsRank, IShipData } from './model';
import { ILayoutContext, IViewerContext, LayoutContext, ViewerContext } from './context';
import { GridView } from './gridview';
import { LayoutPicker } from './layoutpicker';
import { TableView } from './tableview';

type LineupViewerProps = {
	configSource?: 'player' | 'custom';
	voyageConfig: IVoyageCalcConfig | Voyage;
	ship?: Ship;
	roster?: PlayerCrew[];
	rosterType?: 'allCrew' | 'myCrew';
	initialExpand?: boolean;
};

export const LineupViewerAccordion = (props: LineupViewerProps) => {
	const { t } = React.useContext(GlobalContext).localized;

	const [isActive, setIsActive] = React.useState<boolean>(false);
	const { configSource, voyageConfig, ship, roster, rosterType, initialExpand: externActive } = props;

	React.useEffect(() => {
		if (externActive !== undefined) {
			setIsActive(externActive);
		}
	}, [externActive]);

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('voyage.lineup.title')}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && (
					<Segment>
						<LineupViewer
							configSource={configSource}
							voyageConfig={voyageConfig}
							ship={ship}
							roster={roster}
							rosterType={rosterType}
						/>
					</Segment>
				)}
			</Accordion.Content>
		</Accordion>
	);
};

export const LineupViewer = (props: LineupViewerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { t } = globalContext.localized;
	const { configSource, voyageConfig, ship, roster, rosterType } = props;

	const findBestRank: boolean = configSource === 'player';

	const crewVoySkillsScore = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + voySkillScore((c.skills[curr] as Skill)), 0);

	// Average prof (profSkillScore) might be first tiebreaker for encounter crew sort
	// const profSkillScore = (sk: Skill) => (sk.range_min + sk.range_max)/2;
	// const crewProfSkillsScore = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + profSkillScore((c.skills[curr] as Skill)), 0);
	const crewProfSkillsMax = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + (c.skills[curr] as Skill).range_max, 0);
	const crewProfSkillsMin = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + (c.skills[curr] as Skill).range_min, 0);

	const skillRankings: ISkillsRankings = initSkillRankings();
	const skillCombos: ISkillsRankings = initSkillCombos();

	const usedCrew: number[] = [];
	const assignments: IAssignment[] = Object.values(CONFIG.VOYAGE_CREW_SLOTS).map(entry => {
		const { crew, trait, skill } = (Object.values(voyageConfig.crew_slots).find(slot => slot.symbol === entry) as VoyageCrewSlot);
		const name = t(`voyage.seats.${entry}`)
		const bestRank: ISkillsRank | undefined = findBestRank ? getBestRank(crew, skill, usedCrew) : undefined;
		if (!crew.imageUrlPortrait)
			crew.imageUrlPortrait = `${crew.portrait.file.slice(1).replace('/', '_')}.png`;
		usedCrew.push(crew.id);
		return {
			crew, name, trait, bestRank
		};
	});

	const shipData: IShipData = {
		direction: 'right',
		index: -1,
		shipBonus: 0,
		crewBonus: 0
	};

	if (ship) {
		if (!ship.index) ship.index = { left: 0, right: 0 };
		shipData.direction = ship.index.right < ship.index.left ? 'right' : 'left';
		shipData.index = ship.index[shipData.direction] ?? 0;
		shipData.shipBonus = getShipTraitBonus(voyageConfig, ship);
		shipData.crewBonus = voyageConfig.max_hp - ship.antimatter - shipData.shipBonus;
	}

	const viewerContext: IViewerContext = {
		voyageConfig,
		rosterType,
		ship,
		shipData,
		assignments
	};

	return (
		<ViewerContext.Provider value={viewerContext}>
			<React.Fragment>
				{playerData && <PlayerLineupViewer dbid={`${playerData.player.dbid}`} />}
				{!playerData && <NonPlayerLineupViewer />}
			</React.Fragment>
		</ViewerContext.Provider>
	);

	function initSkillRankings(): ISkillsRankings {
		const skillRankings: ISkillsRankings = {};
		if (!findBestRank) return skillRankings;
		if (roster) {
			roster.forEach(crew => {
				const crewSkills: string[] = Object.keys(crew.skills);
				crewSkills.forEach(skill => {
					skillRankings[skill] ??= [];
					skillRankings[skill].push(crew);
				});
			});
			Object.keys(skillRankings).forEach(skill => {
				skillRankings[skill] = skillRankings[skill].sort((c1: PlayerCrew, c2: PlayerCrew) => {
					if (voyageConfig.voyage_type === 'encounter')
						return encounterSort(c1, c2, [skill]);
					return dilemmaSort(c1, c2, [skill]);
				});
			});
		}
		return skillRankings;
	}

	function initSkillCombos(): ISkillsRankings {
		const skillCombos: ISkillsRankings = {};
		if (!findBestRank) return skillCombos;

		[1, 2, 3].forEach(i => {
			souzaCombinations(Object.keys(CONFIG.SKILLS), i).forEach(skills => {
				skillCombos[skills.join(',')] = [];
			});
		});

		if (roster) {
			roster.forEach(crew => {
				const crewSkills: string[] = Object.keys(crew.skills);
				for (let i = 1; i <= crewSkills.length; i++) {
					souzaCombinations(crewSkills, i).forEach(skills => {
						skillCombos[skills.join(',')].push(crew);
					});
				}
			});
			Object.keys(skillCombos).forEach(skills => {
				skillCombos[skills] = skillCombos[skills].sort((c1: PlayerCrew, c2: PlayerCrew) => {
					if (voyageConfig.voyage_type === 'encounter')
						return encounterSort(c1, c2, skills.split(','));
					return dilemmaSort(c1, c2, skills.split(','));
				});
			});
		}

		return skillCombos;
	}

	// Match in-game order for dilemma voyage crew selection
	function dilemmaSort(c1: PlayerCrew, c2: PlayerCrew, skills: string[]): number {
		const v1: number = crewVoySkillsScore(c1, skills);
		const v2: number = crewVoySkillsScore(c2, skills);
		if (v1 === v2) return c1.name.localeCompare(c2.name);	// Probably?
		return v2 - v1;
	}

	// Match in-game order for encounter voyage crew selection
	function encounterSort(c1: PlayerCrew, c2: PlayerCrew, skills: string[]): number {
		// Iniitial sort likely to be range_max
		let p1: number = crewProfSkillsMax(c1, skills);
		let p2: number = crewProfSkillsMax(c2, skills);
		// First tiebreaker likely to be range_min (or possibly average prof)
		if (p1 === p2) {
			p1 = crewProfSkillsMin(c1, skills);
			p2 = crewProfSkillsMin(c2, skills);
			if (p1 === p2) return c1.name.localeCompare(c2.name);	// Probably?
		}
		return p2 - p1;
	}

	// v11.0.4
	function getBestRank(crew: PlayerCrew, seatSkill: string, usedCrew: number[]): ISkillsRank {
		let bestRank: ISkillsRank = {
			skills: [],
			rank: 1000
		};

		// Test seat skill rank
		const seatRank: number = skillRankings[seatSkill].filter(c =>
			!usedCrew.includes(c.id)
		).findIndex(c => c.id === crew.id) + 1;
		if (seatRank > 0 && seatRank <= 3)
			bestRank = { skills: [], rank: seatRank };

		// Test other skill ranks
		if (bestRank.rank > 3) {
			const otherSkills: string[] = Object.keys(crew.skills).filter(skill => skill !== seatSkill);
			for (let i = 0; i < otherSkills.length; i++) {
				const otherSkill: string = otherSkills[i];
				const otherRank: number = skillRankings[otherSkill].filter(c =>
					!usedCrew.includes(c.id)
						&& Object.keys(c.skills).includes(seatSkill)
				).findIndex(c => c.id === crew.id) + 1;
				if (otherRank >= 0 && otherRank < bestRank.rank)
					bestRank = { skills: [otherSkill], rank: otherRank };
			}
		}

		// Test skill pair combo ranks (ranked by sum of skill pair)
		if (bestRank.rank > 3) {
			const crewSkills: string[] = Object.keys(crew.skills);
			for (let i = 0; i < crewSkills.length; i++) {
				const firstSkill: string = crewSkills[i];
				for (let j = i + 1; j < crewSkills.length; j++) {
					const secondSkill: string = crewSkills[j];
					const skills: string[] = [firstSkill, secondSkill];
					const pairRank: number = skillCombos[skills.join(',')].filter(c =>
						!usedCrew.includes(c.id)
							&& Object.keys(c.skills).includes(seatSkill)
					).findIndex(c => c.id === crew.id) + 1;
					if (pairRank >= 0 && pairRank < bestRank.rank)
						bestRank = { skills, rank: pairRank };
				}
			}
		}

		// Test triplet (ranked by sum of all skills)
		if (bestRank.rank > 3) {
			const skills: string[] = Object.keys(crew.skills);
			const tripletRank: number = skillCombos[skills.join(',')].filter(c =>
				!usedCrew.includes(c.id)
			).findIndex(c => c.id === crew.id) + 1;
			if (tripletRank >= 0 && tripletRank < bestRank.rank)
				bestRank = { skills, rank: tripletRank };
		}

		bestRank.skills = sortSkills(bestRank.skills);
		return bestRank;
	}

	// v11.0.3
	// function getBestRank(crew: PlayerCrew, seatSkill: string, usedCrew: number[]): ISkillsRank {
	// 	let bestRank: ISkillsRank = {
	// 		skills: [],
	// 		rank: 1000
	// 	};
	// 	const seatRank: number = skillRankings[seatSkill].filter(c =>
	// 		!usedCrew.includes(c.id)
	// 	).findIndex(c => c.id === crew.id) + 1;
	// 	if (seatRank > 0 && seatRank <= 3) {
	// 		bestRank = { skills: [], rank: seatRank };
	// 	}
	// 	else {
	// 		const otherSkills: string[] = Object.keys(crew.skills).filter(skill => skill !== seatSkill);
	// 		for (let i = 0; i < otherSkills.length; i++) {
	// 			const sortSkill: string = otherSkills[i];
	// 			const pairRank: number = skillRankings[sortSkill].filter(c =>
	// 				!usedCrew.includes(c.id)
	// 					&& Object.keys(c.skills).includes(seatSkill)
	// 			).findIndex(c => c.id === crew.id) + 1;
	// 			if (pairRank >= 0 && pairRank < bestRank.rank)
	// 				bestRank = { skills: [sortSkill], rank: pairRank };
	// 			if (bestRank.rank <= 3) break;
	// 		}
	// 		if (bestRank.rank > 3 && otherSkills.length > 1) {
	// 			for (let i = 0; i < otherSkills.length; i++) {
	// 				const sortSkill: string = otherSkills[i];
	// 				const filterSkill: string = otherSkills[i == 0 ? 1 : 0];
	// 				const tripletRank: number = skillRankings[sortSkill].filter(c =>
	// 					!usedCrew.includes(c.id)
	// 						&& Object.keys(c.skills).includes(seatSkill)
	// 						&& Object.keys(c.skills).includes(filterSkill)
	// 				).findIndex(c => c.id === crew.id) + 1;
	// 				if (tripletRank >= 0 && tripletRank < bestRank.rank)
	// 					bestRank = { skills: [filterSkill, sortSkill], rank: tripletRank };
	// 				if (bestRank.rank <= 3) break;
	// 			}
	// 		}
	// 	}
	// 	return bestRank;
	// }

	// function getBestComboRank(crew: PlayerCrew, seatSkill: string, usedCrew: number[]): ISkillsRank {
	// 	let bestRank: ISkillsRank = {
	// 		skills: [],
	// 		rank: 1000
	// 	};
	// 	const crewSkills: string[] = Object.keys(crew.skills);
	// 	for (let i = 1; i <= crewSkills.length; i++) {
	// 		souzaCombinations(crewSkills, i).forEach(skills => {
	// 			if (skills.includes(seatSkill)) {
	// 				const rank: number = skillRankings[skills.join(',')]
	// 					.filter(c => !usedCrew.includes(c.id))
	// 					.findIndex(c => c.id === crew.id) + 1;
	// 				if (rank < bestRank.rank) bestRank = { skills, rank };
	// 			}
	// 		});
	// 		if (bestRank.rank <= 3) break;
	// 	}
	// 	bestRank.skills = sortSkills(bestRank.skills, seatSkill);
	// 	return bestRank;
	// }

	// Filter out seat skill and match in-game left-to-right order of skill filter buttons
	//	If seatSkill set, seat skill will not be displayed (i.e. <= 11.0.3, when seat skill was pre-selected)
	function sortSkills(skills: string[], seatSkill?: string): string[] {
		const filterSkills: string[] = [
			'command_skill', 'diplomacy_skill', 'engineering_skill',
			'security_skill', 'medicine_skill', 'science_skill'
		];
		const sorted: string[] = [];
		filterSkills.forEach(skill => {
			if (skills.includes(skill) && seatSkill !== skill) sorted.push(skill);
		});
		return sorted;
	}

	// https://blog.lublot.dev/combinations-in-typescript
	function souzaCombinations<T>(items: T[], size: number = items.length): T[][] {
		const combinations: T[][] = [];
		const stack: number[] = [];
		let i = 0;

		size = Math.min(items.length, size);

		while (true) {
			if (stack.length === size) {
				combinations.push(stack.map((index) => items[index]));
				i = stack.pop()! + 1;
			}

			if (i >= items.length) {
				if (stack.length === 0) {
					break;
				}
				i = stack.pop()! + 1;
			} else {
				stack.push(i++);
			}
		}

		return combinations;
	}
};

const PlayerLineupViewer = (props: { dbid: string }) => {
	const [layout, setLayout] = useStateWithStorage<string>(props.dbid+'/voyage/layout', 'table-compact', { rememberForever: true });

	// Layout override may prevent user from changing layout
	//	(When is this used?)
	let layoutOverride: string | undefined;
	if (window.location.search?.length) {
		const search: URLSearchParams = new URLSearchParams(window.location.search);
		if (search.has('layout')) {
			const paramLayout: string | null = search.get('layout');
			if (paramLayout && ['table-compact', 'table-standard', 'grid-cards', 'grid-icons'].includes(paramLayout)) {
				layoutOverride = paramLayout;
			}
		}
	}

	const layoutContext: ILayoutContext = {
		layout: layoutOverride ?? layout,
		setLayout
	};

	return (
		<LayoutContext.Provider value={layoutContext}>
			<React.Fragment>
				{(layout === 'table-compact' || layout === 'table-standard') && <TableView />}
				{(layout === 'grid-cards' || layout === 'grid-icons') && <GridView />}
				<div style={{ marginTop: '2em' }}>
					<LayoutPicker />
				</div>
			</React.Fragment>
		</LayoutContext.Provider>
	);
};

const NonPlayerLineupViewer = () => {
	const [layout, setLayout] = React.useState<string>('table-compact');

	const layoutContext: ILayoutContext = {
		layout,
		setLayout
	};

	return (
		<LayoutContext.Provider value={layoutContext}>
			<React.Fragment>
				{(layout === 'table-compact' || layout === 'table-standard') && <TableView />}
				{(layout === 'grid-cards' || layout === 'grid-icons') && <GridView />}
				<div style={{ marginTop: '2em' }}>
					<LayoutPicker />
				</div>
			</React.Fragment>
		</LayoutContext.Provider>
	);
};
