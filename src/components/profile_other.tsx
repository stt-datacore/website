import React, { Component } from 'react';
import { Table, Icon, Message } from 'semantic-ui-react';

type ProfileOtherProps = {
	playerData: any;
};

type ProfileOtherState = {
	quests: any[];
};

class ProfileOther extends Component<ProfileOtherProps, ProfileOtherState> {
	constructor(props: ProfileOtherProps) {
		super(props);

		this.state = {
			quests: []
		};
	}

	componentDidMount() {
		fetch('/structured/quests.json')
			.then(response => response.json())
			.then(quests => {
				this.setState({ quests });
			});
	}

	render() {
		const { playerData } = this.props;

		return (
			<div>
				<Message icon warning>
					<Icon name="exclamation triangle" />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
						This section is under development and not fully functional yet.
					</Message.Content>
				</Message>

                <Table celled selectable striped collapsing unstackable compact="very">
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={2}>Activity</Table.HeaderCell>
							<Table.HeaderCell width={1}>Status</Table.HeaderCell>
                            <Table.HeaderCell width={3}>Description</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{playerData.player.character.daily_activities
							.map((da, idx) => da.status ? (
								<Table.Row key={idx}>
									<Table.Cell>{da.name}</Table.Cell>
                                    <Table.Cell>{da.status}</Table.Cell>
                                    <Table.Cell>{da.description}</Table.Cell>
								</Table.Row>
							) : undefined)}
					</Table.Body>
				</Table>

				<Table celled selectable striped collapsing unstackable compact="very">
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={3}>Mission</Table.HeaderCell>
							<Table.HeaderCell width={3}>Status</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{playerData.player.character.accepted_missions
							.concat(playerData.player.character.dispute_histories)
							.map((mission, idx) => (
								<Table.Row key={idx}>
									<Table.Cell>{mission.symbol}</Table.Cell>
									<Table.Cell>
										Completed {mission.stars_earned} of {mission.total_stars} missions
									</Table.Cell>
								</Table.Row>
							))}
					</Table.Body>
				</Table>
			</div>
		);
	}
}

export default ProfileOther;
