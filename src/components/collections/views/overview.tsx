import React from 'react';
import { Label, Modal, Grid, Segment, Input, Icon, Image, Popup, Dropdown, Button } from 'semantic-ui-react';

import { GlobalContext } from '../../../context/globalcontext';
import { MilestoneBuff, PlayerCollection } from '../../../model/player';
import { CollectionDetails } from '../overview_modal';
import { formatColString } from '../context';
import { getAllStatBuffs } from '../../../utils/collectionutils';
import { getIconPath } from '../../../utils/assets';
import { Collection } from "../../../model/collections";
import { LazyImage } from '../../lazyimage';
import { gradeToColor, numberToGrade } from '../../../utils/crewutils';
import { OptionsPanelFlexRow } from '../../stats/utils';
import { useStateWithStorage } from '../../../utils/storage';

export const CollectionsOverview = () => {
	const globalContext = React.useContext(GlobalContext);

	const [search, setSearch] = React.useState('');
	const { ITEM_ARCHETYPES, COLLECTIONS, t } = globalContext.localized;
	const [modalInstance, setModalInstance] = React.useState(null as PlayerCollection | null);

	const [sort, setSort] = useStateWithStorage(`${globalContext.player.playerData?.player.dbid || 'default'}_collections/overview/sort_by`, '', { rememberForever: true });
	const [dir, setDir] = useStateWithStorage(`${globalContext.player.playerData?.player.dbid || 'default'}_collections/overview/sort_direction`, 1, { rememberForever: true });

	const collections = React.useMemo(() => {
		const cols = [...globalContext.core.collections];
		if (sort) {
			if (sort === 'name') {
				cols.sort((a, b) => dir * a.name.localeCompare(b.name));
			}
			if (sort === 'score') {
				cols.sort((a, b) => dir * (a.score!.score - b.score!.score));
			}
			else {
				cols.sort((a, b) => dir * (a.score!.details[sort] - b.score!.details[sort]));
			}
		}
		else if (dir === -1) {
			cols.reverse();
		}
		return cols;
	}, [sort, dir, globalContext.core.collections]);

	if (!collections || collections.length === 0) {
		return globalContext.core.spin ? globalContext.core.spin() : <></>;
	}

	const sortOptions = [
		{ key: 'default', value: '', text: t('base.release_date') },
		{ key: 'name', value: 'name', text: t('global.name') },
		{ key: 'score', value: 'score', text: t('base.score') },
		{ key: 'loot_score', value: 'loot_score', text: t('global.loot') },
		{ key: 'difficulty', value: 'difficulty', text: t('global.difficulty') },
	]

	return (
		<div>
			<div style={{display:'flex', flexDirection: 'row', justifyContent:'flex-start', alignItems: 'center', gap: '0.5em', marginBottom: '1em', width: '100%'}}>
				<Input placeholder={t('global.search')} value={search} onChange={(e, { value }) => setSearch(value.trim())} />
				<Icon style={{margin:0,cursor:'pointer'}} name='close' onClick={() => setSearch('')} />
				<div style={{...OptionsPanelFlexRow, flexGrow: 1, justifyContent: 'flex-end', gap: '1em', justifySelf: 'flex-end', textAlign: 'right'}}>
					{t('global.sort_by{{:}}')}&nbsp;
					<Dropdown
						clearable
						placeholder={t('base.release_date')}
						options={sortOptions}
						value={sort}
						onChange={(e, { value }) => setSort(value as any)}
						/>
					<Button
						icon={`sort alphabet ${dir === 1 ? 'descending' : 'ascending'}`}
						onClick={() => setDir(dir * -1)}
						/>
				</div>
			</div>

			<Grid stackable columns={3}>
				{collections.map(colInfo => {
					const stats = getAllStatBuffs(colInfo);
					if (COLLECTIONS[`cc-${colInfo.type_id ?? colInfo.id}`]) {
						colInfo = { ...colInfo, ... COLLECTIONS[`cc-${colInfo.type_id ?? colInfo.id}`]};
					}

					if (!collectionMatches(colInfo)) return <></>

					return (
						<Grid.Column
							key={`${colInfo.type_id}_${colInfo.name}`}>
							<div
								style={{ cursor: 'pointer' }}
								onClick={() => setModalInstance(colInfo as PlayerCollection)}
							>
								<Segment padded>
									<Label attached="top">
										<div style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5em', alignItems: 'center', justifyContent: 'space-between'}}>
											<span style={{fontSize: '1.2em', fontWeight: 'bold'}}>{colInfo.name}</span>
											<div style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.5em', alignItems: 'center', justifyContent: 'flex-start'}}>
												{stats.map(stat => renderBuff(colInfo, stat))}
											</div>
										</div>
									</Label>
									<LazyImage
										src={`${process.env.GATSBY_ASSETS_URL}${colInfo.image}`}
										size="large"
										// onError={e => e.target.style.visibility = 'hidden'}
									/>
									<Label attached='bottom'
										// style={{minHeight: '4em'}}
										>
										<div style={{margin:0,padding:0}}>
										{formatColString(colInfo.description!)}
										</div>
										<div style={{margin:0,padding:'0.5em 0 0 0'}}>

											{t('base.score{{:}}')}
											&nbsp;&nbsp;
											<span>
												{Math.ceil(colInfo!.score!.score).toLocaleString()}
											</span>&nbsp;&mdash;&nbsp;

											{t('global.difficulty{{:}}')}
											&nbsp;&nbsp;
											<span>
												{colInfo?.score?.details?.difficulty.toLocaleString()}
											</span>&nbsp;&mdash;&nbsp;
											{t('global.loot{{:}}')}
											&nbsp;&nbsp;
											<span>
												{colInfo?.score?.details?.loot_score.toLocaleString()}
											</span>

										</div>
									</Label>
								</Segment>
							</div>
						</Grid.Column>)

					})}
			</Grid>

			{modalInstance !== null && (
				<Modal
					open
					size="large"
					onClose={() => setModalInstance(null)}
					closeIcon
				>
					<Modal.Header>
						{modalInstance.name}
					</Modal.Header>
					<Modal.Description>
						<div style={{ marginLeft: '1.5em', marginBottom: '1em' }}>
							{formatColString(modalInstance.description!)}
						</div>
					</Modal.Description>
					<Modal.Content scrolling>
						<CollectionDetails collection={modalInstance} />
					</Modal.Content>
				</Modal>
			)}
		</div>
	);

	function renderBuff(colInfo: Collection, stat: MilestoneBuff) {
		let arch = ITEM_ARCHETYPES[stat.symbol!];

		return (
			<div
				title={`${arch?.name ?? stat?.name ?? ''}${stat.quantity! > 1 ? ' (x' + stat.quantity!.toString() + ')' : ''}`} key={`${colInfo.name}_stat_${stat.symbol}`} style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}
			>
				<img style={{height:'16px'}} src={`${getIconPath(stat.icon!)}`} />
				<span>+{stat.quantity!}%</span>
			</div>
		)

		// return <Popup
		// 			key={`${colInfo.name}_stat_verbose_${stat.symbol}`}
		// 			trigger={
		// 				<div title={`${arch?.name ?? stat?.name ?? ''}${stat.quantity! > 1 ? ' (x' + stat.quantity!.toString() + ')' : ''}`} key={`${colInfo.name}_stat_${stat.symbol}`} style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
		// 					<img style={{height:'16px'}} src={`${getIconPath(stat.icon!)}`} />
		// 					<span>+{stat.quantity!}%</span>
		// 				</div>
		// 			}
		// >
		// 	<Popup.Content>
		// 		<div key={`${colInfo.name}_stat_verbose_${stat.symbol}`} style={{margin: 0, padding: 0, gap: '0.5em', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
		// 			<img style={{height:'28px'}} src={`${getIconPath(stat.icon!)}`} />
		// 			<span>{arch?.name ?? stat?.name ?? ''}{stat.quantity! > 1 ? ' (x' + stat.quantity!.toString() + ')' : ''}</span>
		// 		</div>
		// 	</Popup.Content>

		// </Popup>
	}

	function collectionMatches(c: Collection) {
		let sl = search?.toLowerCase() || '';
		if (!sl) return true;
		let m = !sl || c.name.toLowerCase().includes(sl) || c.description?.toLowerCase().includes(sl)
		if (!m && c.milestones) {
			m = c.milestones?.some(ms => {
				let msb = ms.buffs.some(buff => buff.flavor?.toLowerCase().includes(sl) || buff.name?.toLowerCase().includes(sl) || buff.symbol?.toLowerCase().includes(sl))
				if (!msb) {
					msb = ms.rewards.some(reward => reward.flavor?.toLowerCase().includes(sl) || reward.name?.toLowerCase().includes(sl) || reward.symbol?.toLowerCase().includes(sl))
				}
				return msb;
			})
		}
		return m;
	}


}

export default CollectionsOverview;
