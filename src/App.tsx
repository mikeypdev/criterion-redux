import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomeView from './views/HomeView';
import FilmIndexView from './views/FilmIndexView';
import PersonView from './views/PersonView';
import CollectionsView from './views/CollectionsView';
import { WatchlistProvider } from './context/WatchlistContext';
import WatchlistView from './views/WatchlistView';

const App: React.FC = () => {
  return (
    <WatchlistProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/index" element={<FilmIndexView />} />
            <Route path="/person/:id" element={<PersonView />} />
            <Route path="/collections" element={<CollectionsView />} />
            <Route path="/watchlist" element={<WatchlistView />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </WatchlistProvider>
  );
};

export default App;
