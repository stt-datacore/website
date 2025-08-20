import React from 'react';
import {
	Button,
	Checkbox,
	Form,
	Icon,
	Image,
	Label,
	Message,
	Popup,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { IDataGridSetup, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import CONFIG from '../CONFIG';

import { EvaluationState, ICrewPickerFilters, IDeduction, IEvaluatedGuess, IRosterCrew, ISolverPrefs, ITraitOption, TAssertion, TEvaluationField, TTraitType } from './model';
import { SERIES_ERAS } from './config';
import { GuesserContext, IGuesserContext, WorfleContext } from './context';
import { GameRules, getEraBySeries, getTraitName } from './game';
import { DeductionPickerModal } from './deductionpicker';

const defaultCrewPickerFilters: ICrewPickerFilters = {
	deductions: [],
	hide_nonviable: true,
	hide_guessed: true
};

const defaultSolverPrefs: ISolverPrefs = {
	variants: false,
	gender: false,
	series: false,
	rarity: false,
	skills: false,
	traits: false
};

type GuessPickerProps = {
	rules: GameRules;
	evaluatedGuesses: IEvaluatedGuess[];
	setSelectedCrew: (crewSymbol: string) => void;
};

export const GuessPicker = (props: GuessPickerProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { variantMap, traitMap } = React.useContext(WorfleContext);
	const { rules, evaluatedGuesses, setSelectedCrew } = props;

	const [filters, setFilters] = React.useState<ICrewPickerFilters>(JSON.parse(JSON.stringify(defaultCrewPickerFilters)));
	const [solverPrefs, setSolverPrefs] = React.useState<ISolverPrefs>(JSON.parse(JSON.stringify(defaultSolverPrefs)));

	const [crewPickerIsOpen, setCrewPickerIsOpen] = React.useState<boolean>(false);
	const [deductionPickerIsOpen, setDeductionPickerIsOpen] = React.useState<boolean>(false);
	const [showHints, setShowHints] = React.useState<boolean>(false);

	const traitOptions = React.useMemo(() => {
		return getTraitOptions();
	}, [rules]);

	const deductions = React.useMemo<IDeduction[]>(() => {
		return getDeductions();
	}, [evaluatedGuesses]);

	React.useEffect(() => {
		deduceFilters();
	}, [deductions, solverPrefs]);

	const guessesLeft: number = rules.max_guesses - evaluatedGuesses.length;

	const guesserData: IGuesserContext = {
		rules,
		evaluatedGuesses,
		traitOptions,
		deductions,
		filters,
		setFilters,
		solverPrefs,
		setSolverPrefs
	};

	return (
		<GuesserContext.Provider value={guesserData}>
			<div style={{ margin: '1em 0' }}>
				<Button /* Guess Crew */
					fluid size='big' color='blue'
					onClick={() => setCrewPickerIsOpen(true)}
				>
					<Icon name='zoom-in' />
					Guess Crew
					<span style={{ fontSize: '.95em', fontWeight: 'normal', paddingLeft: '1em' }}>
						({guessesLeft} guess{guessesLeft !== 1 ? 'es' : ''} remaining)
					</span>
				</Button>
			</div>
			{crewPickerIsOpen && (
				<GuessPickerModal
					setSelectedCrew={setSelectedCrew}
					closeCrewPicker={() => setCrewPickerIsOpen(false)}
					openDeductionPicker={() => setDeductionPickerIsOpen(true)}
					showHints={showHints}
					setShowHints={setShowHints}
				/>
			)}
			{deductionPickerIsOpen && (
				<DeductionPickerModal
					closeDeductionPicker={() => setDeductionPickerIsOpen(false)}
				/>
			)}
		</GuesserContext.Provider>
	);

	function getTraitOptions(): ITraitOption[] {
		const options: ITraitOption[] = [];
		rules.series.forEach(series => {
			options.push({
				id: options.length + 1,
				name: `   ${SERIES_ERAS.find(seriesEra => seriesEra.series === series)!.title}`,
				icon: 'tv',
				field: 'series',
				value: series
			});
		});
		rules.rarities.forEach(rarity => {
			options.push({
				id: options.length + 1,
				name: `  ${rarity}*`,
				icon: 'star',
				field: 'rarity',
				value: rarity
			});
		});
		Object.keys(CONFIG.SKILLS).forEach(skill => {
			options.push({
				id: options.length + 1,
				name: ` ${CONFIG.SKILLS[skill]}`,
				iconUrl: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`,
				field: 'skills',
				value: skill
			});
		});
		Object.keys(traitMap).forEach(trait => {
			if (traitMap[trait].count > 1) {
				const type: TTraitType = traitMap[trait].type;
				let icon: SemanticICONS | undefined;
				if (trait === 'female') icon = 'venus';
				if (trait === 'male') icon = 'mars';
				options.push({
					id: options.length + 1,
					name: getTraitName(trait, variantMap, TRAIT_NAMES, type),
					icon,
					iconUrl: !icon ? getTraitIconUrl(trait, type) : undefined,
					field: 'traits',
					value: trait
				});
			}
		});
		return options;
	}

	function getTraitIconUrl(trait: string, type: TTraitType): string {
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
	}

	function assert(deductions: IDeduction[], field: TEvaluationField, value: string | number, assertion: TAssertion): void {
		const existing: IDeduction | undefined = deductions.find(deduction =>
			deduction.field === field && deduction.value === value
		);
		if (existing) {
			existing.assertion = assertion;
		}
		else {
			deductions.push({ field, value, assertion });
		}
	}

	function getDeductions(): IDeduction[] {
		const deductions: IDeduction[] = [];
		evaluatedGuesses.forEach(evaluatedGuess => {
			if (evaluatedGuess.seriesEval === EvaluationState.Exact) {
				assert(deductions, 'series', evaluatedGuess.crew.gamified_series, 'required');
			}
			else if (evaluatedGuess.seriesEval === EvaluationState.Adjacent) {
				const adjacentSeries: string = evaluatedGuess.crew.gamified_series;
				const mysteryEra: number = getEraBySeries(adjacentSeries);
				SERIES_ERAS.filter(seriesEra => seriesEra.series === adjacentSeries || seriesEra.era !== mysteryEra).forEach(seriesEra => {
					assert(deductions, 'series', seriesEra.series, 'rejected');
				});
			}
			else if (evaluatedGuess.seriesEval === EvaluationState.Wrong) {
				const wrongSeries: string = evaluatedGuess.crew.gamified_series;
				const wrongEra: number = getEraBySeries(wrongSeries);
				SERIES_ERAS.filter(seriesEra => seriesEra.era === wrongEra).forEach(seriesEra => {
					assert(deductions, 'series', seriesEra.series, 'rejected');
				});
			}

			if (evaluatedGuess.rarityEval === EvaluationState.Exact) {
				assert(deductions, 'rarity', evaluatedGuess.crew.max_rarity, 'required');
			}
			else if (evaluatedGuess.rarityEval === EvaluationState.Adjacent) {
				const adjacentRarity: number = evaluatedGuess.crew.max_rarity;
				rules.rarities.forEach(rarity => {
					if (![adjacentRarity - 1, adjacentRarity + 1].includes(rarity))
						assert(deductions, 'rarity', rarity, 'rejected');
				});
			}
			else if (evaluatedGuess.rarityEval === EvaluationState.Wrong) {
				const wrongRarity: number = evaluatedGuess.crew.max_rarity;
				rules.rarities.forEach(rarity => {
					if ([wrongRarity - 1, wrongRarity, wrongRarity + 1].includes(rarity))
						assert(deductions, 'rarity', rarity, 'rejected');
				});
			}

			[0, 1, 2].forEach(index => {
				if (evaluatedGuess.crew.skill_order.length > index) {
					const skill: string = evaluatedGuess.crew.skill_order[index];
					if (evaluatedGuess.skillsEval[index] === EvaluationState.Wrong) {
						assert(deductions, 'skills', skill, 'rejected');
					}
					else {
						assert(deductions, 'skills', skill, 'required');
					}
				}
			});

			evaluatedGuess.crew.gamified_traits.forEach(trait => {
				if (evaluatedGuess.matching_traits.includes(trait)) {
					assert(deductions, 'traits', trait, 'required');
				}
				else {
					assert(deductions, 'traits', trait, 'rejected');
				}
			});
		});

		return deductions;
	}

	function deduceFilters(): void {
		let newDeductions: IDeduction[] = JSON.parse(JSON.stringify(filters.deductions));
		(['series', 'rarity', 'skills', 'traits'] as TEvaluationField[]).forEach(field => {
			if (solverPrefs[field]) {
				deductions.filter(deduction => deduction.field === field).forEach(deduction => {
					assert(newDeductions, deduction.field, deduction.value, deduction.assertion);
				});
			}
		});

		// if (solverOptions.variants) {
		// 	if (evaluatedGuess.variantEval === EvaluationState.Adjacent) {
		// 		evaluatedGuess.crew.gamified_variants.forEach(variant => {
		// 			if (evaluatedGuess.matching_traits.includes(variant)) {
		// 				assertLogic(newFilters.logic, 'traits', variant, 'required');
		// 			}
		// 		});
		// 	}
		// 	else if (evaluatedGuess.variantEval === EvaluationState.Wrong) {
		// 		evaluatedGuess.crew.gamified_variants.forEach(variant => {
		// 			assertLogic(newFilters.logic, 'traits', variant, 'rejected');
		// 		});
		// 	}
		// }
		// if (solverOptions.gender) {
		// 	['female', 'male'].forEach(gender => {
		// 		if (evaluatedGuess.matching_traits.includes(gender)) {
		// 			assertLogic(newFilters.logic, 'traits', gender, 'required');
		// 		}
		// 		else {
		// 			if (evaluatedGuess.crew.gamified_traits.includes(gender)) {
		// 				assertLogic(newFilters.logic, 'traits', gender, 'rejected');
		// 			}
		// 		}
		// 	})
		// }

		setFilters({
			...filters,
			deductions: newDeductions
		});
	}
};

type GuessPickerModalProps = {
	setSelectedCrew: (crewSymbol: string) => void;
	closeCrewPicker: () => void;
	openDeductionPicker: () => void;
	showHints: boolean;
	setShowHints: (showHints: boolean) => void;
};

const GuessPickerModal = (props: GuessPickerModalProps) => {
	const { roster: data } = React.useContext(WorfleContext);
	const { rules, evaluatedGuesses, filters } = React.useContext(GuesserContext);
	const { setSelectedCrew, showHints, setShowHints } = props;

	const filteredIds = React.useMemo<Set<number>>(() => {
		const getAssertedValues = (field: TEvaluationField, assertion: TAssertion) => {
			return filters.deductions.filter(deduction =>
				deduction.field === field && deduction.assertion === assertion
			).map(deduction => deduction.value);
		};

		const deductionMap: { [field: string]: { [assertion: string]: (string | number)[] } } = {};
		(['series', 'rarity', 'skills', 'traits'] as TEvaluationField[]).forEach(field => {
			deductionMap[field] = {};
			(['required', 'rejected'] as TAssertion[]).forEach(assertion => {
				deductionMap[field][assertion] = getAssertedValues(field, assertion);
			});
		});

		const crewMatchesViability = (crew: IRosterCrew) => {
			return !filters.hide_nonviable ||
				(rules.series.includes(crew.gamified_series)
					&& rules.rarities.includes(crew.max_rarity)
					&& (!rules.portal_only || crew.in_portal));
		};
		const crewMatchesGuess = (crew: IRosterCrew) => {
			return !filters.hide_guessed || !evaluatedGuesses.find(
				evaluatedGuess => evaluatedGuess.crew.symbol === crew.symbol
			);
		};
		const crewMatchesSeries = (crew: IRosterCrew) => {
			return (deductionMap.series.required.length === 0 || deductionMap.series.required.includes(crew.gamified_series))
				&& (deductionMap.series.rejected.length === 0 || !deductionMap.series.rejected.includes(crew.gamified_series));
		};
		const crewMatchesRarity = (crew: IRosterCrew) => {
			return (deductionMap.rarity.required.length === 0 || deductionMap.rarity.required.includes(crew.max_rarity))
				&& (deductionMap.rarity.rejected.length === 0 || !deductionMap.rarity.rejected.includes(crew.max_rarity));
		};
		const crewMatchesSkills = (crew: IRosterCrew) => {
			return (deductionMap.skills.required.length === 0 || deductionMap.skills.required.every(required => crew.skill_order.includes(required as string)))
				&& (deductionMap.skills.rejected.length === 0 || !deductionMap.skills.rejected.some(rejected => crew.skill_order.includes(rejected as string)))
		};
		const crewMatchesTraits = (crew: IRosterCrew) => {
			return (deductionMap.traits.required.length === 0 || deductionMap.traits.required.every(required => crew.gamified_traits.includes(required as string)))
				&& (deductionMap.traits.rejected.length === 0 || !deductionMap.traits.rejected.some(rejected => crew.gamified_traits.includes(rejected as string)))
		};

		const filteredIds: Set<number> = new Set<number>();
		data.forEach(crew => {
			const canShowCrew: boolean =
				crewMatchesViability(crew)
					&& crewMatchesGuess(crew)
					&& crewMatchesSeries(crew)
					&& crewMatchesRarity(crew)
					&& crewMatchesSkills(crew)
					&& crewMatchesTraits(crew)
			if (!canShowCrew) filteredIds.add(crew.id);
		});
		return filteredIds;
	}, [data, filters]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData) => renderGridCrew(datum as IRosterCrew)
	};

	return (
		<DataPicker	/* Search for crew by name */
			id='/worfle/crewpicker'
			data={data}
			closePicker={handleSelectedIds}
			selection
			closeOnChange
			preFilteredIds={filteredIds}
			search
			searchPlaceholder='Search for crew by name'
			renderOptions={renderOptions}
			renderActions={renderActions}
			gridSetup={gridSetup}
		/>
	);

	function handleSelectedIds(selectedIds: Set<number>, _affirmative: boolean): void {
		props.closeCrewPicker();
		if (selectedIds.size > 0) {
			const selectedId: number = [...selectedIds][0];
			const selectedCrew: IRosterCrew | undefined = data.find(datum =>
				datum.id === selectedId
			);
			if (selectedCrew) setSelectedCrew(selectedCrew.symbol);
		}
	}

	function renderOptions(): JSX.Element {
		return <GuessPickerOptions />;
	}

	function renderActions(): JSX.Element {
		const hintText: string = showHints ? 'Hide hints' : 'Show hints';
		return (
			<React.Fragment>
				<Button
					content='Deductions'
					onClick={() => props.openDeductionPicker()}
				/>
				<Button
					content={hintText}
					onClick={() => setShowHints(!showHints) }
				/>
				<Button /* Close */
					content='Close'
					onClick={() => props.closeCrewPicker()}
				/>
			</React.Fragment>
		);
	}

	function renderGridCrew(crew: IRosterCrew): JSX.Element {
		const isGuessed: boolean = !!evaluatedGuesses.find(evaluatedGuess => evaluatedGuess.crew.symbol === crew.symbol);
		return (
			<React.Fragment>
				<Image>
					<div style={{ opacity: isGuessed ? .5 : 1 }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} width='72px' height='72px' />
					</div>
					{isGuessed && (
						<Label corner='right' color='red' icon='x' />
					)}
				</Image>
				<div>
					{crew.name}
				</div>
				<Label.Group size='small'>
					{isGuessed && (
						<Label color='red'	/* Already guessed */>
							Already guessed
						</Label>
					)}
					{crew.gamified_series === 'n/a' && (
						<Label color='orange' /* Misleading series */>
							Misleading series
						</Label>
					)}
					{rules.portal_only && !crew.in_portal && (
						<Label color='orange'	/* Not in portal */>
							Not in portal
						</Label>
					)}
				</Label.Group>
				<div>
					{showHints && (
						<div>({[crew.gamified_series.toUpperCase(), `${crew.max_rarity}*`, `${Object.keys(crew.base_skills).length}`].join(', ')})</div>
					)}
				</div>
			</React.Fragment>
		);
	}
};

const GuessPickerOptions = () => {
	const { filters, setFilters, setSolverPrefs } = React.useContext(GuesserContext);
	return (
		<Form>
			{filters.deductions.length > 0 && <DeductionsSelected />}
			<Form.Group>
				<Form.Field	/* Hide nonviable crew */
					control={Checkbox}
					label={(
						<label>
							Hide nonviable crew
							<Popup
								trigger={<Icon name='question' />}
								content={(
									<React.Fragment>
										Some crew are not viable as mystery crew because the defined game rules exclude them (e.g. they are not in the portal) or because their traits are known to be misleading.
									</React.Fragment>
								)}
							/>
						</label>
					)}
					checked={filters.hide_nonviable}
					onChange={(e, { checked }) => setFilters({...filters, hide_nonviable: checked})}
				/>
				<Form.Field	/* Hide guessed crew */
					control={Checkbox}
					label='Hide guessed crew'
					checked={filters.hide_guessed}
					onChange={(e, { checked }) => setFilters({...filters, hide_guessed: checked})}
				/>
			</Form.Group>
			<Form.Group style={{ justifyContent: 'end', marginBottom: '0' }}>
				<Form.Field>
					<Button	/* Reset */
						content='Reset'
						onClick={() => {
							setFilters(JSON.parse(JSON.stringify(defaultCrewPickerFilters)));
							setSolverPrefs(JSON.parse(JSON.stringify(defaultSolverPrefs)));
						}}
					/>
				</Form.Field>
			</Form.Group>
		</Form>
	);
};

const DeductionsSelected = () => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { variantMap } = React.useContext(WorfleContext);
	const { filters } = React.useContext(GuesserContext);

	return (
		<React.Fragment>
			<Message attached='top'	/* Only show crew who have all CHECKED traits and no BANNED traits: */>
				Only show crew who have all <Icon name='check' fitted /> traits and no <Icon name='ban' fitted /> traits shown below:
			</Message>
			<Segment attached='bottom'>
				<div style={{ maxHeight: '5em', overflowY: 'scroll' }}>
					<Label.Group>
						{filters.deductions.map(deduction => renderLabel(deduction))}
					</Label.Group>
				</div>
			</Segment>
		</React.Fragment>
	);

	function renderLabel(deduction: IDeduction): JSX.Element {
		return (
			<Label key={`${deduction.field},${deduction.value}`} size='small'>
				<div>
					{deduction.assertion === 'required' && <Icon name='check' />}
					{deduction.assertion === 'rejected' && <Icon name='ban' />}
					{renderDeduction(deduction)}
				</div>
			</Label>
		);
	}

	function renderDeduction(deduction: IDeduction): JSX.Element {
		if (deduction.field === 'series')
			return <>{(deduction.value as string).toUpperCase()}</>;

		if (deduction.field === 'rarity')
			return <>{`${deduction.value}*`}</>;

		if (deduction.field === 'skills')
			return <><img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${deduction.value}.png`} style={{ height: '1em' }} /></>;

		return <>{getTraitName(deduction.value as string, variantMap, TRAIT_NAMES)}</>;
	}
};
