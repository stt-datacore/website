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
	playerData?: PlayerData;
	allCrew?: CrewMember[];
};

class ItemDisplay extends PureComponent<ItemDisplayProps> {
	render() {
		const { playerData, allCrew, targetGroup, crewSymbol } = this.props;

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

		const divStyle = { 
			... (this.props.style ?? {}), 
			position: 'relative',
			display: 'flex',
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center",
			width: this.props.size + 'px',
			height: this.props.size + 'px',
		};

		const imgStyle = {
			borderStyle: 'solid',
			borderRadius: borderRadius + 'px',
			borderWidth: borderWidth + 'px',
			borderColor: borderColor,
			width: this.props.size - 2 * borderWidth + 'px',
			height: this.props.size - 2 * borderWidth + 'px'
		} as React.CSSProperties;

		const starStyle = {
			position: 'absolute',
			width: this.props.size + 'px',
			bottom: bottomStar + 'px',
			left: '50%',
			transform: 'translate(-50%, 0)',
			textAlign: 'center'									
		} as React.CSSProperties;

		let crew: PlayerCrew | undefined = undefined;

		if (allCrew && crewSymbol && targetGroup) {
			crew = playerData?.player?.character?.crew?.find(crew => crew.symbol === crewSymbol);
			if (!crew) {
				crew = allCrew.find(crew => crew.symbol === crewSymbol) as PlayerCrew | undefined;
				if (crew) crew.immortal = CompletionState.DisplayAsImmortalUnowned;
			}
		}
		
		if (crew && crewSymbol && allCrew && targetGroup) {
			return (						
					<div style={divStyle}>
						<CrewTarget 
							inputItem={crew} 
							targetGroup={targetGroup} 
							>
							<img
								src={this.props.src}
								style={imgStyle}
							/>
						</CrewTarget>
						{!this.props.hideRarity && (
							<div
								style={starStyle}>
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
						style={imgStyle}
					/>
					{!this.props.hideRarity && (
						<div
							style={starStyle}>
							{rarity}
						</div>
					)}
				</div>
			);
		}
	}
}

export default ItemDisplay;
