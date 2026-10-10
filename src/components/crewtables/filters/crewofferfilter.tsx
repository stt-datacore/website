import React from 'react';
import { Dropdown, DropdownItemProps, Form } from 'semantic-ui-react';

import { ICrewFilter, IRosterCrew } from '../../../components/crewtables/model';
import { GlobalContext } from '../../../context/globalcontext';

type CrewOfferFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
    offers: string[];
	altTitle?: string;
};

export const CrewOfferFilter = (props: CrewOfferFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
    const { crew } = globalContext.core;
	const { crewFilters, setCrewFilters, offers } = props;

	const [offerFilter, setOfferFilter] = React.useState<string[] | undefined>(undefined as string[] | undefined);

	const offerOptions = [] as DropdownItemProps[];

    offers.forEach((offer) => {
        offerOptions.push(
            { key: offer, value: offer, text: offer },
        )
    });

	const filterByOffer = (crew: IRosterCrew) => {
        if (offerFilter?.length) {
            return !!crew?.offers?.some(o => offerFilter.includes(o.name));
        }
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'offers');
		if (index >= 0) crewFilters.splice(index, 1);
		if (offerFilter?.length) {
			crewFilters.push({ id: 'offers', filterTest: filterByOffer });
		}
		setCrewFilters([...crewFilters]);
	}, [offerFilter]);

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('hints.filter_by_offer')}
				clearable
				selection
				multiple={true}
				options={offerOptions}
				value={offerFilter}
				onChange={(e, { value }) => setOfferFilter(value as string[] | undefined)}
				closeOnChange
			/>
		</Form.Field>
	);
};
