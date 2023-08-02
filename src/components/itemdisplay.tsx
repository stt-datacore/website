import React, { PureComponent } from 'react';
import { Icon } from 'semantic-ui-react';

import CONFIG from './CONFIG';
import { IHover } from '../context/hovercontext';
import { MergedData } from '../context/mergedcontext';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { CrewTarget } from './hovering/crewhoverstat';
import { CrewMember } from '../model/crew';

interface IItemHoverOptions {
	setHover: (hover: IHover) => void;
	corner?: boolean;
};

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
	hoverOptions?: IItemHoverOptions;
	playerData?: PlayerData;
	allCrew?: CrewMember[];
};

class ItemDisplay extends PureComponent<ItemDisplayProps> {
	render(): JSX.Element {
		const { playerData, allCrew, targetGroup, crewSymbol, setHoverItem, hoverOptions } = this.props;

		let divStyle = this.props.style || {};
		divStyle.position = 'relative';
		divStyle.display = 'inline-block';
		divStyle.width = this.props.size + 'px';
		divStyle.height = this.props.size + 'px';

		if (targetGroup && (hoverOptions || setHoverItem)) {
			let crew: PlayerCrew | undefined = undefined;

			if (allCrew && crewSymbol) {
				crew = playerData?.player?.character?.crew?.find(crew => crew.symbol === crewSymbol);
				if (!crew) {
					crew = allCrew.find(crew => crew.symbol === crewSymbol) as PlayerCrew | undefined;
					if (crew) crew.immortal = CompletionState.DisplayAsImmortalUnowned;
				}
			}

			if (crew && hoverOptions?.corner) {
				return (
					<div style={divStyle}>
						{this.renderImage()}
						<div
							style={{
								position: 'absolute',
								top: '-5px',
								right: '-5px'
							}}>
							<CrewTarget
								inputItem={crew}
								targetGroup={targetGroup}
								setDisplayItem={_setDisplayItem}
							>
								<Icon name='info circle' />
							</CrewTarget>
						</div>
						{!this.props.hideRarity && this.renderRarity()}
					</div>
				);
			}
			else if (crew) {
				return (
					<div style={divStyle}>
						<CrewTarget
							inputItem={crew}
							targetGroup={targetGroup}
							setDisplayItem={_setDisplayItem}
						>
							{this.renderImage()}
						</CrewTarget>
						{!this.props.hideRarity && this.renderRarity()}
					</div>
				);
			}
		}

		return (
			<div style={divStyle}>
				{this.renderImage()}
				{!this.props.hideRarity && this.renderRarity()}
			</div>
		);

		function _setDisplayItem(crew: PlayerCrew | CrewMember | null | undefined): void {
			if (hoverOptions && targetGroup) {
				if (hoverOptions.corner && crew) console.log(`corner hover over ${crew.symbol}`);
				hoverOptions.setHover({ targetGroup, crew });
			}
			else if (setHoverItem) {
				setHoverItem(crew);
			}
		}
	}

	renderImage(): JSX.Element {
		const borderWidth = Math.ceil(this.props.size / 34);
		const borderRadius = Math.floor(this.props.size / 7);
		const borderColor = CONFIG.RARITIES[this.props.maxRarity].color;

		return (
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
		);
	}

	renderRarity(): JSX.Element {
		const star_reward = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward.png`;
		const star_reward_inactive = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward_inactive.png`;

		const starSize = Math.floor(this.props.size / 6);
		const bottomStar = Math.floor(this.props.size / 23);

		let rarity = [] as JSX.Element[];

		for (let i = 0; i < this.props.rarity; i++) {
			rarity.push(<img key={i} src={star_reward} style={{ width: starSize + 'px' }} />);
		}
		for (let i = this.props.rarity; i < this.props.maxRarity; i++) {
			rarity.push(<img key={i} src={star_reward_inactive} style={{ width: starSize + 'px' }} />);
		}

		return (
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
		);
	}
}

export default ItemDisplay;
