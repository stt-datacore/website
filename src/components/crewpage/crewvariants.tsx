import React from 'react';
import { Link } from 'gatsby';
import { Segment, Header, Grid } from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { Variant } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import ItemDisplay from '../../components/itemdisplay';
import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
import { crewVariantIgnore, getShortNameFromTrait, getVariantTraits } from '../../utils/crewutils';

type CrewVariantsProps = {
	traits_hidden: string[];
};

export const CrewVariants = (props: CrewVariantsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { traits_hidden } = props;

	const [variants, setVariants] = React.useState<Variant[]>([] as Variant[]);

	React.useEffect(() => {
		const variants = [] as Variant[];

		const variantTraits = getVariantTraits(traits_hidden);
		variantTraits.forEach(trait => {
			const variantGroup = globalContext.core.crew.filter(ac => ac.traits_hidden.indexOf(trait) >= 0 && !crewVariantIgnore.includes(ac.symbol))
				.map(cp => JSON.parse(JSON.stringify(cp)) as CrewMember);

			// Ignore variant group if crew is the only member of the group
			if (variantGroup.length > 1) {
				variantGroup.sort((a, b) => {
					if (a.max_rarity === b.max_rarity)
						return a.name.localeCompare(b.name);
					return a.max_rarity - b.max_rarity;
				});
				// short_name may not always be the best name to use, depending on the first variant
				//	Hardcode fix to show Dax as group name, otherwise short_name will be E. Dax for all dax

				variants.push({
					name: getShortNameFromTrait(trait, variantGroup),
					trait_variants: variantGroup
				});
			}

			setVariants([...variants]);
		});

	}, []);

	if (variants.length === 0) return (<></>);

	return (
		<React.Fragment>
			<CrewHoverStat targetGroup='variants' offset={{ x: 12, y: 12, centerX: true }} />
			{variants.map((group, idx) => renderGroup(group, idx))}
		</React.Fragment>
	);

	function renderGroup(group: Variant, idx: number): JSX.Element {
		return (
			<Segment key={idx}>
				<Header as='h4'>{t('crew_page.variants', { crew: group.name })}</Header>
				<Grid centered padded>
					{group.trait_variants.map(variant => (
						<Grid.Column key={variant.symbol} textAlign='center' mobile={8} tablet={5} computer={4}>
							<CrewTarget
								targetGroup='variants'
								inputItem={variant}
							>
								<ItemDisplay
									src={`${process.env.GATSBY_ASSETS_URL}${variant.imageUrlPortrait}`}
									size={128}
									maxRarity={variant.max_rarity}
									rarity={variant.max_rarity}
							/>
							</CrewTarget>
							<div><Link to={`/crew/${variant.symbol}/`}>{variant.name}</Link></div>
						</Grid.Column>
					))}
				</Grid>
			</Segment>
		);
	}
};
