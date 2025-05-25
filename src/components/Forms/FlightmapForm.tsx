import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { User } from '../../types/model';
import { FormLabel } from './Utils/RequiredFieldIndicator';

const API = import.meta.env.VITE_API_BASE_URL;

export type FlightmapFormData = {
  name: string;
  description?: string;
  owner: number;
};

export const FlightmapForm: React.FC = () => {
  const { register } = useFormContext<FlightmapFormData>();
  // Fetch an array of users instead of a single User.
  const { data: users, loading, error } = useFetch<User[]>(`${API}/users/`);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-10">Flightmap Form</h2>
      <div>
        <FormLabel label="Name" required />
        <input
          {...register('name')}
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <FormLabel label="Description" required />
        <textarea
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <FormLabel label="Owner" required />
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
            {(users || []).map((user: User) => (
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
