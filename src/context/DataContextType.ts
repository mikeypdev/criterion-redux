import { createContext } from 'react';
import type { Film, Collection, SyncStatus } from '../types';

export interface DataContextType {
  catalog: Film[];
  collections: Collection[];
  status: SyncStatus | null;
  isLoading: boolean;
  error: string | null;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);
