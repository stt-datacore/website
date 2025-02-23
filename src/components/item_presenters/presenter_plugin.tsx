import React from "react";

export interface IPresenterPlugIn<T> {
    props: T;
}

export interface PresenterPluginProps<TContext> {
    context: TContext;
    data?: any;
    updateContext?: (value: TContext) => void;
    fontSize?: string;
}

export interface PresenterPluginState {
}

export abstract class PresenterPluginBase<TContext> extends React.Component<PresenterPluginProps<TContext>, PresenterPluginState> {

    static title: string;

    constructor(props: PresenterPluginProps<TContext>)
    {
        super(props);
        this.state = {} as PresenterPluginState;
    }

}

export abstract class PresenterPlugin<TContext, TProps extends PresenterPluginProps<TContext>, TState extends PresenterPluginState>
    extends PresenterPluginBase<TContext>
    implements IPresenterPlugIn<TProps>
    {
    declare props: TProps;
    constructor(props: TProps)
    {
        super(props);
        this.state = {} as TState;
    }
}


