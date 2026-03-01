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
        const [catalogRes, collectionsRes] = await Promise.all([
          fetch('/data/catalog.json'),
          fetch('/data/collections.json')
        ]);

        if (!catalogRes.ok || !collectionsRes.ok) {
          throw new Error('Failed to load cinematic data. Please try again later.');
        }

        const [catalogData, collectionsData] = await Promise.all([
          catalogRes.json(),
          collectionsRes.json()
        ]);

        setCatalog(catalogData);
        setCollections(collectionsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
