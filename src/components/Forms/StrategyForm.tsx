import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Roadmap, User } from '../../types/model';

export type StrategyFormData = {
  roadmap: number;
  name: string;
  tagline?: string;
  vision: string;
  time_horizon: string;
  executive_sponsors: number[];
  strategy_leads: number[];
  communication_leads: number[];
};

export const StrategyForm: React.FC = () => {
  const { register } = useFormContext<StrategyFormData>();
  const { data: roadmaps, loading: loadingRoadmaps, error: errorRoadmaps } = useFetch<Roadmap>('http://127.0.0.1:8000/roadmaps/');
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User>('http://127.0.0.1:8000/users/');

  return (
    <div className="space-y-4">
      <h2>Strategy Form</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Roadmap</label>
        {loadingRoadmaps ? (
          <p>Loading roadmaps...</p>
        ) : errorRoadmaps ? (
          <p>Error: {errorRoadmaps}</p>
        ) : (
          <select
            {...register('roadmap')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a roadmap</option>
            {roadmaps.map((roadmap) => (
              <option key={roadmap.id} value={roadmap.id}>
                {roadmap.name}
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
        <label className="block text-sm font-medium text-gray-700">Tagline</label>
        <input
          {...register('tagline')}
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
      {/* Multi-selects for sponsors and leads */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Executive Sponsors</label>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : errorUsers ? (
          <p>Error: {errorUsers}</p>
        ) : (
          <select
            {...register('executive_sponsors')}
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
        <label className="block text-sm font-medium text-gray-700">Strategy Leads</label>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : errorUsers ? (
          <p>Error: {errorUsers}</p>
        ) : (
          <select
            {...register('strategy_leads')}
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
        <label className="block text-sm font-medium text-gray-700">Communication Leads</label>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : errorUsers ? (
          <p>Error: {errorUsers}</p>
        ) : (
          <select
            {...register('communication_leads')}
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
    </div>
  );
};
