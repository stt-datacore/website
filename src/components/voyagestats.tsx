import React, { PureComponent } from 'react';
import { Table, Grid, Header } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import ChewableWorker from 'worker-loader!../workers/chewableWorker';

import CONFIG from '../components/CONFIG';

type VoyageStatsProps = {
	voyageData: object
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
		const {voyageData} = this.props;
		const score = agg => Math.floor(agg.core + (agg.range_min+agg.range_max)/2);
		this.config = {
			others: [],
			startAm: voyageData.max_hp,
			currentAm: voyageData.hp,
			elapsedSeconds: voyageData.voyage_duration,
		};

		for (let agg of Object.values(voyageData.skill_aggregates)) {
			let score = Math.floor(agg.core + (agg.range_min+agg.range_max)/2);
			let skillOdds = 0.1;

			if (agg.skill == voyageData.skills.primary_skill)
				this.config.ps = score;
			else if (agg.skill == voyageData.skills.secondary_skill)
				this.config.ss = score;
			else
				this.config.others.push(score);

			this.config.variance += ((agg.range_max-agg.range_min)/(agg.core + agg.range_max))*skillOdds;
		}

		const worker = new ChewableWorker();
		worker.addEventListener('message', message => {
			this.setState({ estimate: message.data });
		});

		worker.postMessage(this.config);
	}

	_formatTime(time: number) {
		let hours = Math.floor(time);
		let minutes = Math.floor((time-hours)*60);
		return hours+"h " +minutes+"m";
	}

	_renderEstimate(topMsg: string, needsRevive: boolean = false) {
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
		var refill = 0;

		return (
			<div>
				<h3>{topMsg}</h3>
				<Table>
					{!needsRevive && renderEst("Estimate", refill++)}
					{renderEst("1 Refill", refill++)}
					{renderEst("2 Refills", refill++)}
				</Table>
				<p>The 20 hour voyage needs {estimate['20hrrefills']} refills at a cost of {estimate['20hrdil']} dilithium.</p>
				<small>Powered by Chewable</small>
			</div>
		);
	}

	_renderRewards() {
		const pending = this.props.voyageData.pending_rewards != [];
		const rewards = pending
			? this.props.voyageData.pending_rewards
			: this.props.voyageData.granted_rewards;
		const topMsg = pending
		 	? 'The expected rewards are'
			: 'The rewards to collect are';
		const hideRarity = (entry) => entry.type != 2 || entry.item_type != 3;
		const maxRarity = (entry) => hideRarity(entry) ? entry.rarity : 4;
		const assetURL = file => {
			let url = file === 'energy_icon'
				? 'atlas/energy_icon.png'
				: `${file.substring(1).replaceAll('/', '_')}`;

			if (!url.match(/\.png$/))
				url += '.png'
			return `${process.env.GATSBY_ASSETS_URL}${url}`;
		};

		return (
			<div>
				<h4>{topMsg}</h4>
				<Grid columns={5} centered padded>
					{rewards.loot.map((entry, idx) => (
						<Grid.Column key={idx}>
								<Header
									style={{ display: 'flex' }}
									icon={
										<ItemDisplay
											src={assetURL(entry.icon.file)}
											size={48}
											rarity={entry.rarity}
											maxRarity={maxRarity(entry)}
											hideRarity={hideRarity(entry)}
										/>
									}
									content={entry.name}
									subheader={`Got ${entry.quantity}`}
								/>
						</Grid.Column>
					))}
				</Grid>
			</div>
		);
	}

	render() {
		const { voyageData } = this.props;
		const voyState = voyageData.state;

		return (
			<div>
				{voyState === 'started' && this._renderEstimate('You have a voyage started.')}
				{voyState === 'failed' && this._renderEstimate('Your voyage needs reviving', true)}
				<br/>
				{this._renderRewards(voyageData)}
			</div>
		);
	}
}

export default VoyageStats;
