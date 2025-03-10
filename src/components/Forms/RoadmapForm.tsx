import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { User } from '../../types/model';

export type RoadmapFormData = {
  name: string;
  description?: string;
  owner: number;
};

export const RoadmapForm: React.FC = () => {
  // Access the form context provided by the parent (FormStepper)
  const { register } = useFormContext<RoadmapFormData>();
  const { data: users, loading, error } = useFetch<User>('http://127.0.0.1:8000/users/');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-10">Roadmap Form</h2>
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
        <label className="block text-sm font-medium text-gray-700">Owner</label>
        {loading ? (
          <p>Loading owners...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : (
          <select
            {...register('owner')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select an owner</option>
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
