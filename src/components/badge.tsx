import React from "react";




export interface BadgeProps {
    value?: number;
    color?: string;
    border?: string;
    children?: React.JSX.Element;
}

export class Badge extends React.Component<BadgeProps> {

    constructor(props: BadgeProps) {
        super(props);

    }


    componentDidMount(): void {

    }

    render() {

        const { value, color, border, children } = this.props;
        let usecolor: string;

        if (!color) {
            usecolor = "aquamarine"
        }
        else {
            usecolor = color;
        }
        return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            height: "1.5em"
        }}>
            <div className="ui" style={{
                textAlign: "center",
                position: "relative",
                backgroundColor: usecolor,
                color: "darkgray",
                border,
                top: "-0.5em",
                right: "-3em",
                width: "1.2em",
                height: "1.2em",
                borderRadius: "0.6em"
            }}>
                {value}
            </div>
            {children}
        </div>)
    }






}