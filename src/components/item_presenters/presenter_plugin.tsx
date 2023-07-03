import React from "react";
import { PlayerCrew } from "../../model/player";
import { CrewMember } from "../../model/crew";
import { Ship } from "../../model/ship";

export interface PresenterPluginProps<TContext> {
    context: TContext;
    updateContext?: (value: TContext) => void;
    fontSize?: string;
}

export interface PresenterPluginState {
}

export abstract class PresenterPluginBase<TContext> extends React.Component<PresenterPluginProps<TContext>, PresenterPluginState> {
    constructor(props: PresenterPluginProps<TContext>)
    {
        super(props);
        this.state = {} as PresenterPluginState;
    }

}

export abstract class PresenterPlugin<TContext, TProps extends PresenterPluginProps<TContext>, TState extends PresenterPluginState> 
    extends PresenterPluginBase<TContext> {
    constructor(props: TProps)
    {
        super(props);
        this.state = {} as TState;
    }
}


