import React from 'react';
import { Form, Input } from 'semantic-ui-react';

import moment from 'moment';
import { ICrewFilter, IRosterCrew } from '../../../components/crewtables/model';
import { GlobalContext } from '../../../context/globalcontext';
import { CustomTimeFilterProps, TimeframeFilter, timeframeToWeeks } from '../../../pages/events';
import { getPortalLog } from '../../../utils/misc';
import { useStateWithStorage } from '../../../utils/storage';

type ReleaseDateFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
	altTitle?: string;
};

export const ReleaseDateFilter = (props: ReleaseDateFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
    const { portal_log, crew } = globalContext.core;
    const { pageId, crewFilters, setCrewFilters } = props;

	const [releaseDateFilter, setReleaseDateFilter] = useStateWithStorage<string | undefined>(`${pageId}/releaseDateFilter`, undefined as string | undefined);
	const [customDate, setCustomDate] = useStateWithStorage<Date | undefined>(`${pageId}/customDate`,
        (() => {
            const d = new Date();
            d.setFullYear(d.getFullYear() - 1);
            return d;
        })(), { rememberForever: true });

    const { customDateVal, maxDateVal } = React.useMemo(() => {
        const maxDateVal = moment(new Date()).utc(false).format('YYYY-MM-DD');
        if (customDate) {
            try {
                const customDateVal = moment(customDate).utc(false).format('YYYY-MM-DD');
                return { customDateVal, maxDateVal };
            }
            catch {
            }
        }
        return { customDateVal: undefined, maxDateVal };
    }, [customDate]);

    const portalDate = React.useMemo(() => {
        if (portal_log?.length) {
            let update = getPortalLog(portal_log, crew, 1);
            if (update?.length) {
                return update[0].date;
            }
        }
        return undefined;
    }, [portal_log]);

    const minDate = React.useMemo(() => {
        if (releaseDateFilter === 'custom_1') return customDate ? new Date(customDate) : undefined;
        if (releaseDateFilter === 'custom_2') return portalDate ? new Date(portalDate) : undefined;
        let days = timeframeToWeeks(releaseDateFilter);
        if (!days) {
            return undefined;
        }
        days *= 7;
        let d = new Date();
        d.setDate(d.getDate() - days);
        return d;
    }, [releaseDateFilter, customDate]);

	const filterByTimeframe = (crew: IRosterCrew) => {
        if (releaseDateFilter?.length && minDate) {
            if (typeof crew.date_added === 'string') crew.date_added = new Date(crew.date_added);
            if (crew.date_added.getTime() < minDate.getTime()) return false;
        }
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'timeframe');
		if (index >= 0) crewFilters.splice(index, 1);
		if (releaseDateFilter?.length) {
			crewFilters.push({ id: 'timeframe', filterTest: filterByTimeframe });
		}
		setCrewFilters([...crewFilters]);
	}, [minDate]);

    const customFields = [
        {
            key: 'custom_1',
            value: 'custom_1',
            text: t('duration.custom_date'),
        },
    ] as CustomTimeFilterProps[];
    if (portalDate) {
        customFields.push(
            {
                key: 'custom_2',
                value: 'custom_2',
                text: t('global.portal_update')
            }
        );
    }

	return (
        <div style={{display: 'flex', flexDirection: 'row', margin: 0, padding: 0, gap: '1em', alignItems: 'flex-start', justifyContent: 'center'}}>
            <Form.Field>
                <TimeframeFilter
                    customOptions={customFields}
                    setTimeframe={setReleaseDateFilter}
                    timeframe={releaseDateFilter}
                    />
            </Form.Field>
            {releaseDateFilter === 'custom_1' && <Form.Field>
                <Input
                    type={'date'}
                    max={maxDateVal}
                    value={customDateVal}
                    onChange={(e) => {
                        setCustomDate(e.target.value ? new Date(e.target.value) : undefined)
                    }}
                    />
            </Form.Field>}
            {releaseDateFilter === 'custom_2' && !!portalDate && <div className='ui label' style={{fontSize: '1.1em'}}>
                <b>{t('global.portal_update')}{t('global.colon')}</b>
                {portalDate.toLocaleDateString()}
            </div>}
            {!releaseDateFilter?.includes("custom") && <div></div>}
        </div>
	);

};
