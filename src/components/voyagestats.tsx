import React, { PureComponent } from 'react';
import { Table } from 'semantic-ui-react';
import ChewableWorker from 'worker-loader!../workers/chewableWorker';

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
		
		worker.postMessage(this.props);
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
		
		return (
			<div>
				{header}
				<Table>
					{renderEst("Estimate", 0)}
					{renderEst("1 Refill", 1)}
					{renderEst("2 Refills", 2)}
				</Table>
				<p>The 20 hour voyage needs {estimate['20hrrefills']} refills at a cost of {estimate['20hrdil']} dilithium.</p>
				<small>Powered by Chewable</small>
			</div>
		);
	}
}

export default VoyageStats;