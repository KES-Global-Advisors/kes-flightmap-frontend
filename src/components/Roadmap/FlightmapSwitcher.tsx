// cSpell:ignore workstream workstreams roadmaps Flightmap Gantt
import { useState } from 'react';
import FlightmapVisualization from './FlightmapVisualization';
import GanttChart from './GanttChart';
import FrameworkView from './FrameworkView';
import { FlightmapData } from '@/types/roadmap';

interface FlightmapSwitcherProps {
  roadmap: FlightmapData;
}

const FlightmapSwitcher: React.FC<FlightmapSwitcherProps> = ({ roadmap }) => {
  const [viewMode, setViewMode] = useState<'flightmap' | 'gantt' | 'framework' >('flightmap');

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
          onClick={() => setViewMode('framework')}
          className={`px-4 py-2 rounded ${viewMode === 'framework' ? 'bg-gray-200' : 'bg-white'}`}
        >
          Framework View
        </button>
      </div>

      {viewMode === 'flightmap' && <FlightmapVisualization data={roadmap} />}
      {viewMode === 'gantt' && <GanttChart data={roadmap} />}
      {viewMode === 'framework' && <FrameworkView data={roadmap} />}
    </div>
  );
};

export default FlightmapSwitcher;
