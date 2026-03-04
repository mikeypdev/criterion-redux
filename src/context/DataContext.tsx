import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Film, Collection, SyncStatus } from '../types';

interface DataContextType {
  catalog: Film[];
  collections: Collection[];
  status: SyncStatus | null;
  isLoading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalog, setCatalog] = useState<Film[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const baseUrl = import.meta.env.BASE_URL || '/';
        console.log(`Fetching cinematic data from ${baseUrl}...`);
        
        const [catalogRes, collectionsRes, statusRes] = await Promise.all([
          fetch(`${baseUrl}data/catalog.json`),
          fetch(`${baseUrl}data/collections.json`),
          fetch(`${baseUrl}data/status.json`).catch(() => null) // Optional
        ]);

        if (!catalogRes.ok) throw new Error(`Catalog not found (Status: ${catalogRes.status})`);
        if (!collectionsRes.ok) throw new Error(`Collections not found (Status: ${collectionsRes.status})`);

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
      } catch (err: any) {
        console.error('Data loading error:', err);
        setError(err.message || 'An unexpected error occurred while loading the library.');
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

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
