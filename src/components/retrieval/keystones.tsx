import React from 'react';
import { Button, Checkbox, Form, Icon, Label, Step } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';

import { IConstellation, IKeystone, IPolestar, IPolestarTailors, IRosterCrew, ICrewFilters, CrewFilterField } from './model';
import { IRetrievalContext, RetrievalContext } from './context';
import { RetrievalCrew } from './crew';
import { PolestarFilterModal } from './polestarfilter';
import { PolestarProspectsModal } from './polestarprospects';
import { MutualView } from './mutualview';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import CONFIG from '../CONFIG';
import { MarketAggregation } from '../../model/celestial';
import { CelestialMarket } from './celestialmarket';
import { GapTable } from '../gaptable';

export const RetrievalKeystones = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;

	const [allKeystones, setAllKeystones] = React.useState<IKeystone[] | undefined>(undefined);
	const [market, setMarket] = React.useState<MarketAggregation>({});

	React.useEffect(() => {
		const allKeystones = JSON.parse(JSON.stringify(globalContext.core.keystones)) as IKeystone[];

		// Count all possible constellations and zero out owned count
		let totalCrates = 0, totalDrops = 0;
		const constellations = allKeystones.filter(k => k.type !== 'keystone') as IConstellation[];
		constellations.forEach(constellation => {
			constellation.owned = 0;
			if (constellation.type === 'crew_keystone_crate') {
				totalCrates++;
				totalDrops += constellation.keystones.length;
			}
		});

		// Count all possible polestars and crew_counts
		const polestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
		polestars.forEach(polestar => {
			const crates = constellations.filter(k => (k.type === 'crew_keystone_crate' || k.type === 'keystone_crate') && k.keystones.includes(polestar.id));
			const nochance = polestar.filter.type === 'rarity' || polestar.filter.type === 'skill' || crates.length === 0;
			polestar.crate_count = nochance ? 0 : crates.length;
			//polestar.scan_odds = nochance ? 0 : crates.length/totalDrops; // equal chance of dropping
			polestar.scan_odds = nochance ? 0 : crates.reduce((prev, curr) => prev + (1/curr.keystones.length), 0)/totalCrates; // conditional probability

			polestar.crew_count = 0;
			if (polestar.filter.type === 'rarity') {
				polestar.crew_count = globalContext.core.crew.filter(c => polestar.filter.rarity && c.in_portal && c.max_rarity === polestar.filter.rarity).length;
			}
			else if (polestar.filter.type === 'skill') {
				polestar.crew_count = globalContext.core.crew.filter(c => polestar.filter.skill && c.in_portal && c.base_skills[polestar.filter.skill]).length;
			}
			else if (polestar.filter.type === 'trait') {
				polestar.crew_count = globalContext.core.crew.filter(c => polestar.filter.trait && c.in_portal && c.traits.some(trait => trait === polestar.filter.trait)).length;
			}
		});

		setAllKeystones([...allKeystones]);
		reloadMarket();
	}, []);

	if (!allKeystones)
		return (<div style={{ marginTop: '1em' }}><Icon loading name='spinner' /> {t('spinners.default')}</div>);

	return <ModePicker market={market} reloadMarket={reloadMarket} allKeystones={allKeystones} dbid={`${playerData?.player.dbid}`} />;

	function reloadMarket() {
		fetch('https://datacore.app/api/celestial-market')
			.then((response) => response.json())
			.then(market => {
				setMarket(market);
			})
			.catch((e) => {
				console.log(e);
				if (!market) setMarket({});
			});
	}
};

const polestarTailorDefaults: IPolestarTailors = {
	disabled: [],
	added: []
};

const crewFilterDefaults: ICrewFilters = {
	retrievable: 'retrievable',
	owned: '',
	hideFullyFused: true,
	rarity: [],
	trait: [],
	minTraitMatches: 1,
	collection: ''
};

type ModePickerMode = 'keystones' | 'mutual' | 'market';

type ModePickerProps = {
	allKeystones: IKeystone[];
	dbid: string;
	market: MarketAggregation;
	reloadMarket: () => void;
}

