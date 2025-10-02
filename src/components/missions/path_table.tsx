import React from "react";
import { MissionChallenge, Quest, QuestFilterConfig } from "../../model/missions";
import { PathGroup, QuestSolverResult } from "../../model/worker";
import { GlobalContext } from "../../context/globalcontext";
import { Pagination, Table } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { PathCrewDisplay } from "./path_crew_display";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { Filter } from "../../model/game-elements";
import { splitPath } from "../../utils/episodes";
import PowerExplanation from "../explanations/powerexplanation";



export interface PathTableProps {
    solverResults?: QuestSolverResult,
    quest?: Quest,
    targetGroup?: string;
    pageId: string;
    config: QuestFilterConfig;
    itemTargetGroup?: string;
}

export const PathTable = (props: PathTableProps) => {
    const context = React.useContext(GlobalContext);
    const { solverResults, pageId, quest, config } = props;

    const targetGroup = props.targetGroup ?? pageId + '_threeView_target';
    const itemTargetGroup = props.itemTargetGroup ?? pageId + '_threeView_item_target';

    const [pathOption, setPathOption] = React.useState<string | undefined>(undefined);
    const [pathGroups, setPathGroups] = React.useState<PathGroup[]>(solverResults?.paths ?? []);

    const pathOpts = ["All"] as string[];
    const pathMap = {} as { [key: string]: string };

    solverResults?.paths?.forEach((p) => {
        if (!p.path_expanded) {
            p.path_expanded = splitPath(p.path).map(p => quest?.challenges?.find(f => f.id === p)).filter(f => !!f) as MissionChallenge[];
        }
        let astr = p.path_expanded?.map(ch => ch.name).join(" - ");
        if (astr) {
            if (!pathOpts.includes(astr)) {
                pathOpts.push(astr);
                pathMap[astr] = p.path;
            }
        }
    });

    React.useEffect(() => {
        if (!!pathOption?.length && solverResults?.paths?.length && pathOption !== "All" && pathMap[pathOption]) {
            setPathGroups(solverResults?.paths?.filter(f => f.path === pathMap[pathOption]));
        }
        else {
            setPathGroups(solverResults?.paths ?? []);
        }
    }, [pathOption, solverResults])

    if (pathOption?.length && !pathOpts.includes(pathOption)) {
        setTimeout(() => {
            setPathOption(undefined);
        });
    }

    const sizeChoices = [1, 2, 5, 10, 20, 50, 100].map((n) => {
        return {
            key: "page" + n.toString(),
            value: n,
            text: n.toString()
        }
    });

    const rowConfig = [
        { width: 1, column: '', title: <>Paths <PowerExplanation /></> }
    ] as ITableConfigRow[]

    function renderRow(data: PathGroup, idx: number): React.JSX.Element {

        if (!quest) return <></>

		return (
			<Table.Row key={data.path + data.mastery.toString() + data.crew.map(c => c.symbol).join(",")}>
				<Table.Cell>
                    <PathCrewDisplay
                        config={config}
                        quest={quest}
                        compact={false}
                        pathGroup={data}
                        targetGroup={targetGroup}
                        itemTargetGroup={itemTargetGroup}
                        />
				</Table.Cell>
			</Table.Row>
		);
	}

    const filterRow = (data: PathGroup, filter: Filter[]) => {
        if (filter?.length && filter[0].textSegments?.length) {
            let seg = filter[0].textSegments[0];
            const fres = !seg.negated;
            let text = seg.text.toLocaleLowerCase();

            if (data.crew.some((c) => c.name.toLocaleLowerCase().includes(text))) return fres;
            if (data.path_expanded?.some(ch => ch.name.toLocaleLowerCase().includes(text) || ch.trait_bonuses?.some(tr => tr.trait.toLocaleLowerCase() === text))) return fres;
            return false;
            //return !fres;
        }
        return true;
    }




    return (
        <React.Fragment>

            {!props.targetGroup && <CrewHoverStat targetGroup={targetGroup} />}
            {!props.itemTargetGroup && <ItemHoverStat targetGroup={itemTargetGroup} />}

            <SearchableTable
                toolCaption={'Select Path'}
                dropDownChoices={pathOpts}
                dropDownValue={pathOption}
                setDropDownValue={setPathOption}
				id='collections/progress'
                pagingOptions={sizeChoices}
				data={pathGroups}
				config={rowConfig}
				renderTableRow={(data: any, idx?: number, isActive?: boolean) => renderRow(data, idx ?? -1)}
				filterRow={(data, filter) => filterRow(data, filter)}
				explanation={
					<div>
						<p>Search for solves by crew name, challenge name, or trait.</p>
					</div>
				}
			/>
        </React.Fragment>
    )
}