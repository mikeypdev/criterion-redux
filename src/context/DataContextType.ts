import { createContext } from 'react';
import type { Film, Collection, SyncStatus } from '../types';

export interface DataContextType {
  catalog: Film[];
  collections: Collection[];
  status: SyncStatus | null;
  isLoading: boolean;
  error: string | null;
  /** Set of film IDs that are in any "leaving [month]" collection. */
  leavingSoonFilmIds: Set<string>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);