const ModePicker = (props: ModePickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { t } = globalContext.localized;
	const { allKeystones, market, reloadMarket } = props;
	//const dbid = props.dbid ? props.dbid?.toString() + '/' : '';
	const dbid = props.dbid ? props.dbid?.toString() : '';
	const [mode, setMode] = useStateWithStorage<ModePickerMode>(`${dbid}keystone_modePicker`, 'keystones');
	const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

	React.useEffect(() => {
		if (!playerData && mode === 'mutual') {
			setMode('keystones');
		}
	}, [playerData, mode]);

	return <>
			<Step.Group fluid>
				<Step style={{width: isMobile ? '100%' : '33%'}} key={`keystone_normal`} active={mode === 'keystones'} onClick={() => setMode('keystones')}>
					<Step.Content>
						<Step.Title>{t('retrieval.modes.retrieval')}</Step.Title>
						<Step.Description>{t('retrieval.modes.retrieval_desc')}</Step.Description>
					</Step.Content>
				</Step>
				{!!playerData && <Step style={{width: isMobile ? '100%' : '33%'}}  key={`keystone_mutual`} active={mode === 'mutual'} onClick={() => setMode('mutual')}>
					<Step.Content>
						<Step.Title>{t('retrieval.modes.mutual_polestar_calculator')}</Step.Title>
						<Step.Description>{t('retrieval.modes.mutual_polestar_calculator_desc')}</Step.Description>
					</Step.Content>
				</Step>}
				<Step style={{width: isMobile ? '100%' : '33%'}}  key={`celestial_market`} active={mode === 'market'} onClick={() => setMode('market')}>
					<Step.Content>
						<Step.Title>{t('retrieval.market.title')}
							<Label as='a' corner='right' onClick={() => reloadMarket()}>
								<Icon name='refresh' style={{ cursor: 'pointer' }} />
							</Label>
						</Step.Title>
						<Step.Description>{t('retrieval.market.description')}</Step.Description>
					</Step.Content>
				</Step>
            </Step.Group>

			{!!playerData && <KeystonesPlayer market={market} reloadMarket={reloadMarket} mode={mode} dbid={dbid} allKeystones={allKeystones} />}
			{!playerData && <KeystonesNonPlayer market={market} reloadMarket={reloadMarket} mode={mode} allKeystones={allKeystones} />}

	</>
}

type KeystonesPlayerProps = {
	allKeystones: IKeystone[];
	dbid: string;
	mode: ModePickerMode;
	market: MarketAggregation;
	reloadMarket: () => void;
};

