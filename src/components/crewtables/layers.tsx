import React from 'react';

export interface DataField {
    title?: string;
    description?: string;
    type?: 'string' | 'number' | 'custom';
    path?: string;
    provideValue?: (item: any) => any;
}

export interface FilterLayerProps {
    ChildComponent?: typeof React.Component & FilterLayer;
    children?: React.JSX.Element;
    dataSource: any[];
    fields: DataField[];
}

export interface FilterLayerState {
    currentData: any[];
}

export abstract class FilterLayer extends React.Component<FilterLayerProps, FilterLayerState> {
    protected inited = false;

    constructor(props: FilterLayerProps) {
        super(props);
        this.state = {
            currentData: []
        }
    }

    abstract processData();

    abstract renderFilters(): React.JSX.Element;

    componentDidMount(): void {
        this.initData();
    }

    componentDidUpdate(prevProps: Readonly<FilterLayerProps>, prevState: Readonly<FilterLayerState>, snapshot?: any): void {
        this.initData();
    }

    protected initData() {
        if (this.inited) return;
        this.inited = true;
    }

    render() {
        const { ChildComponent, fields, children } = this.props;

        return (<div style={{display:"flex", flexDirection: "column", justifyContent:"center", alignItems:"center"}}>
            {this.renderFilters()}
            {ChildComponent && <ChildComponent fields={fields} dataSource={this.processData()} />}
            {children}
        </div>);
    }
}

