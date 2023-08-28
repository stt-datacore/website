import React from 'react';
import { GlobalContext } from '../context/globalcontext';
import { ValidDemands } from '../context/datacontext';

import Layout from '../components/layout';

export interface DataPageLayoutProps {
	children: JSX.Element;

    pageId?: string;

    /**
     * Page title, header property is used if undefined
     */
    pageTitle?: string;
	header?: string;

    /**
     * Default demands are crew, items, ship_schematics, and all_buffs.
     */
	demands?: ValidDemands[]

    notReadyMessage?: string;

	narrowLayout?: boolean;

	/** default is true */
	initPlayerData?: boolean;
};

const DataPageLayout = <T extends DataPageLayoutProps>(props: T) => {
	const global = React.useContext(GlobalContext);

	const { children, pageId, pageTitle, header, notReadyMessage, narrowLayout } = props;

    const demands = props.demands ?? [] as ValidDemands[];
    (['crew', 'items', 'ship_schematics', 'all_buffs', 'cadet'] as ValidDemands[]).forEach(required => {
        if (!demands.includes(required))
            demands.push(required);
    });

    const isReady = !!global.core.ready && !!global.core.ready(demands);

	return (
		<Layout header={header} title={pageTitle ?? header} narrowLayout={narrowLayout}>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>{notReadyMessage ?? 'Loading data...'}</div>
			}
			{isReady &&
				<React.Fragment>
                    {children}
				</React.Fragment>
			}
		</Layout>
	);
};

export default DataPageLayout;
