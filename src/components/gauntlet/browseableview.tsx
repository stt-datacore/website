import moment from "moment";
import React from "react";
import { Dropdown } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { Gauntlet } from "../../model/gauntlets";
import { skillToShort } from "../../utils/crewutils";
import { GauntletPane } from "../../utils/gauntlet";
import { useStateWithStorage } from "../../utils/storage";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GauntletContext } from "./dataprovider";
import { GauntletView } from "./gauntletview";

export interface BrowseableGauntletProps {
    searching?: boolean;
    pane: GauntletPane;
}

export const BrowsableGauntletView = (props: BrowseableGauntletProps) => {
    const globalContext = React.useContext(GlobalContext);
    const gauntletContext = React.useContext(GauntletContext);
    const { playerData } = globalContext.player;
    const dbid = playerData ? `${playerData.player.dbid}/` : '';
    const { uniqueGauntlets: uniques } = gauntletContext;
    const { gauntlets, config } = gauntletContext;
    const { searching, pane } = props;
    const { TRAIT_NAMES, t } = globalContext.localized;
    const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
    const foreColor = theme === 'dark' ? 'white' : 'black';
    const browsing = pane === 'browse';

    const [browseGauntlet, setBrowseGauntlet] = useStateWithStorage(`${dbid}/gauntlet/browseSelection`, undefined as string | undefined);
    const [dateGauntlet, setDateGauntlet] = useStateWithStorage(`${dbid}/gauntlet/dateSelection`, undefined as string | undefined);

    const [selectedGauntlet, setSelectedGauntlet] = React.useState<string | undefined>(undefined);

    const [gauntlet, setGauntlet] = React.useState<Gauntlet | undefined>(undefined);

    React.useEffect(() => {
        if (selectedGauntlet) {
            changeGauntlet(selectedGauntlet, pane === 'browse');
        }
        else {
            if (pane === 'browse') {
                setSelectedGauntlet(browseGauntlet || 'gt_0');
            }
            else {
                setSelectedGauntlet(dateGauntlet || gauntlets[2].date);
            }
        }
    }, [selectedGauntlet]);

    React.useEffect(() => {
        if (pane === 'browse') {
            setSelectedGauntlet(browseGauntlet || 'gt_0');
        }
        else {
            setSelectedGauntlet(dateGauntlet || gauntlets[2].date);
        }
    }, [pane]);

    const gauntOpts = (browsing ? uniques : gauntlets).map((g, idx) => {
        let text = "";

        if (g.state === "POWER") {
            text = t('gauntlet.base_power')
        }
        else if (browsing) {
            text = `${g.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(g.contest_data?.featured_skill ?? "")}`;
        }
        else {
            text = moment(g.date).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).utc(false).format('dddd, D MMMM YYYY') + ` (${g.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(g.contest_data?.featured_skill ?? "")})`;
        }

        return {
            key: browsing ? "gt_" + idx : g.date,
            value: browsing ? "gt_" + idx : g.date,
            text: text
        };
    });

    return (<React.Fragment>
        <div style={{
            display: "flex",
            flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
            justifyContent: "space-between"
        }}>
            <h1>{browsing ? t('gauntlet.pages.browse_gauntlets.title') : t('gauntlet.pages.previous_gauntlets.title')}</h1>

            <div style={{
                display: "flex",
                flexDirection: "column"
            }}>
                <Dropdown
                    scrolling
                    clearable={searching}
                    selection={searching}
                    search={searching}
                    options={gauntOpts}
                    value={selectedGauntlet}
                    onChange={(e, { value }) => setSelectedGauntlet(value as string)}
                />

            </div>
        </div>

        {gauntlet && <GauntletView gauntlet={gauntlet} gauntlets={gauntlets} />}

    </React.Fragment>)

    function changeGauntlet(date: string, unique?: boolean) {
        if (unique) {
            if (date === '') date = "gt_0";
            const g = uniques?.find((g) => g.date === date);
            setGauntlet(g);
            setBrowseGauntlet(g ? date : undefined);
        }
        else {
            const g = gauntlets?.find((g) => g.date === date);
            setGauntlet(g);
            setDateGauntlet(g ? date : undefined);
        }
    }

}