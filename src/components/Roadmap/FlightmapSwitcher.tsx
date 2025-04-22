import React, { useState } from 'react';
import FlightmapVisualization from './FlightmapVisualization';
import GanttChart from './GanttChart';
import FrameworkView from './FrameworkView';
import { FlightmapData } from '@/types/roadmap';

interface Props {
  roadmap: FlightmapData;
  // now calls silentRefetch in parent
  onRoadmapChange: () => Promise<void>;
}

const FlightmapSwitcher: React.FC<Props> = ({ roadmap, onRoadmapChange }) => {
  const [viewMode, setViewMode] = useState<'flightmap' | 'gantt' | 'framework'>('flightmap');
  const API = import.meta.env.VITE_API_BASE_URL;

  // optimistic UI update happens inside D3;
  // afterwards we do a silent refetch
  const onMilestoneDeadlineChange = async (
    milestoneId: string,
    newDeadline: Date
  ): Promise<boolean> => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API}/milestones/${milestoneId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ deadline: newDeadline.toISOString().slice(0, 10) }),
      });
      if (!res.ok) {
        console.error('Patch failed');
        return false;
      }
      // silently re‑sync parent data
      await onRoadmapChange();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

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
        <button
          onClick={() => setViewMode('framework')}
          className={`px-4 py-2 rounded ${
            viewMode === 'framework' ? 'bg-gray-200' : 'bg-white'
          }`}
        >
          Framework View
        </button>
      </div>

      {viewMode === 'flightmap' && (
        <FlightmapVisualization
          data={roadmap}
          onMilestoneDeadlineChange={onMilestoneDeadlineChange}
        />
      )}
      {viewMode === 'gantt' && <GanttChart data={roadmap} />}
      {viewMode === 'framework' && <FrameworkView data={roadmap} />}
    </div>
  );
};

export default FlightmapSwitcher;
