import React from 'react';
import {
	Button,
	Checkbox,
	Form,
	Icon,
	Image,
	Label,
	Message,
	Segment
} from 'semantic-ui-react';

import { IDataGridSetup, IDataPickerState, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import { IDeduction, IDeductionOption, TAssertion, TDeductionField, THintGroup } from './model';
import { GameContext } from './context';

type HintPickerModalProps = {
	setSelectedHints: (hints: IDeduction[], hintGroups: THintGroup[]) => void;
	closeHintPicker: () => void;
};

export const HintPickerModal = (props: HintPickerModalProps) => {
	const { deductionOptions, deductions, hints, hintGroups } = React.useContext(GameContext);
	const { setSelectedHints } = props;

	const [showAssertions, setShowAssertions] = React.useState<TAssertion | ''>('');
	const [pendingGroups, setPendingGroups] = React.useState<THintGroup[]>(hintGroups.slice());

	const data = React.useMemo<IDeductionOption[]>(() => {
		return deductionOptions.filter(option =>
			!!deductions.find(deduction =>
				deduction.field === option.field
					&& deduction.value === option.value
					&& (showAssertions === '' || deduction.assertion === showAssertions)
			)
		);
	}, [deductionOptions, deductions, showAssertions]);

	// Deductions that have been previously applied as hints
	//	These should be readonly but DataPicker can't do that yet
	const appliedIds = React.useMemo<Set<number>>(() => {
		const appliedIds: Set<number> = new Set<number>();
		deductionOptions.forEach(option => {
			if (hints.find(hint => hint.field === option.field && hint.value === option.value))
				appliedIds.add(option.id);
		});
		return appliedIds;
	}, [deductionOptions, deductions, hints]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData, isSelected: boolean) => renderDeduction(datum as IDeductionOption, isSelected),
		defaultSort: {
			id: '_field',
			customSort: (a: IEssentialData, b: IEssentialData) => sortDeductions(a as IDeductionOption, b as IDeductionOption)
		}
	};

	return (
		<DataPicker	/* Search for trait by name */
			id='/worfle/hintpicker'
			data={data}
			closePicker={props.closeHintPicker}
			selection
			search
			searchPlaceholder='Search for trait by name'
			renderPreface={renderPreface}
			renderActions={renderActions}
			gridSetup={gridSetup}
		/>
	);

	function renderPreface(): JSX.Element {
		return (
			<React.Fragment>
				Based on your guesses, we know that the mystery crew must match all <Icon name='check' fitted /> traits and no <Icon name='ban' fitted /> traits shown below. Tap to select a trait. Double-tap to make a selection more quickly. The crew list will be narrowed down to crew who match all selected traits.
				<HintGroups
					pendingGroups={pendingGroups}
					setPendingGroups={setPendingGroups}
					showAssertions={showAssertions}
					setShowAssertions={setShowAssertions}
				/>
			</React.Fragment>
		);
	}

	function renderActions(dataPickerState: IDataPickerState): JSX.Element {
		// Preset ids are all deductions that would be selected from pending groups
		const presetIds: Set<number> = new Set<number>();
		pendingGroups.forEach(group => {
			deductions.filter(deduction =>
				(group === 'required' && deduction.assertion === 'required')
					|| (group === 'series' && ['era', 'series'].includes(deduction.field))
					|| deduction.field === group
			).forEach(deduction => {
				const option: IDeductionOption | undefined = deductionOptions.find(option =>
					option.field === deduction.field && option.value === deduction.value
				);
				if (option) presetIds.add(option.id);
			});
		});
		// Manual ids are all new deductions excluding deductions from pending groups
		//	This set will be applied directly to hints
		const manualIds: Set<number> = dataPickerState.pendingSelectedIds.difference(appliedIds).difference(presetIds);
		// Automatic ids are all new deductions from pending groups
		//	This set will be applied as an effect of hintGroups (and subsequent deductions) being updated
		const automaticIds: Set<number> = presetIds.difference(appliedIds);

		const newCount: number = manualIds.size + automaticIds.size;
		const anyGroupSelected: boolean = pendingGroups.length > 0;
		const dirtyGroups: boolean = hintGroups.length !== pendingGroups.length
			|| !hintGroups.every(group => pendingGroups.includes(group))
			|| !pendingGroups.every(group => hintGroups.includes(group));

		return (
			<div>
				{newCount > 0 && (
					<Button /* Apply N+ hints */
						content={`Apply ${newCount}${anyGroupSelected ? '+' : ''} hint${newCount !== 1 || anyGroupSelected ? 's' : ''}`}
						onClick={() => applyChanges(manualIds)}
					/>
				)}
				{dirtyGroups && newCount === 0 && (
					<Button /* Apply */
						content='Apply'
						onClick={() => applyChanges(manualIds)}
					/>
				)}
				<Button /* Close or Cancel */
					content={newCount === 0 ? 'Close' : 'Cancel'}
					onClick={props.closeHintPicker}
				/>
			</div>
		);
	}

	function applyChanges(manualIds: Set<number>): void {
		const newHints: IDeduction[] = [];
		manualIds.forEach(selectedId => {
			const option: IDeductionOption | undefined = deductionOptions.find(option => option.id === selectedId);
			if (option) {
				const deduction: IDeduction | undefined = deductions.find(deduction =>
					deduction.field === option.field && deduction.value === option.value
				);
				if (deduction) newHints.push(deduction);
			}
		});
		setSelectedHints(newHints, pendingGroups);
		props.closeHintPicker();
	}

	function sortDeductions(a: IDeductionOption, b: IDeductionOption): number {
		const getPriority = (field: TDeductionField) => {
			if (field === 'era') return 4;
			if (field === 'series') return 3;
			if (field === 'rarity') return 2;
			if (field === 'skills') return 1;
			return 0;
		};
		const aPriority: number = getPriority(a.field);
		const bPriority: number = getPriority(b.field);
		if (aPriority === bPriority)
			return a.name.localeCompare(b.name);
		return bPriority - aPriority;
	}

	function renderDeduction(option: IDeductionOption, isSelected: boolean): JSX.Element {
		const assertion: TAssertion | undefined = deductions.find(deduction =>
			deduction.field === option.field && deduction.value === option.value
		)!.assertion;
		const showAsSelected: boolean = appliedIds.has(option.id)
			|| isSelected
		 	|| ((pendingGroups.includes('required') && assertion === 'required')
				|| (pendingGroups.includes('series') && ['era', 'series'].includes(option.field))
				|| pendingGroups.includes(option.field));
		return (
			<React.Fragment>
				<Image>
					<div style={{ opacity: assertion === 'rejected' ? .1 : 1 }}>
						{option.iconUrl !== '' && <img src={option.iconUrl} style={{ maxHeight: '48px' }} />}
						{option.icon && <Icon name={option.icon} size='huge' />}
					</div>
					<Label floating circular color={showAsSelected ? 'blue' : undefined}>
						{assertion === 'required' && <Icon name='check' fitted /> }
						{assertion === 'rejected' && <Icon name='ban' fitted /> }
					</Label>
				</Image>
				<div>
					{option.name}
				</div>
				{appliedIds.has(option.id) && (
					<Label size='small'>
						<Icon name='lightbulb' color='yellow' /> Hint applied
					</Label>
				)}
			</React.Fragment>
		);
	}
};

