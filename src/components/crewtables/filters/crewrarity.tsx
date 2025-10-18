import React from 'react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { RarityFilter } from '../../../components/crewtables/commonoptions';

type CrewRarityFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
	notifySetFilter?: (value: number[]) => void;
};

export const CrewRarityFilter = (props: CrewRarityFilterProps) => {
	const { crewFilters, setCrewFilters, notifySetFilter } = props;

	const [rarityFilter, setRarityFilter] = React.useState<number[]>([] as number[]);

	const filterByRarity = (crew: IRosterCrew) => rarityFilter.includes(crew.max_rarity);

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'max_rarity');
		if (index >= 0) crewFilters.splice(index, 1);
		if (rarityFilter.length > 0) {
			crewFilters.push({ id: 'max_rarity', filterTest: filterByRarity });
		}
		setCrewFilters([...crewFilters]);
		if (notifySetFilter) notifySetFilter(rarityFilter);
	}, [rarityFilter]);

	return (
		<RarityFilter
			rarityFilter={rarityFilter}
			setRarityFilter={setRarityFilter}
		/>
	);
};
