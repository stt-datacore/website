import React from "react";
import { Form, Dropdown } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { ICrewFilter, IRosterCrew } from "../model";


//export type SkillOrderFilterType = 'none' | 'unowned' | 'underowned' | 'notmax';

type CrewSkillOrderProps = {
    ownedSkills: string[];
    maxedSkills: string[];
    pageId: string;
    crewFilters: ICrewFilter[];
    setCrewFilters: (crewFilters: ICrewFilter[]) => void;
}

export const CrewSkillOrder = (props: CrewSkillOrderProps) => {
const { t } = React.useContext(GlobalContext).localized;
	const { crewFilters, setCrewFilters, ownedSkills, maxedSkills } = props;

	const [skillOrderFilter, setSkillOrderFilter] = React.useState('');

	const statusOptions = [
		{ key: 'none', value: '', text: t('crew_ownership.none') },
		{ key: 'unowned', value: 'unowned', text: t('skill_order_ownership.unowned') },
		{ key: 'underowned', value: 'underowned', text: t('skill_order_ownership.underowned') },
		{ key: 'notmax', value: 'notmax', text: t('skill_order_ownership.notmax') },
	];

	const filterByOwnership = (crew: IRosterCrew) => {
        const skillkey = `${crew.skill_order.join()},${crew.max_rarity}`;
		if (['unowned'].includes(skillOrderFilter) && !!ownedSkills?.length && (ownedSkills.includes(skillkey))) return false;
        if (['underowned'].includes(skillOrderFilter) && !!maxedSkills?.length && (!crew.have || maxedSkills.includes(skillkey))) return false;
		if (['notmax'].includes(skillOrderFilter)) {
            if (ownedSkills.includes(skillkey) && maxedSkills.includes(skillkey)) return false;
            else return true;
        }
        return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'skill_order_ownership');
		if (index >= 0) crewFilters.splice(index, 1);
		if (skillOrderFilter !== '') {
			crewFilters.push({ id: 'skill_order_ownership', filterTest: filterByOwnership });
		}
		setCrewFilters([...crewFilters]);
	}, [skillOrderFilter]);

	return (
		<Form.Field>
			<Dropdown
				placeholder={t('hints.filter_by_skill_order_ownership')}
				clearable
				selection
				options={statusOptions}
				value={skillOrderFilter}
				onChange={(e, { value }) => setSkillOrderFilter(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);

}