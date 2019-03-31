import React, { PureComponent } from 'react';
import containerStyles from './simplebarchart.module.css';

type SimpleBarChartProps = {
	title: string;
	data: {
		name: string;
		value: number;
	}[];
};

function BarGroup(props) {
	let barPadding = 2;
	let barColour = '#348AA7';
	let widthScale = d => d * 20;

	let width = widthScale(props.d.value);
	let yMid = props.barHeight * 0.5;

	return (
		<g className={containerStyles.bargroup}>
			<text className={containerStyles.namelabel} x='-6' y={yMid} alignmentBaseline='middle'>
				{props.d.name}
			</text>
			<rect y={barPadding * 0.5} width={width} height={props.barHeight - barPadding} fill={barColour} />
			<text className={containerStyles.valuelabel} x={width - 8} y={yMid} alignmentBaseline='middle'>
				{props.d.value}
			</text>
		</g>
	);
}

class SimpleBarChart extends PureComponent<SimpleBarChartProps> {
	render() {
		let barHeight = 24;

		let barGroups = this.props.data.map((d, i) => (
			<g key={i} transform={`translate(0, ${i * barHeight})`}>
				<BarGroup d={d} barHeight={barHeight} />
			</g>
		));

		return (
			<svg viewBox='0 0 800 300'>
				<g className={containerStyles.container}>
					<text className='title' x='10' y='30'>
						{this.props.title}
					</text>
					<g className={containerStyles.chart} transform='translate(130,60)'>
						{barGroups}
					</g>
				</g>
			</svg>
		);
	}
}

export default SimpleBarChart;