const KeystonesPlayer = (props: KeystonesPlayerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { ITEM_ARCHETYPES, language, TRAIT_NAMES, t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { dbid, mode, market, reloadMarket } = props;
	const [allKeystones, setAllKeystones] = React.useState<IKeystone[]>([]);
	const [rosterCrew, setRosterCrew] = React.useState<IRosterCrew[]>([]);

	const [polestarTailors, setPolestarTailors] = useStateWithStorage<IPolestarTailors>(dbid+'retrieval/tailors', polestarTailorDefaults, { rememberForever: true });
	const [crewFilters, setCrewFilters] = useStateWithStorage<ICrewFilters>(dbid+'retrieval/filters', crewFilterDefaults, { rememberForever: true });

	const [wishlist, setWishlist] = useStateWithStorage<string[]>(dbid+'retrieval/wishlist', [], { rememberForever: true });
	const [autoWish, setAutoWish] = useStateWithStorage<boolean>(dbid+'retrieval/auto_wishlist', false, { rememberForever: true });
	const [autoWishes, setAutoWishes] = React.useState<string[]>([]);

	React.useEffect(() => {
		const allKeystones = JSON.parse(JSON.stringify(props.allKeystones)) as IKeystone[];
		allKeystones.forEach((keystone) => {
			if (ITEM_ARCHETYPES[keystone.symbol]) {
				keystone.name = ITEM_ARCHETYPES[keystone.symbol].name;
				keystone.flavor = ITEM_ARCHETYPES[keystone.symbol].flavor;
				if (keystone.symbol.endsWith("_crate")) return;
				if (keystone.symbol.startsWith("rarity_")) {
					let r = Number(keystone.symbol.replace("rarity_", "").replace("_keystone", ""));
					keystone.short_name = CONFIG.RARITIES[r].name;
				}
				else if (keystone.symbol.endsWith("_skill_keystone")) {
					let skill = keystone.symbol.replace("_keystone", "");
					keystone.short_name = CONFIG.SKILLS[skill];
				}
				else {
					let trait = keystone.symbol.replace("_keystone", "");
					keystone.short_name = TRAIT_NAMES[trait];
				}
			}
		});

		// Count owned constellations
		const constellations = allKeystones.filter(k => k.type !== 'keystone') as IConstellation[];
		constellations.forEach(constellation => {
			if (playerData) {
				const itemsOwned = playerData.forte_root.items.find(item => item.id === constellation.id);
				constellation.owned = itemsOwned ? itemsOwned.quantity : 0;
			}
			else {
				constellation.owned = 0;
			}
		});

		// Count owned polestars and calculate odds
		const polestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
		polestars.forEach(polestar => {
			if (playerData) {
				const itemsOwned = playerData.forte_root.items.find(item => item.id === polestar.id);
				polestar.owned = itemsOwned ? itemsOwned.quantity : 0;
			}
			else {
				polestar.owned = 0;
			}
			const crates = constellations.filter(k => (k.type === 'crew_keystone_crate' || k.type === 'keystone_crate') && k.keystones.includes(polestar.id));
			const owned = crates.filter(k => k.owned > 0);
			polestar.owned_crate_count = owned.reduce((prev, curr) => prev + curr.owned, 0);
			polestar.owned_best_odds = owned.length === 0 ? 0 : 1/owned.reduce((prev, curr) => Math.min(prev, curr.keystones.length), 100);
			polestar.owned_total_odds = owned.length === 0 ? 0 : 1-owned.reduce((prev, curr) => prev*(((curr.keystones.length-1)/curr.keystones.length)**curr.owned), 1);
		});

		setAllKeystones([...allKeystones]);
	}, [props.allKeystones, playerData, language]);

	React.useEffect(() => {
		if (playerData && autoWish) {
			let autocrew = [...new Set(playerData.player.character.crew.filter(f => f.favorite).map(c => c.symbol))].sort();
			setAutoWishes(autocrew);
			return;
		}
		setAutoWishes([]);
	}, [autoWish, playerData]);

	const retrievalContext: IRetrievalContext = {
		allKeystones,
		autoWishes,
		rosterCrew, setRosterCrew,
		polestarTailors, setPolestarTailors,
		getCrewFilter, setCrewFilter,
		resetForm,
		wishlist,
		setWishlist,
		market,
		reloadMarket
	};

	return (
		<RetrievalContext.Provider value={retrievalContext}>
			<Form>
				<Form.Group inline>
					<PolestarFilterModal />
					<PolestarProspectsModal />
				</Form.Group>
			</Form>
			<Checkbox
				style={{margin: '0.5em 0 1em 0'}}
				label={t('retrieval.assume_in_game_favorites')}
				type='checkbox'
				checked={autoWish}
				onChange={(e, { checked }) => setAutoWish(!!checked)}
				/>
			{/* {mode === 'keystones' && <GapTable />} */}
			{mode === 'keystones' && <RetrievalCrew />}
			{mode === 'mutual' && <MutualView dbid={dbid} />}
			{mode === 'market' && <CelestialMarket dbid={dbid} />}
		</RetrievalContext.Provider>
	);

	function getCrewFilter(field: CrewFilterField): any {
		return crewFilters[field] ?? crewFilterDefaults[field];
	}

	function setCrewFilter(field: CrewFilterField, value: any): void {
		setCrewFilters({...crewFilters, [field]: value});
	}

	function resetForm(): void {
		setPolestarTailors({...polestarTailorDefaults});
		setCrewFilters({...crewFilterDefaults});
	}
};

type KeystonesNonPlayerProps = {
	allKeystones: IKeystone[];
	market: MarketAggregation;
	mode: ModePickerMode;
	reloadMarket: () => void;
};

const KeystonesNonPlayer = (props: KeystonesNonPlayerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { market, reloadMarket, mode } = props;
	const { playerData } = globalContext.player;

	const [allKeystones, setAllKeystones] = React.useState<IKeystone[]>([]);
	const [rosterCrew, setRosterCrew] = React.useState<IRosterCrew[]>([]);

	// Polestar tailoring not available in non-player mode
	const [polestarTailors, setPolestarTailors] = React.useState<IPolestarTailors>(polestarTailorDefaults);
	const [crewFilters, setCrewFilters] = React.useState<ICrewFilters>(crewFilterDefaults);
	const [wishlist, setWishlist] = React.useState<string[]>([]);

	React.useEffect(() => {
		const allKeystones = JSON.parse(JSON.stringify(props.allKeystones)) as IKeystone[];

		// Zero out owned constellations
		const constellations = allKeystones.filter(k => k.type !== 'keystone') as IConstellation[];
		constellations.forEach(constellation => constellation.owned = 0);

		// Zero out owned polestars and odds
		const polestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
		polestars.forEach(polestar => {
			polestar.owned = 0;
			polestar.owned_crate_count = 0;
			polestar.owned_best_odds = 0;
			polestar.owned_total_odds = 0;
		});

		setAllKeystones([...allKeystones]);
	}, [props.allKeystones, playerData]);

	const retrievalContext: IRetrievalContext = {
		allKeystones,
		autoWishes: [],
		rosterCrew, setRosterCrew,
		polestarTailors, setPolestarTailors,
		getCrewFilter, setCrewFilter,
		resetForm,
		wishlist, setWishlist,
		market,
		reloadMarket
	};

	return (
		<RetrievalContext.Provider value={retrievalContext}>
			{mode === 'keystones' && <RetrievalCrew />}
			{mode === 'market' && <CelestialMarket />}
		</RetrievalContext.Provider>
	);

	function getCrewFilter(field: CrewFilterField): any {
		return crewFilters[field] ?? crewFilterDefaults[field];
	}

	function setCrewFilter(field: CrewFilterField, value: any): void {
		setCrewFilters({...crewFilters, [field]: value});
	}

	function resetForm(): void {
		setPolestarTailors({...polestarTailorDefaults});
		setCrewFilters({...crewFilterDefaults});
	}
};
