import React from 'react';
import { Step, Icon, Label, Message, Button } from 'semantic-ui-react';

import { PlayerCrew, CompactCrew, CompletionState, PlayerBuffMode } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';
import { oneCrewCopy, applyCrewBuffs, getSkills } from '../../utils/crewutils';

import { IRosterCrew, RosterType } from './model';
import { CrewMember } from '../../model/crew';
import { loadOfferCrew } from '../../utils/offers';
import { appelate } from '../../utils/misc';
import { Offer, OfferCrew } from '../../model/offers';
import { useStateWithStorage } from '../../utils/storage';

type RosterPickerProps = {
	rosterType: RosterType;
	setRosterType: (rosterType: RosterType) => void;
	setRosterCrew: (rosterCrew: IRosterCrew[]) => void;
	buffMode?: PlayerBuffMode;
};

export const RosterPicker = (props: RosterPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { maxBuffs } = globalContext;
	const { playerData, buffConfig: playerBuffs, ephemeral, showBuybackAlerts, restoreHiddenAlerts } = globalContext.player;
	const { rosterType, setRosterType, setRosterCrew, buffMode } = props;
	const [allCrew, setAllCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [buyBackCrew, setBuyBackCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [myCrew, setMyCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [offerCrew, setOfferCrew] = React.useState<IRosterCrew[] | undefined>(undefined);

	const [newDismissed, setNewDismissed] = useStateWithStorage('bbnew_dismissed', [] as string[]);
	const [fuseDismissed, setFuseDismissed] = useStateWithStorage('bbfuse_dismissed', [] as string[]);

	React.useEffect(() => {
		if (restoreHiddenAlerts) {
			setNewDismissed([]);
			setFuseDismissed([]);
		}
	}, [restoreHiddenAlerts])

	React.useEffect(() => {
		let currRoster = rosterType;
		if (!playerData) {
			currRoster = 'allCrew';
		}
		else {
			currRoster = 'myCrew';
		}
		if (!playerData) setBuyBackCrew(undefined);
		initializeRoster(currRoster, true);
		setRosterType(currRoster);
	}, [playerData]);

	React.useEffect(() => {
		if (!buyBackCrew?.length && rosterType === 'buyBack') {
			if (playerData) {
				setRosterType('myCrew');
			}
			else {
				setRosterType('allCrew');
			}
		}
	}, [buyBackCrew]);

	React.useEffect(() => {
		initializeRoster(rosterType);
	}, [rosterType]);

	React.useEffect(() => {
		initializeRoster(rosterType, true);
	}, [buffMode]);

	const hasBuyBack = !!playerData?.buyback_well?.length;
	const steps = [] as JSX.Element[];
	const buyFuses = getFusesInBuybackWell();
	const buyUnowned = getUnownedInBuybackWell();

	const allCrewJSX = (
		<Step active={rosterType === 'allCrew'} onClick={() => setRosterType('allCrew')}>
			<Icon name='game' />
			<Step.Content>
				<Step.Title>{t('pages.crew_view_modes.game_roster.name')}</Step.Title>
				<Step.Description>{t('pages.crew_view_modes.game_roster.description')}</Step.Description>
			</Step.Content>
		</Step>)

	const offersJSX = (
		<Step active={rosterType === 'offers'} onClick={() => setRosterType('offers')}>
			<img src={`${process.env.GATSBY_ASSETS_URL}atlas/pp_currency_icon.png`} style={{ width: '2em', marginRight: '1em' }} />
			<Step.Content>
				<Step.Title>{t('pages.crew_view_modes.current_offers.name')}
				{rosterType === 'offers' &&
				<Label title={'Refresh offers'} as='a' corner='right' onClick={() => initializeRoster(rosterType, true)}>
					<Icon name='refresh' style={{ cursor: 'pointer' }} />
				</Label>}
				</Step.Title>
				<Step.Description>{t('pages.crew_view_modes.current_offers.description')}</Step.Description>
			</Step.Content>
		</Step>)

	if (!!playerData) {
		steps.push(
			<Step active={rosterType === 'myCrew'} onClick={() => setRosterType('myCrew')}>
				<img src='/media/crew_icon.png' style={{ width: '3em', marginRight: '1em' }} />
				<Step.Content>
					<Step.Title>{t('pages.crew_view_modes.owned_crew.name')}</Step.Title>
					<Step.Description>{t('pages.crew_view_modes.owned_crew.description')}</Step.Description>
				</Step.Content>
			</Step>)

		if (hasBuyBack) {
			steps.push(
				<Step active={rosterType === 'buyBack'} onClick={() => setRosterType('buyBack')}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/honor_currency.png`} style={{ width: '3em', marginRight: '1em' }} />
					<Step.Content>
						<Step.Title>{t('pages.crew_view_modes.buyback_well.name')}</Step.Title>
						<Step.Description>{t('pages.crew_view_modes.buyback_well.description')}</Step.Description>
					</Step.Content>
				</Step>)
		}
		steps.push(offersJSX);
		steps.push(allCrewJSX);
	}
	else {
		steps.push(allCrewJSX);
		steps.push(offersJSX);
	}

	return (
		<>
		{showBuybackAlerts && !!buyFuses?.length && buyFuses.map((crew, idx) => {
			if (fuseDismissed.includes(crew.symbol)) return <></>
			return <Message key={`buyback_${crew.symbol}+${idx}`} color='blue'>
				{t('alerts.fusible_crew', {
					subject: `${crew.name}`,
					rarity: `${crew.rarity}`,
					max_rarity: `${crew.max_rarity}`
					})} {t('alerts.check_buyback')}
				  <Label as='a' style={{background: 'transparent', float: 'right', margin: 0, padding: 0}} corner='right' onClick={() => dismissFuse(crew)}>
					<Icon name='delete' style={{ cursor: 'pointer' }} />
				</Label>
			</Message>
		})}
		{showBuybackAlerts && !!buyUnowned?.length && buyUnowned.map((crew, idx) => {
			if (newDismissed.includes(crew.symbol)) return <></>
			return <Message key={`buyback_${crew.symbol}+${idx}`} color='blue'>
				{t('alerts.new_crew', {
					subject: `${crew.name}`,
					rarity: `${crew.rarity}`,
					max_rarity: `${crew.max_rarity}`
					})} {t('alerts.check_buyback')}
				  <Label as='a' style={{background: 'transparent', float: 'right', margin: 0, padding: 0}}  onClick={() => dismissNew(crew)}>
					<Icon name='delete' style={{ cursor: 'pointer' }} />
				</Label>
			</Message>
		})}
		<Step.Group fluid widths={hasBuyBack ? 4 : 3}>
			{steps.map((step, idx) => <React.Fragment key={`index_page_step_${idx}`}>{step}</React.Fragment>)}
		</Step.Group>
		</>
	);

	function getFusesInBuybackWell() {
		if (!playerData?.buyback_well?.length) return [];
		return playerData.player.character.crew.filter(f => f.rarity < f.max_rarity && playerData.buyback_well.some(bc => bc.symbol === f.symbol));
	}

	function getUnownedInBuybackWell() {
		if (!playerData?.buyback_well?.length) return [];
		let uu = playerData.buyback_well.filter(f => playerData.player.character.unOwnedCrew?.some(u => u.symbol === f.symbol)).sort((a, b) => a.symbol.localeCompare(b.symbol));
		let lastu = undefined as PlayerCrew | undefined;
		let us = [] as PlayerCrew[];
		for (let u of uu) {
			u.rarity = 1;
			if (lastu && u.symbol === lastu.symbol) lastu.rarity++;
			else {
				us.push(u);
				lastu = u;
			}
		}
		return us.filter(f => f.rarity > 1);
	}

	function dismissNew(crew: PlayerCrew) {
		if (!newDismissed.includes(crew.symbol)) {
			newDismissed.push(crew.symbol);
			setNewDismissed([...newDismissed]);
		}
	}

	function dismissFuse(crew: PlayerCrew) {
		if (!fuseDismissed.includes(crew.symbol)) {
			fuseDismissed.push(crew.symbol);
			setFuseDismissed([...fuseDismissed]);
		}
	}

	async function initializeRoster(rosterType: RosterType, forceReload: boolean = false): Promise<void> {
		let rosterCrew = [] as IRosterCrew[];

		if (rosterType === 'myCrew' && playerData) {
			if (myCrew && !forceReload) {
				setRosterCrew([...myCrew]);
				return;
			}
			rosterCrew = rosterizeMyCrew(playerData.player.character.crew, ephemeral?.activeCrew ?? []);
			if (globalContext.player.newCrew?.length) {
				globalContext.player.newCrew.forEach((crew) => {
					let rcrew = rosterCrew.filter(f => f.archetype_id === crew.archetype_id && f.rarity === crew.rarity);
					rcrew?.forEach((c) => c.is_new = true)
				});
			}
			setMyCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
		else if (rosterType === 'offers') {
			if (offerCrew && !forceReload) {
				setRosterCrew([ ...offerCrew]);
				return;
			}

			const offerData = await loadOfferCrew(globalContext.core.crew) ?? [];
			const offers = {} as { [key: string]: OfferCrew[] }
			offerData.forEach((offer) => {
				offer.crew.forEach((crew) => {
					offers[crew.symbol] ??= [];
					offers[crew.symbol].push(offer);
				});
			})
			const crewMap = [ ... new Set((offerData)?.map(c => c.crew).flat()) ];

			rosterCrew = rosterizeAllCrew(crewMap, offers);
			setOfferCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
		else if (rosterType === 'buyBack' && playerData) {
			if (buyBackCrew && !forceReload) {
				setRosterCrew([...buyBackCrew]);
				return;
			}
			const crewMap = playerData.buyback_well?.map(b => {
				let crew = globalContext.core.crew.find(f => f.symbol === b.symbol) as IRosterCrew;
				if (!b.rarity) crew.rarity = 1;
				else {
					crew.rarity = b.rarity;
				}
				return crew;
			});

			rosterCrew = rosterizeAllCrew(crewMap);
			setBuyBackCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
		else if (rosterType === 'allCrew') {
			if (allCrew && !forceReload) {
				setRosterCrew([...allCrew]);
				return;
			}
			rosterCrew = rosterizeAllCrew();
			setAllCrew([...rosterCrew]);
			setRosterCrew([...rosterCrew]);
		}
	}

	function rosterizeMyCrew(myCrew: PlayerCrew[], activeCrew: CompactCrew[]): IRosterCrew[] {
		const rosterCrew = [] as IRosterCrew[];

		// Create fake ids for active crew based on rarity, level, and equipped status
		const activeCrewIds = activeCrew.map(ac => {
			return {
				id: ac.id,
				active_status: ac.active_status
			};
		});

		let crewmanId = 1;
		myCrew.forEach(crew => {
			if (crew.is_new) {
				console.log('new crew', crew);
			}

			const crewman = {
				... oneCrewCopy(crew),
				//id: crewmanId++,
				have: true
			} as IRosterCrew;

			// Re-attach active_status property
			crewman.active_status = 0;
			if (crew.immortal <= 0) {
				const activeCrewId = crew.id;
				const active = activeCrewIds.find(ac => ac.id === activeCrewId);
				if (active) {
					crewman.active_status = active.active_status ?? 0;
					active.id = 0;	// Clear this id so that dupes are counted properly
				}
			}

			rosterCrew.push(crewman);
		});

		return rosterCrew;
	}

	function rosterizeAllCrew(alternativeCrew?: CrewMember[], offerData?: { [key: string]: OfferCrew[] }): IRosterCrew[] {
		const rosterCrew = [] as IRosterCrew[];

		let crewmanId = 1;
		(alternativeCrew ?? globalContext.core.crew).forEach(crew => {
			const crewman = {
				... oneCrewCopy(crew),
				id: crewmanId++,
				immortal: CompletionState.DisplayAsImmortalStatic,
				level: playerData?.player.character.max_level ?? 100, // crew.max_level,   /* this property does not exist on core.crew!!! */,
				rarity: ("rarity" in crew) ? crew.rarity : crew.max_rarity,
				have: false,
				command_skill: { core: 0, min: 0, max: 0 },
				medicine_skill: { core: 0, min: 0, max: 0 },
				security_skill: { core: 0, min: 0, max: 0 },
				diplomacy_skill: { core: 0, min: 0, max: 0 },
				engineering_skill: { core: 0, min: 0, max: 0 },
				science_skill: { core: 0, min: 0, max: 0 },
			} as IRosterCrew;

			if (offerData && offerData[crewman.symbol]) {
				crewman.offer = offerData[crewman.symbol].map(s => appelate(s.name)).sort().join(" / ");

				crewman.cost_text = offerData[crewman.symbol].map(offer => offer.drop_info.map(drop => drop.cost).sort((a, b) => b - a)[0].toString()).join(" / ");
				crewman.offers = offerData[crewman.symbol];

			}
			if (playerData) {
				const owned = playerData.player.character.crew.filter(crew => crew.symbol === crewman.symbol);
				crewman.have = owned.length > 0;
				crewman.highest_owned_rarity = owned.length > 0 ? owned.reduce((prev, curr) => Math.max(curr.rarity, prev), 0) : 0;
				crewman.any_immortal = owned.length > 0 ? owned.some(crew => crew.immortal > 0 || crew.immortal === CompletionState.Immortalized) : false;
			}

			for (let skill of getSkills(crew)) {
				if (!(skill in crewman) || !crewman[skill].core) crewman[skill] = {
					core: crew.base_skills[skill].core,
					max: crew.base_skills[skill].range_max,
					min: crew.base_skills[skill].range_min,
				}
				crewman.skills ??= {};
				if (!(skill in crewman.skills)) crewman.skills[skill] = { ... crew.base_skills[skill] };
			}

			if (buffMode === 'player' && playerData && playerBuffs) {
				applyCrewBuffs(crewman, playerBuffs);
			}
			else if (buffMode === 'max' && maxBuffs) {
				applyCrewBuffs(crewman, maxBuffs);
			}

			rosterCrew.push(crewman);
		});

		return rosterCrew;
	}
};
