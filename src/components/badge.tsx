import React from "react";




export interface BadgeProps {
    value?: number;
    children?: JSX.Element;
}

export class Badge extends React.Component<BadgeProps> {

    constructor(props: BadgeProps) {
        super(props);

    }



    render() {

        const { children } = this.props;

        return (
        <div>
            {children}    
        </div>)
    }

    




}