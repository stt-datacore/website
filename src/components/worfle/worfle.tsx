import React from 'react';
import {
	Icon,
	Menu
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { crewVariantIgnore, getVariantTraits, oneCrewCopy } from '../../utils/crewutils';

import { useStateWithStorage } from '../../utils/storage';

import { IRosterCrew, ITraitMap, IUserPrefs, TTraitType } from './model';
import { DAX_FIXES, DISPLAY_NAME_FIXES, MISLEADING_CREW, SERIES_ERAS, USABLE_COLLECTIONS, USABLE_HIDDEN_TRAITS } from './config';
import { IWorfleContext, WorfleContext } from './context';
import { DailyGame } from './dailygame';
import { GameInstructions } from './instructions';
import { PracticeGame } from './practicegame';

const DEBUG_FLAG_BAD_SERIES = false;		// Prints crew with missing or multiple series traits to console
const DEBUG_FLAG_MULTIPLE_NAMES = false;	// Prints crew with multiple short names
const DEBUG_FLAG_DUPLICATE_NAMES = false;	// Prints crew with non-unique short names

const prefDefaults: IUserPrefs = {
	favorites: [],
	handicap_rarity: false,
	handicap_series: false,
	handicap_skills: 'hide',
	hide_guessed_crew: true,
	hide_nonviable_crew: true
};

export const Worfle = () => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;

	const [roster, setRoster] = React.useState<IRosterCrew[]>([]);
	const [traitMap, setTraitMap] = React.useState<ITraitMap>({});

	const [userPrefs, setUserPrefs] = useStateWithStorage<IUserPrefs>(
		'worfle/prefs',
		structuredClone(prefDefaults),
		{
			rememberForever: true,
			onInitialize: (_itemKey: string, userPrefs: IUserPrefs) => validateUserPrefs(userPrefs)
		}
	);

	React.useEffect(() => {
		initializeData();
	}, [globalContext]);

	if (!roster) return <></>;

	const worfleData: IWorfleContext = {
		roster,
		traitMap,
		userPrefs,
		setUserPrefs
	};

	return (
		<WorfleContext.Provider value={worfleData}>
			<WorfleTabs />
		</WorfleContext.Provider>
	);

	interface IVariantMap {
		[key: string]: string[];
	};

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
					console.log('BAD_SERIES', crew.name, crew.symbol, crew.series, seriesTraits);
			});
		}

		const roster: IRosterCrew[] = [];
		const variantMap: IVariantMap = {};

		globalContext.core.crew.forEach(crewMember => {
			const crew: IRosterCrew = oneCrewCopy(crewMember) as IRosterCrew;
			const variants: string[] = getGamifiedVariants(crew);

			// Attach gamified series, variants, and traits here
			crew.gamified_series = !!crew.series && !MISLEADING_CREW.includes(crew.symbol) ? crew.series : 'n/a';
			crew.gamified_variants = variants;
			crew.gamified_traits = getGamifiedTraits(crew, variants);

			// Map default name, image, and crew count to traits
			mapTraitData(traitMap, crew, variants);

			// Map short names to variants to properly identify variant display names
			variants.forEach(variant => {
				if (!variantMap[variant]) variantMap[variant] = [];
				variantMap[variant].push(crew.short_name);
			});

			roster.push(crew);
		});

		// Sort here to ensure consistency of seedrandom
		roster.sort((a, b) => a.name.localeCompare(b.name));
		setRoster(roster);

		// Update traitMap with unique display names for variants
		identifyVariantNames(traitMap, variantMap);

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

	function mapTraitData(traitMap: ITraitMap, crew: IRosterCrew, variants: string[]): void {
		const getTraitType = (trait: string) => {
			let type: TTraitType = 'trait';
			if (USABLE_HIDDEN_TRAITS.includes(trait)) type = 'hidden_trait';
			if (USABLE_COLLECTIONS.includes(trait)) type = 'collection';
			if (variants.includes(trait)) type = 'variant';
			return type;
		};

		const getTraitIconUrl = (trait: string, type: TTraitType) => {
			let iconUrl: string = '';
			switch (type) {
				case 'collection':
					iconUrl = '/media/vault.png';
					break;
				case 'trait':
					iconUrl = `${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`;
					break;
				case 'variant':
					iconUrl = '/media/crew_icon.png';
					break;
			}
			return iconUrl;
		};

		crew.gamified_traits.forEach(trait => {
			if (!traitMap[trait]) {
				const type: TTraitType = getTraitType(trait);
				traitMap[trait] = {
					type,
					display_name: TRAIT_NAMES[trait] ?? properCase(trait),
					iconUrl: getTraitIconUrl(trait, type),
					crew: []
				};
			}
			traitMap[trait].crew.push(crew.symbol);
		});
	}

	function identifyVariantNames(traitMap: ITraitMap, variantMap: IVariantMap): void {
		const symbolize = (name: string) => {
			return name.replace(/[^A-Z0-1]/gi, '').toLowerCase();
		};

		const nameCounts: { [key: string]: number } = {};

		Object.keys(variantMap).forEach(variant => {
			let displayName: string = '';

			// Used fixed display names defined in config
			const fix: { variant: string, display_name: string } | undefined = DISPLAY_NAME_FIXES.find(fix => fix.variant === variant);
			if (fix) {
				displayName = fix.display_name;
			}
			// Otherwise use most common short name among variants OR short name that best matches variant symbol
			else {
				const shortNames: { [key: string]: number } = {};
				variantMap[variant].forEach(shortName => {
					shortNames[shortName] = (shortNames[shortName] ?? 0) + 1;
				});
				const bestName: string = Object.keys(shortNames).sort(
					(a, b) => {
						const aCount: number = shortNames[a];
						const bCount: number = shortNames[b];
						if (aCount === bCount) {
							if (symbolize(a) === symbolize(variant)) return -1;
							if (symbolize(b) === symbolize(variant)) return 1;
						}
						return bCount - aCount;
					}
				)[0];
				if (DEBUG_FLAG_MULTIPLE_NAMES) {
					if (Object.keys(shortNames).length > 1)
						console.log('MULTIPLE NAMES', variant, shortNames, bestName);
				}
				displayName = bestName;
			}

			if (displayName !== '') {
				traitMap[variant].display_name = displayName;
				nameCounts[displayName] ??= 0;
				nameCounts[displayName]++;
			}
		});

		// Make sure that no variants share the same display name
		Object.keys(nameCounts).filter(displayName => nameCounts[displayName] > 1).forEach(duplicateName => {
			Object.keys(variantMap).filter(
				variant => traitMap[variant].display_name === duplicateName
			).sort((a, b) =>
				variantMap[b].length - variantMap[a].length
			).forEach((variant, idx) => {
				// Prefer short name of crew with most variants, otherwise use version of variant symbol
				if (idx > 0) {
					const displayName: string = properCase(variant);
					traitMap[variant].display_name = displayName;
					if (DEBUG_FLAG_DUPLICATE_NAMES) {
						console.log('DUPLICATE_NAME', variant, duplicateName, displayName);
					}
				}
			});
		});
	}

	function properCase(trait: string): string {
		return trait.replace(/_/g, ' ').split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1)).join(' ');
	}

	function validateUserPrefs(userPrefs: IUserPrefs): void {
		const validatedPrefs: IUserPrefs = structuredClone(prefDefaults);
		Object.keys(prefDefaults).forEach(key => {
			if (typeof userPrefs[key] === typeof prefDefaults[key])
				validatedPrefs[key] = userPrefs[key];
		});
		setUserPrefs(validatedPrefs);
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
