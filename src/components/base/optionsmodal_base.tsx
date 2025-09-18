import React from "react";
import { Modal, Dropdown, Button, Icon } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";

export type OptionValueType = undefined | boolean | number | string | (boolean | number | string)[];

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
    renderContent?: () => JSX.Element;
    initialValue: OptionValueType;
    containerStyle?: React.CSSProperties;
}

export interface ModalOption {
    key: string | number;
    value: string | number;
    text: string;
}

export abstract class OptionsModal<TOptions extends OptionsBase> extends React.Component<OptionsModalProps<TOptions>, OptionsModalState<TOptions>> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;

    protected optionGroups: OptionGroup[];

	constructor(props: OptionsModalProps<TOptions>) {
		super(props);
		this.optionGroups = [];
		const newstate = {
			isDefault: false,
			isDirty: false,
			options: props.options ?? this.getDefaultOptions(),
			modalIsOpen: false
		} as OptionsModalState<TOptions>;

        this.state = newstate;
	}

	protected checkState(): boolean {
		let j1 = JSON.stringify(this.state.options);
		let j2 = JSON.stringify(this.getDefaultOptions());
		let j3 = JSON.stringify(this.props.options);

		const isDefault = j1 === j2;
		const isDirty = j1 !== j3;

		if (this.state.isDirty !== isDirty || this.state.isDefault !== isDefault) {
			this.setState({ ... this.state, isDefault, isDirty });
			return true;
		}
		return false;
	}

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

        const optionGroups = this.getOptionGroups();
		const { t } = this.context.localized;

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

                    {optionGroups.map((group, idx) => {
                        if (group.renderContent) {
                            return <div key={idx} style={group.containerStyle}>{group.renderContent()}</div>;
                        }
                        else return (
                            <div key={idx} style={group.containerStyle}>
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
					{!isDefault && <Button content={t('global.reset')} onClick={(e) => this.resetOptions()} />}
					{isDirty && <Button positive={true} content={t('global.apply_filters')} onClick={(e) => this.applyOptions()} />}
					{!isDirty && <Button content={t('global.close')} onClick={(e) => this.setModalIsOpen(false)} />}
				</Modal.Actions>
			</Modal>
		);
	}

	renderTrigger(): JSX.Element {
		const { isDefault } = this.state;
		const { t } = this.context.localized;
		return (
			<Button>
				<Icon name='filter' color={!isDefault ? 'green' : undefined} />
				{t('global.filters')}
			</Button>
		);
	}

	revertOptions(): void {
		this.setOptions({...this.props.options});
	}

	resetOptions(): void {
        let newstate = { ... this.state };

        for(let group of this.optionGroups){
			if (group.initialValue === undefined) {
				delete (newstate.options as OptionsBase)[group.key];
			}
			else {
            	(newstate.options as OptionsBase)[group.key] = group.initialValue;
			}
        }

		this.setState(newstate);
	}

	applyOptions(): void {
		this.props.setOptions({...this.state.options});
		this.setModalIsOpen(false);
	}

	setOptions(value: TOptions) {
		this.setState({ ... this.state, options: value });
	}

    setGroupValue(group: OptionGroup, value: any) {
        let newopts = { ... this.state.options } as TOptions;
        (newopts as OptionsBase)[group.key] = value;
        this.setState({ ... this.state, options: newopts });
    }

	setModalIsOpen(value: boolean) {
		this.setState({ ... this.state, modalIsOpen: value });
	}
};
