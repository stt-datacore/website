import React from "react";
import { Accordion, Segment } from "semantic-ui-react";

export interface StatsAccordionProps {
    title: string | JSX.Element,
    collapsedTitle?: string | JSX.Element
    index: string,
    isActive: boolean;
    content: JSX.Element,
    handleClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, {index}: { index: string | number | undefined; }) => void;
}

export const StatsAccordionPanel = (props: StatsAccordionProps) => {
    const { isActive, title, content, index, collapsedTitle: ctitle, handleClick } = props;
    const collapsedTitle = ctitle ? ctitle : title;

    return (
        <Accordion.Panel
            active={isActive}
            index={index}
            onTitleClick={(e, {index}) => handleClick(e, {index})}
            title={isActive ? {icon: 'caret down', content: collapsedTitle} : {icon: 'caret right', content: collapsedTitle}}
            content={{content: <Segment>{content}</Segment>}}/>
    );
};