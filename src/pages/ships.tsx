import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import { ShipTable } from '../components/ship/shiptable';
import { GlobalContext } from '../context/globalcontext';
import { Icon, Step } from 'semantic-ui-react';

const ShipsPage = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const [mode, setMode] = React.useState<'all' | 'owned'>("all");

    React.useEffect(() => {
        if (!playerData && mode === 'owned') {
            setMode('all');
        }
        else if (!!playerData && mode === 'all') {
            setMode('owned');
        }
    }, [playerData]);

    return <DataPageLayout demands={['all_ships']} playerPromptType='recommend' pageTitle={t('pages.ships')}>
        <React.Fragment>
            {!!playerData && <Step.Group fluid style={{marginBottom: '1em'}}>
				<Step active={mode === 'owned'} onClick={() => setMode('owned')}>
					<Step.Content>
						<Step.Title>{t('ship.roster.owned')}</Step.Title>
						<Step.Description>{t('ship.roster.owned')}</Step.Description>
					</Step.Content>
				</Step>
				<Step active={mode === 'all'} onClick={() => setMode('all')}>
					<Step.Content>
						<Step.Title>{t('ship.roster.all')}</Step.Title>
						<Step.Description>{t('ship.roster.all')}</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>}
            <ShipTable pageId='main_ship_table' mode={mode} />
		</React.Fragment>
    </DataPageLayout>
}

export default ShipsPage;

