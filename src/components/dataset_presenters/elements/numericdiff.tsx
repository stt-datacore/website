import React from 'react';
import {
	Icon
} from 'semantic-ui-react';

type NumericDiffProps = {
	diff?: number;
	compare?: {
		currentValue: number;
		baselineValue: number;
		showCurrentValue?: boolean;
		showBaselineValue?: boolean;
	};
	customRender?: (value: number) => JSX.Element;
	showNoChange?: boolean;
	justifyContent?: string;
};

export const NumericDiff = (props: NumericDiffProps) => {
	const { compare, customRender, showNoChange, justifyContent } = props;

	const currentValue: number = compare?.currentValue ?? 0;
	const baselineValue: number = compare?.baselineValue ?? 0;

	const diff: number = props.diff ?? currentValue - baselineValue;

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '.5em', justifyContent: justifyContent ?? 'center' }}>
			{diff === 0 && (
				<React.Fragment>
					{showNoChange && <span>N/C</span>}
					{compare && compare.showCurrentValue && (
						<span>
							{showNoChange && customRender && <>({customRender(currentValue)})</>}
							{showNoChange && !customRender && <>({currentValue})</>}
							{!showNoChange && customRender && <>{customRender(currentValue)}</>}
							{!showNoChange && !customRender && <>{currentValue}</>}
						</span>
					)}
				</React.Fragment>
			)}
			{diff !== 0 && (
				<React.Fragment>
					{compare?.showBaselineValue && (
						<span style={{ whiteSpace: 'nowrap' }}>
							{customRender && <>{customRender(baselineValue)}</>}
							{!customRender && <>{baselineValue}</>}
						</span>
					)}
					<span style={{ whiteSpace: 'nowrap' }}>
						{diff < 0 && <Icon name='minus' color='red' />}
						{diff > 0 && <Icon name='plus' color='green' />}
						{customRender && customRender(Math.abs(diff))}
						{!customRender && <>{Math.abs(diff)}</>}
					</span>
					{compare?.showCurrentValue && (
						<span style={{ whiteSpace: 'nowrap' }}>
							<Icon name='arrow right' />
							{customRender && <>{customRender(currentValue)}</>}
							{!customRender && <>{currentValue}</>}
						</span>
					)}
				</React.Fragment>
			)}
		</div>
	);
};
