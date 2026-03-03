import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomeView from './views/HomeView';
import FilmIndexView from './views/FilmIndexView';
import FilmDetailView from './views/FilmDetailView';
import PersonView from './views/PersonView';
import CollectionsView from './views/CollectionsView';
import CollectionDetailView from './views/CollectionDetailView';
import { WatchlistProvider } from './context/WatchlistContext';
import { DataProvider } from './context/DataContext';
import WatchlistView from './views/WatchlistView';

const App: React.FC = () => {
  return (
    <DataProvider>
      <WatchlistProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/index" element={<FilmIndexView />} />
              <Route path="/film/:id" element={<FilmDetailView />} />
              <Route path="/person/:id" element={<PersonView />} />
              <Route path="/collections" element={<CollectionsView />} />
              <Route path="/collections/:id" element={<CollectionDetailView />} />
              <Route path="/watchlist" element={<WatchlistView />} />
            </Routes>
          </Layout>
        </HashRouter>
      </WatchlistProvider>
    </DataProvider>
  );
};

export default App;
