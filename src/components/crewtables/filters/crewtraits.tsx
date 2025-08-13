import React from 'react';
import { Table, Label } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter, ICrewMarkup } from '../../../components/crewtables/model';
import { CrewTraitFilter } from '../../../components/crewtables/commonoptions';
import { GlobalContext } from '../../../context/globalcontext';

type CrewTraitsFilterProps = {
	pageId: string;
	crewMarkups: ICrewMarkup[];
	setCrewMarkups: (crewMarkups: ICrewMarkup[]) => void;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const CrewTraitsFilter = (props: CrewTraitsFilterProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { maincast } = globalContext.core;
	const { crewMarkups, setCrewMarkups, crewFilters, setCrewFilters } = props;

	const [traitFilter, setTraitFilter] = React.useState<string[]>([] as string[]);
	const [minTraitMatches, setMinTraitMatches] = React.useState(1);

	const addTraitsMatched = (crew: IRosterCrew) => {
		const markup = crew.markup ?? {};
		const cast = Object.values(maincast).flat();
		crew.markup = {
			...markup,
			traits_matched: traitFilter.filter(trait => crew.traits.includes(trait) || crew.traits_hidden.includes(trait))
		};
		if (traitFilter.includes('maincast') && cast.some(trait => crew.traits_hidden.includes(trait))) {
			crew.markup.traits_matched!.push('maincast');
		}
	};
	const filterByTrait = (crew: IRosterCrew) => {
		if (!crew.markup || !crew.markup.traits_matched) return false;
		return crew.markup.traits_matched.length >= minTraitMatches;
	};

	React.useEffect(() => {
		if (minTraitMatches > traitFilter.length)
			setMinTraitMatches(traitFilter.length === 0 ? 1 : traitFilter.length);

		const markupIndex = crewMarkups.findIndex(crewMarkup => crewMarkup.id === 'traits_matched');
		if (markupIndex >= 0) crewMarkups.splice(markupIndex, 1);

		const filterIndex = crewFilters.findIndex(crewFilter => crewFilter.id === 'traits_matched');
		if (filterIndex >= 0) crewFilters.splice(filterIndex, 1);

		if (traitFilter.length > 0) {
			crewMarkups.push({ id: 'traits_matched', applyMarkup: addTraitsMatched });
			crewFilters.push({ id: 'traits_matched', filterTest: filterByTrait });
		}

		setCrewMarkups([...crewMarkups]);
		setCrewFilters([...crewFilters]);
	}, [traitFilter, minTraitMatches]);

	return (
		<CrewTraitFilter
			traitFilter={traitFilter}
			setTraitFilter={setTraitFilter}
			minTraitMatches={minTraitMatches}
			setMinTraitMatches={setMinTraitMatches}
		/>
	);
};

type CrewTraitMatchesCellProps = {
	crew: IRosterCrew;
};

export const CrewTraitMatchesCell = (props: CrewTraitMatchesCellProps) => {
	const { crew } = props;
	const traitList = crew.markup?.traits_matched;
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES, t } = globalContext.localized;
	if (!traitList) return (<Table.Cell />);
	return (
		<Table.Cell textAlign='center'>
			{traitList.sort((a, b) => (TRAIT_NAMES[a] || "").localeCompare(TRAIT_NAMES[b] || "")).map((trait, idx) => (
				<Label key={idx}>
					{crew.traits_hidden.includes(trait) ? t(`series.${trait}`) : TRAIT_NAMES[trait]}
				</Label>
			)).reduce((prev, curr) => <>{prev}{` `}{curr}</>, <></>)}
		</Table.Cell>
	);
};
