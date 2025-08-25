import React from 'react';
import {
	Button,
	Checkbox,
	Divider,
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

import { IDataGridSetup, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import { IDeduction, IDeductionOption, IRosterCrew, TAssertion, TDeductionField, THintGroup } from './model';
import { GameContext, WorfleContext } from './context';
import { getEraBySeries } from './game';
import { HintPickerModal } from './hintpicker';

type GuessPickerProps = {
	readyToGuess: boolean;
	setSelectedCrew: (crewSymbol: string) => void;
	setSelectedHints: (newHints: IDeduction[], hintGroups: THintGroup[]) => void;
};

export const GuessPicker = (props: GuessPickerProps) => {
	const { rules, evaluatedGuesses } = React.useContext(GameContext);
	const { readyToGuess, setSelectedCrew, setSelectedHints } = props;

	const [crewPickerIsOpen, setCrewPickerIsOpen] = React.useState<boolean>(false);
	const [hintPickerIsOpen, setHintPickerIsOpen] = React.useState<boolean>(false);

	const guessesLeft: number = rules.max_guesses - evaluatedGuesses.length;

	return (
		<React.Fragment>
			{readyToGuess && (
				<div style={{ margin: '1em 0' }}>
					<Button /* Guess Crew */
						fluid size='big' color='blue'
						onClick={() => setCrewPickerIsOpen(true)}
					>
						<Icon name='search' />
						Guess Crew
						<span style={{ fontSize: '.95em', fontWeight: 'normal', paddingLeft: '1em' }}>
							({guessesLeft} guess{guessesLeft !== 1 ? 'es' : ''} remaining)
						</span>
					</Button>
				</div>
			)}
			{crewPickerIsOpen && (
				<GuessPickerModal
					setSelectedCrew={setSelectedCrew}
					closeCrewPicker={() => setCrewPickerIsOpen(false)}
					openHintPicker={() => setHintPickerIsOpen(true)}
				/>
			)}
			{hintPickerIsOpen && (
				<HintPickerModal
					setSelectedHints={setSelectedHints}
					closeHintPicker={() => setHintPickerIsOpen(false)}
				/>
			)}
		</React.Fragment>
	);
};

type GuessPickerModalProps = {
	setSelectedCrew: (crewSymbol: string) => void;
	closeCrewPicker: () => void;
	openHintPicker: () => void;
};

const GuessPickerModal = (props: GuessPickerModalProps) => {
	const { roster: data, userPrefs } = React.useContext(WorfleContext);
	const { rules, evaluatedGuesses, deductions, hints } = React.useContext(GameContext);
	const { setSelectedCrew } = props;

	const filteredIds = React.useMemo<Set<number>>(() => {
		const getAssertedValues = (field: TDeductionField, assertion: TAssertion) => {
			return hints.filter(deduction =>
				deduction.field === field && deduction.assertion === assertion
			).map(deduction => deduction.value);
		};

		const hintMap: { [field: string]: { [assertion: string]: (string | number)[] } } = {};
		(['era', 'series', 'rarity', 'skills', 'traits'] as TDeductionField[]).forEach(field => {
			hintMap[field] = {};
			(['required', 'rejected'] as TAssertion[]).forEach(assertion => {
				hintMap[field][assertion] = getAssertedValues(field, assertion);
			});
		});

		const crewMatchesViability = (crew: IRosterCrew) => {
			return !userPrefs.hide_nonviable_crew ||
				(rules.series.includes(crew.gamified_series)
					&& rules.rarities.includes(crew.max_rarity)
					&& (!rules.portal_only || crew.in_portal));
		};
		const crewMatchesGuess = (crew: IRosterCrew) => {
			return !userPrefs.hide_guessed_crew || !evaluatedGuesses.find(
				evaluatedGuess => evaluatedGuess.crew.symbol === crew.symbol
			);
		};
		const crewMatchesEra = (crew: IRosterCrew) => {
			return (hintMap.era.required.length === 0 || hintMap.era.required.includes(getEraBySeries(crew.gamified_series)))
				&& (hintMap.era.rejected.length === 0 || !hintMap.era.rejected.includes(getEraBySeries(crew.gamified_series)));
		};
		const crewMatchesSeries = (crew: IRosterCrew) => {
			return (hintMap.series.required.length === 0 || hintMap.series.required.includes(crew.gamified_series))
				&& (hintMap.series.rejected.length === 0 || !hintMap.series.rejected.includes(crew.gamified_series));
		};
		const crewMatchesRarity = (crew: IRosterCrew) => {
			return (hintMap.rarity.required.length === 0 || hintMap.rarity.required.includes(crew.max_rarity))
				&& (hintMap.rarity.rejected.length === 0 || !hintMap.rarity.rejected.includes(crew.max_rarity));
		};
		const crewMatchesSkills = (crew: IRosterCrew) => {
			return (hintMap.skills.required.length === 0 || hintMap.skills.required.every(required => crew.skill_order.includes(required as string)))
				&& (hintMap.skills.rejected.length === 0 || !hintMap.skills.rejected.some(rejected => crew.skill_order.includes(rejected as string)))
		};
		const crewMatchesTraits = (crew: IRosterCrew) => {
			return (hintMap.traits.required.length === 0 || hintMap.traits.required.every(required => crew.gamified_traits.includes(required as string)))
				&& (hintMap.traits.rejected.length === 0 || !hintMap.traits.rejected.some(rejected => crew.gamified_traits.includes(rejected as string)))
		};

		const filteredIds: Set<number> = new Set<number>();
		data.forEach(crew => {
			const canShowCrew: boolean =
				crewMatchesViability(crew)
					&& crewMatchesGuess(crew)
					&& crewMatchesEra(crew)
					&& crewMatchesSeries(crew)
					&& crewMatchesRarity(crew)
					&& crewMatchesSkills(crew)
					&& crewMatchesTraits(crew)
			if (!canShowCrew) filteredIds.add(crew.id);
		});
		return filteredIds;
	}, [data, hints, userPrefs.hide_guessed_crew, userPrefs.hide_nonviable_crew]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData) => renderGridCrew(datum as IRosterCrew),
		defaultSort: {
			id: '_favorite',
			customSort: (a: IEssentialData, b: IEssentialData) => sortCrew(a as IRosterCrew, b as IRosterCrew)
		}
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

	function handleSelectedIds(selectedIds: Set<number>): void {
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
		return (
			<React.Fragment>
				{deductions.length > 0 && (
					<Button
						content='Use hints...'
						onClick={() => props.openHintPicker()}
					/>
				)}
				<Button /* Close */
					content='Close'
					onClick={() => props.closeCrewPicker()}
				/>
			</React.Fragment>
		);
	}

	function sortCrew(a: IRosterCrew, b: IRosterCrew): number {
		const isFavorited = (crew: IRosterCrew) => {
			return userPrefs.favorites.includes(crew.symbol);
		}
		const aFavorited: boolean = isFavorited(a);
		const bFavorited: boolean = isFavorited(b);
		if (aFavorited === bFavorited)
			return a.name.localeCompare(b.name);
		if (aFavorited && !bFavorited)
			return -1;
		return 1;
	}

	function renderGridCrew(crew: IRosterCrew): JSX.Element {
		const isGuessed: boolean = !!evaluatedGuesses.find(evaluatedGuess => evaluatedGuess.crew.symbol === crew.symbol);
		const isFavorited: boolean = userPrefs.favorites.includes(crew.symbol);
		const isViable: boolean = rules.series.includes(crew.gamified_series)
			&& rules.rarities.includes(crew.max_rarity)
			&& (!rules.portal_only || crew.in_portal);

		return (
			<React.Fragment>
				<Image>
					<div style={{ opacity: isGuessed ? .5 : 1 }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} style={{ maxHeight: '72px' }} />
					</div>
					{isGuessed && (
						<Label corner='right' color='red' icon='x' />
					)}
				</Image>
				<div>
					{isFavorited && <Icon name='heart' color='pink' />}
					{crew.name}
				</div>
				<Label.Group size='small'>
					{userPrefs.handicap_series && <Label>{crew.gamified_series.toUpperCase()}</Label>}
					{userPrefs.handicap_rarity && <Label>{crew.max_rarity}*</Label>}
					{userPrefs.handicap_skills === 'count' && <Label>{crew.skill_order.length}</Label>}
					{userPrefs.handicap_skills === 'order' && (
						<Label>
							<div>
								{crew.skill_order.map(skill => (
									<img key={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1em' }} />
								))}
							</div>
						</Label>
					)}
				</Label.Group>
				<Label.Group size='small'>
					{isGuessed && (
						<Label color='red'	/* Already guessed */>
							Already guessed
						</Label>
					)}
					{!isViable && (
						<Label color='orange' /* Not viable */>
							Not viable
						</Label>
					)}
				</Label.Group>
			</React.Fragment>
		);
	}
};

const GuessPickerOptions = () => {
	const { userPrefs, setUserPrefs } = React.useContext(WorfleContext);
	const { hints } = React.useContext(GameContext);

	const skillOptions: DropdownItemProps[] = [
		{ /* Show skill count */
			key: 'count',
			value: 'count',
			text: 'Show skill count'
		},
		{ /* Show skill order */
			key: 'order',
			value: 'order',
			text: 'Show skill order'
		},
		{ /* Hide skills */
			key: 'hide',
			value: 'hide',
			text: 'Hide skills'
		}
	];

	return (
		<Form>
			{hints.length > 0 && <HintsSelected />}
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
					checked={userPrefs.hide_nonviable_crew}
					onChange={(e, { checked }) => setUserPrefs({...userPrefs, hide_nonviable_crew: checked})}
				/>
				<Form.Field	/* Hide guessed crew */
					control={Checkbox}
					label='Hide guessed crew'
					checked={userPrefs.hide_guessed_crew}
					onChange={(e, { checked }) => setUserPrefs({...userPrefs, hide_guessed_crew: checked})}
				/>
			</Form.Group>
			<Divider />
			<Form.Group style={{ marginBottom: '0' }}>
				<Form.Field	inline /* Handicaps: */
					label='Handicaps:'
				/>
				<Form.Field	/* Show series */
					control={Checkbox}
					label='Show series'
					checked={userPrefs.handicap_series}
					onChange={(e, { checked }) => setUserPrefs({...userPrefs, handicap_series: checked})}
				/>
				<Form.Field	/* Show rarity */
					control={Checkbox}
					label='Show rarity'
					checked={userPrefs.handicap_rarity}
					onChange={(e, { checked }) => setUserPrefs({...userPrefs, handicap_rarity: checked})}
				/>
				<Form.Field
					control={Dropdown}
					options={skillOptions}
					value={userPrefs.handicap_skills}
					onChange={(e, { value }) => setUserPrefs({...userPrefs, handicap_skills: value as 'hide' | 'count' | 'order'})}
				/>
			</Form.Group>
		</Form>
	);
};

const HintsSelected = () => {
	const { deductionOptions, hints } = React.useContext(GameContext);
	return (
		<React.Fragment>
			<Message attached='top'	/* Only show crew who match all CHECKED traits and no BANNED traits shown below: */>
				Only show crew who match all <Icon name='check' fitted /> traits and no <Icon name='ban' fitted /> traits shown below:
			</Message>
			<Segment attached='bottom'>
				<div style={{ maxHeight: '5em', overflowY: 'scroll' }}>
					<Label.Group>
						{hints.map(deduction => renderLabel(deduction))}
					</Label.Group>
				</div>
			</Segment>
		</React.Fragment>
	);

	function renderLabel(deduction: IDeduction): JSX.Element {
		let label: JSX.Element = <></>;
		if (deduction.field === 'skills') {
			label = <><img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${deduction.value}.png`} style={{ height: '1em' }} /></>;
		}
		else {
			const option: IDeductionOption | undefined = deductionOptions.find(option =>
				option.field === deduction.field && option.value === deduction.value
			);
			if (option) label = <>{option.name}</>;
		}
		return (
			<Label key={`${deduction.field},${deduction.value}`} size='small'>
				<div>
					{deduction.assertion === 'required' && <Icon name='check' />}
					{deduction.assertion === 'rejected' && <Icon name='ban' />}
					{label}
				</div>
			</Label>
		);
	}
};
