import React from 'react';
import {
	Button,
	Checkbox,
	Form,
	Grid,
	Icon,
	Label,
	Message,
	Popup,
	Segment
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import ItemDisplay from '../../../itemdisplay';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';
import CONFIG from '../../../CONFIG';
import { EncounterContext } from './context';
import { IChampionBoost } from './championdata';

type BoostPickerProps = {
	assignedCrew: PlayerCrew;
	assignedBoost: IChampionBoost | undefined;
	relevant?: {
		skills: string[];
		crit: boolean;
	};
	onBoostSelected: (boost: IChampionBoost | undefined) => void;
};

export const BoostPicker = (props: BoostPickerProps) => {
	const { inventory } = React.useContext(EncounterContext);
	const { assignedCrew, assignedBoost, relevant, onBoostSelected } = props;

	const [showPopup, setShowPopup] = React.useState<boolean>(false);
	const [showRelevant, setShowRelevant] = React.useState<boolean>(!!relevant);

	const boostOptions = React.useMemo<IChampionBoost[]>(() => {
		const skills: string[] = Object.keys(assignedCrew.skills).filter(skill =>
			!showRelevant || (relevant?.skills.includes(skill))
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
		if (!showRelevant || relevant?.crit) {
			for (let i = 2; i <= 5; i++) {
				options.push({
					type: 'voyage_crit_boost',
					rarity: i
				});
			}
		}
		if (showRelevant && assignedBoost && options.filter(option => option.type === assignedBoost.type).length === 0) {
			options.unshift({
				type: assignedBoost.type,
				rarity: assignedBoost.rarity
			});
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
					{relevant && boostOptions.length === 0 && renderRelevantToggle()}
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
				<BoostLabel boost={assignedBoost} />
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
							onClick={() => toggleBoost(option.type, option.rarity)}
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
										<Icon name='check circle' color='blue' />
									)}
									{getBoostShort(option)}
								</div>
								<div>
									{renderQuantity(option)}
								</div>
							</div>
						</Grid.Column>
					))}
				</Grid>
				{relevant && renderRelevantToggle()}
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

	function renderQuantity(boost: IChampionBoost): JSX.Element {
		let symbol: string = '';
		if (boost.type === 'voyage_crit_boost')
			symbol = `voyage_crit_boost_${boost.rarity}`;
		else
			symbol = `${boost.type.replace('_skill', '')}_bonus_${boost.rarity}_shuttle_consumable`;
		const quantity: number = inventory.find(item => item.symbol === symbol)?.quantity ?? 0;
		return (
			<Label size='small'>
				{quantity}
			</Label>
		);
	}

	function toggleBoost(type: string, rarity: number): void {
		if (assignedBoost?.type === type && assignedBoost?.rarity === rarity)
			onBoostSelected(undefined);
		else
			onBoostSelected({ type, rarity });
	}

	function renderRelevantToggle(): JSX.Element {
		return (
			<Form style={{ textAlign: 'center' }}>
				<Form.Field	/* Only show relevant boosts */
					control={Checkbox}
					label='Only show relevant boosts'
					checked={showRelevant}
					onChange={(e, {checked}) => setShowRelevant(checked as boolean)}
				/>
			</Form>
		);
	}
};

type BoostLabelProps = {
	boost: IChampionBoost;
};

export const BoostLabel = (props: BoostLabelProps) => {
	const { boost } = props;
	return (
		<div style={{ display: 'flex', alignItems: 'center' }}>
			<ItemDisplay
				src={getConsumableImg(boost.type, boost.rarity)}
				size={32}
				rarity={boost.rarity}
				maxRarity={boost.rarity}
			/>
			<span style={{ padding: '0 .5em', whiteSpace: 'nowrap' }}>
				{getBoostShort(boost)}
			</span>
		</div>
	);
};

function getBoostShort(boost: IChampionBoost): string {
	let short: string = `${boost.rarity}*`;
	if (boost.type === 'voyage_crit_boost')
		short += ' CRIT';
	else
		short += ` ${CONFIG.SKILLS_SHORT.find(ss => ss.name === boost.type)?.short ?? ''}`;
	return short;
}

export function getConsumableImg(type: string, rarity: number): string {
	if (type === 'voyage_crit_boost')
		return `${process.env.GATSBY_ASSETS_URL}items_consumables_voyage_crit_boost.png`;
	return `${process.env.GATSBY_ASSETS_URL}items_consumables_${type.replace('_skill', '')}_consumable_${rarity}.png`;
}
