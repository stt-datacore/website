import React from "react";
import { GlobalContext } from "../../../context/globalcontext";
import { CollectionsContext } from "../context";
import { Popup, Icon, Rating, Table } from "semantic-ui-react";
import { ItemArchetypeBase, PlayerCollection, PlayerCrew, Reward } from "../../../model/player";
import { ITableConfigRow, SearchableTable } from "../../searchabletable";
import { compareRewards, rewardsFilterGetRewards } from "../../../utils/collectionutils";
import { Link } from "gatsby";
import { numberToGrade, gradeToColor } from "../../../utils/crewutils";
import { descriptionLabel } from "../../crewtables/commonoptions";
import { quantityLabel, RewardsGrid } from "../../crewtables/rewards";
import { CrewTarget } from "../../hovering/crewhoverstat";
import { WorkerContext } from "../../../context/workercontext";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../../stats/utils";
import { AvatarView } from "../../item_presenters/avatarview";
import { getMilestoneRewards } from "../../../utils/itemutils";
import { EquipmentItem } from "../../../model/equipment";
import { getIconPath } from "../../../utils/assets";
import { renderMainDataScore } from "../../crewtables/views/base";


export interface CollectionTableProps {
	collectionCrew: PlayerCrew[];
	playerCollections: PlayerCollection[];
	short: boolean;
	topCrewScore: number;
	topStarScore: number;
}

