import React, { useState, useEffect } from 'react';
import { DataContext } from './DataContextType';
import type { Film, Collection, SyncStatus } from '../types';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalog, setCatalog] = useState<Film[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catalogRes, collectionsRes, statusRes] = await Promise.all([
          fetch('data/catalog.json'),
          fetch('data/collections.json'),
          fetch('data/status.json').catch(() => null)
        ]);

        if (!catalogRes.ok || !collectionsRes.ok) {
          throw new Error('Could not load library data.');
        }

        const catalogData = await catalogRes.json();
        const collectionsData = await collectionsRes.json();
        const statusData = statusRes && statusRes.ok ? await statusRes.json() : null;

        if (!Array.isArray(catalogData) || catalogData.length === 0) {
          throw new Error('Catalog data is empty or invalid.');
        }
        
        setCatalog(catalogData);
        setCollections(collectionsData);
        setStatus(statusData);
        console.log(`Data loaded: ${catalogData.length} films, ${collectionsData.length} collections.`);
      } catch (err) {
        console.error('Data loading error:', err);
        setError((err as Error).message || 'An unexpected error occurred while loading the library.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#A0A0A0',
        backgroundColor: '#0A0A0A',
        textAlign: 'center',
        padding: '40px'
      }}>
        <h2 style={{ color: 'white', marginBottom: '20px' }}>Connection Interrupted</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: '30px', 
            padding: '12px 24px', 
            backgroundColor: 'white', 
            color: 'black', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{ catalog, collections, status, isLoading, error }}>
      {children}
    </DataContext.Provider>
  );
};
