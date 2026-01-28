'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface FavoriteAccount {
  address: string;
  label?: string;
  addedAt: number;
}

interface FavoritesContextType {
  favorites: FavoriteAccount[];
  addFavorite: (address: string, label?: string) => void;
  removeFavorite: (address: string) => void;
  updateFavoriteLabel: (address: string, label: string) => void;
  isFavorite: (address: string) => boolean;
  getFavorite: (address: string) => FavoriteAccount | undefined;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'stellarchain_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteAccount[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when favorites change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites, isLoaded]);

  const addFavorite = (address: string, label?: string) => {
    setFavorites(prev => {
      if (prev.some(f => f.address === address)) return prev;
      return [...prev, { address, label, addedAt: Date.now() }];
    });
  };

  const removeFavorite = (address: string) => {
    setFavorites(prev => prev.filter(f => f.address !== address));
  };

  const updateFavoriteLabel = (address: string, label: string) => {
    setFavorites(prev => prev.map(f =>
      f.address === address ? { ...f, label } : f
    ));
  };

  const isFavorite = (address: string) => {
    return favorites.some(f => f.address === address);
  };

  const getFavorite = (address: string) => {
    return favorites.find(f => f.address === address);
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addFavorite,
      removeFavorite,
      updateFavoriteLabel,
      isFavorite,
      getFavorite
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
