/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams roadmaps flightmap flightmaps
// src/pages/FlightmapListing.tsx
import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemeContext } from '@/contexts/ThemeContext';
import Modal from '@/components/Roadmap/Modal';
import FlightmapSwitcher from '@/components/Roadmap/FlightmapSwitcher';
import FlightmapCard from './components/FlightmapCard';
import { FlightmapData } from '@/types/roadmap';

const API = import.meta.env.VITE_API_BASE_URL;

// 1️⃣ fetcher for the flightmaps list
async function fetchFlightmaps(): Promise<FlightmapData[]> {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(`${API}/flightmaps/`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch flightmaps');
  return res.json();
}

export default function FlightmapListing() {
  const { themeColor } = useContext(ThemeContext);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<FlightmapData | null>(null);
  

  // 2️⃣ Load all flightmaps
  const {
    data: roadmaps,
    isLoading,
    isError,
    error,
  } = useQuery<FlightmapData[], Error>({
    queryKey: ['flightmaps'],
    queryFn: fetchFlightmaps,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const selectedId = selected?.id;
  const freshSelected = roadmaps?.find(r => r.id === selectedId);

  // 3️⃣ Delete a flightmap (optimistic)
  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API}/flightmaps/${id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) throw new Error('Delete failed');
    },
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['flightmaps'] });
      const previous = qc.getQueryData<FlightmapData[]>(['flightmaps']);
      qc.setQueryData<FlightmapData[]>(['flightmaps'],
        previous?.filter(r => r.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previous) {
        qc.setQueryData(['flightmaps'], context.previous);
      }
      alert('Failed to delete. Please try again.');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4"
          style={{ borderColor: themeColor }}
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Flightmaps</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {roadmaps!.map((r) => (
          <FlightmapCard
            key={r.id}
            roadmap={r}
            openModal={() => setSelected(r)}
            onDelete={() => deleteMutation.mutate(r.id)}
          />
        ))}
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h2 className="text-xl font-bold mb-4">{selected.name}</h2>
          <FlightmapSwitcher
            roadmap={freshSelected!}
          />
        </Modal>
      )}
    </div>
  );
}
