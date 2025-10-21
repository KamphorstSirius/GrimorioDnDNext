import React, { createContext, useContext } from 'react';
import { useFavoritePresetsWithCache } from '@/hooks/useFavoritePresetsWithCache';

// Share a single favorites/grimoire state across the whole app
// so Index and GrimoireSelector stay in sync
export type FavoritePresetsContextValue = ReturnType<typeof useFavoritePresetsWithCache>;

const FavoritePresetsContext = createContext<FavoritePresetsContextValue | null>(null);

export const FavoritePresetsProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useFavoritePresetsWithCache();
  return (
    <FavoritePresetsContext.Provider value={value}>
      {children}
    </FavoritePresetsContext.Provider>
  );
};

export const useFavoritePresetsContext = () => {
  const ctx = useContext(FavoritePresetsContext);
  if (!ctx) throw new Error('useFavoritePresetsContext must be used within FavoritePresetsProvider');
  return ctx;
};
