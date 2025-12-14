import React from 'react';
import { Link } from 'gatsby';
import { Button, Form, Checkbox, Table, Segment, Modal, Header, Rating, Statistic, Divider, Label } from 'semantic-ui-react';

import { CrewMember, Skill } from '../../../model/crew';
import { CryoCollection, PlayerCollection, PlayerUtilityRanks, TranslateMethod } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import CONFIG from '../../../components/CONFIG';
import { ITableConfigRow } from '../../../components/searchabletable';
import { useStateWithStorage } from '../../../utils/storage';

import { IRosterCrew, ICrewMarkup, ICrewFilter, ICrewUtilityRanks } from '../../../components/crewtables/model';
import { CrewBaseCells, getBaseTableConfig, renderMainDataScore } from './base';
import { getBernardsNumber } from '../../../utils/gauntlet';
import { printPortalStatus } from '../../../utils/crewutils';
import { categorizeCrewCollections } from '../../../utils/collectionutils';
import { Collection } from "../../../model/collections";
import { Ship, ShipInUse } from '../../../model/ship';
import { getShipsInUse } from '../../../utils/shiputils';

interface IUtilityUserPrefs {
	thresholds: IUtilityThresholds;
	prefer_versatile: boolean;
	include_base: boolean;
	always_show_datascore: boolean;
};

interface IUtilityThresholds {
	core: number;
	shuttle: number;
	gauntlet: number;
	voyage: number;
};

const defaultPrefs = {
	thresholds: {
		core: 10,
		shuttle: 10,
		gauntlet: 10,
		voyage: 10
	},
	prefer_versatile: true,
	include_base: false,
	always_show_datascore: false,
} as IUtilityUserPrefs;

type CrewUtilityFormProps = {
	pageId: string;
	rosterCrew: IRosterCrew[];
	crewMarkups: ICrewMarkup[];
	setCrewMarkups: (crewMarkups: ICrewMarkup[]) => void;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
	showBase: boolean;
	setShowBase: (value: boolean) => void;
	alwaysShowDataScore: boolean;
	setAlwaysShowDataScore: (value: boolean) => void;
};

