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

import { IDeduction, ISolverPrefs, ITraitOption, TAssertion } from './model';
import { GameContext, GuesserContext } from './context';

type DeductionPickerModalProps = {
	closeDeductionPicker: () => void;
};

export const DeductionPickerModal = (props: DeductionPickerModalProps) => {
	const { traitOptions, deductions } = React.useContext(GameContext);
	const { filters, setFilters, solverPrefs, setSolverPrefs } = React.useContext(GuesserContext);

	const [showAll, setShowAll] = React.useState<boolean>(true);
	const [pendingSolverPrefs, setPendingSolverPrefs] = React.useState<ISolverPrefs>(JSON.parse(JSON.stringify(solverPrefs)));

	const data = React.useMemo<ITraitOption[]>(() => {
		return traitOptions.filter(traitOption =>
			!!deductions.find(deduction =>
				(showAll || deduction.assertion === 'required')
					&& deduction.field === traitOption.field && deduction.value === traitOption.value
			)
		);
	}, [traitOptions, deductions, showAll]);

	// Existing deductions in filters that are NOT preset by solverPrefs
	const preSelectedIds = React.useMemo<Set<number>>(() => {
		const selectedIds: Set<number> = new Set<number>();
		filters.deductions.forEach(deduction => {
			if (!solverPrefs[deduction.field]) {
				const option: ITraitOption | undefined = traitOptions.find(option =>
					option.field === deduction.field && option.value === deduction.value
				);
				if (option) selectedIds.add(option.id);
			}
		});
		return selectedIds;
	}, [traitOptions, filters, solverPrefs]);

	// Deductions that are preset by solverPrefs
	//	These should be readonly but DataPicker can't do that yet
	const preFixedIds = React.useMemo<Set<number>>(() => {
		const fixedIds: Set<number> = new Set<number>();
		traitOptions.forEach(option => {
			if (pendingSolverPrefs[option.field])
				fixedIds.add(option.id);
		});
		return fixedIds;
	}, [traitOptions, pendingSolverPrefs]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData, isSelected: boolean) => renderTrait(datum as ITraitOption, isSelected)
	};

	return (
		<DataPicker	/* Search for deduced trait by name */
			id='/worfle/traitpicker'
			data={data}
			closePicker={handleSelectedIds}
			preSelectedIds={preSelectedIds}
			selection
			search
			searchPlaceholder='Search for deduced trait by name'
			renderPreface={renderPreface}
			renderActions={renderActions}
			gridSetup={gridSetup}
		/>
	);

	function renderPreface(): JSX.Element {
		return (
			<React.Fragment>
				Based on your guesses, we know that the mystery crew must have all <Icon name='check' fitted /> traits and no <Icon name='ban' fitted /> traits shown below. Tap to select a deduced trait. Double-tap to make a selection more quickly. The list of possible solutions will be narrowed down to crew who match all selected traits.
				<AutoDeductionOptions
					pendingSolverPrefs={pendingSolverPrefs}
					setPendingSolverPrefs={setPendingSolverPrefs}
				/>
			</React.Fragment>
		);
	}

	function renderActions(dataPickerState: IDataPickerState): JSX.Element {
		const allText: string = showAll ? 'Only show required' : 'Show all';
		return (
			<React.Fragment>
				<Button
					content={allText}
					onClick={() => setShowAll(!showAll)}
				/>
				<Button /* Close */
					content='Close'
					onClick={() => handleSelectedIds(dataPickerState.pendingSelectedIds)}
				/>
			</React.Fragment>
		);
	}

	function renderTrait(option: ITraitOption, isSelected: boolean): JSX.Element {
		const showAsSelected: boolean = isSelected || preFixedIds.has(option.id);
		const assertion: TAssertion | undefined = deductions.find(deduction =>
			deduction.field === option.field && deduction.value === option.value
		)!.assertion;
		return (
			<React.Fragment>
				<Image>
					<div style={{ opacity: assertion === 'rejected' ? .1 : 1 }}>
						{option.iconUrl !== '' && <img src={option.iconUrl} style={{ maxHeight: '32px' }} />}
						{option.icon && <Icon name={option.icon} size='big' />}
					</div>
					<Label floating circular color={showAsSelected ? 'blue' : undefined}>
						{assertion === 'required' && <Icon name='check' fitted /> }
						{assertion === 'rejected' && <Icon name='ban' fitted /> }
					</Label>
				</Image>
				<div>
					{option.name}
				</div>
			</React.Fragment>
		);
	}

	function handleSelectedIds(selectedIds: Set<number>): void {
		const newDeductions: IDeduction[] = [];
		selectedIds.forEach(selectedId => {
			const option: ITraitOption | undefined = traitOptions.find(option => option.id === selectedId);
			if (option) {
				const deduction: IDeduction | undefined = deductions.find(deduction =>
					deduction.field === option.field && deduction.value === option.value
				);
				if (deduction) newDeductions.push(deduction);
			}
		});
		setFilters({
			...filters,
			deductions: newDeductions
		});
		setSolverPrefs(pendingSolverPrefs);
		props.closeDeductionPicker();
	}
};

type AutoDeductionOptionsProps = {
	pendingSolverPrefs: ISolverPrefs;
	setPendingSolverPrefs: (pendingSolverPrefs: ISolverPrefs) => void;
};

const AutoDeductionOptions = (props: AutoDeductionOptionsProps) => {
	const { pendingSolverPrefs: solverPrefs, setPendingSolverPrefs: setSolverPrefs } = props;

	return (
		<React.Fragment>
			<Message attached='top'>
				We can automatically select all traits by group type. Don't use these options if you want the game to be more challenging!
			</Message>
			<Segment attached='bottom'>
				<Form>
					<Form.Group inline style={{ marginBottom: '0' }}>
						<label	/* Automatically select all: */>
							Automatically select all:
						</label>
						<Form.Field	/* Series */
							control={Checkbox}
							label='Series'
							checked={solverPrefs.series}
							onChange={(e, { checked }) => setSolverPrefs({...solverPrefs, series: checked})}
						/>
						<Form.Field	/* Rarity */
							control={Checkbox}
							label='Rarity'
							checked={solverPrefs.rarity}
							onChange={(e, { checked }) => setSolverPrefs({...solverPrefs, rarity: checked})}
						/>
						<Form.Field	/* Skills */
							control={Checkbox}
							label='Skills'
							checked={solverPrefs.skills}
							onChange={(e, { checked }) => setSolverPrefs({...solverPrefs, skills: checked})}
						/>
						<Form.Field	/* Traits */
							control={Checkbox}
							label='Traits'
							checked={solverPrefs.traits}
							onChange={(e, { checked }) => setSolverPrefs({...solverPrefs, traits: checked})}
						/>
					</Form.Group>
				</Form>
			</Segment>
		</React.Fragment>
	);
};
