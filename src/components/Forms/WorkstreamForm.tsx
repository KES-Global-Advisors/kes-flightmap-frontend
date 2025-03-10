import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Program, User } from '../../types/model';

export type WorkstreamFormData = {
  program: number;
  name: string;
  vision?: string;
  time_horizon: string;
  workstream_leads: number[];
  team_members: number[];
  improvement_targets: string[];  // Assuming comma-separated values
  organizational_goals: string[]; // Assuming comma-separated values
};

export const WorkstreamForm: React.FC = () => {
  const { register } = useFormContext<WorkstreamFormData>();
  const { data: programs, loading: loadingPrograms, error: errorPrograms } = useFetch<Program>('http://127.0.0.1:8000/programs/');
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User>('http://127.0.0.1:8000/users/');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-10">Workstream Form</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Program</label>
        {loadingPrograms ? (
          <p>Loading programs...</p>
        ) : errorPrograms ? (
          <p>Error: {errorPrograms}</p>
        ) : (
          <select
            {...register('program')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
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
        <label className="block text-sm font-medium text-gray-700">Vision</label>
        <textarea
          {...register('vision')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Time Horizon</label>
        <input
          {...register('time_horizon')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Workstream Leads</label>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : errorUsers ? (
          <p>Error: {errorUsers}</p>
        ) : (
          <select
            {...register('workstream_leads')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Team Members</label>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : errorUsers ? (
          <p>Error: {errorUsers}</p>
        ) : (
          <select
            {...register('team_members')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Improvement Targets (comma separated)</label>
        <input
          {...register('improvement_targets')}
          type="text"
          placeholder="e.g., Target1, Target2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Organizational Goals (comma separated)</label>
        <input
          {...register('organizational_goals')}
          type="text"
          placeholder="e.g., Goal1, Goal2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
};
