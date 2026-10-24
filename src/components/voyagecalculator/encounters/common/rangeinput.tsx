import React from 'react';
import {
	Input
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { IContestSkill } from '../model';

type ProficiencyRangeInputProps = {
	contestSkill: IContestSkill;
	onChange: (contestSkill: IContestSkill) => void;
};

export const ProficiencyRangeInput = (props: ProficiencyRangeInputProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { contestSkill, onChange } = props;
	return (
		<div style={{ display: 'flex', alignItems: 'center', columnGap: '.5em' }}>
			<ProficiencyInput	/* Min */
				placeholder={t('voyage.contests.min')}
				field='range_min'
				contestSkill={contestSkill}
				onChange={onChange}
			/>
			-
			<ProficiencyInput	/* Max */
				placeholder={t('voyage.contests.max')}
				field='range_max'
				contestSkill={contestSkill}
				onChange={onChange}
			/>
		</div>
	);
};

type ProficiencyInputProps = {
	placeholder: string;
	field: 'range_min' | 'range_max';
	contestSkill: IContestSkill;
	onChange: (contestSkill: IContestSkill) => void;
};

const ProficiencyInput = (props: ProficiencyInputProps) => {
	const { placeholder, field, contestSkill, onChange } = props;

	const [value, setValue] = React.useState<number | string>(contestSkill[field]);
	const [invalid, setInvalid] = React.useState<boolean>(false);
	const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	React.useEffect(() => {
		setValue(contestSkill[field]);
		setInvalid(false);
	}, [contestSkill]);

	React.useEffect(() => {
		return () => clearTimeout(timer.current);
	}, []);

	return (
		<Input
			placeholder={placeholder}
			value={value}
			onChange={(e, { value }) => { setValue(value as string); validate(value as string); } }
			// onBlur={() => { if (invalid) { setValue(contestantSkill[field]); setInvalid(false); } }}
			style={{ width: '5em' }}
			error={invalid}
		/>
	);

	function validate(value: string): void {
		const parsedValue: number = parseInt(value);
		if (isNaN(parsedValue)
			|| parsedValue.toString() !== value
			|| parsedValue < 0
			|| (field === 'range_min' && parsedValue > contestSkill.range_max)
			|| (field === 'range_max' && parsedValue < contestSkill.range_min)
		) {
			setInvalid(true);
			return;
		}

		setInvalid(false);

		// Delay the edit to avoid simulating before finished input
		clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			contestSkill[field] = parsedValue;
			onChange(contestSkill);
			timer.current = undefined;
		}, 1000);
	}
};
