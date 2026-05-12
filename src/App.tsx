// import './App.css';
// import './polyfills';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import UnneededItemsPage from './pages/unneeded';
import VoyagePage from './pages/voyage';
import VoyageHistoryPage from './pages/voyagehistory';
import TestPage from './pages/testpage';
import StatTrends from './pages/stattrends';
import StatsPage from './pages/stats';
import ShuttleHelperPage from './pages/shuttlehelper';
import ShipInfoPage from './pages/ship_info';
import SeasonalEvent from './pages/seasonal';
import RetrievalPage from './pages/retrieval';
import ResourceTrackerPage from './pages/resourcetracker';
import ProfilePage from './pages/profile';
import PlayerToolsPage from './pages/playertools';
import ObjectiveEventHelperPage from './pages/objective_events';
import ItemsPage from './pages/items';
import ItemInfoPage from './pages/item_info';
import IndexPage from './pages';
import HallOfFamePage from './pages/hall_of_fame';
import GauntletsPage from './pages/gauntlets';
import OtherPage from './pages/achievements';
import Announcements from './pages/announcements';
import BeholdsPage from './pages/behold';
import BridgeCrewPage from './pages/bridgecrew';
import ChartsPage from './pages/charts';
import CiteOptimizerPage from './pages/cite-opt';
import CollectionsPage from './pages/collections';
import ContinuumPage from './pages/continuum';
import CrewChallenge from './pages/crewchallenge';
import EpisodesPage from './pages/episodes';
import EventInfoPage from './pages/event_info';
import EventPlannerPage from './pages/eventplanner';
import EventsPage from './pages/events';
import FactionsPage from './pages/factions';
import FleetBossBattlesPage from './pages/fbb';
import FleetPage from './pages/fleet';
import FTMHofPage from './pages/ftmhof';
import ShipsPage from './pages/ships';
import { DataProvider } from './context/datacontext';
import { GlobalProvider } from './context/globalcontext';
import { LocalizedProvider } from './context/localizedcontext';
import { PlayerProvider } from './context/playercontext';
import { PromptProvider } from './context/promptcontext';
import StaticCrewPage from './templates/crewpage';

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <PlayerProvider>
          <LocalizedProvider>
            <GlobalProvider>
              <PromptProvider>
                <React.Fragment>
                  <Routes>
                    <Route path="/" element={<IndexPage location={`${window.location}`} />} />
                    <Route path="/crew/:crew_symbol" element={<StaticCrewPage />} />
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

                    {/* <Route path="/" element={<Home />} /> */}
                  </Routes>
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
