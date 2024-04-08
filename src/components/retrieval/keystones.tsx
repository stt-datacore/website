import React from 'react';
import { Form, Icon } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';

import { IConstellation, IKeystone, IPolestar, IPolestarTailors, IRosterCrew, ICrewFilters, CrewFilterField } from './model';
import { IRetrievalContext, RetrievalContext } from './context';
import { RetrievalCrew } from './crew';
import { PolestarFilterModal } from './polestarfilter';
import { PolestarProspectsModal } from './polestarprospects';

export const RetrievalKeystones = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const [allKeystones, setAllKeystones] = React.useState<IKeystone[] | undefined>(undefined);

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
	}, []);

	if (!allKeystones)
		return (<div style={{ marginTop: '1em' }}><Icon loading name='spinner' /> Loading...</div>);

	if (playerData)
		return <KeystonesPlayer allKeystones={allKeystones} dbid={`${playerData.player.dbid}`} />;

	return <KeystonesNonPlayer allKeystones={allKeystones} />;
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

type KeystonesPlayerProps = {
	allKeystones: IKeystone[];
	dbid: string;
};

const KeystonesPlayer = (props: KeystonesPlayerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const [allKeystones, setAllKeystones] = React.useState<IKeystone[]>([]);
	const [rosterCrew, setRosterCrew] = React.useState<IRosterCrew[]>([]);

	const [polestarTailors, setPolestarTailors] = useStateWithStorage<IPolestarTailors>(props.dbid+'retrieval/tailors', polestarTailorDefaults, { rememberForever: true });
	const [crewFilters, setCrewFilters] = useStateWithStorage<ICrewFilters>(props.dbid+'retrieval/filters', crewFilterDefaults, { rememberForever: true });
	const [wishlist, setWishlist] = useStateWithStorage<string[]>(props.dbid+'retrieval/wishlist', [], { rememberForever: true });

	React.useEffect(() => {
		const allKeystones = JSON.parse(JSON.stringify(props.allKeystones)) as IKeystone[];

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
	}, [props.allKeystones, playerData]);

	const retrievalContext: IRetrievalContext = {
		allKeystones,
		rosterCrew, setRosterCrew,
		polestarTailors, setPolestarTailors,
		getCrewFilter, setCrewFilter,
		resetForm,
		wishlist, setWishlist
	};

	return (
		<RetrievalContext.Provider value={retrievalContext}>
			<Form>
				<Form.Group inline>
					<PolestarFilterModal />
					<PolestarProspectsModal />
				</Form.Group>
			</Form>
			<RetrievalCrew />
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
};

const KeystonesNonPlayer = (props: KeystonesNonPlayerProps) => {
	const globalContext = React.useContext(GlobalContext);
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
		rosterCrew, setRosterCrew,
		polestarTailors, setPolestarTailors,
		getCrewFilter, setCrewFilter,
		resetForm,
		wishlist, setWishlist
	};

	return (
		<RetrievalContext.Provider value={retrievalContext}>
			<RetrievalCrew />
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
