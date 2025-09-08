import React from 'react';
import {
	Button,
	Grid,
	Icon,
	Popup
} from 'semantic-ui-react';

import ItemDisplay from '../../../itemdisplay';
import { IChampionBoost } from './championdata';
import { MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from './championdata';

type BoostPickerProps = {
	skills: string[];
	activeBoost: IChampionBoost | undefined;
	onBoostSelected: (boost: IChampionBoost | undefined) => void;
	impact: 'now' | 'future';
};

export const BoostPicker = (props: BoostPickerProps) => {
	const { skills, activeBoost, onBoostSelected, impact } = props;

	const [showPopup, setShowPopup] = React.useState<boolean>(false);

	const options: IChampionBoost[] = [];
	skills.forEach(skill => {
		for (let i = 0; i <= 5; i++) {
			options.push({
				type: skill,
				rarity: i
			});
		}
	});

	return (
		<Popup
			trigger={renderTrigger()}
			on='click'
			open={showPopup}
			onOpen={() => setShowPopup(true)}
			onClose={() => setShowPopup(false)}
			position='top center'
			wide
		>
			<Popup.Header>
				<Button /* No boost */
					title='No boost'
					icon='ban'
					floated='right'
					onClick={() => {
						onBoostSelected(undefined);
						setShowPopup(false);
					}}
				/>
				Select a boost
				<div style={{ marginTop: '.5em', fontSize: '1rem', fontWeight: 'normal' }}>
					{impact === 'now' && <>Using a boost here will improve the odds of winning this contest.</>}
					{impact === 'future' && <>Using a boost here will improve the odds of winning later contests with this skill.</>}
				</div>
			</Popup.Header>
			<Popup.Content>
				{renderOptions()}
			</Popup.Content>
		</Popup>
	);

	function renderTrigger(): JSX.Element {
		if (!activeBoost || activeBoost.type !== skills[0]) {
			return (
				<Button /* Add a boost */
					title='Add a boost'
					icon='plus'
					size='small'
				/>
			);
		}
		return (
			<div /* Change boost */
				title='Change boost'
				style={{ cursor: 'pointer' }}
			>
				<ItemDisplay
					src={getConsumableImg(activeBoost.type, activeBoost.rarity)}
					size={32}
					rarity={activeBoost.rarity}
					maxRarity={activeBoost.rarity}
				/>
			</div>
		);
	}

	function renderOptions(): JSX.Element {
		return (
			<Grid columns={4}>
				{options.map(option => (
					<Grid.Column
						key={`${option.type}_${option.rarity}`}
						onClick={() => onBoostSelected({ type: option.type, rarity: option.rarity })}
						style={{ cursor: 'pointer' }}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'top',
								alignItems: 'center',
							}}
						>
							<div>
								<ItemDisplay
									src={getConsumableImg(option.type, option.rarity)}
									size={48}
									rarity={option.rarity}
									maxRarity={option.rarity}
								/>
							</div>
							<div style={{ whiteSpace: 'nowrap' }}>
								{activeBoost?.type === option.type && activeBoost?.rarity === option.rarity && (
									<Icon name='check' color='blue' fitted />
								)}
								<small>
									+({MIN_RANGE_BOOSTS[option.rarity]}-{MAX_RANGE_BOOSTS[option.rarity]})
								</small>
							</div>
						</div>
					</Grid.Column>
				))}
			</Grid>
		);
	}

	function getConsumableImg(skill: string, rarity: number): string {
		return `${process.env.GATSBY_ASSETS_URL}items_consumables_${skill.replace('_skill', '')}_consumable_${rarity}.png`;
	}
};
