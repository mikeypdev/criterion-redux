import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Film, Collection } from '../types';

interface DataContextType {
  catalog: Film[];
  collections: Collection[];
  isLoading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalog, setCatalog] = useState<Film[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching cinematic data...');
        const [catalogRes, collectionsRes] = await Promise.all([
          fetch('/data/catalog.json'),
          fetch('/data/collections.json')
        ]);

        if (!catalogRes.ok) throw new Error(`Catalog not found (Status: ${catalogRes.status})`);
        if (!collectionsRes.ok) throw new Error(`Collections not found (Status: ${collectionsRes.status})`);

        const catalogData = await catalogRes.json();
        const collectionsData = await collectionsRes.json();

        if (!Array.isArray(catalogData) || catalogData.length === 0) {
          throw new Error('Catalog data is empty or invalid.');
        }
        
        console.log('Sample Film:', catalogData[0]);
        console.log('Sample Collection:', collectionsData[0]);
        
        setCatalog(catalogData);
        setCollections(collectionsData);
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
    <DataContext.Provider value={{ catalog, collections, isLoading, error }}>
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
