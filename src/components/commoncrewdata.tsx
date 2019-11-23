import React, { Component } from 'react';
import { Header, Segment, Accordion, Statistic, Grid, Image, Label } from 'semantic-ui-react';

import { graphql, Link } from 'gatsby';

import CrewStat from '../components/crewstat';
import CONFIG from '../components/CONFIG';

import { getCoolStats } from '../utils/misc';

type StatLabelProps = {
	title: string;
	value: string;
};

class StatLabel extends Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		return (
			<Label size='large' style={{marginBottom: '0.5em'}}>
				{title}
				<Label.Detail>{value}</Label.Detail>
			</Label>
		);
	}
}

type CommonCrewDataProps = {
	crew: any;
	markdownRemark: any;
	compact?: boolean;
	crewDemands?: any;
};

class CommonCrewData extends Component<CommonCrewDataProps> {
	render() {
		const { markdownRemark, crew, compact, crewDemands } = this.props;

		return (
			<React.Fragment>
				{compact ? (
					<Segment>
						<Grid columns={2}>
							<Grid.Column width={4}>
								<Image src={`/media/assets/${crew.imageUrlFullBody}`} size='tiny' />
							</Grid.Column>
							<Grid.Column width={12}>
								<CrewStat skill_name='security_skill' data={crew.base_skills.security_skill} scale={compact ? 0.75 : 1} />
								<CrewStat skill_name='command_skill' data={crew.base_skills.command_skill} scale={compact ? 0.75 : 1} />
								<CrewStat skill_name='diplomacy_skill' data={crew.base_skills.diplomacy_skill} scale={compact ? 0.75 : 1} />
								<CrewStat skill_name='science_skill' data={crew.base_skills.science_skill} scale={compact ? 0.75 : 1} />
								<CrewStat skill_name='medicine_skill' data={crew.base_skills.medicine_skill} scale={compact ? 0.75 : 1} />
								<CrewStat skill_name='engineering_skill' data={crew.base_skills.engineering_skill} scale={compact ? 0.75 : 1} />
							</Grid.Column>
						</Grid>
					</Segment>
				) : (
					<Segment>
						<CrewStat skill_name='security_skill' data={crew.base_skills.security_skill} scale={compact ? 0.75 : 1} />
						<CrewStat skill_name='command_skill' data={crew.base_skills.command_skill} scale={compact ? 0.75 : 1} />
						<CrewStat skill_name='diplomacy_skill' data={crew.base_skills.diplomacy_skill} scale={compact ? 0.75 : 1} />
						<CrewStat skill_name='science_skill' data={crew.base_skills.science_skill} scale={compact ? 0.75 : 1} />
						<CrewStat skill_name='medicine_skill' data={crew.base_skills.medicine_skill} scale={compact ? 0.75 : 1} />
						<CrewStat skill_name='engineering_skill' data={crew.base_skills.engineering_skill} scale={compact ? 0.75 : 1} />
					</Segment>
				)}

				{crew.flavor && !compact && <p>{crew.flavor}</p>}

				{compact && (
					<div style={{textAlign: 'center'}}>
						<StatLabel title='Voyage rank' value={crew.ranks.voyRank} />
						<StatLabel title='Gauntlet rank' value={crew.ranks.gauntletRank} />
						{markdownRemark.frontmatter.bigbook_tier !== null && (
							<StatLabel title='Big book tier' value={markdownRemark.frontmatter.bigbook_tier} />
						)}
						{markdownRemark.frontmatter.events !== null && (
							<StatLabel title='Events' value={markdownRemark.frontmatter.events} />
						)}
					</div>
				)}

				{!compact && (
					<Statistic.Group style={{ paddingBottom: '2em' }} size='tiny'>
						{markdownRemark.frontmatter.events !== null && (
							<Statistic>
								<Statistic.Label>Events</Statistic.Label>
								<Statistic.Value>{markdownRemark.frontmatter.events}</Statistic.Value>
							</Statistic>
						)}
						{markdownRemark.frontmatter.bigbook_tier !== null && (
							<Statistic>
								<Statistic.Label>Tier</Statistic.Label>
								<Statistic.Value>{markdownRemark.frontmatter.bigbook_tier}</Statistic.Value>
							</Statistic>
						)}
						{!compact && markdownRemark.frontmatter.in_portal !== null && (
							<Statistic color={markdownRemark.frontmatter.in_portal ? 'green' : 'red'}>
								<Statistic.Label>Portal</Statistic.Label>
								<Statistic.Value>{markdownRemark.frontmatter.in_portal ? 'YES' : 'NO'}</Statistic.Value>
							</Statistic>
						)}
						<Statistic>
							<Statistic.Label>Voyage Rank</Statistic.Label>
							<Statistic.Value>{crew.ranks.voyRank}</Statistic.Value>
						</Statistic>
						<Statistic>
							<Statistic.Label>Gauntlet Rank</Statistic.Label>
							<Statistic.Value>{crew.ranks.gauntletRank}</Statistic.Value>
						</Statistic>
					</Statistic.Group>
				)}

				{crewDemands && (
					<p>
						<b>{crewDemands.factionOnlyTotal}</b>
						{' faction items, '}
						<span style={{ display: 'inline-block' }}>
							<img src={`/media/icons/energy_icon.png`} height={14} />
						</span>{' '}
						<b>{crewDemands.totalChronCost}</b>
						{', '}
						<span style={{ display: 'inline-block' }}>
							<img src={`/media/icons/images_currency_sc_currency_0.png`} height={16} />
						</span>{' '}
						<b>{crewDemands.craftCost}</b>
					</p>
				)}

				<Accordion
					defaultActiveIndex={-1}
					panels={[
						{
							index: 0,
							key: 0,
							title: getCoolStats(crew, false),
							content: { content: <div style={{ paddingBottom: '1em' }}>{this.renderOtherRanks(crew)}</div> }
						}
					]}
				/>

				<p>
					<b>Traits: </b>
					{crew.traits_named
						.map(trait => (
							<a key={trait} href={`/?search=trait:${trait}`}>
								{trait}
							</a>
						))
						.reduce((prev, curr) => [prev, ', ', curr])}
					{', '}
					{crew.traits_hidden
						.map(trait => (
							<a style={{ color: 'lightgray' }} key={trait} href={`/?search=trait:${trait}`}>
								{trait}
							</a>
						))
						.reduce((prev, curr) => [prev, ', ', curr])}
				</p>

				{crew.cross_fuse_targets && crew.cross_fuse_targets.symbol && (
					<p>
						Can cross-fuse with <Link to={`/crew/${crew.cross_fuse_targets.symbol}/`}>{crew.cross_fuse_targets.name}</Link>.
					</p>
				)}

				{crew.collections.length > 0 && (
					<p>
						<b>Collections: </b>
						{crew.collections
							.map(col => (
								<Link key={col} to={`/collections/#${encodeURIComponent(col)}`}>
									{col}
								</Link>
							))
							.reduce((prev, curr) => [prev, ', ', curr])}
					</p>
				)}
			</React.Fragment>
		);
	}

