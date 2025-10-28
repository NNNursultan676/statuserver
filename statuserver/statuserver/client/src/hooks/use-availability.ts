import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

interface AvailabilityStatus {
  [serviceId: string]: boolean | null;
}

export function useAvailability() {
  const [availability, setAvailability] = useState<AvailabilityStatus>({});

  const checkMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const response = await fetch(`/api/check-availability/${serviceId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to check availability');
      return response.json();
    },
    onSuccess: (data) => {
      setAvailability(prev => ({
        ...prev,
        [data.serviceId]: data.available
      }));
    },
  });

  const checkAvailability = useCallback((serviceId: string) => {
    checkMutation.mutate(serviceId);
  }, [checkMutation]);

  const getStatus = useCallback((serviceId: string) => {
    return availability[serviceId] ?? null;
  }, [availability]);

  return { checkAvailability, getStatus, isChecking: checkMutation.isPending };
}
