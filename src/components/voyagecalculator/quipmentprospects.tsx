
import React from 'react';
import { GlobalContext } from '../../context/globalcontext';
import { Modal, Button, Checkbox, Dropdown } from 'semantic-ui-react';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';

export type QuipmentProspectMode = 'best' | 'best_2' | 'all';
export type VoyageSkillPreferenceMode = 'none' | 'voyage' | 'voyage_1' | 'voyage_2';

export type QuipmentProspectConfig = {
	mode: QuipmentProspectMode;
	enabled: boolean;
    current: boolean;
	voyage: VoyageSkillPreferenceMode;
}

export interface QuipmentProspectProps {
    config: QuipmentProspectConfig;
    setConfig: (value: QuipmentProspectConfig) => void;
}

export const QuipmentProspects = (props: QuipmentProspectProps) => {
    const globalContext = React.useContext(GlobalContext);

    const { t } = globalContext.localized;
    const { config, setConfig } = props;
    const [modalIsOpen, setModalIsOpen] = React.useState(false);

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const crewOpts = [
        { key: 'best', value: 'best', text: t('voyage.quipment.mode.best') },
        { key: 'best_2', value: 'best_2', text: t('voyage.quipment.mode.best_2') },
        { key: 'all', value: 'all', text: t('voyage.quipment.mode.all') },
    ]

    const voyOpts = [
        { key: 'none', value: 'none', text: t('voyage.quipment.skill_prefs.none') },
        { key: 'voyage', value: 'voyage', text: t('voyage.quipment.skill_prefs.voyage') },
        { key: 'voyage_1', value: 'voyage_1', text: t('voyage.quipment.skill_prefs.voyage_1') },
        { key: 'voyage_2', value: 'voyage_2', text: t('voyage.quipment.skill_prefs.voyage_2') },
    ]

    return (
		<Modal
			size='small'
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			centered={true}
		>
			<Modal.Header>
				{t('voyage.quipment.title')}
			</Modal.Header>
			<Modal.Content >
                <div style={{...flexCol, gap: '1em', flexWrap: 'wrap'}}>
                    <div style={{...flexCol, gap: '1em', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                        <Checkbox label={t('voyage.quipment.enable')}
                            style={{wordWrap:'wrap'}}
                            checked={config.enabled}
                            onChange={(e, { checked }) => setConfig({...config, enabled: !!checked })}
                            />
                        <Checkbox label={t('voyage.quipment.use_current')}
                            style={{wordWrap:'wrap'}}
                            disabled={!config.enabled}
                            checked={config.current}
                            onChange={(e, { checked }) => setConfig({...config, current: !!checked })}
                            />
                        <div style={{...flexRow, gap: '2em', flexWrap: 'wrap'}}>
                            <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
                                <b>{t('voyage.quipment.crew_prefs')}</b>
                                <Dropdown
                                    disabled={!config.enabled}
                                    selection
                                    options={crewOpts}
                                    value={config.mode}
                                    onChange={(e, { value }) => {
                                        setConfig({...config, mode: value as QuipmentProspectMode })
                                    }}
                                    />
                            </div>
                            <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
                                <b>{t('voyage.quipment.voyage_prefs')}</b>
                                <Dropdown
                                    disabled={!config.enabled}
                                    selection
                                    clearable
                                    options={voyOpts}
                                    value={config.voyage}
                                    onChange={(e, { value }) => {
                                        setConfig({...config, voyage: value as VoyageSkillPreferenceMode || 'none' })
                                    }}
                                    />
                            </div>
                        </div>
                        <i>{t('voyage.quipment.voyage_prefs_explain')}</i>
                    </div>
                </div>
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={() => setModalIsOpen(false)}>
                    {t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

    function renderTrigger() {

        return <Button color={config.enabled ? 'green' : undefined}>
            {t('voyage.quipment.title')}
        </Button>
    }
}