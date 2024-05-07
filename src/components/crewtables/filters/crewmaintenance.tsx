import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { CompletionState } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { isQuipped } from '../../../utils/crewutils';

type CrewMaintenanceFilterProps = {
	pageId: string;
	rosterCrew: IRosterCrew[];
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const CrewMaintenanceFilter = (props: CrewMaintenanceFilterProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { crewFilters, setCrewFilters } = props;

	const [maintenanceFilter, setMaintenanceFilter] = React.useState('');

	const maintenanceOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'quipped', value: 'quipped', text: 'Only show quipped crew' },
		{ key: 'quippable', value: 'quippable', text: 'Only show quippable crew' },
		{ key: 'advanceable', value: 'advanceable', text: 'Only show crew with unclaimed quipment slots' },
		{ key: 'freezable', value: 'freezable', text: 'Only show freezable crew' },
		{ key: 'mortal', value: 'mortal', text: 'Only show non-immortals' },
		{ key: 'priority', value: 'priority', text: 'Only show fully-fused non-immortals' },
		{ key: 'impact', value: 'impact', text: 'Only show crew needing 1 fuse' },
		{ key: 'threshold', value: 'threshold', text: 'Only show crew needing 2 fuses' },
		{ key: 'fodder', value: 'fodder', text: 'Only show unfused crew' },
		{ key: 'dupes', value: 'dupes', text: 'Only show duplicate crew' },
		{ key: 'buyback', value: 'buyback', text: 'Show crew with fuses in buy-back well' }
	];

	const filterByMaintenance = (crew: IRosterCrew) => {
		if (maintenanceFilter === 'quipped' && !isQuipped(crew)) return false;
		if (maintenanceFilter === 'quippable' && (!crew.q_bits || crew.q_bits < 100)) return false;
		if (maintenanceFilter === 'advanceable' && (crew.q_bits >= 1300 || crew.immortal !== -1)) return false;
		if (maintenanceFilter === 'freezable' && crew.immortal !== CompletionState.Immortalized) return false;
		if (maintenanceFilter === 'mortal' && crew.immortal !== CompletionState.NotComplete) return false;
		if (maintenanceFilter === 'priority' && (crew.immortal === CompletionState.Immortalized || crew.immortal >= CompletionState.Frozen || crew.max_rarity !== crew.rarity)) return false;
		if (maintenanceFilter === 'threshold' && crew.max_rarity - crew.rarity !== 2) return false;
		if (maintenanceFilter === 'impact' && crew.max_rarity - crew.rarity !== 1) return false;
		if (maintenanceFilter === 'fodder' && !crew.expires_in && (crew.max_rarity === 1 || crew.rarity !== 1)) return false;
		if (maintenanceFilter === 'dupes' && props.rosterCrew.filter((c) => c.symbol === crew.symbol).length === 1) return false;
		if (maintenanceFilter === 'buyback') {
			if (!globalContext.player.playerData?.buyback_well?.length) return false;
			if (crew.rarity === crew.max_rarity) return false;
			if (!globalContext.player.playerData.buyback_well.includes(crew.symbol)) return false;	
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
				placeholder='Roster maintenance'
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
