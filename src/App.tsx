// import './App.css';
// import './polyfills';
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Icon } from "semantic-ui-react";
import { DataProvider } from "./context/datacontext";
import { GlobalContext, GlobalProvider } from "./context/globalcontext";
import { LocalizedProvider } from "./context/localizedcontext";
import { PlayerProvider } from "./context/playercontext";
import { PromptProvider } from "./context/promptcontext";

import { StandardFlexRow } from "./cssdef";
import { MarkdownRoot } from "./model/mdpages";
import markdown_pages from "./static/structured/markdown_pages.json";
import { populateSlugs } from "./utils/mdpageutils";

const UnneededItemsPage = lazy(() => import("./pages/unneeded"));
const VoyagePage = lazy(() => import("./pages/voyage"));
const VoyageHistoryPage = lazy(() => import("./pages/voyagehistory"));
const TestPage = lazy(() => import("./pages/testpage"));
const StatTrends = lazy(() => import("./pages/stattrends"));
const StatsPage = lazy(() => import("./pages/stats"));
const ShuttleHelperPage = lazy(() => import("./pages/shuttlehelper"));
const ShipInfoPage = lazy(() => import("./pages/ship_info"));
const SeasonalEvent = lazy(() => import("./pages/seasonal"));
const RetrievalPage = lazy(() => import("./pages/retrieval"));
const ResourceTrackerPage = lazy(() => import("./pages/resourcetracker"));
const ProfilePage = lazy(() => import("./pages/profile"));
const PlayerToolsPage = lazy(() => import("./pages/playertools"));
const ObjectiveEventHelperPage = lazy(() => import("./pages/objective_events"));
const ItemsPage = lazy(() => import("./pages/items"));
const ItemInfoPage = lazy(() => import("./pages/item_info"));
const IndexPage = lazy(() => import("./pages"));
const HallOfFamePage = lazy(() => import("./pages/hall_of_fame"));
const GauntletsPage = lazy(() => import("./pages/gauntlets"));
const OtherPage = lazy(() => import("./pages/achievements"));
const Announcements = lazy(() => import("./pages/announcements"));
const BeholdsPage = lazy(() => import("./pages/behold"));
const BridgeCrewPage = lazy(() => import("./pages/bridgecrew"));
const ChartsPage = lazy(() => import("./pages/charts"));
const CiteOptimizerPage = lazy(() => import("./pages/cite-opt"));
const CollectionsPage = lazy(() => import("./pages/collections"));
const ContinuumPage = lazy(() => import("./pages/continuum"));
const CrewChallenge = lazy(() => import("./pages/crewchallenge"));
const EpisodesPage = lazy(() => import("./pages/episodes"));
const EventInfoPage = lazy(() => import("./pages/event_info"));
const EventPlannerPage = lazy(() => import("./pages/eventplanner"));
const EventsPage = lazy(() => import("./pages/events"));
const FactionsPage = lazy(() => import("./pages/factions"));
const FleetBossBattlesPage = lazy(() => import("./pages/fbb"));
const FleetPage = lazy(() => import("./pages/fleet"));
const FTMHofPage = lazy(() => import("./pages/ftmhof"));
const ShipsPage = lazy(() => import("./pages/ships"));
const CrewDetailsPage = lazy(() => import("./templates/crewpage"));
const MarkdownPage = lazy(() => import("./components/mdpage"));

const RootSpin = (props: { message?: string }) => {
    let { message } = props;
    // Can use this here because is called from within global context.
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    let loc_msg = t("spinners.please_wait");

    return (
        <div
            style={{
                ...StandardFlexRow,
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                margin: "5em 0",
                fontSize: "1.2rem",
            }}
        >
            <Icon loading name="spinner" /> {message || loc_msg}
        </div>
    );
};

function App() {
  const markdownRoot = markdown_pages as any as MarkdownRoot;

  const announcements = markdownRoot.announcements;
  const pages = markdownRoot.pages;

  populateSlugs(announcements);
  populateSlugs(pages);
  const announcement = announcements.length ? announcements[0] : undefined;

  return (
    <BrowserRouter>
      <DataProvider>
        <PlayerProvider>
          <LocalizedProvider>
            <GlobalProvider announcement={announcement} extraPages={pages}>
              <PromptProvider>
                <React.Fragment>
                  <Suspense fallback={<RootSpin />}>
                    <Routes>
                      <Route index path="/" element={<IndexPage location={`${window.location}`} />} />
                      <Route path="/crew/:crew_symbol" element={<CrewDetailsPage />} />
                      <Route path="/achievements" element={<OtherPage />} />
                      <Route path="/announcements" element={<Announcements announcements={announcements} />} />
                      <Route path="/behold" element={<BeholdsPage location={`${window.location}`} />} />
                      <Route path="/bridgecrew" element={<BridgeCrewPage />} />
                      <Route path="/charts" element={<ChartsPage />} />
                      <Route path="/cite-opt" element={<CiteOptimizerPage />} />
                      <Route path="/collections" element={<CollectionsPage />} />
                      <Route path="/continuum" element={<ContinuumPage />} />
                      <Route path="/crewchallenge" element={<CrewChallenge />} />
                      <Route path="/episodes" element={<EpisodesPage />} />
                      <Route path="/event_info" element={<EventInfoPage />} />
                      <Route path="/eventplanner" element={<EventPlannerPage />} />
                      <Route path="/events" element={<EventsPage />} />
                      <Route path="/factions" element={<FactionsPage />} />
                      <Route path="/fbb" element={<FleetBossBattlesPage />} />
                      <Route path="/fleet" element={<FleetPage />} />
                      <Route path="/ftmhof" element={<FTMHofPage />} />
                      <Route path="/gauntlets" element={<GauntletsPage />} />
                      <Route path="/hall_of_fame" element={<HallOfFamePage />} />
                      <Route path="/item_info" element={<ItemInfoPage />} />
                      <Route path="/items" element={<ItemsPage />} />
                      <Route path="/objective_events" element={<ObjectiveEventHelperPage />} />
                      <Route path="/playertools" element={<PlayerToolsPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/resourcetracker" element={<ResourceTrackerPage />} />
                      <Route path="/retrieval" element={<RetrievalPage />} />
                      <Route path="/seasonal" element={<SeasonalEvent />} />
                      <Route path="/ship/:ship_symbol" element={<ShipInfoPage />} />
                      <Route path="/ships" element={<ShipsPage />} />
                      <Route path="/shuttlehelper" element={<ShuttleHelperPage />} />
                      <Route path="/stats" element={<StatsPage />} />
                      <Route path="/stattrends" element={<StatTrends />} />
                      <Route path="/testpage" element={<TestPage />} />
                      <Route path="/unneeded" element={<UnneededItemsPage />} />
                      <Route path="/voyage" element={<VoyagePage />} />
                      <Route path="/voyagehistory" element={<VoyageHistoryPage />} />
                      {pages.map((page) => {
                            return (
                                <Route path={`/${page.slug}`}
                                    element={(
                                        <MarkdownPage fullpage node={page} prefix="pages" />
                                    )}
                                />
                            );
                      })}
                    </Routes>
                  </Suspense>
                </React.Fragment>
              </PromptProvider>
            </GlobalProvider>
          </LocalizedProvider>
        </PlayerProvider>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;
