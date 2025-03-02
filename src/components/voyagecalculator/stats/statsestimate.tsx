import React from "react";
import { Estimate } from "../../../model/voyage";
import { GlobalContext } from "../../../context/globalcontext";
import { isMobile } from "react-device-detect";
import { Table } from "semantic-ui-react";
import { VoyageStatsChart } from "./statschart";
import { formatTime } from "../../../utils/voyageutils";
import { PrettyCost } from "./prettycost";


export interface VoyageStatsEstimateProps {
    estimate?: Estimate;
    needsRevive?: boolean;
    selectedTime?: number;
}

export const VoyageStatsEstimateTitle = (props: VoyageStatsEstimateProps) => {
    const { estimate, needsRevive } = props;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    return needsRevive || !estimate
        ? t('voyage.estimate.estimate')
        : t('voyage.estimate.estimate_time', {
            time: formatTime(estimate['refills'][0].result, t)
        });
}

export const VoyageStatsEstimate = (props: VoyageStatsEstimateProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { estimate, needsRevive, selectedTime } = props;

    if (!estimate)
        return (<div>{t('spinners.calculating_voyage_estimate')}</div>);

    const renderEst = (label, refills, idx) => {
        if (refills >= estimate['refills'].length) return (<></>);
        const est = estimate['refills'][refills];
        return (
            <tr>
                <td>{label}: {formatTime(est.result, t)}</td>
                {!isMobile && <td>90%: {formatTime(est.safeResult, t)}</td>}
                <td>99%: {formatTime(est.saferResult, t)}</td>
                <td>
                    {t('voyage.estimate.dilemma_chance', {
                        time: `${est.lastDil}`,
                        chance: `${Math.floor(est.dilChance)}`
                    })}
                </td>
                <td>
                    <PrettyCost cost={est.refillCostResult} index={idx} />
                </td>
            </tr>
        );
    };

    if (estimate.deterministic) {
        let extendTime = estimate['refills'][1].result - estimate['refills'][0].result;
        let refill = 0;

        return (
            <div>
                {t('voyage.estimate.voyage_end', {
                    time: formatTime(estimate['refills'][0].result, t)
                })}
                {t('voyage.estimate.voyage_extend', {
                    time: formatTime(extendTime, t)
                })}
                {/*
					For a {this.config?.selectedTime ?? 20} hour voyage you need {estimate['refillshr20']} refills at a cost of {estimate['dilhr20']} dilithium (or {estimate['refillshr20']} voyage revivals.) */}
                <Table style={{ marginTop: "0.5em" }}><tbody>
                    {!needsRevive && renderEst(t('voyage.estimate.estimate'), refill++, 0)}
                    {renderEst(t('voyage.estimate.1_refill'), refill++, 1)}
                    {renderEst(t('voyage.estimate.n_refills', { n: '2' }), refill++, 2)}
                </tbody></Table>
                <p>
                    {t('voyage.estimate.voyage_long_advice', {
                        h: `${selectedTime ?? 20}`,
                        r: `${estimate['refillshr20']}`,
                        d: `${estimate['dilhr20']}`,
                        re: `${estimate['refillshr20']}`
                    })}
                </p>
            </div>
        );
    } else {
        let refill = 0;

        return (
            <div>
                <Table><tbody>
                    {!needsRevive && renderEst(t('voyage.estimate.estimate'), refill++, 0)}
                    {renderEst(t('voyage.estimate.1_refill'), refill++, 1)}
                    {renderEst(t('voyage.estimate.n_refills', { n: '2' }), refill++, 2)}
                </tbody></Table>
                <p>
                    {t('voyage.estimate.voyage_long_advice', {
                        h: `${selectedTime ?? 20}`,
                        r: `${estimate['refillshr20']}`,
                        d: `${estimate['dilhr20']}`,
                        re: `${estimate['refillshr20']}`
                    })}
                </p>
                {estimate.final && <VoyageStatsChart estimate={estimate} />}
            </div>
        );
    }

}