import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { SketchPicker } from 'react-color';
import useFetch from '../../hooks/UseFetch';
import { Program, User } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';

export type WorkstreamFormData = {
  workstreams: {
    program: number;
    name: string;
    vision?: string;
    time_horizon: string;
    workstream_leads: number[];
    team_members: number[];
    improvement_targets: string[];
    organizational_goals: string[];
    color: string;
  }[];
};

export const WorkstreamForm: React.FC = () => {
  const { register, control } = useFormContext<WorkstreamFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "workstreams"
  });
  
  const { data: programs, loading: loadingPrograms, error: errorPrograms } = useFetch<Program>('http://127.0.0.1:8000/programs/');
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User>('http://127.0.0.1:8000/users/');

  // Add a new empty workstream
  const addWorkstream = () => {
    append({
      program: 0,
      name: "",
      vision: "",
      time_horizon: "",
      workstream_leads: [],
      team_members: [],
      improvement_targets: [],
      organizational_goals: [],
      color: "#0000FF"
    });
  };

  // Add an initial workstream if the array is empty
  React.useEffect(() => {
    if (fields.length === 0) {
      addWorkstream();
    }
  }, [fields.length]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Workstreams</h2>
        <button
          type="button"
          onClick={addWorkstream}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Workstream
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Workstream {index + 1}</h3>
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Program</label>
              {loadingPrograms ? (
                <p>Loading programs...</p>
              ) : errorPrograms ? (
                <p>Error: {errorPrograms}</p>
              ) : (
                <select
                  {...register(`workstreams.${index}.program` as const)}
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
                {...register(`workstreams.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Vision</label>
              <textarea
                {...register(`workstreams.${index}.vision` as const)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Time Horizon</label>
              <input
                {...register(`workstreams.${index}.time_horizon` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Color picker for workstream color */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Workstream Color</label>
              <Controller
                name={`workstreams.${index}.color` as const}
                control={control}
                defaultValue="#0000FF"
                render={({ field }) => (
                  <div className="mt-1">
                    <SketchPicker
                      color={field.value}
                      onChangeComplete={(color) => field.onChange(color.hex)}
                    />
                  </div>
                )}
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
                  {...register(`workstreams.${index}.workstream_leads` as const)}
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
                  {...register(`workstreams.${index}.team_members` as const)}
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
                {...register(`workstreams.${index}.improvement_targets` as const)}
                type="text"
                placeholder="e.g., Target1, Target2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Organizational Goals (comma separated)</label>
              <input
                {...register(`workstreams.${index}.organizational_goals` as const)}
                type="text"
                placeholder="e.g., Goal1, Goal2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};