export const CollectionTableView = (props: CollectionTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const colContext = React.useContext(CollectionsContext);
	const workerContext = React.useContext(WorkerContext);
	const workerRunning = workerContext.running;

	const { t } = globalContext.localized;

	const { mapFilter, setModalInstance, showThisCrew } = colContext;
	const { playerCollections, short, topCrewScore, topStarScore, collectionCrew } = props;

	const tableConfig: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: t('collections.columns.crew'), pseudocolumns: ['name', 'level', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: t('collections.columns.rarity'), reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{
			width: 1, column: 'ranks.scores.overall_rank', title: t('rank_names.datascore'), reverse: false,
			customCompare: (a: PlayerCrew, b: PlayerCrew) => {
				return a.ranks.scores.overall_rank - b.ranks.scores.overall_rank;
			}
		},
		{ width: 2, column: 'unmaxedIds.length', title: t('collections.columns.collections'), reverse: true },
		{
			width: 1,
			column: 'collectionScore',
			title: <span>{t('collections.columns.grade')} <Popup trigger={<Icon name='help' />} content={t('collections.columns.descriptions.grade')} /></span>,
			reverse: true
		},
		{
			width: 1,
			column: 'collectionScoreN',
			title: <span>{t('collections.columns.star_grade')} <Popup trigger={<Icon name='help' />} content={t('collections.columns.descriptions.star_grade')} /></span>,
			reverse: true,
			customCompare: (a: PlayerCrew, b: PlayerCrew) => {
				if (a.collectionScoreN !== undefined && b.collectionScoreN !== undefined) {
					if (a.collectionScoreN === -1 && b.collectionScoreN === -1) {
						if (a.collectionScore !== undefined && b.collectionScore !== undefined) {
							return a.collectionScore - b.collectionScore;
						}
					}
					else if (a.collectionScoreN === -1) {
						return 1;
					}
					else if (b.collectionScoreN === -1) {
						return -1;
					}
					else {
						return a.collectionScoreN - b.collectionScoreN;
					}
				}
				return 0;
			}
		},
		{
			width: 3,
			column: 'immortalRewards.length',
			title: <span>{t('collections.columns.immortal_rewards')} <Popup trigger={<Icon name='help' />} content='Rewards you can claim if you immortalize this crew right now' /></span>,
			reverse: true,
			customCompare: !!mapFilter?.rewardFilter?.length ? compareCrewRewards : undefined
		}
	];

	return (

		<React.Fragment>
			{/* {workerRunning && globalContext.core.spin(t('spinners.default'))} */}
			{true && <SearchableTable
				id='collections/crew'
				data={collectionCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderCrewRow(crew, idx ?? -1)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
			/>}
		</React.Fragment>)

	function renderCrewRow(crew: PlayerCrew, idx: number): JSX.Element {
		const unmaxed = crew.unmaxedIds?.map(id => { return playerCollections.find(pc => pc.id === id) });
		const tabledProgress = unmaxed?.sort((a, b) => (a?.needed ?? 0) - (b?.needed ?? 0)).map(collection => {
			if (!collection) return <></>
			return (
				<tr key={`crew_collection_${collection.id}_${crew.id}`} style={{ cursor: 'pointer' }} onClick={() => setModalInstance({ collection, pageId: 'collections/crew', activeTab: 1 })}>
					<td style={{ whiteSpace: 'wrap', fontSize: '.95em' }}>{collection.name}</td>
					<td style={{ textAlign: 'right', fontSize: '.95em' }}>
						<Popup
							wide="very"
							trigger={
								<div>
									{collection.progress} / {collection.milestone.goal}
								</div>
							}
							content={
								renderRewardHover(collection)
							}
						/>

					</td>
				</tr>
			);
		});

		const pctgrade = crew.collectionScore! / topCrewScore;
		const lettergrade = numberToGrade(pctgrade);

		const pctgradeN = crew.collectionScoreN === -1 ? 1 : crew.collectionScoreN! / topStarScore;
		const lettergradeN = numberToGrade(pctgradeN);

		return (
			<Table.Row key={crew.symbol}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<CrewTarget inputItem={crew} targetGroup='collectionsTarget'>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell>
					{renderMainDataScore(crew)}
				</Table.Cell>
				<Table.Cell width={4}>
					{!!tabledProgress && (
						<table style={{ width: '100%' }}>
							<tbody>{tabledProgress}</tbody>
						</table>
					)}
				</Table.Cell>
				<Table.Cell>
					<div style={{ color: gradeToColor(pctgrade) ?? undefined, textAlign: 'center' }}>
						<div>{lettergrade}</div>
						<sub>{crew.collectionScore?.toLocaleString() ?? ''}</sub>
					</div>
				</Table.Cell>
				<Table.Cell>
					<div style={{ color: gradeToColor(pctgradeN) ?? undefined, textAlign: 'center' }}>
						{crew.collectionScoreN === -1 && <Icon name='check' color='green' />}
						{crew.collectionScoreN !== -1 &&
							<div style={{ textAlign: 'center' }}>
								<div>{lettergradeN}</div>
								<sub>{crew.collectionScoreN?.toLocaleString() ?? ''}</sub>
							</div>}
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<div style={{
						margin: "1em",
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'center',
						alignItems: 'center'
					}}>
						<RewardsGrid wrap={true} rewards={crew.immortalRewards as Reward[]} />
					</div>
				</Table.Cell>
			</Table.Row>
		);
	}

	function compareCrewRewards(a: PlayerCrew, b: PlayerCrew): number {
		if (!!a.immortalRewards?.length != !!b.immortalRewards?.length) {
			if (a.immortalRewards?.length) return 1;
			else if (b.immortalRewards?.length) return -1;
		}
		let acol = a.unmaxedIds?.map(ci => playerCollections.find(f => f.id === ci) as PlayerCollection) ?? [];
		let bcol = b.unmaxedIds?.map(ci => playerCollections.find(f => f.id === ci) as PlayerCollection) ?? [];
		let r = compareRewards(mapFilter, acol, bcol, short);
		return -r;
	}

	function descriptionLabel(crew: any): JSX.Element {
		if (crew.immortal > 0) {
			return (
				<div>
					<Icon name='snowflake' /> <span>{crew.immortal} frozen</span>
				</div>
			);
		} else {
			return (
				<div>
					{crew.highest_owned_rarity > 0 && (<span>Level {crew.highest_owned_level}</span>)}
				</div>
			);
		}
	}

	function renderRewardHover(col: PlayerCollection) {
		let reward = [] as ItemArchetypeBase[];
		const migroups = {} as { [key: string]: ItemArchetypeBase[] }
		if (mapFilter?.rewardFilter?.some(r => !!r)) {
			reward = rewardsFilterGetRewards(mapFilter, [col], short, true);
			for (let r of reward) {
				if (r.data?.goal) {
					migroups[r.data.goal] ??= [];
					migroups[r.data.goal].push(r);
				}
			}
		}
		else {
			reward = getMilestoneRewards([col.milestone]);
			migroups[col.milestone.goal] = reward;
		}

		const mirender = [] as JSX.Element[];
		const flexRow = OptionsPanelFlexRow;
		const flexCol = OptionsPanelFlexColumn;

		Object.entries(migroups).forEach(([goal, rewards]) => {
			const b = <div key={`${goal}_${rewards?.length}_${col.type_id}`} style={{ margin: '0.5em 0' }}>
				<div style={{ padding: '0.5em 0.25em', borderBottom: '1px solid', margin: '0.5em' }}>
					<h4>{t('global.n_x', {
						n: goal,
						x: t('base.crewmen')
					})}</h4>
				</div>
				<div style={{ ...flexRow, justifyContent: 'flex-start', gap: '0.5em', alignItems: 'flex-start', flexWrap: 'wrap' }}>
					{rewards.map((reward) => {
						let item = reward as EquipmentItem;
						item.imageUrl = getIconPath(item.icon!, true);
						return <div style={{ ...flexCol, gap: '0.5em', textAlign: 'center', width: '4em' }}>
							<AvatarView
								mode={'item'}
								item={item}
								partialItem={true}
								size={32}
							/>
							<span style={{ fontSize: '0.8em' }}>
								{quantityLabel(reward.quantity, false, undefined, true)}
							</span>
						</div>
					})}
				</div>
			</div>
			mirender.push(b);
		});

		return <>{mirender}</>
	}

}