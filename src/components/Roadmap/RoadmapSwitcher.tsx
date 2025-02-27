import { useState } from 'react';
import RoadmapVisualization from './FlightmapVisualization';
import GanttChart from './GanttChart';
import ActivityTable  from './Table'
import { RoadmapData } from '@/types/roadmap';

interface RoadmapSwitcherProps {
  roadmap: RoadmapData;
}

const RoadmapSwitcher: React.FC<RoadmapSwitcherProps> = ({ roadmap }) => {
  const [viewMode, setViewMode] = useState<'flightmap' | 'gantt' | 'table'>('flightmap');

  return (
    <div>
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setViewMode('flightmap')}
          className={`px-4 py-2 rounded ${viewMode === 'flightmap' ? 'bg-gray-200' : 'bg-white'}`}
        >
          Flightmap View
        </button>
        <button
          onClick={() => setViewMode('gantt')}
          className={`px-4 py-2 rounded ${viewMode === 'gantt' ? 'bg-gray-200' : 'bg-white'}`}
        >
          Gantt View
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 rounded ${viewMode === 'table' ? 'bg-gray-200' : 'bg-white'}`}
        >
          Tabular View
        </button>
      </div>

      {viewMode === 'flightmap' && <RoadmapVisualization data={roadmap} />}
      {viewMode === 'gantt' && <GanttChart data={roadmap} />}
      {viewMode === 'table' && <ActivityTable data={roadmap} />}
    </div>
  );
};

export default RoadmapSwitcher;
