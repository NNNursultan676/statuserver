
import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

interface AvailabilityStatus {
  [serviceId: string]: boolean | null;
}

interface CheckAvailabilityRequest {
  url: string;
  method: string;
  timeout: number;
}

interface CheckAvailabilityResponse {
  success: boolean;
  url: string;
  final_url: string | null;
  method: string;
  status_code: number | null;
  reason: string | null;
  elapsed_ms: number;
  error: string | null;
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

  const checkUrlMutation = useMutation({
    mutationFn: async (request: CheckAvailabilityRequest): Promise<CheckAvailabilityResponse> => {
      const response = await fetch('http://10.183.45.198:8000/utility/check_availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('Failed to check availability');
      return response.json();
    },
  });

  const checkAvailability = useCallback((serviceId: string) => {
    checkMutation.mutate(serviceId);
  }, [checkMutation]);

  const checkUrlAvailability = useCallback((url: string, method: string, timeout: number) => {
    return checkUrlMutation.mutateAsync({ url, method, timeout });
  }, [checkUrlMutation]);

  const getStatus = useCallback((serviceId: string) => {
    return availability[serviceId] ?? null;
  }, [availability]);

  return { 
    checkAvailability, 
    checkUrlAvailability,
    getStatus, 
    isChecking: checkMutation.isPending,
    isCheckingUrl: checkUrlMutation.isPending,
  };
}
