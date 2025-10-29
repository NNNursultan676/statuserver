import { useState, useEffect } from "react";

interface HistoryItem {
  serviceId: string;
  serviceName: string;
  timestamp: number;
}

const MAX_HISTORY_ITEMS = 50;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("service-history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = (serviceId: string, serviceName: string) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.serviceId !== serviceId);
      const newHistory = [
        { serviceId, serviceName, timestamp: Date.now() },
        ...filtered
      ].slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem("service-history", JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("service-history");
  };

  return { history, addToHistory, clearHistory };
}