export const CrewUtilityForm = (props: CrewUtilityFormProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { rosterCrew, crewMarkups, setCrewMarkups, crewFilters, setCrewFilters, showBase, setShowBase, alwaysShowDataScore, setAlwaysShowDataScore } = props;

	const dbid = playerData?.player.dbid ?? '';

	const [ranks, setRanks] = React.useState<PlayerUtilityRanks | undefined>(undefined);
	const [userPrefs, setUserPrefs] = useStateWithStorage<IUtilityUserPrefs>(dbid+'/utility', defaultPrefs, { rememberForever: true });
	const [showPane, setShowPane] = React.useState(false);
	const [shipsInUse, setShipsInUse] = React.useState<ShipInUse[]>([]);
	const [crewOnShips, setCrewOnShips] = React.useState<IRosterCrew[]>([]);

	const crewReasons = React.useMemo(() => {
		if (!playerData) return {};
		const playerCols = playerData.player.character.cryo_collections.filter(f => f.milestone.rewards?.length);
		const cols = globalContext.core.collections.filter(f => playerCols.some(pc => `${pc.type_id}` == `${f.id}` || `${pc.type_id}` == `${f.type_id}`))
		const output = {} as {[key:string]: string[]}
		let shipCrew = [] as IRosterCrew[];
		if (globalContext?.player) {
			let ships = getShipsInUse(globalContext.player);
			setShipsInUse(ships);
			shipCrew = ships.map(s => s.ship.battle_stations?.map(bs => bs.crew) || []).flat().filter(f => f !== undefined) as IRosterCrew[] || [];
			shipCrew = shipCrew.concat(playerData.player.character.crew.filter(f => f.passive_id !== undefined))
			if (shipCrew.length) {
				// Single representation of crew, only.
				shipCrew = shipCrew.filter((c, i) => shipCrew.findIndex(c2 => c2.id === c.id) === i);
			}
			setCrewOnShips(shipCrew);
		}
		for (let c of rosterCrew) {
			output[c.id] = reasonsToKeep(c, cols, shipCrew);
		}
		return output;
	}, [rosterCrew, globalContext.player]);

	const addCrewUtility = (crew: IRosterCrew) => {
		const myRanks = {} as ICrewUtilityRanks;
		const thresholds = [] as string[];
		if (ranks) {
			Object.keys(ranks).forEach(key => {
				const myRank = ranks[key].indexOf(crew.id) + 1;
				myRanks[key] = myRank;
				let threshold = 0;
				switch (key.slice(0, 2)) {
					case 'B_': threshold = getThreshold('core'); break;
					case 'S_': threshold = getThreshold('shuttle'); break;
					case 'G_': threshold = getThreshold('gauntlet'); break;
					case 'V_': threshold = getThreshold('voyage'); break;
				}
				if (myRank > 0 && myRank <= threshold) thresholds.push(key);
			});
		}
		const markup = crew.markup ?? {};
		crew.markup = {
			...markup,
			crew_utility: {
				ranks: myRanks,
				thresholds,
				counts: {
					shuttle: thresholds.filter(key => ['B', 'S'].includes(key.slice(0, 1))).length,
					gauntlet: thresholds.filter(key => key.slice(0, 1) === 'G').length,
					voyage: thresholds.filter(key => key.slice(0, 1) === 'V').length
				},
				reasons_to_keep: crewReasons[crew.id]
			}
		};
	};

	const filterByUtility = (crew: IRosterCrew) => {
		return true;
	};

	React.useEffect(() => {
		scoreUtility();
	}, [rosterCrew, userPrefs]);

	React.useEffect(() => {
		if (userPrefs.include_base !== showBase) {
			setShowBase(userPrefs.include_base);
		}
		if (userPrefs.always_show_datascore !== alwaysShowDataScore) {
			setAlwaysShowDataScore(userPrefs.always_show_datascore);
		}
	}, [userPrefs]);

	React.useEffect(() => {
		const markupIndex = crewMarkups.findIndex(crewMarkup => crewMarkup.id === 'crew_utility');
		if (markupIndex >= 0) crewMarkups.splice(markupIndex, 1);

		const filterIndex = crewFilters.findIndex(crewFilter => crewFilter.id === 'crew_utility');
		if (filterIndex >= 0) crewFilters.splice(filterIndex, 1);

		if (ranks) {
			crewMarkups.push({ id: 'crew_utility', applyMarkup: addCrewUtility });
			crewFilters.push({ id: 'crew_utility', filterTest: filterByUtility });
		}

		setCrewMarkups([...crewMarkups]);
		setCrewFilters([...crewFilters]);
	}, [ranks]);

	return (
		<div style={{ marginBottom: '1em' }}>
			<p>
				{tfmt('crew_utility.header', {
					event_planner: <Link to='/eventplanner'>{t('menu.tools.event_planner')}</Link>,
					gauntlets: <Link to='/gauntlets'>{t('menu.tools.gauntlet')}</Link>,
					voyage_calculator: <Link to='/voyage'>{t('menu.tools.voyage_calculator')}</Link>,
				})}
			</p>
			<Button content={t('crew_utility.customize_button')} onClick={() => setShowPane(!showPane)} />
			{showPane &&
				<div style={{ margin: '1em 0' }}>
					<p style={{textAlign: 'center'}}>{t('crew_utility.customize_header')}</p>
					{renderThresholdForm()}
				</div>
			}
		</div>
	);

	function renderThresholdForm(): JSX.Element {
		return (
			<Form style={{ textAlign: 'center' }}>
				<Table collapsing style={{ margin: '0 auto' }}>
					<Table.Body>
						<Table.Row>
							<Table.Cell>{t('crew_utility.custom.core')}:</Table.Cell>
							<Table.Cell>
								<Button.Group size='tiny'>
									{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
										<Button key={t} content={t} color={getThreshold('core') === t ? 'green' : undefined}
											onClick={() => setThreshold('core', t)}
										/>
									)}
								</Button.Group>
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>{t('crew_utility.custom.shuttle_pairs')}:</Table.Cell>
							<Table.Cell>
								<Button.Group size='tiny'>
									{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
										<Button key={t} content={t} color={getThreshold('shuttle') === t ? 'green' : undefined}
											onClick={() => setThreshold('shuttle', t)}
										/>
									)}
								</Button.Group>
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>{t('crew_utility.custom.voyage')}:</Table.Cell>
							<Table.Cell>
								<Button.Group size='tiny'>
									{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
										<Button key={t} content={t} color={getThreshold('voyage') === t ? 'green' : undefined}
											onClick={() => setThreshold('voyage', t)}
										/>
									)}
								</Button.Group>
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>{t('crew_utility.custom.gauntlet')}:</Table.Cell>
							<Table.Cell>
								<Button.Group size='tiny'>
									{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
										<Button key={t} content={t} color={getThreshold('gauntlet') === t ? 'green' : undefined}
											onClick={() => setThreshold('gauntlet', t)}
										/>
									)}
								</Button.Group>
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table>
				<div style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start'}}>
					<div style={{ marginTop: '1em' }}>
						<Form.Field
							control={Checkbox}
							label={<label>{t('crew_utility.consider_three_skill_check')}</label>}
							checked={userPrefs.prefer_versatile ?? defaultPrefs.prefer_versatile}
							onChange={(e, { checked }) => setUserPrefs({...userPrefs, prefer_versatile: checked})}
						/>
					</div>
					<div style={{ marginTop: '1em' }}>
						<Form.Field
							control={Checkbox}
							label={<label>{t('crew_utility.include_base_ranks_check')}</label>}
							checked={userPrefs.include_base ?? defaultPrefs.include_base}
							onChange={(e, { checked }) => setUserPrefs({...userPrefs, include_base: checked})}
						/>
					</div>
					<div style={{ marginTop: '1em' }}>
						<Form.Field
							control={Checkbox}
							label={<label>{t('rank_names.always_show_datascore')}</label>}
							checked={userPrefs.always_show_datascore ?? defaultPrefs.always_show_datascore}
							onChange={(e, { checked }) => setUserPrefs({...userPrefs, always_show_datascore: !!checked})}
						/>
					</div>
				</div>
			</Form>
		)
	}

	function getThreshold(area: string): number {
		return userPrefs.thresholds[area] ?? defaultPrefs.thresholds[area];
	}

	function setThreshold(area: string, value: number): void {
		const thresholds = userPrefs.thresholds ?? defaultPrefs.thresholds;
		thresholds[area] = value;
		setUserPrefs({...userPrefs, thresholds});
	}

	function scoreUtility(): void {
		const crewScore = (crew: IRosterCrew, skill: string) => {
			if (crew[skill].core === 0) return { core: 0, min: 0, max: 0 };
			return crew[skill];
		};

		const rankCore = (skill: string) => {
			return rosterCrew.slice().sort((a, b) => crewScore(b, skill).core - crewScore(a, skill).core)
				.map(crew => crew.id);
		};

		const rankGauntlet = (skills: string[]) => {
			const gauntletScore = (crew: IRosterCrew) => {
				if ((userPrefs.prefer_versatile ?? defaultPrefs.prefer_versatile) && Object.keys(crew.base_skills).length < 3) return 0;
				const skillsForBernard = skills.map(skillName => {
					const skill = crewScore(crew, skillName);
					return {
						core: skill.core,
						range_min: skill.min,
						range_max: skill.max,
						skill: skillName
					} as Skill;
				});
				return getBernardsNumber(crew, undefined, skillsForBernard);
				//const scores = skills.map(skill => crewScore(crew, skill));
				//return scores.reduce((prev, curr) => prev + curr.max, 0)/scores.length;
			};
			return rosterCrew.slice().filter(crew => gauntletScore(crew) > 0)
				.sort((a, b) => gauntletScore(b) - gauntletScore(a))
				.map(crew => crew.id);
		};

		const rankVoyage = (skills: string[]) => {
			const voyageScore = (crew: IRosterCrew) => {
				if ((userPrefs.prefer_versatile ?? defaultPrefs.prefer_versatile) && Object.keys(crew.base_skills).length < 3) return 0;
				const scores = skills.map(skill => crewScore(crew, skill));
				return scores.reduce((prev, curr) => prev + curr.core+(curr.min+curr.max)/2, 0);
			};
			return rosterCrew.slice().filter(crew => voyageScore(crew) > 0)
				.sort((a, b) => voyageScore(b) - voyageScore(a))
				.map(crew => crew.id);
		};

		const rankShuttle = (skills: string[]) => {
			const shuttleScore = (crew: IRosterCrew) => {
				if (crewScore(crew, skills[0]).core > crewScore(crew, skills[1]).core)
					return crewScore(crew, skills[0]).core+(crewScore(crew, skills[1]).core/4);
				return crewScore(crew, skills[1]).core+(crewScore(crew, skills[0]).core/4);
			};
			return rosterCrew.slice().filter(crew => shuttleScore(crew) > 0)
				.sort((a, b) => shuttleScore(b) - shuttleScore(a))
				.map(crew => crew.id);
		};

		const ranks = {} as PlayerUtilityRanks;
		for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
			let firstSkill = CONFIG.SKILLS_SHORT[first].name;
			ranks[`B_${CONFIG.SKILLS_SHORT[first].short}`] = rankCore(firstSkill);
			ranks[`G_${CONFIG.SKILLS_SHORT[first].short}`] = rankGauntlet([firstSkill]);
			for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
				let secondSkill = CONFIG.SKILLS_SHORT[second].name;
				ranks[`S_${CONFIG.SKILLS_SHORT[first].short}_${CONFIG.SKILLS_SHORT[second].short}`] = rankShuttle([firstSkill, secondSkill]);
				ranks[`G_${CONFIG.SKILLS_SHORT[first].short}_${CONFIG.SKILLS_SHORT[second].short}`] = rankGauntlet([firstSkill, secondSkill]);
				ranks[`V_${CONFIG.SKILLS_SHORT[first].short}_${CONFIG.SKILLS_SHORT[second].short}`] = rankVoyage([firstSkill, secondSkill]);
			}
		}

		setRanks({...ranks});
	}

	function reasonsToKeep(crew: CrewMember, collections: Collection[], crewOnShips: CrewMember[]) {
		let reasons = [] as string[];
		if (crew.ranks.scores.ship.overall_rank <= 50) {
			reasons.push(t(`rank_names.scores.ship`))
		}
		if (crewOnShips.some(c => c.id === crew.id)) {
			reasons.push(t('ship.battle_stations'));
		}
		let scores = Object.entries(crew.ranks.scores).filter(([key, value]) => key.includes("_rank") && value <= 50);
		for (let s of scores) {
			reasons.push(t(`rank_names.scores.${s[0]}`))
		}
		if ("immortal" in crew && crew.immortal === 0) {
			let nev = t('global.never');
			let ps = printPortalStatus(crew, t, true, true);
			if (ps.includes(nev)) {
				ps = ps.replace(nev, '').trim();
				reasons.push(`${t('base.never_in_portal')} ${ps}`);
			}
			const { crew_rewards, stat_buffs, others } = categorizeCrewCollections(crew, collections);
			if (crew_rewards.length) {
				reasons.push(t('collections.types.crew_rewarding'));
			}
			if (stat_buffs.length && stat_buffs.some(sb => sb.size <= 50)) {
				reasons.push(t('collections.types.stat_boosting'));
			}
			if (others.length) {
				reasons.push(t('collections.types.vanity'));
			}
		}
		return reasons.filter(f => !!f).sort();
	}

};

