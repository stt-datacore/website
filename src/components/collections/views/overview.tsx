import React from 'react';
import { Label, Modal, Grid, Segment, Input, Icon, Image, Popup } from 'semantic-ui-react';

import { GlobalContext } from '../../../context/globalcontext';
import { MilestoneBuff, PlayerCollection } from '../../../model/player';
import { CollectionDetails } from '../overview_modal';
import { formatColString } from '../context';
import { getAllStatBuffs } from '../../../utils/collectionutils';
import { getIconPath } from '../../../utils/assets';
import { Collection } from "../../../model/collections";

export const CollectionsOverview = () => {
	const globalContext = React.useContext(GlobalContext);

	const [search, setSearch] = React.useState('');
	const { ITEM_ARCHETYPES, COLLECTIONS, t } = globalContext.localized;
	const [modalInstance, setModalInstance] = React.useState(null as PlayerCollection | null);
	const { collections } = globalContext.core;

	if (!collections || collections.length === 0) {
		return globalContext.core.spin ? globalContext.core.spin() : <></>;
	}

	return (
		<div>
			<div style={{display:'flex', flexDirection: 'row', justifyContent:'flex-start', alignItems: 'center', gap: '0.5em', marginBottom: '1em'}}>
				<Input placeholder={t('global.search')} value={search} onChange={(e, { value }) => setSearch(value.trim())} />
				<Icon style={{margin:0,cursor:'pointer'}} name='close' onClick={() => setSearch('')} />
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
									<Image
										src={`${process.env.GATSBY_ASSETS_URL}${colInfo.image}`}
										size="large"
										// onError={e => e.target.style.visibility = 'hidden'}
									/>
									<Label attached='bottom'>
										{formatColString(colInfo.description!)}
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
