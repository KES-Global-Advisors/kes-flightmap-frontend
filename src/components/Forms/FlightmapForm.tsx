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

interface FlightmapFormProps {
  editMode?: boolean; // New prop to control edit functionality
}

export const FlightmapForm: React.FC<FlightmapFormProps> = ({ editMode = false }) => {
  const { register, formState: { errors } } = useFormContext<FlightmapFormData>();
  const { data: users, loading, error } = useFetch<User[]>(`${API}/users/`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          {editMode ? 'Edit Flightmap' : 'Create New Flightmap'}
        </h2>
        {!editMode && (
          <div className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-full">
            Creation Mode
          </div>
        )}
      </div>

      <div>
        <FormLabel label="Name" required />
        <input
          {...register('name', { 
            required: 'Flightmap name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
            maxLength: { value: 100, message: 'Name must be less than 100 characters' }
          })}
          type="text"
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
            errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Enter flightmap name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <FormLabel label="Description" required />
        <textarea
          {...register('description', { 
            required: 'Description is required',
            minLength: { value: 10, message: 'Description must be at least 10 characters' },
            maxLength: { value: 500, message: 'Description must be less than 500 characters' }
          })}
          rows={4}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
            errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Describe the purpose and scope of this flightmap"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <FormLabel label="Owner" required />
        {loading ? (
          <div className="mt-1 block w-full p-3 text-gray-500 bg-gray-50 rounded-md">
            Loading owners...
          </div>
        ) : error ? (
          <div className="mt-1 block w-full p-3 text-red-600 bg-red-50 rounded-md">
            Error loading owners: {error}
          </div>
        ) : (
          <>
            <select
              {...register('owner', { 
                required: 'Owner selection is required',
                validate: value => value !== 0 || 'Please select a valid owner'
              })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                errors.owner ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              }`}
            >
              <option value="">Select an owner</option>
              {(users || []).map((user: User) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
            {errors.owner && (
              <p className="mt-1 text-sm text-red-600">{errors.owner.message}</p>
            )}
          </>
        )}
      </div>

      {/* Creation-specific guidance */}
      {!editMode && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Creation Guidelines:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Choose a descriptive name that clearly identifies your flightmap</li>
            <li>• Provide a comprehensive description including objectives and scope</li>
            <li>• Select an owner who will be responsible for this flightmap</li>
            <li>• All fields marked with * are required to proceed</li>
          </ul>
        </div>
      )}
    </div>
  );
};