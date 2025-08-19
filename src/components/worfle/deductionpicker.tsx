import React from 'react';
import {
	Button,
	Icon,
	Image,
	Label,
	Message,
	Segment
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { IDataGridSetup, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import { IDeduction, ITraitOption, TAssertion } from './model';
import { GuesserContext, WorfleContext } from './context';
import { getTraitName } from './game';

export const DeductionPicker = () => {
	const { filters, setFilters, readOnlyFilters, openTraitPicker } = React.useContext(GuesserContext);

	return (
		<React.Fragment>
			<Message attached='top'	/* Only show crew who have all CHECKED traits and no BANNED traits. */>
				Only show crew who have all <Icon name='check' fitted /> traits and no <Icon name='ban' fitted /> traits as shown below:
			</Message>
			<Segment attached='bottom'>
				<div style={{ maxHeight: '5em', overflowY: 'scroll' }}>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
						<Button compact onClick={() => openTraitPicker()}>
							<Icon name='search' />
							Search deduced traits...
						</Button>
						{filters.deductions.map(deduction => renderCancel(deduction))}
					</div>
				</div>
			</Segment>
		</React.Fragment>
	);

	function renderCancel(deduction: IDeduction): JSX.Element {
		const readonly: boolean = readOnlyFilters.includes(deduction.field);
		return (
			<Button key={deduction.value} size='small' compact onClick={!readonly ? () => cancelDeduction(deduction) : undefined}>
				{deduction.assertion === 'required' && <Icon name='check' color={readonly ? 'grey' : undefined} />}
				{deduction.assertion === 'rejected' && <Icon name='ban' color={readonly ? 'grey' : undefined} />}
				<DeductionContent deduction={deduction} />
			</Button>
		);
	}

	function cancelDeduction(deduction: IDeduction): void {
		let newDeductions: IDeduction[] = JSON.parse(JSON.stringify(filters.deductions));
		newDeductions = newDeductions.filter(existing =>
			existing.field !== deduction.field || existing.value !== deduction.value
		);
		setFilters({
			...filters,
			deductions: newDeductions
		});
	}
};

type DeductionPickerModalProps = {
	closeModal: () => void;
};

export const DeductionPickerModal = (props: DeductionPickerModalProps) => {
	const { traitOptions, deductions, filters, setFilters, readOnlyFilters } = React.useContext(GuesserContext);

	const data = React.useMemo<ITraitOption[]>(() => {
		return traitOptions.filter(traitOption =>
			!readOnlyFilters.includes(traitOption.field)
				&& !!deductions.find(deduction =>
						deduction.field === traitOption.field && deduction.value === traitOption.value
					)
		);
	}, [traitOptions, deductions, readOnlyFilters]);

	const preSelectedIds = React.useMemo<Set<number>>(() => {
		const ids: Set<number> = new Set<number>();
		filters.deductions.forEach(deduction => {
			const option: ITraitOption | undefined = traitOptions.find(option =>
				option.field === deduction.field && option.value === deduction.value
			);
			if (option) ids.add(option.id);
		});
		return ids;
	}, [traitOptions, filters]);

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
			gridSetup={gridSetup}
		/>
	);

	function renderPreface(): JSX.Element {
		return (
			<React.Fragment>
				Based on your guesses, the mystery crew must have all <Icon name='check' fitted /> traits and no <Icon name='ban' fitted /> traits as shown below. Tap a trait to select a deduction. Double-tap to make a selection more quickly. The list of possible solutions will be narrowed down to crew who match all selected deductions.
			</React.Fragment>
		);
	}

	function renderTrait(option: ITraitOption, isSelected: boolean): JSX.Element {
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
					<Label floating circular color={isSelected ? 'blue' : undefined}>
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
		props.closeModal();
	}
};

type DeductionContentProps = {
	deduction: IDeduction;
};

export const DeductionContent = (props: DeductionContentProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { variantMap } = React.useContext(WorfleContext);
	const { deduction } = props;

	if (deduction.field === 'series')
		return <>{(deduction.value as string).toUpperCase()}</>;

	if (deduction.field === 'rarity')
		return <>{`${deduction.value}*`}</>;

	if (deduction.field === 'skills')
		return <><img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${deduction.value}.png`} style={{ height: '1em' }} /></>;

	return <>{getTraitName(deduction.value as string, variantMap, TRAIT_NAMES)}</>;
};
