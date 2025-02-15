import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Workstream, Milestone, Activity } from '../../types/model';

export type ActivityFormData = {
  workstream: number;
  milestone?: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 1 | 2 | 3;
  target_start_date: string;
  target_end_date: string;
  prerequisite_activities: number[];
  parallel_activities: number[];
  successive_activities: number[];
  impacted_employee_groups: string[];
  change_leaders: string[];
  development_support: string[];
  external_resources: string[];
  corporate_resources: string[];
};

export const ActivityForm: React.FC = () => {
  const { register } = useFormContext<ActivityFormData>();
  const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>('http://127.0.0.1:8000/workstreams/');
  const { data: milestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone>('http://127.0.0.1:8000/milestones/');
  const { data: activities, loading: loadingActivities, error: errorActivities } = useFetch<Activity>('http://127.0.0.1:8000/activities/');

  return (
    <div className="space-y-4">
      <h2>Activity Form</h2>
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
        <label className="block text-sm font-medium text-gray-700">Milestone (optional)</label>
        {loadingMilestones ? (
          <p>Loading milestones...</p>
        ) : errorMilestones ? (
          <p>Error: {errorMilestones}</p>
        ) : (
          <select
            {...register('milestone')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">No milestone</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
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
        <label className="block text-sm font-medium text-gray-700">Priority</label>
        <select
          {...register('priority')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value={1}>High</option>
          <option value={2}>Medium</option>
          <option value={3}>Low</option>
        </select>
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
        <label className="block text-sm font-medium text-gray-700">Target Start Date</label>
        <input
          {...register('target_start_date')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Target End Date</label>
        <input
          {...register('target_end_date')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      {/* Multi-selects for activity relationships */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Prerequisite Activities</label>
        {loadingActivities ? (
          <p>Loading activities...</p>
        ) : errorActivities ? (
          <p>Error: {errorActivities}</p>
        ) : (
          <select
            {...register('prerequisite_activities')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Parallel Activities</label>
        {loadingActivities ? (
          <p>Loading activities...</p>
        ) : errorActivities ? (
          <p>Error: {errorActivities}</p>
        ) : (
          <select
            {...register('parallel_activities')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Successive Activities</label>
        {loadingActivities ? (
          <p>Loading activities...</p>
        ) : errorActivities ? (
          <p>Error: {errorActivities}</p>
        ) : (
          <select
            {...register('successive_activities')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {/* For resource fields, using comma-separated string inputs */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Impacted Employee Groups (comma separated)
        </label>
        <input
          {...register('impacted_employee_groups')}
          type="text"
          placeholder="e.g., Group1, Group2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Change Leaders (comma separated)
        </label>
        <input
          {...register('change_leaders')}
          type="text"
          placeholder="e.g., Leader1, Leader2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Development Support (comma separated)
        </label>
        <input
          {...register('development_support')}
          type="text"
          placeholder="e.g., Support1, Support2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          External Resources (comma separated)
        </label>
        <input
          {...register('external_resources')}
          type="text"
          placeholder="e.g., Resource1, Resource2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Corporate Resources (comma separated)
        </label>
        <input
          {...register('corporate_resources')}
          type="text"
          placeholder="e.g., Resource1, Resource2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
};
