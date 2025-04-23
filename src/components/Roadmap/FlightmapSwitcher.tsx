// cSpell:ignore workstream workstreams roadmaps Gantt flightmap flightmaps
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import FlightmapVisualization from './FlightmapVisualization';
import GanttChart from './GanttChart';
import FrameworkView from './FrameworkView';
import { FlightmapData, Milestone } from '@/types/roadmap';

const API = import.meta.env.VITE_API_BASE_URL;

interface Props {
  roadmap: FlightmapData;
}

const FlightmapSwitcher: React.FC<Props> = ({ roadmap }) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'flightmap' | 'gantt' | 'framework'>('flightmap');


  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, newDeadline }: { milestoneId: number; newDeadline: Date }) => {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API}/milestones/${milestoneId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ deadline: newDeadline.toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error('Failed to update milestone');
    },
    onMutate: async ({ milestoneId, newDeadline }) => {
      await queryClient.cancelQueries({ queryKey: ['flightmaps'] });
      const previousFlightmaps = queryClient.getQueryData<FlightmapData[]>(['flightmaps']);

      queryClient.setQueryData<FlightmapData[]>(['flightmaps'], (old) => {
        if (!old) return [];
        return old.map((flightmap) => {
          if (flightmap.id !== roadmap.id) return flightmap;
          return {
            ...flightmap,
            strategies: flightmap.strategies.map((strategy) => ({
              ...strategy,
              programs: strategy.programs.map((program) => ({
                ...program,
                workstreams: program.workstreams.map((workstream) => ({
                  ...workstream,
                  milestones: workstream.milestones.map((milestone: Milestone) =>
                    milestone.id === milestoneId
                      ? { ...milestone, deadline: newDeadline.toISOString().slice(0, 10) }
                      : milestone
                  ),
                })),
              })),
            })),
          };
        });
      });

      return { previousFlightmaps };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousFlightmaps) {
        queryClient.setQueryData(['flightmaps'], context.previousFlightmaps);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });

  const onMilestoneDeadlineChange = async (milestoneId: string, newDeadline: Date): Promise<boolean> => {
    try {
      const milestoneIdNumber = Number(milestoneId); // Convert string to number
      if (isNaN(milestoneIdNumber)) {
        throw new Error('Invalid milestone ID');
      }
      await updateMilestoneMutation.mutateAsync({ milestoneId: milestoneIdNumber, newDeadline });
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
};

export default FlightmapSwitcher;