type HintGroupsProps = {
	pendingGroups: THintGroup[];
	setPendingGroups: (pendingGroups: THintGroup[]) => void;
	showAssertions: TAssertion | '';
	setShowAssertions: (showAssertions: TAssertion | '') => void;
};

const HintGroups = (props: HintGroupsProps) => {
	const { pendingGroups, setPendingGroups, showAssertions, setShowAssertions } = props;

	return (
		<React.Fragment>
			<Message attached='top'>
				We can automatically select all traits by group type. Don't use these options if you want the game to be more challenging!
			</Message>
			<Segment attached='bottom'>
				<Form>
					<Form.Group inline style={{ marginBottom: '0' }}>
						<Form.Field	/* Automatically select all: */
							label='Automatically select all:'
						/>
						<Form.Field	/* Series */
							control={Checkbox}
							label='Series'
							checked={pendingGroups.includes('series')}
							onChange={() => toggleGroup('series')}
						/>
						<Form.Field	/* Rarity */
							control={Checkbox}
							label='Rarity'
							checked={pendingGroups.includes('rarity')}
							onChange={() => toggleGroup('rarity')}
						/>
						<Form.Field	/* Skills */
							control={Checkbox}
							label='Skills'
							checked={pendingGroups.includes('skills')}
							onChange={() => toggleGroup('skills')}
						/>
						<Form.Field	/* Traits */
							control={Checkbox}
							label='Traits'
							checked={pendingGroups.includes('traits')}
							onChange={() => toggleGroup('traits')}
						/>
						<Form.Field	/* Matching */
							control={Checkbox}
							label='Matching'
							checked={pendingGroups.includes('required')}
							onChange={() => toggleGroup('required')}
						/>
						<Form.Field>
							<Button	/* Show matching traits or Show all traits */
								size='small'
								content={showAssertions !== 'required' ? 'Show matching traits' : 'Show all traits'}
								onClick={() => setShowAssertions(showAssertions !== 'required' ? 'required' : '')}
								toggle={true}
							/>
						</Form.Field>
					</Form.Group>
				</Form>
			</Segment>
		</React.Fragment>
	);

	function toggleGroup(group: THintGroup): void {
		const updatedGroups: THintGroup[] = pendingGroups.slice().filter(g => g !== group);
		if (!pendingGroups.includes(group)) updatedGroups.push(group);
		setPendingGroups(updatedGroups);
	}
};
