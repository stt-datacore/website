import React from 'react';
import { Button, Checkbox, Dropdown, Icon, Label, Message, Modal, Popup } from 'semantic-ui-react';

import { NumericOptions } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';

import { IPolestar, IRosterCrew, ActionableState } from './model';
import { getComboCost, RetrievalContext, sortCombosByCost } from './context';
import { CombosPlanner } from './combosplanner';
import { CombosGrid } from './combosgrid';
import { filterTraits } from './utils';
import { factorial, getPermutations } from '../../utils/misc';
import { useStateWithStorage } from '../../utils/storage';

interface IFuseGroups {
	[key: string]: number[][];
};

type CombosModalProps = {
	crew: IRosterCrew;
};

export const CombosModal = (props: CombosModalProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { allKeystones, polestarTailors, wishlist, setWishlist, autoWishes, market } = React.useContext(RetrievalContext);
	const { crew } = props;
	const dbid = playerData ? `${playerData.player.dbid}/` : '';
	const addedPolestars = polestarTailors.added;
	const disabledPolestars = polestarTailors.disabled;

 	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	// Unique combos consider all polestars
	const [uniqueCombos, setUniqueCombos] = React.useState<IPolestar[][] | undefined>(undefined);

	// Tailored combos only consider polestars after user filtering (i.e. owned polestars - disabled + added)
	const [tailoredCombos, setTailoredCombos] = React.useState<IPolestar[][] | undefined>(undefined);
	const [tailoredFuseGroups, setTailoredFuseGroups] = React.useState<IFuseGroups | undefined>(undefined);

	const [fuseIndex, setFuseIndex] = React.useState<number>(1);
	const [groupIndex, setGroupIndex] = React.useState<number>(0);

	const [actionableOnlyMode, setActionableOnlyMode] = React.useState<boolean>(true);
	const [alwaysShowPrice, setAlwaysShowPrice] = useStateWithStorage(`retrieval/always_show_polestars`, false, { rememberForever: true })

	// Calc algo is always set to short now, but deep algo code should still work, if the option is ever needed
	const [algo, setAlgo] = React.useState<string>('');

	React.useEffect(() => {
		if (modalIsOpen) preCalculateCombos();
	}, [modalIsOpen]);

	React.useEffect(() => {
		setGroupIndex(0);
	}, [fuseIndex]);

	const showModeToggler = fuseIndex === 1 && (crew.actionable === ActionableState.Now || crew.actionable === ActionableState.PostTailor);

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			size='small'
		>
			<Modal.Header>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>{crew.name}</div>
					<div>{renderWishlist()}</div>
				</div>
				{renderSubhead()}
			</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div style={{display: 'flex', flexDirection:'column', alignItems: 'flex-start', gap: '0.5em', justifyContent: 'flex-start'}}>
						{showModeToggler && (
							<Checkbox
								label={t('retrieval.hide_combos_with_unowned_polestars')}
								checked={actionableOnlyMode}
								onChange={(e, { checked }) => setActionableOnlyMode(checked as boolean)}
							/>
						)}
						<Checkbox
							label={t('retrieval.price.all')}
							checked={alwaysShowPrice}
							onChange={(e, { checked }) => setAlwaysShowPrice(checked as boolean)}
						/>
					</div>
					<Button onClick={() => setModalIsOpen(false)}>
						{t('global.close')}
					</Button>
				</div>
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		if (playerData) {
			if (crew.actionable === ActionableState.PostTailor)
				return <Button compact color='blue'>{t('global.view_options')}</Button>;
			else if (crew.actionable === ActionableState.PreTailor)
				return <Button compact color='orange'>{t('retrieval.polestars_needed')}</Button>;
			else if (crew.actionable === ActionableState.Viable)
				return <Button compact color='yellow'>{t('retrieval.polestars_needed')}</Button>;
		}
		return <Button compact>{t('global.view_options')}</Button>;
	}

	function renderSubhead(): JSX.Element {
		if (!uniqueCombos || uniqueCombos.length === 0) return <></>;

		if (playerData) {
			if (!actionableOnlyMode || (crew.actionable !== ActionableState.Now && crew.actionable !== ActionableState.PostTailor)) {
				return (
					<div style={{ fontSize: '1rem', fontWeight: 'normal' }}>
						{t('retrieval.showing_all_potential')}
					</div>
				);
			}

			if (tailoredCombos && tailoredFuseGroups) {
				const fuseOptions: NumericOptions[] = [];
				[1, 2, 3, 4, 5].forEach(fuse => {
					const fuseId = 'x' + fuse;
					if (tailoredFuseGroups[fuseId] && tailoredFuseGroups[fuseId].length > 0) {
						fuseOptions.push({ key: fuse, value: fuse, text: fuseId });
					}
				});

				const groups = tailoredFuseGroups['x'+fuseIndex];
				let groupOptions: NumericOptions[] = [];
				if (fuseIndex > 1) {
					groupOptions = groups.map((group, groupId) => {
						return { key: groupId, value: groupId, text: t('retrieval.option_n', { n: `${(groupId+1)}` }) };
					});
					// Only show first 200 options
					if (groupOptions.length > 200)
						groupOptions = groupOptions.slice(0, 200);
				}

				return (
					<div style={{ fontSize: '1rem', fontWeight: 'normal' }}>
						{fuseIndex > 1 && <>{t('retrieval.use_all_combos_below_to_retrieve')}</>}
						{fuseIndex <= 1 && <>{t('retrieval.use_any_combo_below_to_retrieve')}</>}
						{fuseOptions.length > 1 && (
							<Dropdown
								style={{ marginLeft: '1em' }}
								options={fuseOptions}
								value={fuseIndex}
								onChange={(e, { value }) => setFuseIndex(value as number)}
							/>
						)}
						{groupOptions.length > 1 && (
							<React.Fragment>
								<Dropdown scrolling
									style={{ marginLeft: '1em' }}
									options={groupOptions}
									value={groupIndex}
									onChange={(e, { value }) => setGroupIndex(value as number)}
								/>
								<Button icon='forward' compact style={{ marginLeft: '1em' }} onClick={cycleGroup} />
							</React.Fragment>
						)}
					</div>
				);
			}
		}

		return (
			<div style={{ fontSize: '1rem', fontWeight: 'normal' }}>
				{t('retrieval.use_any_combo_below_to_retrieve')}
			</div>
		);
	}

	function renderWishlist(): JSX.Element {
		if (!playerData) return <></>;
		const onWishlist = wishlist.includes(crew.symbol);
		const autoWish = autoWishes.includes(crew.symbol) && !wishlist.includes(crew.symbol);

		let content = '';

		if (autoWish && !onWishlist) {
			content = `${t('retrieval.wishlist.add')} (${t('retrieval.wishlist.auto')})`;
		}
		else if (onWishlist) {
			content = `${t('retrieval.wishlist.remove')}`;
		}
		else {
			content = `${t('retrieval.wishlist.add')}`;
		}

		return (
			<Popup
				content={content}
				trigger={(
					<Icon
						name={onWishlist || autoWish ? 'heart' : 'heart outline'}
						color={onWishlist && !autoWish ? 'pink' : undefined}
						onClick={toggleWishlist}
						style={{ cursor: 'pointer' }}
					/>
				)}
				mouseEnterDelay={500}
			/>
		);

		function toggleWishlist(): void {
			if (onWishlist) {
				setWishlist([...wishlist.filter(c => c !== crew.symbol)]);
				return;
			}
			setWishlist([...wishlist, crew.symbol]);
		}
	}

	function renderContent(): JSX.Element {
		if (!modalIsOpen) return <></>;
		if (!uniqueCombos) return <></>;

		if (playerData) {
			if (!actionableOnlyMode || crew.actionable === ActionableState.Viable) {
				return (
					<React.Fragment>
						<Message>
							<CombosPlanner uniqueCombos={uniqueCombos} />
						</Message>
						<CombosGrid alwaysShowPrice={alwaysShowPrice} combos={uniqueCombos} fuseIndex={fuseIndex} />
					</React.Fragment>
				);
			}

			let combos = uniqueCombos;
			if (tailoredCombos && tailoredFuseGroups) {
				combos = tailoredCombos;
				if (fuseIndex > 1) {
					const group = tailoredFuseGroups[`x${fuseIndex}`][groupIndex];
					combos = group.map(comboId => tailoredCombos[comboId]);
				}
			}

			let preface: JSX.Element | undefined;
			if (crew.actionable === ActionableState.PreTailor)
				preface = <>You can retrieve this crew with your current polestar inventory, but you will need to use 1 or more <Label color='orange'>filtered polestars</Label></>;
			else if (crew.actionable === ActionableState.PostTailor)
				preface = <>You cannot retrieve this crew with your current polestar inventory, but you will be able to after you acquire 1 or more <Label color='blue'>prospective polestars</Label></>;

			return (
				<React.Fragment>
					{preface && (
						<Message>
							{preface}
							{crew.actionable === ActionableState.PreTailor && (
								<div style={{ marginTop: '1em' }}>
									<CombosPlanner uniqueCombos={combos} />
								</div>
							)}
						</Message>
					)}
					<CombosGrid alwaysShowPrice={alwaysShowPrice} combos={combos} fuseIndex={fuseIndex} />
				</React.Fragment>
			);
		}

		return <CombosGrid alwaysShowPrice={alwaysShowPrice} combos={uniqueCombos} fuseIndex={1} />;
	}

	function preCalculateCombos(): void {
		if (crew.unique_polestar_combos) {
			const allPolestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
			const uniques: IPolestar[][] = [];
			crew.unique_polestar_combos.forEach(upc => {
				const combo: IPolestar[] = [];
				upc.forEach(trait => {
					const polestar = allPolestars.find(polestar => filterTraits(polestar, trait));
					if (polestar) combo.push(polestar);
				});
				if (combo.length === upc.length) uniques.push(combo);
			});
			setUniqueCombos([...uniques]);
		}
		else {
			setUniqueCombos([]);
		}

		if (playerData) {
			// tailored polestars (i.e. owned polestars - disabled + added) determines if combo is tailored
			const allPolestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
			const tailoredPolestars = allPolestars.filter(polestar =>
				(polestar.owned > 0 && !disabledPolestars.includes(polestar.id)) || addedPolestars.includes(polestar.symbol)
			);

			const [tailoredCount, tailoredCombos] = getCombos(crew, tailoredPolestars);
			tailoredCombos.sort((a, b) => {
				return a.map(aa => aa.symbol).join().localeCompare(b.map(aa => aa.symbol).join())
			})
			if (tailoredCombos && tailoredCombos.length > 0) {
				let fuseGroups: IFuseGroups;
				if (algo === 'deep')
					fuseGroups = groupByFusesDeep(tailoredCombos, 0, []);
				else
					fuseGroups = groupByFusesShort(tailoredCombos, 0, []);

				setTailoredCombos([...tailoredCombos]);
				setTailoredFuseGroups({...fuseGroups});

				if (!fuseGroups[`${fuseIndex}`]) setFuseIndex(1);
			}
		}
	}

	function getCombos(crew: IRosterCrew, polestars: IPolestar[], knownGroups?: number): [number, IPolestar[][]] {
		const combos: IPolestar[][] = [];
		crew.unique_polestar_combos?.forEach(upc => {
			if (upc.every(trait => polestars.some(polestar => filterTraits(polestar, trait)))) {
				const combo: IPolestar[] = [];
				upc.forEach(trait => {
					const polestar = polestars.find(polestar => filterTraits(polestar, trait));
					if (polestar) combo.push(polestar);
				});
				if (combo.length === upc.length) combos.push(combo);
			}
		});

		/*
			(n+r-1)!
			(n-1)! r!
		*/
		let dn = combos.length;

		let n = combos.length;
		let r = knownGroups ?? 5;

		let result: number;

		result = factorial(n) / (factorial(n - r) * factorial(r));
		if (result < n) result = n * 5;
		return [result, combos];
	}

	interface ComboTrack {
		id: number,
		quantity: number,
		used: number
	};

	function dingCT(lh: ComboTrack[], rh: ComboTrack[]) {
		for (let lv of lh) {
			for (let rv of rh) {
				if (lv.id === rv.id) {
					if (lv.used + 1 > lv.quantity) return false;
					lv.used++;
					break;
				}
			}
		}

		for (let rv of rh) {
			if (!lh.some(v => v.id === rv.id)) {
				lh.push(rv);
			}
		}

		return true;
	}

	// WORK IN PROGRESS, DO NOT DELETE COMMENTED CODE!
	function groupByFusesShort(combos: IPolestar[][], unused: number, unused2: number[]) {
		const result: IFuseGroups = {};
		// let groupTotals: { groupId: number, total: number }[] = [];
		// let x = 0;

		const groupKey = (group: IPolestar[][]) => {
			return group.map(ps => ps.map(pd => pd.name).sort().join(",")).sort().join(";");
		}

		const inventory = (check: IPolestar[]) => {
			return check.map(c => c.owned).reduce((p, n) => p + n, 0);
		}

		const groupInventory = (check: IPolestar[][]) => {
			return check.flat().map(c => c.owned).reduce((p, n) => p + n, 0);
		}

		const getMaxBuilds = (combo: IPolestar[]) => {
			const counts = {} as any;
			let fail = false;
			let builds = 0;
			while (true) {
				for (let i of combo) {
					counts[i.symbol] ??= 0;
					counts[i.symbol]++;
					if (counts[i.symbol] > i.owned) {
						fail = true;
						break;
					}
				}
				if (fail) break;
				else builds++;
			}
			const result = [] as IPolestar[][];
			for (let i = 0; i < builds; i++) {
				result.push(combo);
			}
			return result;
		}

		// for (let combo of combos) {
		// 	let map = combo.map(cb => quantify(cb));
		// 	map.sort((a, b) => a - b);
		// 	let total = map[0];
		// 	groupTotals.push({ groupId: x++, total: total });
		// }

		const groupcalc = {} as { [key:string]: IPolestar[][][] };

		for (const group of [1, 2, 3, 4, 5]) {
			const seen = {} as { [key:string]: boolean };

			const combocopy = [...combos];
			combocopy.sort((a, b) => a.length - b.length);

			getPermutations(combocopy, group, 2000n, true, undefined, (iter) => {
				let study = iter.map(c => getMaxBuilds(c));
				let repeaters = study.flat();
				let trials = [iter] as IPolestar[][][];
				let parts = [] as IPolestar[][];
				let norepeaters = iter.filter(f => !repeaters.some(r => r === f));

				for (let s of study) {
					if (s.length > group) {
						parts = parts.concat(s.splice(group));
					}
				}

				parts.sort((a, b) => inventory(b) - inventory(a));

				for (let s of study) {
					if (s.length < group) {
						let p = 0;
						let c = parts.length
						while (s.length < group && p < c) {
							s.push(parts[p++]);
						}
					}
				}

				trials = trials.concat(study.filter(s => s.length === group));
				repeaters = repeaters.concat(norepeaters);
				repeaters.sort((a, b) => inventory(b) - inventory(a) || a.length - b.length);

				while (repeaters.length) {
					trials.push(repeaters.splice(0, group));
				}

				trials = trials.filter(g => g.length === group);
				trials.forEach(trial => trial.sort((a, b) => a.length - b.length || inventory(b) - inventory(a)));
				trials.sort((a, b) => a.length - b.length || groupInventory(b) - groupInventory(a));

				for (let combo of trials) {
					const counts = {} as any;
					let fail = false;
					combo.forEach((cidx) => {
						let combo = cidx;
						for (let i of combo) {
							counts[i.symbol] ??= 0;
							counts[i.symbol]++;
							if (counts[i.symbol] > i.owned) {
								fail = true;
							}
						}
					});
					if (!fail) {
						let key = groupKey(combo);
						if (seen[key]) continue;
						seen[key] = true;
						groupcalc[group] ??= [];
						groupcalc[group].push(combo);
					}
				}
				return iter;
			});
		}

		Object.keys(groupcalc).forEach(group => {
			groupcalc[group].forEach((group) => {
				group.sort((a, b) => a.length - b.length);
			});
			groupcalc[group].sort((a, b) => {
				return a.map(l => l.length).reduce((p, n) => p + n) - b.map(l => l.length).reduce((p, n) => p + n);
			});
			const idx_map = groupcalc[group].map(pscombos => pscombos.map(test => combos.findIndex(cbin => cbin == test)));
			result[`x${group}`] = idx_map;
		});

		return result;

		// let duplications: number[] = [];
		// let seen: boolean[] = [];

		// for (let total of groupTotals) {
		// 	for (let i = 0; i < total.total; i++) {
		// 		duplications.push(total.groupId);
		// 	}
		// }

		// let comboout: number[][][] = [[], [], [], [], [], []];

		// let fn = combos.length < 5 ? combos.length : 5;
		// for (let f = 1; f <= fn; f++) {
		// 	seen = duplications.map(d => false);
		// 	let option = 0;

		// 	for (let n = 0; n < duplications.length; n++) {
		// 		comboout[f].push([duplications[n]]);
		// 		// let ps = combos[duplications[n]].map(z => { return { id: z?.id, quantity: quantify(z), used: 1 } as ComboTrack });

		// 		let cc = 1;
		// 		seen[n] = true;

		// 		for (let y = 0; y < duplications.length; y++) {
		// 			if (seen[y]) continue;
		// 			// let xs = combos[duplications[y]].map(z => { return { id: z?.id, quantity: quantify(z), used: 1 } as ComboTrack });
		// 			//if (!dingCT(ps, xs)) break;

		// 			comboout[f][option].push(duplications[y]);
		// 			seen[y] = true;

		// 			cc++;
		// 			if (cc >= f) break;
		// 		}

		// 		option++;
		// 	}
		// }

		// for (let f = 1; f <= 5; f++) {
		// 	let key = "x" + f;
		// 	result[key] = [] as number[][];

		// 	for (let res of comboout[f]) {
		// 		if (res.length === f) {
		// 			result[key].push(res);
		// 		}
		// 	}

		// 	for (let res of result[key]) {
		// 		res.sort((a, b) => a - b);
		// 	}
		// }

		// for (let f = 1; f <= 5; f++) {
		// 	let key = "x" + f;
		// 	let strres = result[key].map(m => JSON.stringify(m));
		// 	strres = strres.filter((s, i) => strres.indexOf(s) === i);

		// 	let numres = strres.map(s => JSON.parse(s) as number[]);
		// 	numres.sort((a, b) => {
		// 		let r = countCombos(a, combos) - countCombos(b, combos);
		// 		if (r === 0) {
		// 			for (let i = 0; i < a.length; i++) {
		// 				r = a[i] - b[i];
		// 				if (r) return r;
		// 			}
		// 		}
		// 		return r;
		// 	})
		// 	result[key] = numres;
		// }
		// Object.keys(result).forEach((key) => {
		// 	if (key === 'x1') return;
		// 	result[key] = result[key].filter((group => {
		// 		let counts = {} as any;
		// 		let no = false;
		// 		group.forEach((cidx) => {
		// 			let combo = combos[cidx];
		// 			for (let i of combo) {
		// 				counts[i.symbol] ??= 0;
		// 				counts[i.symbol]++;
		// 				if (counts[i.symbol] > i.owned) {
		// 					no = true;
		// 				}
		// 			}
		// 		});
		// 		return !no;
		// 	}));
		// });
		// return result;
	}

	function countCombos(keys: number[], combos: IPolestar[][]) {
		let res = 0;
		for (let key of keys) {
			res += combos[key].length;
		}
		return res;
	}

	function groupByFusesDeep(combos: IPolestar[][], start: number, group: number[]): IFuseGroups {
		const fuseGroups: IFuseGroups = {};
		const consumed = {};
		group.forEach((comboId) => {
			combos[comboId].forEach((polestar) => {
				if (polestar === undefined) return;
				if (consumed[polestar.symbol])
					consumed[polestar.symbol]++;
				else
					consumed[polestar.symbol] = 1;
			});
		});
		combos.forEach((combo, comboId) => {
			if (comboId >= start) {
				let consumable = 0;
				combo.forEach((polestar) => {
					if (polestar === undefined) return;
					if (consumed[polestar.symbol] === undefined || quantify(polestar)-consumed[polestar.symbol] >= 1)
						consumable++;
				});
				if (consumable == combo.length) {
					const parentGroup = [...group, comboId];
					const parentId = 'x'+parentGroup.length;
					if (fuseGroups[parentId])
						fuseGroups[parentId].push(parentGroup);
					else
						fuseGroups[parentId] = [parentGroup];
					// Only collect combo groups up to 5 fuses
					if (parentGroup.length < 5) {
						let childGroups = groupByFusesDeep(combos, comboId, parentGroup);
						for (let childId in childGroups) {
							if (fuseGroups[childId])
								fuseGroups[childId] = fuseGroups[childId].concat(childGroups[childId]);
							else
								fuseGroups[childId] = childGroups[childId];
						}
					}
				}
			}
		});
		return fuseGroups;
	}

	function quantify(polestar: IPolestar): number {
		const loaned = addedPolestars.filter(added => added === polestar.symbol);
		return polestar.owned + loaned.length;
	}

	function cycleGroup(): void {
		if (!tailoredFuseGroups) return;
		if (groupIndex + 1 >= tailoredFuseGroups[`x${fuseIndex}`].length)
			setGroupIndex(0);
		else
			setGroupIndex(groupIndex+1);
	}
};
