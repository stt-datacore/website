import React from 'react';
import {
	Button,
	Checkbox,
	Dropdown,
	DropdownItemProps,
	Form,
	Icon,
	Image,
	Label,
	Message,
	Popup,
	Segment
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { RarityFilter } from '../crewtables/commonoptions';
import { IDataGridSetup, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import CONFIG from '../CONFIG';

import { EvaluationState, IEvaluatedGuess, IRosterCrew, TTraitType } from './model';
import { SERIES_ERAS } from './config';
import { WorfleContext } from './context';
import { GameRules, getEraBySeries, getTraitName } from './game';

interface IPickerFilters {
	series_potential: string[];
	rarity_potential: number[];
	skills_required: string[];
	skills_rejected: string[];
	traits_required: string[];
	traits_rejected: string[];
	valid_series_only: boolean;
	portal_only: boolean;
};

interface IHintOptions {
	variants: boolean;
	gender: boolean;
	series: boolean;
	rarity: boolean;
	skills: boolean;
	traits: boolean;
};

const defaultHintOptions: IHintOptions = {
	variants: true,
	gender: false,
	series: false,
	rarity: false,
	skills: false,
	traits: false
};

interface IReduction {
	type: 'rarity' | 'series' | 'skill' | 'trait';
	value: number | string;
};

interface ITraitDatum {
	id: number;
	name: string;
	icon: string;
	trait: string;
	type: string;
	count: number;
};

type GuessPickerProps = {
	rules: GameRules;
	evaluatedGuesses: IEvaluatedGuess[];
	setSelectedCrew: (crewSymbol: string) => void;
};

export const GuessPicker = (props: GuessPickerProps) => {
	const { roster: data } = React.useContext(WorfleContext);
	const { rules, evaluatedGuesses, setSelectedCrew } = props;

	const [filters, setFilters] = React.useState<IPickerFilters>(getDefaultFilters(rules));
	const [showHints, setShowHints] = React.useState<boolean>(false);
	const [hintOptions, setHintOptions] = React.useState<IHintOptions>({...defaultHintOptions});
	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	const filteredIds = React.useMemo<Set<number>>(() => {
		const filteredIds: Set<number> = new Set<number>();
		data.forEach(crew => {
			const canShowCrew: boolean =
				(filters.series_potential.length === 0 || filters.series_potential.includes(crew.gamified_series) || (!filters.valid_series_only && crew.gamified_series === 'n/a'))
					&& (filters.rarity_potential.length === 0 || filters.rarity_potential.includes(crew.max_rarity))
					&& (filters.skills_required.length === 0 || filters.skills_required.every(required => crew.skill_order.includes(required)))
					&& (filters.skills_rejected.length === 0 || !filters.skills_rejected.some(rejected => crew.skill_order.includes(rejected)))
					&& (filters.traits_required.length === 0 || filters.traits_required.every(required => crew.gamified_traits.includes(required)))
					&& (filters.traits_rejected.length === 0 || !filters.traits_rejected.some(rejected => crew.gamified_traits.includes(rejected)))
					&& (!filters.portal_only || crew.in_portal)
			if (!canShowCrew) filteredIds.add(crew.id);
		});
		return filteredIds;
	}, [data, filters]);

	const reductions = React.useMemo<IReduction[]>(() => {
		return getReductions();
	}, [evaluatedGuesses]);

	React.useEffect(() => {
		deduceFilters();
	}, [hintOptions, evaluatedGuesses]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData) => renderGridCrew(datum as IRosterCrew)
	};

	const guessesLeft: number = rules.max_guesses - evaluatedGuesses.length;

	return (
		<React.Fragment>
			<div style={{ margin: '1em 0' }}>
				<Button fluid size='big' color='blue' onClick={() => setModalIsOpen(true)}>
					<Icon name='zoom-in' />
					Guess Crew
					<span style={{ fontSize: '.95em', fontWeight: 'normal', paddingLeft: '1em' }}>
						({guessesLeft} guess{guessesLeft !== 1 ? 'es' : ''} remaining)
					</span>
				</Button>
			</div>
			{modalIsOpen && (
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
					renderPreface={renderPreface}
					renderActions={renderActions}
					gridSetup={gridSetup}
				/>
			)}
		</React.Fragment>
	);

	function getReductions(): IReduction[] {
		const reductions: IReduction[] = [];
		const knownVariants: string[] = [];
		let knownRarity: number = 0;
		let knownSeries: string = '';
		const knownTraits: string[] = [];
		evaluatedGuesses.forEach(evaluatedGuess => {
			if (evaluatedGuess.variantEval === EvaluationState.Adjacent) {
				evaluatedGuess.crew.gamified_variants.forEach(variant => {
					if (evaluatedGuess.matching_traits.includes(variant)) {
						if (!knownVariants.includes(variant))
							knownVariants.push(variant);
					}
				});
			}
			if (evaluatedGuess.seriesEval === EvaluationState.Exact) {
				knownSeries = evaluatedGuess.crew.gamified_series;
			}
			if (evaluatedGuess.rarityEval === EvaluationState.Exact) {
				knownRarity = evaluatedGuess.crew.max_rarity;
			}
			evaluatedGuess.matching_traits.forEach(trait => {
				if (!knownTraits.includes(trait)) knownTraits.push(trait);
			});
		});
		if (knownSeries !== '') reductions.push({
			type: 'series',
			value: knownSeries
		});
		if (knownRarity > 0) reductions.push({
			type: 'rarity',
			value: knownRarity
		});
		knownTraits.forEach(trait => {
			reductions.push({
				type: 'trait',
				value: trait
			});
		});
		return reductions;
	}

	function deduceFilters(): void {
		const filters: IPickerFilters = {
			series_potential: rules.series.slice(),
			rarity_potential: rules.rarities.slice(),
			skills_required: [],
			skills_rejected: [],
			traits_rejected: [],
			traits_required: [],
			valid_series_only: true,
			portal_only: rules.portal_only
		};
		evaluatedGuesses.forEach(evaluatedGuess => {
			if (hintOptions.variants) {
				if (evaluatedGuess.variantEval === EvaluationState.Adjacent) {
					evaluatedGuess.crew.gamified_variants.forEach(variant => {
						if (evaluatedGuess.matching_traits.includes(variant)) {
							if (!filters.traits_required.includes(variant))
								filters.traits_required.push(variant);
						}
					});
				}
				else if (evaluatedGuess.variantEval === EvaluationState.Wrong) {
					evaluatedGuess.crew.gamified_variants.forEach(variant => {
						if (!filters.traits_rejected.includes(variant))
							filters.traits_rejected.push(variant);
					});
				}
			}
			if (hintOptions.gender) {
				['female', 'male'].forEach(gender => {
					if (evaluatedGuess.matching_traits.includes(gender)) {
						if (!filters.traits_required.includes(gender))
							filters.traits_required.push(gender);
					}
					else {
						if (evaluatedGuess.crew.gamified_traits.includes(gender)) {
							if (!filters.traits_rejected.includes(gender))
								filters.traits_rejected.push(gender);
						}
					}
				})
			}
			if (hintOptions.series) {
				if (evaluatedGuess.seriesEval === EvaluationState.Exact) {
					filters.series_potential = [evaluatedGuess.crew.gamified_series];
				}
				else if (evaluatedGuess.seriesEval === EvaluationState.Adjacent) {
					const adjacentSeries: string = evaluatedGuess.crew.gamified_series;
					const mysteryEra: number = getEraBySeries(adjacentSeries);
					filters.series_potential = filters.series_potential.filter(series =>
						series !== adjacentSeries && getEraBySeries(series) === mysteryEra
					);
				}
				else if (evaluatedGuess.seriesEval === EvaluationState.Wrong) {
					const wrongSeries: string = evaluatedGuess.crew.gamified_series;
					const wrongEra: number = getEraBySeries(wrongSeries);
					filters.series_potential = filters.series_potential.filter(series =>
						getEraBySeries(series) !== wrongEra
					);
				}
			}
			if (hintOptions.rarity) {
				if (evaluatedGuess.rarityEval === EvaluationState.Exact) {
					filters.rarity_potential = [evaluatedGuess.crew.max_rarity];
				}
				else if (evaluatedGuess.rarityEval === EvaluationState.Adjacent) {
					const adjacentRarity: number = evaluatedGuess.crew.max_rarity;
					filters.rarity_potential = filters.rarity_potential.filter(rarity =>
						[adjacentRarity - 1, adjacentRarity + 1].includes(rarity)
					);
				}
				else if (evaluatedGuess.rarityEval === EvaluationState.Wrong) {
					const wrongRarity: number = evaluatedGuess.crew.max_rarity;
					filters.rarity_potential = filters.rarity_potential.filter(rarity =>
						![wrongRarity, wrongRarity - 1, wrongRarity + 1].includes(rarity)
					);
				}
			}
			if (hintOptions.skills) {
				[0, 1, 2].forEach(index => {
					if (evaluatedGuess.crew.skill_order.length >= index) {
						const skill: string = evaluatedGuess.crew.skill_order[index];
						if (evaluatedGuess.skillsEval[index] === EvaluationState.Wrong) {
							if (!filters.skills_rejected.includes(skill))
								filters.skills_rejected.push(skill)
						}
						else {
							if (!filters.skills_required.includes(skill))
								filters.skills_required.push(skill)
						}
					}
				});
			}
			if (hintOptions.traits) {
				evaluatedGuess.crew.gamified_traits.forEach(trait => {
					if (evaluatedGuess.matching_traits.includes(trait)) {
						if (!filters.traits_required.includes(trait))
							filters.traits_required.push(trait);
					}
					else {
						if (!filters.traits_rejected.includes(trait))
							filters.traits_rejected.push(trait);
					}
				});
			}
		});
		setFilters(filters);
	}

	function handleSelectedIds(selectedIds: Set<number>, _affirmative: boolean): void {
		setModalIsOpen(false);
		if (selectedIds.size > 0) {
			const selectedId: number = [...selectedIds][0];
			const selectedCrew: IRosterCrew | undefined = data.find(datum =>
				datum.id === selectedId
			);
			if (selectedCrew) setSelectedCrew(selectedCrew.symbol);
		}
	}

	function renderOptions(): JSX.Element {
		return (
			<GuessPickerOptions
				rules={rules}
				filters={filters}
				setFilters={setFilters}
			/>
		);
	}

	function renderPreface(): JSX.Element {
		if (!showHints || evaluatedGuesses.length === 0) return <></>;
		return (
			<GuessHintOptions
				reductions={reductions}
				hintOptions={hintOptions}
				setHintOptions={setHintOptions}
			/>
		);
	}

	function renderActions(): JSX.Element {
		const hintText: string = showHints ? 'Hide hints' : 'Show hints';
		return (
			<React.Fragment>
				<Button
					content={hintText}
					onClick={() => setShowHints(!showHints) }
				/>
				<Button /* Close */
					content='Close'
					onClick={() => setModalIsOpen(false)}
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
		)
	}
};

type GuessHintOptionsProps = {
	reductions: IReduction[];
	hintOptions: IHintOptions;
	setHintOptions: (hintOptions: IHintOptions) => void;
};

const GuessHintOptions = (props: GuessHintOptionsProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { variantMap } = React.useContext(WorfleContext);
	const { reductions, hintOptions, setHintOptions } = props;

	return (
		<Message>
			{reductions.length > 0 && (
				<div>
					Based on your guesses, the mystery crew must be:
					<Label.Group>
						{reductions.map((reduction, idx) =>
							<Label key={idx} size='small'>
								{formatReduction(reduction)}
							</Label>
						)}
					</Label.Group>
				</div>
			)}
			<Form>
				We can automatically narrow down the list of possible solutions for you. Don't use these options if you want the game to be more challenging!
				<Form.Group inline style={{ marginTop: '1em' }}>
					<label>Filter by deduced:</label>
					<Form.Field	/* Variant */
						control={Checkbox}
						label='Variant'
						checked={hintOptions.variants}
						onChange={(e, { checked }) => setHintOptions({...hintOptions, variants: checked})}
					/>
					<Form.Field	/* Gender */
						control={Checkbox}
						label='Gender'
						checked={hintOptions.gender}
						onChange={(e, { checked }) => setHintOptions({...hintOptions, gender: checked})}
					/>
					<Form.Field	/* Series */
						control={Checkbox}
						label='Series'
						checked={hintOptions.series}
						onChange={(e, { checked }) => setHintOptions({...hintOptions, series: checked})}
					/>
					<Form.Field	/* Rarity */
						control={Checkbox}
						label='Rarity'
						checked={hintOptions.rarity}
						onChange={(e, { checked }) => setHintOptions({...hintOptions, rarity: checked})}
					/>
					<Form.Field	/* Skills */
						control={Checkbox}
						label='Skills'
						checked={hintOptions.skills}
						onChange={(e, { checked }) => setHintOptions({...hintOptions, skills: checked})}
					/>
					<Form.Field	/* Traits */
						control={Checkbox}
						label='Traits'
						checked={hintOptions.traits}
						onChange={(e, { checked }) => setHintOptions({...hintOptions, traits: checked})}
					/>
				</Form.Group>
			</Form>
		</Message>
	);

	function formatReduction(reduction: IReduction): JSX.Element {
		if (reduction.type === 'series')
			return <>{(reduction.value as string).toUpperCase()}</>;
			// return SERIES_ERAS.find(seriesEra => seriesEra.series === (reduction.value as string))!.title;

		if (reduction.type === 'rarity')
			return <>{`${reduction.value}*`}</>;
			// return <Rating defaultRating={reduction.value as number} maxRating={reduction.value as number} icon='star' size='mini' disabled />

		return <>{getTraitName(reduction.value as string, variantMap, TRAIT_NAMES)}</>;
	}
};

type GuessPickerOptionsProps = {
	rules: GameRules;
	filters: IPickerFilters;
	setFilters: (filters: IPickerFilters) => void;
};

const GuessPickerOptions = (props: GuessPickerOptionsProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { variantMap, traitMap } = React.useContext(WorfleContext);
	const { rules, filters, setFilters } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	const traitPresets = React.useMemo<string[]>(() => {
		const presets: string[] = filters.traits_required.concat(filters.traits_rejected);
		presets.sort((a, b) => a.localeCompare(b));
		return presets;
	}, [filters]);

	const traitData = React.useMemo<ITraitDatum[]>(() => {
		return Object.keys(traitMap).filter(trait =>
				traitMap[trait].count > 1
			).map((trait, idx) => {
				const type: TTraitType = traitMap[trait].type;
				let icon: string = '';
				switch (type) {
					case 'collection':
						icon = '/media/vault.png';
						break;
					case 'trait':
						icon = `${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`;
						break;
					case 'variant':
						icon = '/media/crew_icon.png';
						break;
				}
				return {
					id: idx + 1,
					name: getTraitName(trait, variantMap, TRAIT_NAMES, type),
					icon,
					trait,
					type,
					count: traitMap[trait].count
				};
			});
	}, [traitMap]);

	const seriesOptions: DropdownItemProps[] = SERIES_ERAS.map(seriesEra => {
		return {
			key: seriesEra.series,
			value: seriesEra.series,
			text: seriesEra.title
		};
	});

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData) => renderTrait(datum as ITraitDatum)
	};

	return (
		<Form>
			<Form.Group widths='equal'>
				<Form.Field	/* Filter by series */
					control={Dropdown}
					placeholder='Any series'
					selection multiple fluid clearable closeOnChange
					options={seriesOptions}
					value={filters.series_potential}
					onChange={(e, { value }) => setFilters({...filters, series_potential: value})}
				/>
				<RarityFilter
					rarityFilter={filters.rarity_potential}
					setRarityFilter={(value: number[]) => setFilters({...filters, rarity_potential: value})}
				/>
			</Form.Group>
			<Form.Group inline>
				<label>
					Toggle skill filters:
					<Popup
						content={(
							<React.Fragment>
								{/* Only show crew who have all CHECKED skills (in any order) and no BANNED skills. */}
								Only show crew who have all <Icon name='check' color='green' fitted /> skills (in any order) and no <Icon name='ban' color='red' fitted /> skills.
							</React.Fragment>
						)}
						trigger={<Icon name='question' />}
					/>
				</label>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
					{Object.keys(CONFIG.SKILLS).map(skill => renderToggleOption('skills', skill, CONFIG.SKILLS[skill]))}
				</div>
			</Form.Group>
			<Form.Group inline>
				<label style={{ whiteSpace: 'nowrap' }}>
					<span >Toggle trait filters:</span>
					<Popup
						content={(
							<React.Fragment>
								{/* Only show crew who have all CHECKED traits and no BANNED traits. */}
								Only show crew who have all <Icon name='check' color='green' fitted /> traits and no <Icon name='ban' color='red' fitted /> traits.
							</React.Fragment>
						)}
						trigger={<Icon name='question' />}
					/>
				</label>
				<Segment raised inverted attached>
					<div style={{ maxHeight: '4em', overflowY: 'scroll' }}>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
							{traitPresets.map(trait => renderToggleOption('traits', trait, getTraitName(trait, variantMap, TRAIT_NAMES)))}
							<Button size='small' compact icon='search' onClick={() => setModalIsOpen(true)} />
						</div>
					</div>
					{modalIsOpen && (
						<DataPicker	/* Search for trait by name */
							id='/worfle/traitpicker'
							data={traitData.filter(traitDatum => traitDatum.count > 1)}
							closePicker={handleSelectedIds}
							selection
							closeOnChange
							search
							searchPlaceholder='Search for trait by name'
							gridSetup={gridSetup}
						/>
					)}
				</Segment>
			</Form.Group>
			<Form.Group>
				<Form.Field	/* Hide crew with misleading series traits */
					control={Checkbox}
					label={(
						<label>
							Hide crew with misleading series traits
							<Popup content='Some crew will be excluded as mystery crew because their in-game series traits are misleading.' trigger={<Icon name='question' />} />
						</label>
					)}
					checked={filters.valid_series_only}
					onChange={(e, { checked }) => setFilters({...filters, valid_series_only: checked})}
				/>
				{rules.portal_only && (
					<React.Fragment>
						<Form.Field	/* Hide non-portal crew */
							control={Checkbox}
							label={(
								<label>
									Hide non-portal crew
									<Popup content='Only crew who are currently available in the time portal will be used as mystery crew.' trigger={<Icon name='question' />} />
								</label>
							)}
							checked={filters.portal_only}
							onChange={(e, { checked }) => setFilters({...filters, portal_only: checked})}
						/>
					</React.Fragment>
				)}
			</Form.Group>
			<Form.Group style={{ justifyContent: 'end', marginBottom: '0' }}>
				<Form.Field>
					<Button	/* Reset */
						content='Reset'
						onClick={() => setFilters(getDefaultFilters(rules))}
					/>
				</Form.Field>
			</Form.Group>
		</Form>
	);

	function renderToggleOption(group: string, itemKey: string, itemText: string): JSX.Element {
		const required: boolean = filters[`${group}_required`].includes(itemKey);
		const rejected: boolean = filters[`${group}_rejected`].includes(itemKey);
		return (
			<Button key={itemKey} size='small' compact onClick={() => toggleOption(group, itemKey)}>
				{required && <Icon name='check' color='green' />}
				{rejected && <Icon name='ban' color='red' />}
				{itemText}
			</Button>
		);
	}

	function toggleOption(group: string, itemKey: string): void {
		const required: boolean = filters[`${group}_required`].includes(itemKey);
		const rejected: boolean = filters[`${group}_rejected`].includes(itemKey);

		const newRequires: string[] = filters[`${group}_required`].slice();
		const newRejects: string[] = filters[`${group}_rejected`].slice();
		const requiredIndex: number = newRequires.indexOf(itemKey);
		const rejectedIndex: number = newRejects.indexOf(itemKey);

		// Move from required to rejected
		if (required) {
			if (requiredIndex >= 0) newRequires.splice(requiredIndex);
			if (!newRejects.includes(itemKey)) newRejects.push(itemKey);
		}
		// Move from rejected to neither (i.e. remove from both)
		else if (rejected) {
			if (requiredIndex >= 0) newRequires.splice(requiredIndex);
			if (rejectedIndex >= 0) newRejects.splice(rejectedIndex);
		}
		// Add to required
		else {
			if (!newRequires.includes(itemKey)) newRequires.push(itemKey);
			if (rejectedIndex >= 0) newRejects.splice(rejectedIndex);
		}

		setFilters({
			...filters,
			[`${group}_required`]: newRequires,
			[`${group}_rejected`]: newRejects
		});
	};

	function renderTrait(traitDatum: ITraitDatum): JSX.Element {
		return (
			<React.Fragment>
				<div>
					{traitDatum.icon !== '' && <img width={32} src={traitDatum.icon} />}
				</div>
				{traitDatum.name}
			</React.Fragment>
		);
	}

	function handleSelectedIds(selectedIds: Set<number>, affirmative: boolean): void {
		setModalIsOpen(false);
		if (selectedIds.size > 0 && affirmative) {
			const selectedId: number = [...selectedIds][0];
			const selectedTrait: ITraitDatum | undefined = traitData.find(datum =>
				datum.id === selectedId
			);
			if (selectedTrait) toggleOption('traits', selectedTrait.trait);
		}
	}
};

function getDefaultFilters(rules: GameRules): IPickerFilters {
	return {
		series_potential: rules.series.slice(),
		rarity_potential: rules.rarities.slice(),
		skills_required: [],
		skills_rejected: [],
		traits_rejected: [],
		traits_required: [],
		valid_series_only: true,
		portal_only: rules.portal_only
	};
}
