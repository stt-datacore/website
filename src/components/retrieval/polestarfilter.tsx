import React from 'react';
import { Button, Checkbox, Grid, Icon, Modal } from 'semantic-ui-react';

import { IPolestar } from './model';
import { RetrievalContext } from './context';
import { GlobalContext } from '../../context/globalcontext';

export const PolestarFilterModal = () => {
	const { allKeystones, polestarTailors, setPolestarTailors } = React.useContext(RetrievalContext);
	const { t } = React.useContext(GlobalContext).localized;

	const disabledPolestars = polestarTailors.disabled;

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);
	const [pendingDisabled, setPendingDisabled] = React.useState<number[]>([]);

	// Update on external changes, e.g. reset request from crew.tsx
	React.useEffect(() => {
		setPendingDisabled([...disabledPolestars]);
	}, [disabledPolestars]);

	// Recalculate combos only when modal gets closed
	React.useEffect(() => {
		if (!modalIsOpen && JSON.stringify(pendingDisabled) !== JSON.stringify(disabledPolestars)) {
			setPolestarTailors({...polestarTailors, disabled: pendingDisabled});
		}
	}, [modalIsOpen]);

	const rarityIds: number[] = [14502, 14504, 14506, 14507, 14509];
	const skillIds: number[] = [14511, 14512, 14513, 14514, 14515, 14516];

	interface IPolestarGroup {
		title: string;
		polestars: IPolestar[];
		anyDisabled: boolean;
	};
	const grouped: IPolestarGroup[] = [
		{
			title: t('base.rarity'),
			polestars: [],
			anyDisabled: false
		},
		{
			title: t('base.skills'),
			polestars: [],
			anyDisabled: false
		},
		{
			title: t('base.traits'),
			polestars: [],
			anyDisabled: false
		},
	];

	const ownedPolestars = allKeystones.filter(k => k.type === 'keystone' && k.owned > 0) as IPolestar[];
	ownedPolestars.forEach(polestar => {
		let group = 2;
		if (rarityIds.indexOf(polestar.id) !== -1) group = 0;
		if (skillIds.indexOf(polestar.id) !== -1) group = 1;
		grouped[group].polestars.push(polestar);
		if (pendingDisabled.indexOf(polestar.id) !== -1) grouped[group].anyDisabled = true;
	});

	const selectedPolestars = ownedPolestars.length - disabledPolestars.length;
	const buttonColor = selectedPolestars < ownedPolestars.length ? 'orange' : undefined;

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button color={buttonColor}><Icon name='filter' />{selectedPolestars} / {ownedPolestars.length}</Button>}
			size='large'
		>
			<Modal.Header>{t('retrieval.filter_owned_polestars')}</Modal.Header>
			<Modal.Content scrolling>
				<Grid columns={4} stackable padded>
					{createFilterCheckboxes()}
				</Grid>
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={() => setModalIsOpen(false)}>
					{t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function createFilterCheckboxes(): React.JSX.Element[] {
		const checkboxes: React.JSX.Element[] = [];
		grouped.map((group) => {
			if(group.polestars.length > 0) {
				checkboxes.push(filterCheckboxGroupHeader(group.title));
				group.polestars.sort((a, b) => a.name.localeCompare(b.name)).map((polestar) => {
					checkboxes.push(filterCheckbox(polestar));
				});
			}
		});
		return checkboxes;
	}

	function filterCheckbox(p: IPolestar): React.JSX.Element {
		return (
			<Grid.Column key={p.id}>
				<Checkbox
					toggle
					id={`polestar_filter_id_${p.id}`}
					label={`${p.short_name} (${p.owned})`}
					checked={pendingDisabled.indexOf(p.id)===-1}
					onChange={(e) => checkOne(p.id, (e.target as HTMLInputElement).checked)}
				/>
			</Grid.Column>
		)
	}

	function filterCheckboxGroupHeader(title: string): React.JSX.Element {
		const group = grouped.find(group => group.title === title);
		if (!group) return <></>;
		const groupLink = <Button style={{ marginLeft: '1em' }} size='mini' onClick={() => checkGroup(title, group.anyDisabled)}>{group.anyDisabled ? t('global.check_all') : t('global.uncheck_all')}</Button>;
		return (
			<Grid.Column largeScreen={16} mobile={4} key={title}>
				<strong>{title}</strong> {groupLink}
			</Grid.Column>
		)
	}

	function checkOne(id: number, checked: boolean): void {
		handleFilterChange(id, checked);
		setPendingDisabled([...pendingDisabled]);
	}

	function checkGroup(t: string, checkAll: boolean): void {
		const group = grouped.find(group => group.title === t);
		if (!group) return;
		group.polestars.forEach(p => handleFilterChange(p.id, checkAll));
		setPendingDisabled([...pendingDisabled]);
	}

	function handleFilterChange(id: number, checked: boolean): void {
		if(checked === true && pendingDisabled.indexOf(id) !== -1) {
			pendingDisabled.splice(pendingDisabled.indexOf(id), 1);
		}
		if(checked === false && pendingDisabled.indexOf(id) === -1) {
			pendingDisabled.push(id);
		}
	}
};
