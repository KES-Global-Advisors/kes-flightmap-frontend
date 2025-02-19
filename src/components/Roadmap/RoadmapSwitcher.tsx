import { useState } from 'react';
import Treemap from './FlightmapVisualization';
import GanttChart from './GanttRangeBar';
// import { RoadmapData } from '@/types/roadmap';

/* ------------------------------------------------------------------
   4) RoadmapSwitcher - Toggles Flightmap & Gantt
   ------------------------------------------------------------------ */
   const RoadmapSwitcher = () => {
    // const RoadmapSwitcher: React.FC<{ data: RoadmapData }> = ({ data }) => {
    const [viewMode, setViewMode] = useState<'flightmap' | 'gantt'>('flightmap');
  
    return (
      <div>
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setViewMode('flightmap')}
            className={`px-4 py-2 rounded ${
              viewMode === 'flightmap' ? 'bg-gray-200' : 'bg-white'
            }`}
          >
            Flightmap View
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`px-4 py-2 rounded ${
              viewMode === 'gantt' ? 'bg-gray-200' : 'bg-white'
            }`}
          >
            Gantt View
          </button>
        </div>

        {viewMode === 'flightmap' && (
          <Treemap  />
        )}
        {viewMode === 'gantt' && <GanttChart  />}
  
        {/* {viewMode === 'flightmap' && (
          <FlightmapVisualization data={data} width={1000} height={500} />
        )}
        {viewMode === 'gantt' && <GanttChart data={data} chartHeight={500} />} */}
      </div>
    );
  };
  
  export default RoadmapSwitcher;