import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Strategy } from '@/types/flightmap';
import { useUpdateMilestoneDeadline } from '@/api/flightmap';

const API = import.meta.env.VITE_API_BASE_URL;

interface FlightmapContextType {
  // Data
  flightmap: Strategy | null;
  flightmaps: Strategy[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Filter state
  draftFilter: 'all' | 'drafts' | 'completed';
  setDraftFilter: (filter: 'all' | 'drafts' | 'completed') => void;
  
  // Selection
  selectedFlightmap: Strategy | null;
  setSelectedFlightmap: (flightmap: Strategy | null) => void;
  
  // Mutations
  deleteFlightmap: (id: number) => Promise<void>;
  updateMilestoneDeadline: (milestoneId: string, newDeadline: Date) => Promise<boolean>;
  
  // Utilities
  refetch: () => void;
}

const FlightmapContext = createContext<FlightmapContextType | undefined>(undefined);

export const useFlightmapContext = () => {
  const context = useContext(FlightmapContext);
  if (!context) {
    throw new Error('useFlightmapContext must be used within FlightmapProvider');
  }
  return context;
};

interface FlightmapProviderProps {
  children: ReactNode;
}

export const FlightmapProvider: React.FC<FlightmapProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [draftFilter, setDraftFilter] = useState<'all' | 'drafts' | 'completed'>('all');
  const [selectedFlightmap, setSelectedFlightmap] = useState<Strategy | null>(null);
  
  // Mutations
  const updateMilestoneMutation = useUpdateMilestoneDeadline();

  // Query for flightmaps
  const { data: flightmaps, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['flightmaps', draftFilter],
    queryFn: async () => {
      const token = sessionStorage.getItem('accessToken');
      let url = `${API}/flightmaps/`;
      
      if (draftFilter === 'drafts') {
        url += '?show_drafts=only';
      } else if (draftFilter === 'completed') {
        url += '?show_drafts=false';
      }

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch flightmaps');
      return res.json();
    },
  });

  // Get fresh selected flightmap
  const flightmap = selectedFlightmap ? 
    flightmaps?.find((f: Strategy) => f.id === selectedFlightmap.id) || selectedFlightmap 
    : null;

  // Delete mutation
  const deleteFlightmap = async (id: number) => {
    const token = sessionStorage.getItem('accessToken');
    const res = await fetch(`${API}/flightmaps/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!res.ok) throw new Error('Delete failed');
    
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ['flightmaps', draftFilter] });
    const previous = queryClient.getQueryData<Strategy[]>(['flightmaps', draftFilter]);
    queryClient.setQueryData<Strategy[]>(
      ['flightmaps', draftFilter],
      previous?.filter(r => r.id !== id) ?? []
    );
    
    // Clear selection if deleted
    if (selectedFlightmap?.id === id) {
      setSelectedFlightmap(null);
    }
    
    // Invalidate
    queryClient.invalidateQueries({ queryKey: ['flightmaps'] });
  };

  // Update milestone deadline
  const updateMilestoneDeadline = async (milestoneId: string, newDeadline: Date): Promise<boolean> => {
    try {
      const milestoneIdNumber = Number(milestoneId);
      if (isNaN(milestoneIdNumber)) throw new Error('Invalid milestone ID');

      await updateMilestoneMutation.mutateAsync({
        milestoneId: milestoneIdNumber,
        deadline: newDeadline.toISOString().slice(0, 10),
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const value: FlightmapContextType = {
    flightmap,
    flightmaps,
    isLoading,
    isError,
    error: error as Error | null,
    draftFilter,
    setDraftFilter,
    selectedFlightmap,
    setSelectedFlightmap,
    deleteFlightmap,
    updateMilestoneDeadline,
    refetch,
  };

  return (
    <FlightmapContext.Provider value={value}>
      {children}
    </FlightmapContext.Provider>
  );
};