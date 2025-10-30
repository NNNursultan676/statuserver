import { useState, useEffect } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("service-favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  const toggleFavorite = (serviceId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      localStorage.setItem("service-favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const isFavorite = (serviceId: string) => favorites.includes(serviceId);

  return { favorites, toggleFavorite, isFavorite };
}
