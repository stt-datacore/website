import React from 'react';
import { Link } from 'gatsby';
import { Segment, Header, Grid, Dropdown, Form } from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { Variant } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import ItemDisplay from '../../components/itemdisplay';
import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
import { crewVariantIgnore, getShortNameFromTrait, getVariantTraits } from '../../utils/crewutils';
import { useStateWithStorage } from '../../utils/storage';
import { AvatarView } from '../item_presenters/avatarview';

type CrewVariantsProps = {
	short_name: string;
	traits_hidden: string[];
};

export const CrewVariants = (props: CrewVariantsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { traits_hidden, short_name } = props;

	const [variants, setVariants] = React.useState<Variant[]>([] as Variant[]);
	const [byDate, setByDate] = useStateWithStorage('crewVariantSort', false, { rememberForever: true });

	const sortTraitGroup = (crew: CrewMember[]) => {
		crew.sort(((a, b) => {
			if (a.max_rarity === b.max_rarity) {
				if (byDate && a.date_added && b.date_added) {
					if (typeof a.date_added === 'string') a.date_added = new Date(a.date_added);
					if (typeof b.date_added === 'string') b.date_added = new Date(b.date_added);
					return a.date_added.getTime() - b.date_added.getTime();
				}
				else {
					return a.name.localeCompare(b.name);
				}
			}
			return a.max_rarity - b.max_rarity;
		}))
	}

	React.useEffect(() => {
		const variants = [] as Variant[];

		const variantTraits = getVariantTraits(traits_hidden);
		let sn_var = undefined as Variant | undefined;
		variantTraits.forEach(trait => {
			const variantGroup = globalContext.core.crew.filter(ac => (ac.traits_hidden.indexOf(trait) >= 0 && !crewVariantIgnore.includes(ac.symbol)))
				.map(cp => JSON.parse(JSON.stringify(cp)) as CrewMember);

			// Ignore variant group if crew is the only member of the group
			if (variantGroup.length > 1) {
				sortTraitGroup(variantGroup);
				// short_name may not always be the best name to use, depending on the first variant
				//	Hardcode fix to show Dax as group name, otherwise short_name will be E. Dax for all dax

				const addvar = {
					name: getShortNameFromTrait(trait, variantGroup),
					trait_variants: variantGroup
				};

				variants.push(addvar);
				if (addvar.name === short_name) sn_var = addvar;
			}
		});

		const shortNameGroup = globalContext.core.crew.filter(ac => (ac.short_name === short_name && short_name !== 'Burnham' && short_name !== 'Q'))
			.map(cp => JSON.parse(JSON.stringify(cp)) as CrewMember)
			.filter(fc => !sn_var?.trait_variants.some(tv => tv.symbol === fc.symbol));

			// Ignore variant group if crew is the only member of the group
		if (shortNameGroup.length && sn_var) {
			sn_var.trait_variants = sn_var.trait_variants.concat(shortNameGroup);
			sortTraitGroup(sn_var.trait_variants);
		}
		else if (shortNameGroup.length > 1) {
			sortTraitGroup(shortNameGroup);
			const addvar = {
				name: short_name,
				trait_variants: shortNameGroup
			};

			variants.push(addvar);
		}

		setVariants([...variants]);
	}, [byDate]);

	if (variants.length === 0) return (<></>);

	const sortOptions = [{
		key: 'name',
		value: false,
		text: t('global.name')
	},
	{
		key: 'date',
		value: true,
		text: t('base.release_date')
	}];

	return (
		<React.Fragment>
			<CrewHoverStat targetGroup='variants' offset={{ x: 12, y: 12, centerX: true }} />
			{variants.map((group, idx) => renderGroup(group, idx))}
		</React.Fragment>
	);

	function renderGroup(group: Variant, idx: number): JSX.Element {
		return (
			<Segment key={idx}>
				<div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
					<Header as='h4'>{t('crew_page.variants', { crew: group.name })}</Header>
					<Form>
						<Form.Field
							control={Dropdown}
							label={`${t('global.sort_by')}${t('global.colon')}`}
							options={sortOptions}
							value={byDate}
							onChange={(e, { value }) => setByDate(value as boolean)}
							inline
						/>
					</Form>
				</div>
				<Grid centered padded>
					{group.trait_variants.map(variant => (
						<Grid.Column key={variant.symbol} mobile={8} tablet={4} computer={3}>
							<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
								<AvatarView
									mode='crew'
									size={128}
									targetGroup='variants'
									item={variant}
									useDirect={true}
								/>
								<div><Link to={`/crew/${variant.symbol}/`}>{variant.name}</Link></div>
							</div>
						</Grid.Column>
					))}
				</Grid>
			</Segment>
		);
	}
};
