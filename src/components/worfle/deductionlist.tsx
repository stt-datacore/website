import React from 'react';
import {
	Icon,
	Label,
} from 'semantic-ui-react';

import { IDeduction, IDeductionOption } from './model';
import { GameContext } from './context';

type DeductionListProps = {
	deductions: IDeduction[];
};

export const DeductionList = (props: DeductionListProps) => {
	const { deductionOptions, } = React.useContext(GameContext);
	const { deductions } = props;

	return (
		<Label.Group>
			{deductions.map(deduction => renderLabel(deduction))}
		</Label.Group>
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
