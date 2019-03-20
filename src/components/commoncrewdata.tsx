import React, { Component } from 'react';
import { Header, Segment, Accordion, Statistic } from 'semantic-ui-react';

import { graphql, Link } from 'gatsby';

import CrewStat from '../components/crewstat';
import CONFIG from '../components/CONFIG';

type CommonCrewDataProps = {
	crew: any;
	markdownRemark: any;
};

class CommonCrewData extends Component<CommonCrewDataProps> {
	render() {
		const { markdownRemark, crew } = this.props;

		return (
			<React.Fragment>
				<Segment>
					<CrewStat skill_name='security_skill' data={crew.base_skills.security_skill} />
					<CrewStat skill_name='command_skill' data={crew.base_skills.command_skill} />
					<CrewStat skill_name='diplomacy_skill' data={crew.base_skills.diplomacy_skill} />
					<CrewStat skill_name='science_skill' data={crew.base_skills.science_skill} />
					<CrewStat skill_name='medicine_skill' data={crew.base_skills.medicine_skill} />
					<CrewStat skill_name='engineering_skill' data={crew.base_skills.engineering_skill} />
				</Segment>

				{crew.flavor && <p>{crew.flavor}</p>}

				<Statistic.Group style={{ paddingBottom: '2em' }} size={'tiny'}>
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
					{markdownRemark.frontmatter.in_portal !== null && (
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

				<Accordion
					defaultActiveIndex={-1}
					panels={[
						{
							index: 0,
							key: 0,
							title: this.getCoolStats(crew),
							content: { content: <div style={{ paddingBottom: '1em' }}>{this.renderOtherRanks(crew)}</div> }
						}
					]}
				/>

				<p>
					<b>Traits: </b>
					{crew.traits_named.join(', ')}
					<span style={{ color: 'lightgray' }}>, {crew.traits_hidden.join(', ')}</span>
				</p>

				{crew.cross_fuse_targets && crew.cross_fuse_targets.symbol && <p>
					Can cross-fuse with <Link to={`/crew/${crew.cross_fuse_targets.symbol}/`}>{crew.cross_fuse_targets.name}</Link>.
				</p>}

				{crew.collections.length > 0 && (
					<p>
						<b>Collections: </b>
						{crew.collections
							.map(col => (
								<Link key={col} to={`/collection/${col}/`}>
									{col}
								</Link>
							))
							.reduce((prev, curr) => [prev, ', ', curr])}
					</p>
				)}
			</React.Fragment>
		);
	}

	getCoolStats(crew) {
		let stats = [];

		const rankType = rank => {
			return rank.startsWith('V_') ? 'Voyage' : rank.startsWith('G_') ? 'Gauntlet' : 'Base';
		};

		for (let rank in crew.ranks) {
			if (rank.startsWith('V_') || rank.startsWith('B_') || rank.startsWith('G_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= 9) {
					stats.push(`${rankType(rank)} #${crew.ranks[rank]} ${rank.substr(2).replace('_', ' / ')}`);
				}
			}
		}

		if (stats.length === 0) {
			return 'More stats...';
		} else {
			return stats.join(', ') + ', more stats...';
		}
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

