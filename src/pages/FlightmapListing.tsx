// cSpell:ignore workstream workstreams flightmaps flightmap flightmaps
// src/pages/FlightmapListing.tsx
import { useState, useContext } from 'react';
import { FlightmapProvider, useFlightmapContext } from '@/contexts/FlightmapContext';
import { ThemeContext } from '@/contexts/ThemeContext';
import Modal from '@/components/Flightmap/Modal';
import FlightmapSwitcher from '@/components/Flightmap/FlightmapSwitcher';
import FlightmapCard from './components/FlightmapCard';
import { Strategy } from '@/types/flightmap';
import { Filter, FileText } from 'lucide-react';
import { ConfirmationModal } from '@/components/Forms/Utils/ConfirmationModal';

function FlightmapListingContent() {
  const { themeColor } = useContext(ThemeContext);
  const {
    flightmaps,
    isLoading,
    isError,
    error,
    draftFilter,
    setDraftFilter,
    selectedFlightmap,
    setSelectedFlightmap,
    deleteFlightmap,
  } = useFlightmapContext();
  
  const [flightmapToDelete, setFlightmapToDelete] = useState<Strategy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (flightmap: Strategy) => {
    setFlightmapToDelete(flightmap);
  };

  const confirmDelete = async () => {
    if (!flightmapToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteFlightmap(flightmapToDelete.id);
      setFlightmapToDelete(null);
    } catch (error) {
      console.error('Failed to delete flightmap:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div 
          className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4"
          style={{ borderColor: themeColor }}
        ></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading flightmaps</p>
          <p className="text-gray-600">{error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Flightmaps</h1>
        
        {/* Draft Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={draftFilter}
            onChange={(e) => setDraftFilter(e.target.value as 'all' | 'drafts' | 'completed')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Flightmaps</option>
            <option value="drafts">Drafts Only</option>
            <option value="completed">Completed Only</option>
          </select>
        </div>
      </div>

      {!flightmaps || flightmaps.length === 0 ? (
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
              openModal={() => setSelectedFlightmap(r)}
              onDelete={() => handleDelete(r)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedFlightmap && (
        <Modal onClose={() => setSelectedFlightmap(null)}>
          <h2 className="text-xl font-bold mb-4">
            {selectedFlightmap.name}
            {selectedFlightmap.is_draft && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Draft
              </span>
            )}
          </h2>
          <FlightmapSwitcher />
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

// Main component wraps with provider
export default function FlightmapListing() {
  return (
    <FlightmapProvider>
      <FlightmapListingContent />
    </FlightmapProvider>
  );
}