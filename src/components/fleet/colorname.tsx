import React from "react";



export interface ColorNameProps {
    text: string;
}

export const ColorName = (props: ColorNameProps) => {

    const { text } = props;
    if (!text) return <></>
    const segments = [] as JSX.Element[];

    let splits = `${text}`.split("<#");
    if (splits.length === 1) return <span>{text}</span>;


    segments.push(<span>{splits[0]}</span>);
    for (let i = 1; i < splits.length; i++) {
        let v = splits[i].indexOf(">");
        if (v !== -1) {
            let color = splits[i].slice(0, v);
            let text = splits[i].slice(v + 1);
            segments.push(<span style={{color: "#" + color}}>{text}</span>);
        }
    }

    return <React.Fragment>
        {segments}
    </React.Fragment>
}