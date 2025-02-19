// import React, { useState } from 'react';
// import { RoadmapData } from '@/types/roadmap';
// import Modal from '@/components/Roadmap/Modal';
// import useFetch from '@/hooks/UseFetch';
// import RoadmapSwitcher from '@/components/Roadmap/RoadmapSwitcher';

// /* ------------------------------------------------------------------
//    6) RoadmapListing - Creative Cards + Modal for RoadmapSwitcher
//    ------------------------------------------------------------------ */
  
//   const RoadmapListing: React.FC = () => {
//     const [selectedRoadmap, setSelectedRoadmap] = useState<RoadmapData | null>(null);
//     const [showModal, setShowModal] = useState(false);
  
//     // Use your custom hook to fetch an array of RoadmapData
//     const {
//       data: roadmaps,
//       loading,
//       error,
//     } = useFetch<RoadmapData[]>('http://127.0.0.1:8000/roadmaps/');
  
//     // Handle loading/error states
//     if (loading) {
//       return <div className="min-h-screen flex items-center justify-center">Loading roadmaps...</div>;
//     }
  
//     if (error) {
//       return (
//         <div className="min-h-screen flex items-center justify-center text-red-500">
//           Error: {error}
//         </div>
//       );
//     }
  
//     if (!roadmaps || !roadmaps.length) {
//       return (
//         <div className="min-h-screen flex items-center justify-center">
//           No roadmaps available.
//         </div>
//       );
//     }
  
//     // Handlers for modal
//     const openModal = (roadmap: RoadmapData) => {
//       setSelectedRoadmap(roadmap);
//       setShowModal(true);
//     };
  
//     const closeModal = () => {
//       setSelectedRoadmap(null);
//       setShowModal(false);
//     };
  
//     return (
//       <div className="p-4">
//         <h1 className="text-2xl font-bold mb-6">Roadmaps</h1>
//         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//           {roadmaps.map((roadmap) => (
//             <div
//               key={roadmap.id}
//               className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
//             >
//               {/* Example cover image, could be dynamic or a fallback */}
//               <img
//                 src="https://via.placeholder.com/400x200?text=Roadmap+Cover"
//                 alt="Roadmap Cover"
//                 className="w-full h-48 object-cover"
//               />
  
//               <div className="p-4 flex-1 flex flex-col">
//                 <h2 className="text-xl font-semibold mb-2">{roadmap.name}</h2>
//                 <p className="text-sm text-gray-600 flex-grow">
//                   {roadmap.description || 'No description provided.'}
//                 </p>
//                 <button
//                   onClick={() => openModal(roadmap)}
//                   className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 self-start"
//                 >
//                   View Roadmap
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
  
//         {showModal && selectedRoadmap && (
//           <Modal onClose={closeModal}>
//             <h2 className="text-xl font-bold mb-4">{selectedRoadmap.name}</h2>
//             <RoadmapSwitcher data={selectedRoadmap} />
//           </Modal>
//         )}
//       </div>
//     );
//   };
  
//     export default RoadmapListing;

import React, { useState } from 'react';
import { RoadmapData } from '@/types/roadmap';
import Modal from '@/components/Roadmap/Modal';
import useFetch from '@/hooks/UseFetch';
import RoadmapSwitcher from '@/components/Roadmap/RoadmapSwitcher';
import { ChevronRight } from 'lucide-react';

const RoadmapCard: React.FC<{ roadmap: RoadmapData; openModal: (roadmap: RoadmapData) => void }> = ({ roadmap, openModal }) => (
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
      
      {/* <div className="flex items-center space-x-4 text-sm text-gray-500">
        <span className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          {Math.floor(Math.random() * 40 + 20)}h
        </span>
        <span className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          {Math.floor(Math.random() * 10000)}
        </span>
      </div> */}
      
      <button
        onClick={() => openModal(roadmap)}
        className="w-full mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center group"
      >
        <span>View Roadmap</span>
        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  </div>
);

const RoadmapListing: React.FC = () => {
  const [selectedRoadmap, setSelectedRoadmap] = useState<RoadmapData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const {
    data: roadmaps,
    loading,
    error,
  } = useFetch<RoadmapData[]>('http://127.0.0.1:8000/roadmaps/');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading roadmaps...</div>;
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
          <RoadmapSwitcher />
          {/* <RoadmapSwitcher data={selectedRoadmap} /> */}
        </Modal>
      )}
    </div>
  );
};

export default RoadmapListing;
