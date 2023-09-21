import React from 'react';
import { Icon, SemanticCOLORS } from 'semantic-ui-react';
import { IconSizeProp } from 'semantic-ui-react/dist/commonjs/elements/Icon/Icon';

export interface TablifyProps {
	image: string;
	size: IconSizeProp;
	title: string;
	color: SemanticCOLORS;
    onClick?: (e: React.MouseEvent) => void;
}

export const TableButton = (props: TablifyProps) => {
	const { image, size, title, color, onClick } = props;

	const sizeRef = [["mini", "24px"], ["tiny", "16px"], ["small", "32px"], ["large", "64px"], ["big", "96px"], ["huge", "128px"], ["massive", "256px"]];
	const sizeInfo = sizeRef.find(sr => sr[0] === size) ?? ['', ''];	

	const whole = Number.parseFloat(sizeInfo[1].replace("px", ''));
	const half = Number.parseFloat(sizeInfo[1].replace("px", '')) / 2;
	const quarter = Number.parseFloat(sizeInfo[1].replace("px", '')) / 4;

	return  (
	<div className='ui button'
        onClick={(e) => onClick ? onClick(e) : null}
		 style={{		
			display:"inline-flex",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center",
			padding: "0.5em"
		}}>
		<div 
			style={{
			display:"flex",
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			textAlign: "left",
			margin: 0,
			padding: 0,
			marginBottom: -quarter + "px",
			paddingLeft: "1em",
			paddingRight: "0.5em"
		}}>	
			<div style={{
				display:"flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent:"center",
				margin: 0,
				padding: 0
			}}>	
				<img src={image} 
					style={{
						opacity: 0.5,
						height: half + "px"
					}} />
				<Icon 
					name={'table'} 
					size={size}
					color={color}
					style={{
						position: "relative",
						left : -8 + "px",
						top : -32 + "px" 
					}} 
				/>
			</div>
			<div style={{
				fontSize:"1em", 
				marginTop: -quarter + "px", 
				padding: 0,
				}}>
					{title}
			</div>
		</div>
	</div>)
}
