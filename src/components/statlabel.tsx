import React, { Component } from 'react';
import { Label } from 'semantic-ui-react';

import { DEFAULT_MOBILE_WIDTH } from './hovering/hoverstat';
import { GlobalContext } from '../context/globalcontext';

const isWindow = typeof window !== 'undefined';

export type StatLabelProps = {
	title: string | React.JSX.Element;
	value: number | string | React.JSX.Element;
	size?: 'small' | 'medium' | 'large' | 'jumbo',
	style?: React.CSSProperties
};

export class StatLabel extends Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		const size = this.props.size ?? 'medium';

		const getPadding = () => {
			if (isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH) {
				if (size === 'jumbo') {
					return "0.5em";
				}
				return undefined;
			}
			else {
				switch (size) {
					case "small":
						return "0.27em";
					case "medium":
						return "0.65em";
					case "large":
						return "0.7em";
					case "jumbo":
						return "1em";
					default:
						return "0.65em";
				}
			}
		}

		const getFontSize = () => {
			if (isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH) {
				if (size === 'jumbo') {
					return "14pt";
				}
				return undefined;
			}
			else {
				switch (size) {
					case "small":
						return "10pt";
					case "medium":
						return "12pt";
					case "large":
						return "14pt";
					case "jumbo":
						return "16pt";
					default:
						return "12pt";
				}
			}
		}

		return (
			<Label size="large" style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexDirection: "row",
					marginBottom: '0.5em',
					width: 'calc(50% - 4px)',
					marginLeft: 0,
					marginRight: 0,
					fontSize: getFontSize(),
					padding: getPadding(),
					marginTop: 0,
					...this.props.style }}>
				{title}
				<div>
					<Label.Detail>{<div style={{fontSize: size === 'jumbo' && isWindow && window.innerWidth >= DEFAULT_MOBILE_WIDTH ? '2em' : undefined}}> {value}</div>}</Label.Detail>
				</div>
			</Label>
		);
	}
}

export class ThinStatLabel extends React.Component<StatLabelProps> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    render() {
        const { title, value } = this.props;

        let sizeDefault = '12.75em';
        let sizeMobile = '12.5em';
        if (this.context.localized.language === 'de') {
            sizeDefault = '16em';
            sizeMobile = '16em';
        }
        else if (this.context.localized.language === 'sp') {
            sizeDefault = '14em';
            sizeMobile = '14em';
        }

        const style = {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5em",
            flexWrap: 'wrap',
            marginLeft: 0,
            width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? sizeMobile : sizeDefault,
        } as React.CSSProperties;

        return (<>
            {!!title &&
                <Label
                    size={window.innerWidth < DEFAULT_MOBILE_WIDTH ? "small" : "medium"}
                    style={style}
                >
                    {title}
                    <Label.Detail>{value}</Label.Detail>
                </Label>}
            {!title &&
                <div className='ui label' style={{ ...style, justifyContent: 'center' }}>{value}</div>}
        </>);
    }
}