export const getCrewUtilityTableConfig = (t: TranslateMethod, include_base: boolean, always_show_datascore: boolean) => {
	const tableConfig = [] as ITableConfigRow[];

	if (include_base) {
		let base = getBaseTableConfig('profileCrew', t);
		for (let column of base) {
			tableConfig.push(column);
		}
	}
	else if (always_show_datascore) {
		tableConfig.push(
			{
				width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'), reverse: true,
				customCompare: (a: IRosterCrew, b: IRosterCrew) => {
					if (a.ranks?.scores?.overall === undefined && b.ranks?.scores?.overall === undefined) return 0;
					else if (a.ranks?.scores?.overall === undefined) return 1;
					else if (b.ranks?.scores?.overall === undefined) return -1;
					let r = a.ranks.scores.overall - b.ranks.scores.overall;
					if (!r) r = (b.cab_ov_rank ?? 0) - (a.cab_ov_rank ?? 0);
					return r;
				}
			},
		);
	}

	tableConfig.push(
		{ width: 1, column: 'markup.crew_utility.thresholds.length', title: include_base ? t('crew_utility.columns.u') : t('crew_utility.columns.utility'), reverse: true, tiebreakers: ['max_rarity'] },
		{ width: 1, column: 'markup.crew_utility.counts.shuttle', title: include_base ? t('crew_utility.columns.s') : t('crew_utility.columns.shuttle_ranks'), reverse: true, tiebreakers: ['max_rarity'] },
		{ width: 1, column: 'markup.crew_utility.counts.gauntlet', title: include_base ? t('crew_utility.columns.g') : t('crew_utility.columns.gauntlet_ranks'), reverse: true, tiebreakers: ['max_rarity'] },
		{ width: 1, column: 'markup.crew_utility.counts.voyage', title: include_base ? t('crew_utility.columns.v') : t('crew_utility.columns.voyage_ranks'), reverse: true, tiebreakers: ['max_rarity'] },
		{
			width: 1, column: 'markup.crew_utility.reasons_to_keep', title: include_base ? t('crew_utility.columns.r') : t('crew_utility.columns.reasons_to_keep'), reverse: true, tiebreakers: ['max_rarity'],
			customCompare: (a: IRosterCrew, b: IRosterCrew) => {
				let r = (a.markup?.crew_utility?.reasons_to_keep?.length ?? 0) - (b.markup?.crew_utility?.reasons_to_keep?.length ?? 0);
				if (!r) r = a.markup?.crew_utility?.reasons_to_keep?.join().localeCompare(b.markup?.crew_utility?.reasons_to_keep?.join() || "") || 0;
				if (!r) r = a.ranks.scores.overall - b.ranks.scores.overall;
				return r;
			}
		},
	)
	return tableConfig;
};

