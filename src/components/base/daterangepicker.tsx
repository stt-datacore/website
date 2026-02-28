import React from "react";
import { OptionsPanelFlexColumn } from "../stats/utils";
import { Form } from "semantic-ui-react";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GlobalContext } from "../../context/globalcontext";

export interface DateRangePickerProps {
    startDate?: Date;
    endDate?: Date;
    setStartDate: (value?: Date) => void;
    setEndDate?: (value?: Date) => void;
    minDate?: Date;
    maxDate?: Date;
}

export const DateRangePicker = (props: DateRangePickerProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const flexCol = OptionsPanelFlexColumn;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const { minDate, maxDate, startDate, endDate, setStartDate, setEndDate } = props;

    const config = React.useMemo(() => {
        const startValue = getValue('start');
        const startMin = getMinDate('start');
        const startMax = getMaxDate('start');
        const endValue = getValue('end');
        const endMin = getMinDate('end');
        const endMax = getMaxDate('end');
        return { startValue, startMin, startMax, endValue, endMin, endMax };
    }, [minDate, maxDate, startDate, endDate]);

    const { startValue, startMin, startMax, endValue, endMin, endMax } = config;

    return (<>
        <div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
            <span>{t('global.date_start')}</span>
            <Form.Input
                style={{minWidth: !isMobile ? '14.25em' : undefined}}
                type='date'
                value={startValue}
                min={startMin}
                max={startMax}
                onChange={(e, { value }) => setValue(value, 'start')}
            />
        </div>
        {!!setEndDate && <div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
            <span>{t('global.date_end')}</span>
            <Form.Input
                style={{minWidth: !isMobile ? '14.25em' : undefined}}
                type='date'
                value={endValue}
                min={endMin}
                max={endMax}
                onChange={(e, { value }) => setValue(value, 'end')}
            />
        </div>}
    </>);

    function getMinDate(widget: 'start' | 'end') {
        let d1 = minDate;
        let d2 = startDate;
        if (widget === 'end' && d2) return d2.toISOString().slice(0, 10);
        if (d2 && d1) {
            if (d1.getTime() < d2.getTime()) return d1.toISOString().slice(0, 10);
            else return d2.toISOString().slice(0, 10);
        }
        if (widget === 'end') {
            if (d1) return d1.toISOString().slice(0, 10);
            else if (d2) return d2.toISOString().slice(0, 10);
        }
        else {
            if (d1) return d1.toISOString().slice(0, 10);
        }
        return undefined;
    }

    function getMaxDate(widget: 'start' | 'end') {
        let d1 = maxDate;
        let d2 = endDate;
        if (widget === 'start' && d2) return d2.toISOString().slice(0, 10);
        if (d2 && d1) {
            if (d1.getTime() > d2.getTime()) return d1.toISOString().slice(0, 10);
            else return d2.toISOString().slice(0, 10);
        }
        if (widget === 'start') {
            if (d1) return d1.toISOString().slice(0, 10);
            else if (d2) return d2.toISOString().slice(0, 10);
        }
        else {
            if (d1) return d1.toISOString().slice(0, 10);
        }
        return undefined;
    }

    function getValue(widget: 'start' | 'end') {
        if (widget === 'start') {
            if (startDate && typeof startDate === 'string') return (new Date(startDate)).toISOString().slice(0, 10);
            let s = startDate?.toISOString().slice(0, 10);
            return s;
        }
        else {
            if (endDate && typeof endDate === 'string') return (new Date(endDate)).toISOString().slice(0, 10);
            let s = endDate?.toISOString().slice(0, 10);
            return s;
        }
    }

    function setValue(value: string | undefined, widget: 'start' | 'end') {
        let d = value ? new Date(value) : undefined;
        if (d && `${d}`.toLowerCase() === 'invalid date') d = undefined;
        if (widget === 'start') {
            if (d && endDate) {
                if (d.getTime() > endDate.getTime()) {
                    setStartDate(endDate);
                    return;
                }
            }
            setStartDate(d);
        }
        else if (setEndDate) {
            if (d && startDate) {
                if (d.getTime() < startDate.getTime()) {
                    setEndDate(startDate);
                    return;
                }
            }
            setEndDate(d);
        }
    }
}