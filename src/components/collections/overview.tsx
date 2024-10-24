import React from 'react';
import { Label, Modal, Grid, Segment } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { PlayerCollection } from '../../model/player';
import { CollectionDetails } from './overview_modal';
import LazyImage from '../lazyimage';
import { formatColString } from './context';
import { getAllStatBuffs } from '../../utils/collectionutils';
import { getIconPath } from '../../utils/assets';
import CONFIG from '../CONFIG';

type CollectionsPageProps = {
	onClick?: (collectionId: number) => void;
};

export const CollectionsOverview = (props: CollectionsPageProps) => {
	const globalContext = React.useContext(GlobalContext);

	const { ITEM_ARCHETYPES } = globalContext.localized;
	const [modalInstance, setModalInstance] = React.useState(null as PlayerCollection | null);
	const { collections } = globalContext.core;

	if (!collections || collections.length === 0) {
		return globalContext.core.spin ? globalContext.core.spin() : <></>;
	}

	return (
		<div>
			<Grid stackable columns={3}>
				{collections.map(colInfo => {
					const stats = getAllStatBuffs(colInfo);

					return (
						<Grid.Column key={`${colInfo.type_id}_${colInfo.name}`}>
							<div
								style={{ cursor: 'pointer' }}
								onClick={() => setModalInstance(colInfo as PlayerCollection)}
							>
								<Segment padded>
									<Label attached="top">
										<div style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25em', alignItems: 'center', justifyContent: 'space-between'}}>
											<span>{colInfo.name}</span>
											<div className='ui label' style={{margin: 0, padding: 0, flexWrap: 'wrap', display: 'flex', flexDirection: 'row', gap: '0.5em', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
												{stats.map(stat => {
													let arch = ITEM_ARCHETYPES[stat.symbol!];
													return (
														<div title={`${arch?.name ?? stat?.name ?? ''}${stat.quantity! > 1 ? ' (x' + stat.quantity!.toString() + ')' : ''}`} key={`${colInfo.name}_stat_${stat.symbol}`} style={{margin: 0, padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
															<img style={{height:'16px'}} src={`${getIconPath(stat.icon!)}`} />
															<span>+{stat.quantity!}%</span>
														</div>)
												})}
											</div>
										</div>

									</Label>
									<LazyImage
										src={`${process.env.GATSBY_ASSETS_URL}${colInfo.image}`}
										size="large"
										onError={e => e.target.style.visibility = 'hidden'}
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
}

export default CollectionsOverview;
