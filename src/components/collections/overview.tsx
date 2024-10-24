import React, { PureComponent } from 'react';
import { Item, Icon, Dropdown, Label, Modal, Grid, Segment } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { CrewMember } from '../../model/crew';
import { Collection } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../CONFIG';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { crewCopy } from '../../utils/crewutils';
import { TinyStore } from '../../utils/tiny';
import { useStateWithStorage } from '../../utils/storage';
import { PlayerCollection } from '../../model/player';
import EventInfoModal from '../event_info_modal';
import { CollectionDetails } from './overview_modal';
import LazyImage from '../lazyimage';
import { formatColString } from './context';

type CollectionsPageProps = {
	onClick?: (collectionId: number) => void;
};

type SortOptions = 'date_added' | 'rarity' | 'owned_status';
type Direction = 'ascending' | 'descending';

export const CollectionsOverview = (props: CollectionsPageProps) => {
	const globalContext = React.useContext(GlobalContext);

	const [modalInstance, setModalInstance] = React.useState(null as PlayerCollection | null);
	const { collections } = globalContext.core;

	if (!collections || collections.length === 0) {
		return globalContext.core.spin ? globalContext.core.spin() : <></>;
	}

	return (
		<div>
			<Grid stackable columns={3}>
				{collections.map(colInfo => (
					<Grid.Column key={`${colInfo.type_id}_${colInfo.name}`}>
						<div
							style={{ cursor: 'pointer' }}
							onClick={() => setModalInstance(colInfo as PlayerCollection)}
						>
							<Segment padded>
								<Label attached="top">
									{colInfo.name}
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
					</Grid.Column>
				))}
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
