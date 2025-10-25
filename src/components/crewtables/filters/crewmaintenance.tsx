import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { CompletionState } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { getCrewQuipment, isQuipped } from '../../../utils/crewutils';
import { EquipmentItem } from '../../../model/equipment';
import { getPossibleQuipment } from '../../../utils/itemutils';

type CrewMaintenanceFilterProps = {
	pageId: string;
	rosterCrew: IRosterCrew[];
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const CrewMaintenanceFilter = (props: CrewMaintenanceFilterProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { crewFilters, setCrewFilters } = props;
	const [maintenanceFilter, setMaintenanceFilter] = React.useState('');

	const maintenanceOptions = [
		{ key: 'none', value: '', text: t('options.roster_maintenance.none') },
		{ key: 'quipped', value: 'quipped', text: t('options.roster_maintenance.quipped') },
		{ key: 'quippable', value: 'quippable', text: t('options.roster_maintenance.quippable') },
		{ key: 'advanceable', value: 'advanceable', text: t('options.roster_maintenance.advanceable') },
		{ key: 'freezable', value: 'freezable', text: t('options.roster_maintenance.freezable') },
		{ key: 'mortal', value: 'mortal', text: t('options.roster_maintenance.mortal') },
		{ key: 'nonfe', value: 'nonfe', text: t('options.roster_maintenance.nonfe') },
		{ key: 'fe', value: 'fe', text: t('options.roster_maintenance.fe') },
		{ key: 'priority', value: 'priority', text: t('options.roster_maintenance.priority') },
		{ key: 'impact', value: 'impact', text: t('options.roster_maintenance.impact') },
		{ key: 'threshold', value: 'threshold', text: t('options.roster_maintenance.threshold') },
		{ key: 'fodder', value: 'fodder', text: t('options.roster_maintenance.fodder') },
		{ key: 'dupes', value: 'dupes', text: t('options.roster_maintenance.dupes') },
		{ key: 'buyback', value: 'buyback', text: t('options.roster_maintenance.buyback') },
	];

	const filterByMaintenance = (crew: IRosterCrew) => {
		if (maintenanceFilter === 'quipped' && !isQuipped(crew)) return false;
		if (maintenanceFilter === 'quippable' && (!crew.q_bits || crew.q_bits < 100)) return false;
		if (maintenanceFilter === 'advanceable' && ((crew.q_bits !== undefined && crew.q_bits >= 1300) || !crew.immortal)) return false;
		if (maintenanceFilter === 'freezable' && crew.immortal !== CompletionState.Immortalized) return false;
		if (['mortal', 'fe', 'nonfe'].includes(maintenanceFilter) && crew.immortal !== CompletionState.NotComplete) return false;
		if (maintenanceFilter === 'fe' && (crew.level < 100 || crew.equipment.length < 4)) return false;
		if (maintenanceFilter === 'nonfe' && (crew.level === 100 && crew.equipment.length === 4)) return false;
		if (maintenanceFilter === 'priority' && (crew.immortal === CompletionState.Immortalized || crew.immortal >= CompletionState.Frozen || crew.max_rarity !== crew.rarity)) return false;
		if (maintenanceFilter === 'threshold' && crew.max_rarity - crew.rarity !== 2) return false;
		if (maintenanceFilter === 'impact' && crew.max_rarity - crew.rarity !== 1) return false;
		if (maintenanceFilter === 'fodder' && !crew.expires_in && (crew.max_rarity === 1 || crew.rarity !== 1)) return false;
		if (maintenanceFilter === 'dupes' && props.rosterCrew.filter((c) => c.symbol === crew.symbol).length === 1) return false;
		if (maintenanceFilter === 'buyback') {
			if (!globalContext.player.playerData?.buyback_well?.length) return false;
			if (crew.rarity === crew.max_rarity) return false;
			if (!globalContext.player.playerData.buyback_well.some(c => c.symbol === crew.symbol)) return false;
		}
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'maintenance');
		if (index >= 0) crewFilters.splice(index, 1);
		if (maintenanceFilter !== '') {
			crewFilters.push({ id: 'maintenance', filterTest: filterByMaintenance });
		}
		setCrewFilters([...crewFilters]);
	}, [maintenanceFilter]);

	return (
		<Form.Field>
			<Dropdown
				placeholder={t('hints.roster_maintenance')}
				clearable
				selection
				options={maintenanceOptions}
				value={maintenanceFilter}
				onChange={(e, { value }) => setMaintenanceFilter(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
};