	renderOtherRanks(crew) {
		let v = [];
		let g = [];
		let b = [];

		const skillName = short => CONFIG.SKILLS[CONFIG.SKILLS_SHORT.find(c => c.short === short).name];

		for (let rank in crew.ranks) {
			if (rank.startsWith('V_')) {
				v.push(
					<Statistic key={rank}>
						<Statistic.Label>{rank.substr(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{crew.ranks[rank]}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('G_')) {
				g.push(
					<Statistic key={rank}>
						<Statistic.Label>{rank.substr(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{crew.ranks[rank]}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('B_') && crew.ranks[rank]) {
				b.push(
					<Statistic key={rank}>
						<Statistic.Label>{skillName(rank.substr(2))}</Statistic.Label>
						<Statistic.Value>{crew.ranks[rank]}</Statistic.Value>
					</Statistic>
				);
			}
		}

		return (
			<React.Fragment>
				<Segment>
					<Header as='h5'>Base ranks</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{b}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as='h5'>Voyage combo ranks</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{v}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as='h5'>Gauntlet combo ranks</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{g}
					</Statistic.Group>
				</Segment>
			</React.Fragment>
		);
	}
}

export default CommonCrewData;

export const query = graphql`
	fragment RanksFragment on CrewJson {
		ranks {
			voyRank
			gauntletRank
			V_CMD_SCI
			V_CMD_SEC
			V_CMD_ENG
			V_CMD_DIP
			V_CMD_MED
			V_SCI_SEC
			V_SCI_ENG
			V_SCI_DIP
			V_SCI_MED
			V_SEC_ENG
			V_SEC_DIP
			V_SEC_MED
			V_ENG_DIP
			V_ENG_MED
			V_DIP_MED
			G_CMD_SCI
			G_CMD_SEC
			G_CMD_ENG
			G_CMD_DIP
			G_CMD_MED
			G_SCI_SEC
			G_SCI_ENG
			G_SCI_DIP
			G_SCI_MED
			G_SEC_ENG
			G_SEC_DIP
			G_SEC_MED
			G_ENG_DIP
			G_ENG_MED
			G_DIP_MED
			B_SCI
			B_SEC
			B_ENG
			B_DIP
			B_CMD
			B_MED
		}
	}
`;
