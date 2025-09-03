import React from 'react';

import { DataContext, ICoreContext, ValidDemands, defaultCore } from './datacontext';
import { PlayerContext, PlayerContextData, defaultPlayer } from './playercontext';
import { DefaultLocalizedData, LocalizedContext, ILocalizedData, TranslatedCore } from './localizedcontext';
import { BuffStatTable } from "../utils/voyageutils";
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import { Button, Container, Input, Label, Message, Modal, Segment } from 'semantic-ui-react';
import { MarketAggregation } from '../model/celestial';

const DEBUG_MODE = false;

export type ModalConfirmProps = { message: string, title: string, affirmative?: string, negative?: string, onClose: (result: boolean) => void };
export type ModalPromptProps = { message: string, title: string, affirmative?: string, negative?: string, onClose: (result: string | null) => void, currentValue?: string };

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
}

export interface ConfirmConfig extends GlobalDialogConfig {
	onClose: (result: boolean) => void;
}

interface GlobalProviderProperties {
	children: JSX.Element;
};

interface ILocalizationTrigger {
	triggered: boolean;
	onReady: () => void;
};

export interface IDefaultGlobal {
    core: ICoreContext;
    player: PlayerContextData;
	localized: ILocalizedData;
    maxBuffs: BuffStatTable | undefined;
	data?: any;
	isMobile: boolean;
	readyLocalizedCore: (demands: ValidDemands[], onReady: () => void) => void;
	confirm: (props: ModalConfirmProps) => void;
	prompt: (props: ModalPromptProps) => void;
	market: MarketAggregation;
	reloadMarket: () => void;
};

const defaultGlobal: IDefaultGlobal = {
    core: defaultCore,
    player: defaultPlayer,
	localized: DefaultLocalizedData,
    maxBuffs: undefined,
	isMobile: false,
	market: {},
	readyLocalizedCore: () => {},
	confirm: () => false,
	prompt: () => false,
	reloadMarket: () => false,
};

export const GlobalContext = React.createContext<IDefaultGlobal>(defaultGlobal);

export const GlobalProvider = (props: GlobalProviderProperties) => {
    const core = React.useContext(DataContext);
    const player = React.useContext(PlayerContext);
	const localized = React.useContext(LocalizedContext);
	const { children } = props;

	const [localizedCore, setLocalizedCore ] = React.useState<ICoreContext>(core);
	const [localizedPlayer, setLocalizedPlayer] = React.useState<PlayerContextData>(player);
	const [localizationTrigger, setLocalizationTrigger] = React.useState<ILocalizationTrigger | undefined>(undefined);
	const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH);

	const [promptModal, setPromptModal] = React.useState<GlobalDialogConfig | undefined>(undefined);
	const [modalValue, setModalValue] = React.useState('');

	const [market, setMarket] = React.useState<MarketAggregation>({});

	React.useEffect(() => {
		if (!localizationTrigger) return;
		const translatedCore: TranslatedCore = localized.translateCore();
		setLocalizedCore({ ...core, ...translatedCore });
		if (DEBUG_MODE) console.log("localizationTrigger.onReady()");
		localizationTrigger.onReady();
	}, [localizationTrigger]);

	React.useEffect(() => {
		if (DEBUG_MODE) console.log("Effect for: localizedCore or player updated.");
		const translatedPlayer: PlayerContextData = localized.translatePlayer();
		setLocalizedPlayer(translatedPlayer);
	}, [localizedCore, player]);

	if (typeof window !== 'undefined') {
		window.addEventListener('resize', (e) => {
			let mobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
			if (isMobile !== mobile) {
				setIsMobile(mobile);
			}
		});
	}

	let maxBuffs: BuffStatTable | undefined;

	maxBuffs = player.maxBuffs;

	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && core.all_buffs) {
		maxBuffs = core.all_buffs;
	}

	const providerValue: IDefaultGlobal = {
		core: localizedCore,
		player: localizedPlayer,
		localized,
        maxBuffs,
		isMobile,
		market,
		readyLocalizedCore,
		confirm,
		prompt,
		reloadMarket
	};

	return (
		<React.Fragment>
			<GlobalContext.Provider value={providerValue}>
				{children}
			</GlobalContext.Provider>
			{!!promptModal &&
				<Modal
					open={!!promptModal}
					size="mini"
					content={<>
						{drawModalBody()}
					</>}
					/>
			}
		</React.Fragment>
	);

	function readyLocalizedCore(demands: ValidDemands[], onReady: () => void): void {
		if (DEBUG_MODE) console.log("enter readyLocalizedCore");

		core.ready(demands, () => {
			if (DEBUG_MODE) console.log("setLocalizationTrigger");
			setLocalizationTrigger({
				triggered: true,
				onReady
			});
		});
	}

	function reloadMarket() {
		fetch('https://datacore.app/api/celestial-market')
			.then((response) => response.json())
			.then(market => {
				setMarket(market);
			})
			.catch((e) => {
				console.log(e);
				if (!market) setMarket({});
			});
	}

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
			currentValue: '',
			...props,
		} as PromptConfig;
		setPromptModal(newProps);
	}

	function modalAffirmative() {
		if (promptModal)  {
			if (promptModal.mode === 'confirm') {
				promptModal.onClose(true);
			}
			else {
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
					{editor.mode === 'edit' &&
						<Input value={editor.currentValue} onChange={(e, { value }) => setModalValue(value)} />
					}
				</Message.Content>
			</Message>
			<div  style={{gap: '1em', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', margin: '1em'}}>
				<Button onClick={modalNegative}>{promptModal?.negative}</Button>
				<Button onClick={modalAffirmative}>{promptModal?.affirmative}</Button>
			</div>
		</Container>
	}
};
