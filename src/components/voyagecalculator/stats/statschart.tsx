import React from "react";
import { Estimate } from "../../../model/voyage";
import { GlobalContext } from "../../../context/globalcontext";
import { ResponsiveLineCanvas } from "@nivo/line";
import { DEFAULT_MOBILE_WIDTH } from "../../hovering/hoverstat";

import themes from '../../nivo_themes';
import { formatTime } from "../../../utils/voyageutils";

export interface VoyageStatsChartProps {
    needsRevive?: boolean;
    estimate: Estimate;
}

interface RefillBin {
	result: number;
	count: number;
}

interface Bins {
	[key: number]: RefillBin;
}

export const VoyageStatsChart = (props: VoyageStatsChartProps) => {

    const globalContext = React.useContext(GlobalContext);

    const { t } = globalContext.localized;
    const { estimate, needsRevive } = props;

		const names = needsRevive ? [t('voyage.estimate.first_refill'), t('voyage.estimate.second_refill')]
															: [ t('voyage.estimate.no_refills'), t('voyage.estimate.one_refill'), t('voyage.estimate.two_refills')];
		const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
		const rawData = needsRevive ? estimate?.refills : estimate?.refills.slice(0, 2);
		// Convert bins to percentages
		const data = estimate?.refills.map((refill, index) => {
			var bins = {} as Bins;
			const binSize = 1/30;

			for (var result of refill.all.sort()) {
				const bin = Math.floor(result/binSize)*binSize+binSize/2;

			  try{
				++bins[bin].count;
			  }
			  catch {
				bins[bin] = {result: bin, count: 1};
			  }
			}

			delete bins[NaN];
			var refillBins = Object.values(bins);

			const total = refillBins
				.map(value => value.count)
				.reduce((acc, value) => acc + value, 0);
			var aggregate = total;
			const cumValues = value => {
				aggregate -= value.count;
				return {x: value.result, y: (aggregate/total)*100};
			};
			const ongoing = value => { return {x: value.result, y: value.count/total}};

			const percentages = refillBins
				.sort((bin1, bin2) => bin1.result - bin2.result)
				.map(cumValues);

			return {
				id: names[index],
				data: percentages
			};
		});
		if (!data) return <></>;

		return (
			<div style={{height : 200}}>
				<ResponsiveLineCanvas
					data={data}
					xScale= {{type: 'linear', min: data[0].data[0].x}}
					yScale={{type: 'linear', max: 100 }}
					theme={themes.dark}
					axisBottom={{legend : t('voyage.estimate.legend.voyage_length'), legendOffset: 30, legendPosition: 'middle'}}
					axisLeft={{legend : t('voyage.estimate.legend.chance_%'), legendOffset: -36, legendPosition: 'middle'}}
					margin={{ top: 50, right: 170, bottom: 50, left: 60 }}
					enablePoints= {true}
					pointSize={0}
					crosshairType={undefined}
					tooltip={input => {
						let data = input.point.data;
						return <>{input.point.serieId}:
						{t('voyage.estimate.n_chance_of_reaching_t', {
							n: (data.y as number).toFixed(2),
							t: formatTime(data.x as number, t)
						})}
						</>;
					}}
					legends={[
						{
							anchor: 'bottom-right',
							direction: 'column',
							justify: false,
							translateX: 120,
							translateY: 0,
							itemsSpacing: 2,
							itemWidth: 100,
							itemHeight: 20,
							symbolSize: 20,
							effects: [
								{
									on: 'hover',
									style: {
										itemOpacity: 1,
									},
								},
							],
						},
					]}
				/>
			</div>
		);

}