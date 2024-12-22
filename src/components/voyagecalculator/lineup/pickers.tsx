import React from "react";
import { Button } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { useStateWithStorage } from "../../../utils/storage";
import { GridView } from "./grid";
import { TableView } from "./table";

export const PlayerViewPicker = (props: { dbid: string }) => {
	let default_layout = 'table-compact';
	const { t } = React.useContext(GlobalContext).localized;
	if (window.location.search?.length) {
		let search = new URLSearchParams(window.location.search);
		if (search.has('layout')) {
			let param_layer = search.get('layout');
			if (param_layer && ['table-compact', 'table-standard', 'grid-cards', 'grid-icons'].includes(param_layer)) {
				default_layout = param_layer;
			}
		}
	}

	const [layout, setLayout] = useStateWithStorage(props.dbid+'/voyage/layout', default_layout, { rememberForever: true });

	return (
		<React.Fragment>
			{(layout === 'table-compact' || layout === 'table-standard') && <TableView layout={layout} />}
			{(layout === 'grid-cards' || layout === 'grid-icons') && <GridView layout={layout} />}
			<div style={{ marginTop: '2em' }}>
				{t('voyage.lineup.select_layout_colon')}{` `}
				<Button.Group>
					<Button icon='align justify' color={layout === 'table-compact' ? 'blue' : undefined} onClick={() => setLayout('table-compact')} />
					<Button icon='list' color={layout === 'table-standard' ? 'blue' : undefined} onClick={() => setLayout('table-standard')} />
					<Button icon='block layout' color={layout === 'grid-cards' ? 'blue' : undefined} onClick={() => setLayout('grid-cards')} />
					<Button icon='ellipsis horizontal' color={layout === 'grid-icons' ? 'blue' : undefined} onClick={() => setLayout('grid-icons')} />
				</Button.Group>
			</div>
		</React.Fragment>
	);
};

export const NonPlayerViewPicker = () => {
	const { t } = React.useContext(GlobalContext).localized;
	const [layout, setLayout] = React.useState('table-compact');
	return (
		<React.Fragment>
			{(layout === 'table-compact' || layout === 'table-standard') && <TableView layout={layout} />}
			{(layout === 'grid-cards' || layout === 'grid-icons') && <GridView layout={layout} />}
			<div style={{ marginTop: '2em' }}>
				{t('voyage.lineup.select_layout_colon')}{` `}
				<Button.Group>
					<Button icon='align justify' color={layout === 'table-compact' ? 'blue' : undefined} onClick={() => setLayout('table-compact')} />
					<Button icon='list' color={layout === 'table-standard' ? 'blue' : undefined} onClick={() => setLayout('table-standard')} />
					<Button icon='block layout' color={layout === 'grid-cards' ? 'blue' : undefined} onClick={() => setLayout('grid-cards')} />
					<Button icon='ellipsis horizontal' color={layout === 'grid-icons' ? 'blue' : undefined} onClick={() => setLayout('grid-icons')} />
				</Button.Group>
			</div>
		</React.Fragment>
	);
};