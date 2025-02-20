import React, { useState, useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { RoadmapData } from '@/types/roadmap';
import Modal from '@/components/Roadmap/Modal';
import useFetch from '@/hooks/UseFetch';
import RoadmapSwitcher from '@/components/Roadmap/RoadmapSwitcher';
import { ChevronRight } from 'lucide-react';

const RoadmapCard: React.FC<{ roadmap: RoadmapData; openModal: (roadmap: RoadmapData) => void }> = ({ roadmap, openModal }) => {
  const { themeColor } = useContext(ThemeContext);

  return (
    <div className="bg-white rounded-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100">
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
          className="w-full mt-4  text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center group"
        >
          <span>View Roadmap</span>
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

const RoadmapListing: React.FC = () => {
  const { themeColor } = useContext(ThemeContext);
  const [selectedRoadmap, setSelectedRoadmap] = useState<RoadmapData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const {
    data: roadmaps,
    loading,
    error,
  } = useFetch<RoadmapData[]>('http://127.0.0.1:8000/roadmaps/');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: themeColor }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!roadmaps || !roadmaps.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        No roadmaps available.
      </div>
    );
  }

  const openModal = (roadmap: RoadmapData) => {
    setSelectedRoadmap(roadmap);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedRoadmap(null);
    setShowModal(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Roadmaps</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {roadmaps.map((roadmap) => (
          <RoadmapCard key={roadmap.id} roadmap={roadmap} openModal={openModal} />
        ))}
      </div>

      {showModal && selectedRoadmap && (
        <Modal onClose={closeModal}>
          <h2 className="text-xl font-bold mb-4">{selectedRoadmap.name}</h2>
          <RoadmapSwitcher roadmap={selectedRoadmap} />
        </Modal>
      )}
    </div>
  );
};

export default RoadmapListing;
