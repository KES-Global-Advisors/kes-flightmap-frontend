/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useQuickEditAPI.ts
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API = import.meta.env.VITE_API_BASE_URL;

interface QuickEditPayload {
  [key: string]: string | number | string[] | number[];
}

interface UseQuickEditAPIReturn {
  updateField: (
    entityType: 'strategies' | 'programs' | 'workstreams' | 'strategic-goals' | 'milestones' | 'activities',
    entityId: number,
    field: string,
    value: string | number | string[] | number[],
    optimisticUpdate?: (currentData: any) => any
  ) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

export const useQuickEditAPI = (): UseQuickEditAPIReturn => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateField = useCallback(async (
    entityType: 'strategies' | 'programs' | 'workstreams' | 'strategic-goals' | 'milestones' | 'activities',
    entityId: number,
    field: string,
    value: string | number | string[] | number[],
    optimisticUpdate?: (currentData: any) => any
  ): Promise<boolean> => {
    const accessToken = sessionStorage.getItem('accessToken');
    
    if (!accessToken) {
      setError('Authentication required');
      return false;
    }

    setIsUpdating(true);
    setError(null);

    // Optimistic update if provided
    if (optimisticUpdate) {
      queryClient.setQueryData(['flightmaps'], (oldData: any) => {
        if (!oldData) return oldData;
        return optimisticUpdate(oldData);
      });
    }

    try {
      const payload: QuickEditPayload = { [field]: value };
      
      const response = await fetch(`${API}/${entityType}/${entityId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to update ${field}`);
      }

      const updatedEntity = await response.json();
      
      // Update the cache with the server response
      queryClient.setQueryData(['flightmaps'], (oldData: any) => {
        if (!oldData) return oldData;
        
        // This is a simplified update - you might need to adjust based on your data structure
        if (Array.isArray(oldData)) {
          return oldData.map((item: any) => {
            if (item.id === entityId) {
              return { ...item, ...updatedEntity };
            }
            // Handle nested entities (programs, workstreams, etc.)
            if (item.programs) {
              return {
                ...item,
                programs: item.programs.map((program: any) => {
                  if (program.id === entityId && entityType === 'programs') {
                    return { ...program, ...updatedEntity };
                  }
                  if (program.workstreams) {
                    return {
                      ...program,
                      workstreams: program.workstreams.map((ws: any) => 
                        ws.id === entityId && entityType === 'workstreams' 
                          ? { ...ws, ...updatedEntity }
                          : ws
                      )
                    };
                  }
                  return program;
                })
              };
            }
            return item;
          });
        }
        return oldData;
      });

      // Invalidate queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['flightmaps'] });
      
      return true;
    } catch (err) {
      console.error('Quick edit error:', err);
      setError(err instanceof Error ? err.message : 'Update failed');
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['flightmaps'] });
      
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [queryClient]);

  return {
    updateField,
    isUpdating,
    error,
  };
};