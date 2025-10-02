


export type AlertMode = 'crew' | 'item' | 'ship' | 'any';

export type AlertItemType = 'crew' | 'item' | 'ship';

export interface AlertItem {
    symbol: string;
    type: AlertItemType;
}

export interface IAlertConfig {
    disableAlerts: boolean;
    alert_fuses: number;
    alert_new: number;
    always_legendary: boolean;
    alert_crew: string[];
    alert_items: string[];
    alert_ships: string[];
}

export const DefaultAlertConfig = {
    disableAlerts: false,
    alert_fuses: 1,
    alert_new: 1,
    always_legendary: true,
    alert_crew: [],
    alert_items: [],
    alert_ships: []
} as IAlertConfig;

export interface AlertModalProps {
	config: IAlertConfig;
    setConfig: (value: IAlertConfig) => void;
	renderTrigger?: () => React.JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;
};
