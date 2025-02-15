import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Workstream } from '../../types/model';

export type MilestoneFormData = {
  workstream: number;
  name: string;
  description?: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed';
  strategic_goals: number[];
};

export const MilestoneForm: React.FC = () => {
  const { register } = useFormContext<MilestoneFormData>();
  const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>('http://127.0.0.1:8000/workstreams/');
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal>('http://127.0.0.1:8000/strategic-goals/');

  return (
    <div className="space-y-4">
      <h2>Milestone Form</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Workstream</label>
        {loadingWorkstreams ? (
          <p>Loading workstreams...</p>
        ) : errorWorkstreams ? (
          <p>Error: {errorWorkstreams}</p>
        ) : (
          <select
            {...register('workstream')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a workstream</option>
            {workstreams.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          {...register('name')}
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Deadline</label>
        <input
          {...register('deadline')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          {...register('status')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Strategic Goals</label>
        {loadingGoals ? (
          <p>Loading strategic goals...</p>
        ) : errorGoals ? (
          <p>Error: {errorGoals}</p>
        ) : (
          <select
            {...register('strategic_goals')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {strategicGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.goal_text}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
