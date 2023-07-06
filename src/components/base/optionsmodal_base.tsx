import React from "react";
import { Modal, Dropdown, Button, Icon } from "semantic-ui-react";

export type OptionValueType = boolean | number | string | (boolean | number | string)[];

export interface OptionsBase {
    [key: string]: OptionValueType | undefined;
}

export interface OptionsModalProps<TOptions extends OptionsBase> {
	options: TOptions;
	setOptions: (value: TOptions) => void;
    modalTitle: string;
};

export interface OptionsModalState<TOptions extends OptionsBase> {
	options: TOptions;
	modalIsOpen: boolean;
	isDefault: boolean;
	isDirty: boolean;
}

export interface OptionGroup {
    title: string;
    key: string;
    options?: ModalOption[];
    placeholder?: string;
    multi?: boolean;
    content?: JSX.Element;
    initialValue: OptionValueType;
    containerStyle?: React.CSSProperties;
}

export interface ModalOption {
    key: string;
    value: string | number;
    text: string;
}

export abstract class OptionsModal<TOptions extends OptionsBase> extends React.Component<OptionsModalProps<TOptions>, OptionsModalState<TOptions>> {

    protected readonly optionGroups: OptionGroup[];

	constructor(props: OptionsModalProps<TOptions>) {
		super(props);

		let newstate = {
			isDefault: false,
			isDirty: false,
			options: props.options,
			modalIsOpen: false            
		} as OptionsModalState<TOptions>;

        this.optionGroups = this.getOptionGroups();        

        newstate.options ??= {} as TOptions;

        for(let group of this.optionGroups){
            (newstate.options as OptionsBase)[group.key] = group.initialValue;
        }

        this.state = newstate;
	}

	protected abstract checkState();

    protected abstract getOptionGroups(): OptionGroup[];

    protected abstract getDefaultOptions(): TOptions;

	componentDidMount(): void {
		this.checkState();
	}

	componentDidUpdate(prevProps: Readonly<OptionsModalProps<TOptions>>, prevState: Readonly<OptionsModalState<TOptions>>, snapshot?: any): void {
		this.checkState();
	}

	render() {
		const { modalIsOpen, isDefault, isDirty, options } = this.state;
        const { modalTitle } = this.props;

        const optionGroups = this.optionGroups;

		return (
			<Modal
				open={modalIsOpen}
				onClose={() => { this.revertOptions(); this.setModalIsOpen(false); }}
				onOpen={() => this.setModalIsOpen(true)}
				trigger={this.renderTrigger()}
				size='tiny'
			>
				<Modal.Header>
					{modalTitle}
				</Modal.Header>
				<Modal.Content>

                    {optionGroups.map((group) => {
                        if (group.content) {
                            return <div style={group.containerStyle}>{group.content}</div>;
                        }
                        else return (
                            <div style={group.containerStyle}>
                                {group.title}
                                <Dropdown selection clearable fluid
                                    multiple={group.multi}
                                    placeholder={group.placeholder}
                                    options={group.options}
                                    value={(options as OptionsBase)[group.key]}
                                    onChange={(e, { value }) => this.setGroupValue(group, value)}
                                />
                            </div>
                        )
                    })}
					
				</Modal.Content>
				<Modal.Actions>
					{!isDefault && <Button content='Reset' onClick={() => this.resetOptions()} />}
					{isDirty && <Button positive={true} content='Apply filters' onClick={() => this.applyOptions()} />}
					{!isDirty && <Button content='Close' onClick={() => this.setModalIsOpen(false)} />}
				</Modal.Actions>
			</Modal>
		);
	}

	protected renderTrigger(): JSX.Element {
		const { isDefault } = this.state;

		return (
			<Button>
				<Icon name='filter' color={!isDefault ? 'green' : undefined} />
				Filters
			</Button>
		);
	}

	protected revertOptions(): void {
		this.setOptions({...this.props.options});
	}

	protected resetOptions(): void {
		this.setOptions({... this.getDefaultOptions() });
	}

	protected applyOptions(): void {
		this.props.setOptions({...this.state.options});
		this.setModalIsOpen(false);
	}

	protected setOptions(value: TOptions) {
		this.setState({ ... this.state, options: value });
	}

    protected setGroupValue(group: OptionGroup, value: any) {
        let newstate = { ... this.state } as OptionsModalState<TOptions>;
        (newstate.options as OptionsBase)[group.key] = value;
        this.setState({ ... newstate });
    }
	
	protected setModalIsOpen(value: boolean) {
		this.setState({ ... this.state, modalIsOpen: value });
	}
};
