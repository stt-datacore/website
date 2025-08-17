import React from 'react';
import {
	Icon,
	Menu
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { crewVariantIgnore, getVariantTraits, oneCrewCopy } from '../../utils/crewutils';

import { IRosterCrew, ITraitMap, IVariantMap } from './model';
import { DAX_FIXES, DISPLAY_NAME_FIXES, INVALID_SERIES, SERIES_ERAS, USABLE_COLLECTIONS, USABLE_HIDDEN_TRAITS } from './config';
import { WorfleContext } from './context';
import { DailyGame } from './dailygame';
import { getTraitType } from './game';
import { GameInstructions } from './instructions';
import { PracticeGame } from './practicegame';

const DEBUG_FLAG_BAD_SERIES = false;	// Prints crew with missing or multiple series traits to console

export const Worfle = () => {
	const globalContext = React.useContext(GlobalContext);

	const [roster, setRoster] = React.useState<IRosterCrew[]>([]);
	const [variantMap, setVariantMap] = React.useState<IVariantMap>({});
	const [traitMap, setTraitMap] = React.useState<ITraitMap>({});

	React.useEffect(() => {
		initializeData();
	}, [globalContext]);

	if (!roster) return <></>;

	return (
		<WorfleContext.Provider value={{ roster, variantMap, traitMap }}>
			<WorfleTabs />
		</WorfleContext.Provider>
	);

	function initializeData(): void {
		if (DEBUG_FLAG_BAD_SERIES) {
			globalContext.core.crew.forEach(crew => {
				const seriesTraits: string[] = [];
				crew.traits_hidden.forEach(trait => {
					if (SERIES_ERAS.find(seriesEra => seriesEra.series === trait)) {
						seriesTraits.push(trait);
					}
				})
				if (seriesTraits.length !== 1 && !seriesTraits.includes('original'))
					console.log(crew.name, crew.symbol, crew.series, seriesTraits);
			});
		}

		const roster: IRosterCrew[] = [];
		const variantMap: IVariantMap = {};

		globalContext.core.crew.forEach(crewMember => {
			const crew: IRosterCrew = oneCrewCopy(crewMember) as IRosterCrew;
			const variants: string[] = getGamifiedVariants(crew);

			// Attach gamified series, variants, and traits here
			crew.gamified_series = !!crew.series && !INVALID_SERIES.includes(crew.symbol) ? crew.series : 'n/a';
			crew.gamified_variants = variants;
			crew.gamified_traits = getGamifiedTraits(crew, variants);

			// Map display names to variants and crew counts to traits
			mapVariantNames(variantMap, crew, variants);
			mapTraitCounts(traitMap, crew, variantMap);

			roster.push(crew);
		});

		// Sort here to ensure consistency of seedrandom
		roster.sort((a, b) => a.name.localeCompare(b.name));
		setRoster(roster);

		fixNameMap(variantMap);

		setVariantMap(variantMap);
		setTraitMap(traitMap);
	}

	function getGamifiedVariants(crew: IRosterCrew): string[] {
		const variants: string[] = crewVariantIgnore.includes(crew.symbol) ? [] : getVariantTraits(crew.traits_hidden);
		const daxVariant: string | undefined = DAX_FIXES.find(fix => fix.short_name === crew.short_name)?.variant;
		if (daxVariant) variants.unshift(daxVariant);
		return variants;
	}

	function getGamifiedTraits(crew: IRosterCrew, variants: string[]): string[] {
		const traits: string[] = variants.slice();
		USABLE_HIDDEN_TRAITS.forEach(usable => {
			if (crew.traits_hidden.includes(usable))
				traits.push(usable);
		});
		crew.collections.forEach(collection => {
			if (USABLE_COLLECTIONS.includes(collection))
				traits.push(collection);
		});
		return traits.concat(crew.traits);
	}

	function mapVariantNames(variantMap: IVariantMap, crew: IRosterCrew, variants: string[]): void {
		variants.forEach(variant => {
			if (!variantMap[variant]) {
				variantMap[variant] = {
					short_names: [],
					display_name: ''
				};
			}

			variantMap[variant].short_names.push(crew.short_name);
			variantMap[variant].display_name = crew.short_name;

			if (variantMap[variant].short_names.length > 1) {
				const shortNames: { [key: string]: number } = {};
				variantMap[variant].short_names.forEach(shortName => {
					shortNames[shortName] = (shortNames[shortName] ?? 0) + 1;
				});
				variantMap[variant].display_name = Object.keys(shortNames).sort(
					(a, b) => shortNames[b] - shortNames[a]
				)[0];
			}
		});
	}

	function mapTraitCounts(traitMap: ITraitMap, crew: IRosterCrew, variantMap: IVariantMap): void {
		crew.gamified_traits.forEach(trait => {
			if (!traitMap[trait]) {
				traitMap[trait] = {
					type: 'trait',
					count: 0
				};
			}
			traitMap[trait].type = getTraitType(trait, variantMap);
			traitMap[trait].count++;
		});
	}

	function fixNameMap(variantMap: IVariantMap): void {
		const properName = (trait: string) => {
			return trait.replace(/_/g, ' ').split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1)).join(' ');
		};
		const nameCounts: { [key: string]: number } = {};
		Object.keys(variantMap).forEach(variant => {
			let displayName: string = variantMap[variant].display_name;
			// First fix display names defined in config
			const fix: { variant: string, display_name: string } | undefined = DISPLAY_NAME_FIXES.find(fix => fix.variant === variant);
			if (fix) {
				displayName = fix.display_name;
				variantMap[variant].display_name = displayName;
			}
			nameCounts[displayName] ??= 0;
			nameCounts[displayName]++;
		});
		// Then handle duplicate display names
		Object.keys(nameCounts).filter(displayName => nameCounts[displayName] > 1).forEach(duplicateName => {
			Object.keys(variantMap).filter(
				variant => variantMap[variant].display_name === duplicateName
			).sort((a, b) =>
				variantMap[b].short_names.length - variantMap[a].short_names.length
			).forEach((variant, idx) => {
				// Prefer short name of crew with most variants, otherwise use version of variant symbol
				if (idx > 0 || variantMap[variant].short_names.length === 1)
					variantMap[variant].display_name = properName(variant);
			});
		});
	}
};

const WorfleTabs = () => {
	const [activeItem, setActiveItem] = React.useState<string>('daily');

	const menuItems = [
		{	/* Daily Game */
			name: 'daily',
			title: 'Daily Game'
		},
		{	/* Practice Game */
			name: 'practice',
			title: 'Practice Game'
		},
		{	/* How to Play */
			name: 'instructions',
			title: <span><Icon name='question circle outline' /> How to Play</span>
		}
	];

	return (
		<React.Fragment>
			<Menu>
				{menuItems.map(item => (
					<Menu.Item key={item.name}
						name={item.name}
						active={activeItem === item.name}
						onClick={() => setActiveItem(item.name)}
					>
						{item.title}
					</Menu.Item>
				))}
			</Menu>
			{activeItem === 'daily' && <DailyGame />}
			{activeItem === 'practice' && <PracticeGame />}
			{activeItem === 'instructions' && <GameInstructions />}
		</React.Fragment>
	);
};
