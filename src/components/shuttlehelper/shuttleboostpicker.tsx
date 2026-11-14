import React from 'react';
import { Button, Divider, Grid, Icon, Label, Popup } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import ItemDisplay from '../itemdisplay';
import CONFIG from '../CONFIG';

import { Shuttle, IShuttleBoost } from './model';
import { SHUTTLE_BOOST_BONUSES, getShuttleBoostSymbol } from './utils';

type ShuttleBoostPickerProps = {
	shuttle: Shuttle;
	// eslint-disable-next-line no-unused-vars
	onBoostSelected: (boost: IShuttleBoost | undefined) => void;
};

export const ShuttleBoostPicker = (props: ShuttleBoostPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { shuttle, onBoostSelected } = props;

	const [showPopup, setShowPopup] = React.useState<boolean>(false);

	// Only skill boosts that affect this shuttle's seats are offered
	const skills = [
		...new Set(
			shuttle.seats
			.flatMap(seat => [seat.skillA, seat.skillB])
			.filter((skill) => skill !== '')
		),
	];
	if (skills.length === 0) return <></>;

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
			<Popup.Header>
				{shuttle.name}
			</Popup.Header>
			<Popup.Content>
				<div style={{ maxHeight: '300px', overflowX: 'hidden', overflowY: 'auto', padding: '1em' }}>
					{skills.map(skill => renderSkill(skill))}
				</div>
				<div style={{ display: 'flex', columnGap: '1em', marginTop: '1em' }}>
					{shuttle.boost && (
						<Button /* No boost */
							icon='ban'
							content={t('boosts.no_boost')}
							onClick={() => selectBoost(undefined)}
							fluid
						/>
					)}
					<Button /* Close */
						content={t('global.close')}
						onClick={() => setShowPopup(false)}
						fluid
					/>
				</div>
			</Popup.Content>
		</Popup>
	);

	function renderTrigger(): React.ReactNode {
		if (!shuttle.boost) {
			return (
				<Button /* Add a boost */
					title={t('boosts.add_boost')}
					icon='plus'
					compact
				/>
			);
		}
		return (
			<div /* Change boost */
				title={t('boosts.change_boost')}
				style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
			>
				<ItemDisplay
					src={getBoostImg(shuttle.boost)}
					size={32}
					rarity={shuttle.boost.rarity}
					maxRarity={shuttle.boost.rarity}
				/>
				<span style={{ paddingLeft: '.5em', whiteSpace: 'nowrap' }}>
					{renderBonus(shuttle.boost)}
				</span>
			</div>
		);
	}

	function renderSkill(skill: string): React.ReactNode {
		return (
			<div key={skill}>
				{skills.length > 1 && (
					<Divider horizontal>
						<img
							src={`${process.env.VITE_ASSETS_URL}atlas/icon_${skill}.png`}
							style={{ height: '1.5em' }}
							className='invertibleIcon'
						/>
					</Divider>
				)}
				<Grid columns={3} centered doubling>
					{SHUTTLE_BOOST_BONUSES.map((_bonus, rarity) => renderOption({ skill, rarity }))}
				</Grid>
			</div>
		);
	}

	function renderOption(boost: IShuttleBoost): React.ReactNode {
		const isSelected = shuttle.boost?.skill === boost.skill && shuttle.boost?.rarity === boost.rarity;
		return (
			<Grid.Column
				key={`${boost.skill}_${boost.rarity}`}
				onClick={() => selectBoost(isSelected ? undefined : boost)}
				style={{ cursor: 'pointer' }}
			>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<ItemDisplay
						src={getBoostImg(boost)}
						size={48}
						rarity={boost.rarity}
						maxRarity={boost.rarity}
					/>
					<div style={{ whiteSpace: 'nowrap' }}>
						{isSelected && <Icon name='check circle' color='blue' />}
						{renderBonus(boost)}
					</div>
					{playerData && (
						<div>
							{renderOwned(boost)}
						</div>
					)}
				</div>
			</Grid.Column>
		);
	}

	function renderBonus(boost: IShuttleBoost): React.ReactNode {
		const short = CONFIG.SKILLS_SHORT.find(ss => ss.name === boost.skill)?.short ?? '';
		return <>+{SHUTTLE_BOOST_BONUSES[boost.rarity]} {short}</>;
	}

	function renderOwned(boost: IShuttleBoost): React.ReactNode {
		const symbol = getShuttleBoostSymbol(boost);
		const quantity = playerData?.player.character.items.find(item => item.symbol === symbol)?.quantity ?? 0;
		return (
			<Label /* N owned */
				size='small'
				title={t('items.n_owned', { n: `${quantity}` })}
			>
				{quantity}
			</Label>
		);
	}

	function selectBoost(boost: IShuttleBoost | undefined): void {
		onBoostSelected(boost);
		setShowPopup(false);
	}
};

function getBoostImg(boost: IShuttleBoost): string {
	return `${process.env.VITE_ASSETS_URL}items_consumables_${boost.skill.replace('_skill', '')}_consumable_${boost.rarity}.png`;
}
