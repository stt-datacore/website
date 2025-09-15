import React from "react";
import { GlobalContext } from "./globalcontext";
import { Modal, Container, Message, Input, Label, Button } from "semantic-ui-react";

export type ModalConfirmProps = { message: string, title: string, affirmative?: string, negative?: string, onClose: (result: boolean) => void };
export type ModalPromptProps = { message: string, title: string, affirmative?: string, negative?: string, onClose: (result: string | null) => void, currentValue?: string, validate?: (value?: string) => boolean | string };

export interface GlobalDialogConfig {
	mode: 'edit' | 'confirm';
	title: string;
	message: string;
	affirmative: string;
	negative: string;
	onClose: (result: any) => void;
}

export interface PromptConfig extends GlobalDialogConfig {
	currentValue: string;
	onClose: (result: string | null) => void;
	validate?: (result: string) => boolean | string;
}

export interface ConfirmConfig extends GlobalDialogConfig {
	onClose: (result: boolean) => void;
}

export interface IPromptContext {
    confirm: (props: ModalConfirmProps) => void;
    prompt: (props: ModalPromptProps) => void;
};

const defaultPrompt: IPromptContext = {
    confirm: () => false,
    prompt: () => false,
};

export const PromptContext = React.createContext(defaultPrompt);

interface PromptProviderProps {
    children: JSX.Element;
}
export const PromptProvider = (props: PromptProviderProps) => {
    const context = React.useContext(GlobalContext);
    const { localized } = context;
    const { children } = props;

    const [promptModal, setPromptModal] = React.useState<GlobalDialogConfig | undefined>(undefined);

    const data: IPromptContext = {
        ...defaultPrompt,
        confirm,
        prompt
    };

    return (<>
        <PromptContext.Provider value={data}>
            {children}
        </PromptContext.Provider>
        <PromptModal promptModal={promptModal} />
    </>);

    function confirm(props: ModalConfirmProps) {
        const { t } = localized;
        const newProps = {
            mode: 'confirm',
            affirmative: t('global.yes'),
            negative: t('global.no'),
            ...props,
        } as ConfirmConfig;
        setPromptModal(newProps);
    }

    function prompt(props: ModalPromptProps) {
        const { t } = localized;
        const newProps = {
            mode: 'edit',
            affirmative: t('global.yes'),
            negative: t('global.no'),
            currentValue: props.currentValue || '',
            ...props,
        } as PromptConfig;
        setPromptModal(newProps);
    }


	function PromptModal(props: { promptModal?: GlobalDialogConfig }) {
		const { promptModal } = props;
		const [modalValue, setModalValue] = React.useState((promptModal as PromptConfig)?.currentValue || '');
		const [invalid, setInvalid] = React.useState('');

		return (<>
			{!!promptModal &&
				<Modal
					open={!!promptModal}
					size="mini"
					content={<>
						{drawModalBody()}
					</>}
					/>
			}
		</>)

		function modalAffirmative() {
			if (promptModal) {
				if (promptModal.mode === 'confirm') {
					promptModal.onClose(true);
				}
				else {
					let pc = promptModal as PromptConfig;
					if (pc.validate) {
						let res = pc.validate(modalValue);
						if (res !== true) {
							if (typeof res === 'string') {
								setInvalid(res);
							}
							else {
								setInvalid(localized.t('global.invalid_input'));
							}
							return;
						}
					}
					promptModal.onClose(modalValue);
				}
			}
			modalReset();
		}

		function modalNegative() {
			if (promptModal)  {
				if (promptModal.mode === 'confirm') {
					promptModal.onClose(false);
				}
				else {
					promptModal.onClose(null);
				}
			}
			modalReset();
		}

		function modalReset() {
			setPromptModal(undefined);
			setInvalid('');
			setModalValue('');
		}

		function drawModalBody() {
			if (!promptModal) return <></>;

			const editor = promptModal as PromptConfig;

			return <Container style={{height: '100%'}}>
				<Message>
					<h3>
						{promptModal?.title}
					</h3>
					<Message.Content>
						{promptModal.message}
						{editor.mode === 'edit' &&<>
							<br/>
							<Input error={!!invalid} style={{marginTop: '0.5em'}} fluid value={modalValue} onChange={(e, { value }) => setModalValue(value)} />
							{!!invalid && <Label color='red'>{invalid}</Label>}
							</>
						}
					</Message.Content>
				</Message>
				<div  style={{gap: '1em', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', margin: '1em'}}>
					<Button onClick={modalNegative}>{promptModal?.negative}</Button>
					<Button onClick={modalAffirmative}>{promptModal?.affirmative}</Button>
				</div>
			</Container>
		}
	}

}

