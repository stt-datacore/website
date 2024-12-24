import React from 'react';
import {
	Button
} from 'semantic-ui-react';

import { GlobalContext } from '../../../context/globalcontext';
import { LayoutContext } from './context';

export const LayoutPicker = () => {
	const { t } = React.useContext(GlobalContext).localized;
	const { layout, setLayout } = React.useContext(LayoutContext);
	return (
		<React.Fragment>
			{t('voyage.lineup.select_layout_colon')}{` `}
			<Button.Group>
				<Button icon='align justify' color={layout === 'table-compact' ? 'blue' : undefined} onClick={() => setLayout('table-compact')} />
				<Button icon='list' color={layout === 'table-standard' ? 'blue' : undefined} onClick={() => setLayout('table-standard')} />
				<Button icon='block layout' color={layout === 'grid-cards' ? 'blue' : undefined} onClick={() => setLayout('grid-cards')} />
				<Button icon='ellipsis horizontal' color={layout === 'grid-icons' ? 'blue' : undefined} onClick={() => setLayout('grid-icons')} />
			</Button.Group>
		</React.Fragment>
	);
};
