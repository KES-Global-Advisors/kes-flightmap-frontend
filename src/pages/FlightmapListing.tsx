/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams flightmaps flightmap flightmaps
// src/pages/FlightmapListing.tsx
import { useState, useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThemeContext } from '@/contexts/ThemeContext';
import Modal from '@/components/Flightmap/Modal';
import FlightmapSwitcher from '@/components/Flightmap/FlightmapSwitcher';
import FlightmapCard from './components/FlightmapCard';
import { Strategy } from '@/types/flightmap';
import { Filter, FileText } from 'lucide-react';
import { ConfirmationModal } from '@/components/Forms/Utils/ConfirmationModal';

const API = import.meta.env.VITE_API_BASE_URL;

type DraftFilter = 'all' | 'drafts' | 'completed';

export default function FlightmapListing() {
  const { themeColor } = useContext(ThemeContext);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Strategy | null>(null);
  const [draftFilter, setDraftFilter] = useState<DraftFilter>('all');
  const [flightmapToDelete, setFlightmapToDelete] = useState<Strategy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load flightmaps with draft filtering
  const { data: flightmaps, isLoading, isError, error } = useQuery({
    queryKey: ['flightmaps', draftFilter],
    queryFn: async () => {
      const token = sessionStorage.getItem('accessToken');
      let url = `${API}/flightmaps/`;
      
      // Add draft filtering
      if (draftFilter === 'drafts') {
        url += '?show_drafts=only';
      } else if (draftFilter === 'completed') {
        url += '?show_drafts=false';
      }
      // 'all' uses default behavior

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

  const selectedId = selected?.id;
  const freshSelected = flightmaps?.find((r: Strategy) => r.id === selectedId);

  // Delete a flightmap (optimistic)
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
      await qc.cancelQueries({ queryKey: ['flightmaps', draftFilter] });
      const previous = qc.getQueryData<Strategy[]>(['flightmaps', draftFilter]);
      qc.setQueryData<Strategy[]>(['flightmaps', draftFilter],
        previous?.filter(r => r.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previous) {
        qc.setQueryData(['flightmaps', draftFilter], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });

  const handleDelete = async (flightmap: Strategy) => {
    setFlightmapToDelete(flightmap);
  };

  const confirmDelete = async () => {
    if (flightmapToDelete) {
      setIsDeleting(true);
      try {
        await deleteMutation.mutateAsync(flightmapToDelete.id);
        setFlightmapToDelete(null);
        
        // Close modal if we're deleting the selected flightmap
        if (selected?.id === flightmapToDelete.id) {
          setSelected(null);
        }
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Calculate statistics
  const stats = {
    total: flightmaps?.length || 0,
    drafts: flightmaps?.filter((r: Strategy) => r.is_draft).length || 0,
    completed: flightmaps?.filter((r: Strategy) => !r.is_draft).length || 0,
  };

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
      {/* Header with filter controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Flightmaps</h1>
          <p className="text-sm text-gray-600 mt-1">
            {stats.total} total • {stats.completed} completed • {stats.drafts} drafts
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={draftFilter}
            onChange={(e) => setDraftFilter(e.target.value as DraftFilter)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Flightmaps</option>
            <option value="completed">Completed Only</option>
            <option value="drafts">Drafts Only</option>
          </select>
        </div>
      </div>

      {/* Empty state */}
      {flightmaps?.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {draftFilter === 'drafts' 
              ? 'No draft flightmaps found.' 
              : draftFilter === 'completed'
              ? 'No completed flightmaps found.'
              : 'No flightmaps found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {flightmaps!.map((r: Strategy) => (
            <FlightmapCard
              key={r.id}
              flightmap={r}
              openModal={() => setSelected(r)}
              onDelete={() => handleDelete(r)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h2 className="text-xl font-bold mb-4">
            {selected.name}
            {selected.is_draft && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Draft
              </span>
            )}
          </h2>
          <FlightmapSwitcher flightmap={freshSelected!} />
        </Modal>
      )}

      {/* Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!flightmapToDelete}
        onClose={() => setFlightmapToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Flightmap"
        message={`Are you sure you want to delete "${flightmapToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}