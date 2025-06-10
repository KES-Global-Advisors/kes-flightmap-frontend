// cSpell:ignore workstream workstreams roadmaps Gantt flightmap flightmaps
import React, { useState } from 'react';
import FlightmapVisualization from './FlightmapVisualization';
import GanttChart from './GanttChart';
import FrameworkView from './FrameworkView';
import { FlightmapData } from '@/types/flightmap';
import { useUpdateMilestoneDeadline } from '@/api/flightmap';


interface Props {
  roadmap: FlightmapData;
}

const FlightmapSwitcher: React.FC<Props> = React.memo(({ roadmap }) => {
  const [viewMode, setViewMode] = useState<'flightmap' | 'gantt' | 'framework'>('flightmap');
  const updateMilestoneMutation = useUpdateMilestoneDeadline();

  const onMilestoneDeadlineChange = async (milestoneId: string, newDeadline: Date): Promise<boolean> => {
    try {
      const milestoneIdNumber = Number(milestoneId);
      if (isNaN(milestoneIdNumber)) throw new Error('Invalid milestone ID');

      await updateMilestoneMutation.mutateAsync({
        milestoneId: milestoneIdNumber,
        deadline: newDeadline.toISOString().slice(0, 10),
      });

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
}, (prevProps, nextProps) => {
  // Only re-render if roadmap ID or critical fields change
  return prevProps.roadmap.id === nextProps.roadmap.id && 
         prevProps.roadmap.name === nextProps.roadmap.name;
});

export default FlightmapSwitcher;