type CrewCellProps = {
	pageId: string;
	crew: IRosterCrew;
	showBase: boolean;
	alwaysShowDataScore: boolean;
};

export const CrewUtilityCells = (props: CrewCellProps) => {
	const { crew, showBase, pageId, alwaysShowDataScore } = props;
	const { t } = React.useContext(GlobalContext).localized;
	return (
		<React.Fragment>
			{showBase && <CrewBaseCells crew={crew} pageId={pageId} tableType='profileCrew' />}
			{!showBase && alwaysShowDataScore &&
			<Table.Cell>
				{renderMainDataScore(crew)}
			</Table.Cell>
			}
			<Table.Cell textAlign='center'>
				<RanksModal crew={crew} />
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{renderUtilities(crew, ['B', 'S'])}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{renderUtilities(crew, ['G'])}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{renderUtilities(crew, ['V'])}
			</Table.Cell>
			<Table.Cell>
				{renderReasonsToKeep(crew)}
			</Table.Cell>
		</React.Fragment>
	);

	function renderReasonsToKeep(crew: IRosterCrew) {
		//if (crew.immortal) return <>{t('global.na')}</>;
		if (!crew.markup?.crew_utility?.reasons_to_keep?.length) return <>{t('global.none')}</>;
		return crew.markup.crew_utility.reasons_to_keep.map((reason, idx) => {
			let key = `${crew.symbol}_reason_${idx}`;
			return (
				<Label key={key} style={{margin: '0.5em 0', width: '100%'}}>
					{reason}
				</Label>
			)
		});
	}

	function renderUtilities(crew: IRosterCrew, options: string[]): JSX.Element {
		if (!crew.markup || !crew.markup.crew_utility) return (<></>);
		const crewUtility = crew.markup.crew_utility;
		const utilities = crewUtility.thresholds.filter(key => options.includes(key.slice(0, 1)))
			.map(key => {
				const shorts = key.slice(2).split('_');
				return ({
					key,
					rank: crewUtility.ranks[key],
					skills: shorts.map(short => CONFIG.SKILLS_SHORT.find(s => s.short === short)?.name)
				});
			})
			.sort((a, b) => { if (a.skills.length === b.skills.length) return a.key.localeCompare(b.key); return a.skills.length - b.skills.length; });
		if (utilities.length === 0) return (<></>);
		return (
			<Table size='small' compact='very'>
				<Table.Body>
					{utilities.map(utility =>
						<Table.Row key={utility.key}>
							<Table.Cell textAlign='center' style={{ whiteSpace: 'nowrap' }}>
								<div style={{ display: 'flex', justifyContent: 'center', gap: '3px' }}>
								{utility.skills.map(skill =>
									<span key={skill}>
										<img key={skill} alt={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1em' }} />
									</span>
								)}
								</div>
							</Table.Cell>
							<Table.Cell textAlign='right'>{utility.rank}</Table.Cell>
						</Table.Row>
					)}
				</Table.Body>
			</Table>
		);
	}
};

type RanksModalProps = {
	crew: IRosterCrew;
};

const RanksModal = (props: RanksModalProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crew } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);

	if (!crew.markup || !crew.markup.crew_utility) return (<></>);

	const crewUtility = crew.markup.crew_utility;

	// Reverse engineer threshold prefs, since we can't access preferences from here
	const ranksWithinThreshold = {
		core: [] as number[],
		shuttle: [] as number[],
		gauntlet: [] as number[],
		voyage: [] as number[]
	};
	crewUtility.thresholds.forEach(rank => {
		if (rank.startsWith('B_')) ranksWithinThreshold.core.push(crewUtility.ranks[rank]);
		if (rank.startsWith('S_')) ranksWithinThreshold.shuttle.push(crewUtility.ranks[rank]);
		if (rank.startsWith('G_')) ranksWithinThreshold.gauntlet.push(crewUtility.ranks[rank]);
		if (rank.startsWith('V_')) ranksWithinThreshold.voyage.push(crewUtility.ranks[rank]);
	});
	const highestThresholdRank = {
		core: ranksWithinThreshold.core.reduce((prev, curr) => Math.max(curr, prev), 0),
		shuttle: ranksWithinThreshold.shuttle.reduce((prev, curr) => Math.max(curr, prev), 0),
		gauntlet: ranksWithinThreshold.gauntlet.reduce((prev, curr) => Math.max(curr, prev), 0),
		voyage: ranksWithinThreshold.voyage.reduce((prev, curr) => Math.max(curr, prev), 0)
	};

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button content={crewUtility.thresholds.length} />}
			size='tiny'
		>
			<Modal.Header>
				{crew.name}
				<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} disabled style={{ marginLeft: '1em' }} />
			</Modal.Header>
			<Modal.Content scrolling>
				{modalIsOpen && renderRanks()}
			</Modal.Content>
			<Modal.Actions>
				<Button content={t('global.close')} onClick={() => setModalIsOpen(false)} />
			</Modal.Actions>
		</Modal>
	);

	function getThreshold(area: string): number {
		return highestThresholdRank[area];
	}

	// Adaptation of renderOtherRanks from commoncrewdata.tsx
	function renderRanks(): JSX.Element {
		const v = [] as JSX.Element[];
		const g = [] as JSX.Element[], g1 = [] as JSX.Element[];
		const b = [] as JSX.Element[];
		const s = [] as JSX.Element[];

		const skillName = short => {

			let conf = CONFIG.SKILLS_SHORT.find(c => c.short === short)?.name;
			if (conf) {
				return CONFIG.SKILLS[conf];
			}
			return ""
		}

		for (let rank in crewUtility.ranks) {
			const utility = crewUtility.ranks[rank];
			if (rank.startsWith('V_')) {
				v.push(
					<Statistic key={rank} color={(utility > 0 && utility <= getThreshold('voyage')) ? 'green' : undefined}>
						<Statistic.Label>{rank.slice(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('G_')) {
				if (rank.includes('_', 2)) {
					g.push(
						<Statistic key={rank} color={utility > 0 && utility <= getThreshold('gauntlet') ? 'green' : undefined}>
							<Statistic.Label>{rank.slice(2).replace('_', ' / ')}</Statistic.Label>
							<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
						</Statistic>
					);
				}
				else if (utility > 0) {
					g1.push(
						<Statistic key={rank} color={utility > 0 && utility <= getThreshold('gauntlet') ? 'green' : undefined}>
							<Statistic.Label>{skillName(rank.slice(2))}</Statistic.Label>
							<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
						</Statistic>
					);
				}
			} else if (rank.startsWith('B_') && crew.ranks[rank]) {
				b.push(
					<Statistic key={rank} color={utility > 0 && utility <= getThreshold('core') ? 'green' : undefined}>
						<Statistic.Label>{skillName(rank.slice(2))}</Statistic.Label>
						<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('S_')) {
				s.push(
					<Statistic key={rank} color={utility > 0 && utility <= getThreshold('shuttle') ? 'green' : undefined}>
						<Statistic.Label>{rank.slice(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
					</Statistic>
				);
			}
		}

		return (
			<React.Fragment>
				<Segment>
					<Header as='h5'>Core / shuttle pair ranks on your roster</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{b}
					</Statistic.Group>
					<Divider />
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{s}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as='h5'>Gauntlet ranks on your roster</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{g1}
					</Statistic.Group>
					<Divider />
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{g}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as='h5'>Voyage ranks on your roster</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{v}
					</Statistic.Group>
				</Segment>
			</React.Fragment>
		);
	}
};
