// cSpell:ignore workstream workstreams roadmaps flightmaps
import React, { useState, useContext, useRef, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { FlightmapData } from '@/types/roadmap';
import { useAuth } from '@/contexts/UserContext';
import Modal from '@/components/Roadmap/Modal';
import useFetch from '@/hooks/UseFetch';
import FlightmapSwitcher from '@/components/Roadmap/FlightmapSwitcher';
import { ChevronRight, MoreVertical, Trash2, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) => {
  const { themeColor } = useContext(ThemeContext);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Confirm Action</h3>
          <button 
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ backgroundColor: themeColor }}
            className="px-4 py-2 rounded-lg text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

interface FlightmapCardProps {
  roadmap: FlightmapData;
  openModal: (roadmap: FlightmapData) => void;
  onDelete: (id: number) => void;
}

const FlightmapCard: React.FC<FlightmapCardProps> = ({ roadmap, openModal, onDelete }) => {
  const { themeColor } = useContext(ThemeContext);
  const { user } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDelete = async () => {
    setShowConfirmDialog(true);
  };

  const confirmDelete = () => {
    onDelete(roadmap.id);
    setShowConfirmDialog(false);
    setShowDropdown(false);
  };

  const cancelDelete = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className="bg-white rounded-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 relative">
      {/* Admin Menu */}
      {user?.role === 'admin' && (
        <div className="absolute top-4 right-4" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Flightmap
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <svg viewBox="0 0 200 120" className="w-full h-32">
          <rect x="0" y="0" width="200" height="120" fill="#f0f9ff" />
          <circle cx="100" cy="60" r="30" fill="#93c5fd" opacity="0.6" />
          <path
            d="M 40 80 Q 100 20 160 80"
            stroke="#3b82f6"
            strokeWidth="4"
            fill="none"
          />
          <circle cx="40" cy="80" r="8" fill="#2563eb" />
          <circle cx="160" cy="80" r="8" fill="#2563eb" />
        </svg>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900">{roadmap.name}</h3>
        <p className="text-gray-600 text-sm line-clamp-2">
          {roadmap.description || 'Embark on a journey to master new skills and advance your career.'}
        </p>

        <button
          onClick={() => openModal(roadmap)}
          style={{ backgroundColor: themeColor, cursor: 'pointer' }}
          className="w-full mt-4 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center group"
        >
          <span>View Flightmap</span>
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Custom Confirmation Dialog */}
      <ConfirmationDialog 
        isOpen={showConfirmDialog}
        message="Are you sure you want to delete this roadmap?"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};


const FlightmapListing: React.FC = () => {
  const { themeColor } = useContext(ThemeContext);
  const [selectedRoadmap, setSelectedRoadmap] = useState<FlightmapData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const API = import.meta.env.VITE_API_BASE_URL;

  const {
    data: roadmaps,
    loading,
    error,
    refetch,
    silentRefetch,
  } = useFetch<FlightmapData[]>(`${API}/flightmaps/`);

  // keep selectedRoadmap fresh whenever the list updates
  useEffect(() => {
    if (selectedRoadmap && roadmaps) {
      const updated = roadmaps.find(r => r.id === selectedRoadmap.id);
      if (updated) setSelectedRoadmap(updated);
    }
  }, [roadmaps, selectedRoadmap]);

  const openModal = (r: FlightmapData) => {
    setSelectedRoadmap(r);
    setShowModal(true);
  };
  const closeModal = () => {
    setSelectedRoadmap(null);
    setShowModal(false);
  };

  // only show page‑level loader when not in the modal
  if (loading && !showModal) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4"
          style={{ borderColor: themeColor }}
        />
      </div>
    );
  }
  if (error && !showModal) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>;
  }

  const handleDelete = async (id: number) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API}/flightmaps/${id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (!res.ok) throw new Error('Delete failed');
      // re‑load list (with loader)
      await refetch();
    } catch {
      alert('Failed to delete. Please try again.');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Flightmaps</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {roadmaps?.map(r => (
          <FlightmapCard
            key={r.id}
            roadmap={r}
            openModal={openModal}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {showModal && selectedRoadmap && (
        <Modal onClose={closeModal}>
          <h2 className="text-xl font-bold mb-4">{selectedRoadmap.name}</h2>
          <FlightmapSwitcher
            roadmap={selectedRoadmap}
            // silent refetch => no loader shown
            onRoadmapChange={() => silentRefetch()}
          />
        </Modal>
      )}
    </div>
  );
};

export default FlightmapListing;
