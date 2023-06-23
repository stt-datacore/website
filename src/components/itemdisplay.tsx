import React, { PureComponent } from 'react';

import CONFIG from './CONFIG';
import { MergedData } from '../context/mergedcontext';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { CrewTarget } from './hovering/crewhoverstat';
import { CrewMember } from '../model/crew';
import { VoyageContext } from './voyagecalculator';

type ItemDisplayProps = {
	maxRarity: number;
	rarity: number;
	hideRarity?: boolean;
	size: number;
	style?: any;
	src: string;
	crewSymbol?: string;
	targetGroup?: string;
	setHoverItem?: (item: PlayerCrew | CrewMember | null | undefined) => void;
	playerData?: PlayerData;
	allCrew?: CrewMember[];
};

class ItemDisplay extends PureComponent<ItemDisplayProps> {
	render() {
		const { playerData, allCrew, targetGroup, crewSymbol, setHoverItem: setDisplayItem } = this.props;

		let borderWidth = Math.ceil(this.props.size / 34);
		let starSize = Math.floor(this.props.size / 6);
		let bottomStar = Math.floor(this.props.size / 23);
		let borderRadius = Math.floor(this.props.size / 7);
		let borderColor = CONFIG.RARITIES[this.props.maxRarity].color;

		let star_reward = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward.png`;
		let star_reward_inactive = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward_inactive.png`;

		let rarity = [] as JSX.Element[];
		if (!this.props.hideRarity) {
			for (let i = 0; i < this.props.rarity; i++) {
				rarity.push(<img key={i} src={star_reward} style={{ width: starSize + 'px' }} />);
			}
			for (let i = this.props.rarity; i < this.props.maxRarity; i++) {
				rarity.push(<img key={i} src={star_reward_inactive} style={{ width: starSize + 'px' }} />);
			}
		}

		let divStyle = this.props.style || {};
		divStyle.position = 'relative';
		divStyle.display = 'inline-block';
		divStyle.width = this.props.size + 'px';
		divStyle.height = this.props.size + 'px';

		let crew: PlayerCrew | undefined = undefined;

		if (playerData && allCrew && crewSymbol && targetGroup) {
			crew = playerData.player.character.crew.find(crew => crew.symbol === crewSymbol);
			if (!crew) {
				crew = allCrew.find(crew => crew.symbol === crewSymbol) as PlayerCrew | undefined;
				if (crew) crew.immortal = CompletionState.DisplayAsImmortalUnowned;
			}
		}
		
		if (crew && crewSymbol && allCrew && targetGroup && setDisplayItem) {
			return (
						
					<div style={divStyle}>
						<CrewTarget 
							inputItem={crew} 
							allCrew={allCrew} 
							targetGroup={targetGroup} 
							setDisplayItem={setDisplayItem}>
							<img
								src={this.props.src}
								style={{
									borderStyle: 'solid',
									borderRadius: borderRadius + 'px',
									borderWidth: borderWidth + 'px',
									borderColor: borderColor,
									width: this.props.size - 2 * borderWidth + 'px',
									height: this.props.size - 2 * borderWidth + 'px'
								}}
							/>
						</CrewTarget>
						{!this.props.hideRarity && (
							<div
								style={{
									position: 'absolute',
									width: this.props.size + 'px',
									bottom: bottomStar + 'px',
									left: '50%',
									transform: 'translate(-50%, 0)',
									textAlign: 'center'
								}}>
								{rarity}
							</div>
						)}
					</div>
			);
	
		}
		else {
			return (
				<div style={divStyle}>
					<img
						src={this.props.src}
						style={{
							borderStyle: 'solid',
							borderRadius: borderRadius + 'px',
							borderWidth: borderWidth + 'px',
							borderColor: borderColor,
							width: this.props.size - 2 * borderWidth + 'px',
							height: this.props.size - 2 * borderWidth + 'px'
						}}
					/>
					{!this.props.hideRarity && (
						<div
							style={{
								position: 'absolute',
								width: this.props.size + 'px',
								bottom: bottomStar + 'px',
								left: '50%',
								transform: 'translate(-50%, 0)',
								textAlign: 'center'
							}}>
							{rarity}
						</div>
					)}
				</div>
			);
		}
	}
}

export default ItemDisplay;
