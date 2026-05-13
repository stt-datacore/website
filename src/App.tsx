// import './App.css';
// import './polyfills';
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DataProvider } from './context/datacontext';
import { GlobalProvider } from './context/globalcontext';
import { LocalizedProvider } from './context/localizedcontext';
import { PlayerProvider } from './context/playercontext';
import { PromptProvider } from './context/promptcontext';
import { Icon } from 'semantic-ui-react';

const UnneededItemsPage = lazy(() => import('./pages/unneeded'));
const VoyagePage = lazy(() => import('./pages/voyage'));
const VoyageHistoryPage = lazy(() => import('./pages/voyagehistory'));
const TestPage = lazy(() => import('./pages/testpage'));
const StatTrends = lazy(() => import('./pages/stattrends'));
const StatsPage = lazy(() => import('./pages/stats'));
const ShuttleHelperPage = lazy(() => import('./pages/shuttlehelper'));
const ShipInfoPage = lazy(() => import('./pages/ship_info'));
const SeasonalEvent = lazy(() => import('./pages/seasonal'));
const RetrievalPage = lazy(() => import('./pages/retrieval'));
const ResourceTrackerPage = lazy(() => import('./pages/resourcetracker'));
const ProfilePage = lazy(() => import('./pages/profile'));
const PlayerToolsPage = lazy(() => import('./pages/playertools'));
const ObjectiveEventHelperPage = lazy(() => import('./pages/objective_events'));
const ItemsPage = lazy(() => import('./pages/items'));
const ItemInfoPage = lazy(() => import('./pages/item_info'));
const IndexPage = lazy(() => import('./pages'));
const HallOfFamePage = lazy(() => import('./pages/hall_of_fame'));
const GauntletsPage = lazy(() => import('./pages/gauntlets'));
const OtherPage = lazy(() => import('./pages/achievements'));
const Announcements = lazy(() => import('./pages/announcements'));
const BeholdsPage = lazy(() => import('./pages/behold'));
const BridgeCrewPage = lazy(() => import('./pages/bridgecrew'));
const ChartsPage = lazy(() => import('./pages/charts'));
const CiteOptimizerPage = lazy(() => import('./pages/cite-opt'));
const CollectionsPage = lazy(() => import('./pages/collections'));
const ContinuumPage = lazy(() => import('./pages/continuum'));
const CrewChallenge = lazy(() => import('./pages/crewchallenge'));
const EpisodesPage = lazy(() => import('./pages/episodes'));
const EventInfoPage = lazy(() => import('./pages/event_info'));
const EventPlannerPage = lazy(() => import('./pages/eventplanner'));
const EventsPage = lazy(() => import('./pages/events'));
const FactionsPage = lazy(() => import('./pages/factions'));
const FleetBossBattlesPage = lazy(() => import('./pages/fbb'));
const FleetPage = lazy(() => import('./pages/fleet'));
const FTMHofPage = lazy(() => import('./pages/ftmhof'));
const ShipsPage = lazy(() => import('./pages/ships'));
const CrewDetailsPage = lazy(() => import('./templates/crewpage'));

const RootSpin = (props: { message?: string }) => {
  let { message } = props;
  message ??= "Loading..."
  return (<span><Icon loading name='spinner' /> {message}</span>);
};

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <PlayerProvider>
          <LocalizedProvider>
            <GlobalProvider>
              <PromptProvider>
                <React.Fragment>
                  <Suspense fallback={<RootSpin />}>
                    <Routes>
                      <Route index path="/" element={<IndexPage location={`${window.location}`} />} />
                      <Route path="/crew/:crew_symbol" element={<CrewDetailsPage />} />
                      <Route path="/achievements" element={<OtherPage />} />
                      <Route path="/announcements" element={<Announcements data={{ allMarkdownRemark: { a: 0 } }} />} />
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
                      <Route path="/ship_info" element={<ShipInfoPage />} />
                      <Route path="/ships" element={<ShipsPage />} />
                      <Route path="/shuttlehelper" element={<ShuttleHelperPage />} />
                      <Route path="/stats" element={<StatsPage />} />
                      <Route path="/stattrends" element={<StatTrends />} />
                      <Route path="/testpage" element={<TestPage />} />
                      <Route path="/unneeded" element={<UnneededItemsPage />} />
                      <Route path="/voyage" element={<VoyagePage />} />
                      <Route path="/voyagehistory" element={<VoyageHistoryPage />} />
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
