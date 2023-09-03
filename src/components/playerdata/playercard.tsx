import React from 'react';
import { Progress, Item, Label } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';

export const PlayerCard = () => {
	const context = React.useContext(GlobalContext);

	const playerData = context.player.playerData;
	if (!playerData) return (<></>);

	const PlayerLevelProgress = () => {
		const endingValue = playerData.player.character.xp_for_next_level - playerData.player.character.xp_for_current_level;
		const currentValue = playerData.player.character.xp - playerData.player.character.xp_for_current_level;
		const percent = (currentValue / endingValue) * 100;
		return (
			<Progress
				percent={percent.toPrecision(3)}
				label={`Level ${playerData.player.character.level}: ${playerData.player.character.xp} / ${playerData.player.character.xp_for_next_level}`}
				progress
			/>
		);
	};

	return (
		<Item.Group style={{ marginBottom: '.5em' }}>
			<Item>
				<Item.Image
					size='tiny'
					src={`${process.env.GATSBY_ASSETS_URL}${playerData.player.character.crew_avatar?.icon
							? playerData.player.character.crew_avatar.portrait.file
							: 'crew_portraits_cm_empty_sm.png'
						}`}
				/>
				<Item.Content>
					<Item.Header>{playerData.player.character.display_name}</Item.Header>
					<Item.Description>
						{playerData.player.fleet && (
							<b>{playerData.player.fleet.slabel}</b>
						)}
					</Item.Description>
					<Item.Meta>
						<Label>VIP {playerData.player.vip_level}</Label>
						<Label>
							Level {playerData.player.character.level}
						</Label>
						{playerData.calc &&
							<Label>{playerData.calc.numImmortals} immortalized</Label>
						}
					</Item.Meta>
				</Item.Content>
			</Item>
		</Item.Group>
	);
};
