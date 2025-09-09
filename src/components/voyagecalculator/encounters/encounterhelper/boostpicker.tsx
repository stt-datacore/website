import React from 'react';
import {
	Button,
	Checkbox,
	Form,
	Grid,
	Icon,
	Message,
	Popup,
	Segment
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import ItemDisplay from '../../../itemdisplay';
import { CRIT_BOOSTS, IChampionBoost } from './championdata';
import { MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from './championdata';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';

type BoostPickerProps = {
	assignedCrew: PlayerCrew;
	assignedBoost: IChampionBoost | undefined;
	targetSkills: string[];
	targetCrit: boolean;
	onBoostSelected: (boost: IChampionBoost | undefined) => void;
};

export const BoostPicker = (props: BoostPickerProps) => {
	const { assignedCrew, assignedBoost, targetSkills, targetCrit, onBoostSelected } = props;

	const [showPopup, setShowPopup] = React.useState<boolean>(false);
	const [showRelevant, setShowRelevant] = React.useState<boolean>(true);

	const boostOptions = React.useMemo<IChampionBoost[]>(() => {
		const skills: string[] = Object.keys(assignedCrew.skills).filter(skill =>
			!showRelevant || targetSkills.includes(skill)
		);
		const options: IChampionBoost[] = [];
		skills.forEach(skill => {
			for (let i = 0; i <= 5; i++) {
				options.push({
					type: skill,
					rarity: i
				});
			}
		});
		if (!showRelevant || targetCrit) {
			for (let i = 2; i <= 5; i++) {
				options.push({
					type: 'voyage_crit_boost',
					rarity: i
				});
			}
		}
		return options;
	}, [assignedCrew, showRelevant]);

	return (
		<Popup
			trigger={renderTrigger()}
			on='click'
			open={showPopup}
			onOpen={() => setShowPopup(true)}
			onClose={() => setShowPopup(false)}
			position='left center'
			wide
		>
			<Popup.Content>
				<Message
					attached='top'
					onDismiss={() => setShowPopup(false)}
				>
					<CrewLabel crew={assignedCrew} />
				</Message>
				<Segment
					attached='bottom'
					style={{
						maxHeight: '200px',
						overflowX: 'hidden',
						overflowY: 'scroll',
						padding: '1em'
					}}
				>
					{boostOptions.length > 0 && renderBoosts()}
					{boostOptions.length === 0 && renderRelevantToggle()}
				</Segment>
			</Popup.Content>
		</Popup>
	);

	function renderTrigger(): JSX.Element {
		if (!assignedBoost) {
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
					src={getConsumableImg(assignedBoost.type, assignedBoost.rarity)}
					size={32}
					rarity={assignedBoost.rarity}
					maxRarity={assignedBoost.rarity}
				/>
			</div>
		);
	}

	function renderBoosts(): JSX.Element {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					rowGap: '2em'
				}}
			>
				<Grid columns={3}>
					{boostOptions.map(option => (
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
									{assignedBoost?.type === option.type && assignedBoost?.rarity === option.rarity && (
										<Icon name='check' color='blue' fitted />
									)}
									<small>
										{option.type === 'voyage_crit_boost' && (
											<>+{CRIT_BOOSTS[option.rarity]}%</>
										)}
										{option.type !== 'voyage_crit_boost' && (
											<>+({MIN_RANGE_BOOSTS[option.rarity]}-{MAX_RANGE_BOOSTS[option.rarity]})</>
										)}
									</small>
								</div>
							</div>
						</Grid.Column>
					))}
				</Grid>
				{renderRelevantToggle()}
				<Button /* No boost */
					icon='ban'
					content='No boost'
					onClick={() => {
						onBoostSelected(undefined);
						setShowPopup(false);
					}}
					fluid
				/>
			</div>
		);
	}

	function renderRelevantToggle(): JSX.Element {
		return (
			<Form style={{ textAlign: 'center' }}>
				<Form.Field
					control={Checkbox}
					label='Only show relevant boosts'
					checked={showRelevant}
					onChange={(e, {checked}) => setShowRelevant(checked as boolean)}
				/>
			</Form>
		);
	}

	function getConsumableImg(type: string, rarity: number): string {
		if (type === 'voyage_crit_boost')
			return `${process.env.GATSBY_ASSETS_URL}items_consumables_voyage_crit_boost.png`;
		return `${process.env.GATSBY_ASSETS_URL}items_consumables_${type.replace('_skill', '')}_consumable_${rarity}.png`;
	}
};
