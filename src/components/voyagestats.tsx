import React, { PureComponent } from 'react';
import { Table } from 'semantic-ui-react';
import { ResponsiveLine } from '@nivo/line'
import ChewableWorker from 'worker-loader!../workers/chewableWorker2';

type VoyageStatsProps = {
	ps: number,
	ss: number,
	others: number[],
	currentAm: number,
	startAm: number,
	elapsedSeconds: number,
	prof: number
};

type VoyageStatsState = {
	estimate: []
};

export class VoyageStats extends PureComponent<VoyageStatsProps, VoyageStatsState> {
	constructor(props) {
		super(props);

		this.state = {
			estimate: undefined
		};
	}

	componentDidMount() {
		const worker = new ChewableWorker();
		worker.addEventListener('message', message => {
			this.setState({ estimate: message.data });
		});
		
		let config = Object.assign({}, this.props);
		config.numSims = 10000;
		config.createBins = true;
		worker.postMessage(config);
	}


	_formatTime(time: number) {
		let hours = Math.floor(time);
		let minutes = Math.floor((time-hours)*60);
		return hours+"h " +minutes+"m";
	}

	render() {
		let { estimate } = this.state;
		
		if (!estimate)
			return (null);
		const renderEst = (label, refills) => {
			const est = estimate['refills'][refills];
			return (
				<tr>
					<td>{label}: {this._formatTime(est.result)}</td>
					<td>90%: {this._formatTime(est.safeResult)}</td>
					<td>99%: {this._formatTime(est.saferResult)}</td>
					<td>Chance of {est.lastDil} hour dilemma: {Math.floor(est.dilChance)}%</td>
					<td>{est.refillCostResult == 0 || 'Costing ' + est.refillCostResult + ' dilithium'}</td>
				</tr>
			);
		};
		
		const header = this.props.elapsedSeconds 
			?  <h3>You have a voyage running. Heres its chances.</h3>
			: <h3>These are this voyages chances</h3>;

		let data = [];
		const estimateLabels = ['Estimate', '1 Refill', '2 Refills'];

		for (let refill in estimate.refills) {
			let label = estimateLabels[refill];
			let values = estimate.refills[refill].bins.map(bin => {
				return {
					id: label,
					x: bin.result,
					y: bin.count/10000	
				};
			});
			
			data += values;
		}
		

		return (
			<div>
				{header}
				<Table><tbody>
					{renderEst("Estimate", 0)}
					{renderEst("1 Refill", 1)}
					{renderEst("2 Refills", 2)}
				</tbody></Table>
				<p>The 20 hour voyage needs {estimate['20hrrefills']} refills at a cost of {estimate['20hrdil']} dilithium.</p>
				
				<ResponsiveLine data={data} />
				<small>Powered by Chewable</small>
			</div>
		);
	}
}

export default VoyageStats;