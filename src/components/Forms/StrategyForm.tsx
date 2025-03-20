import React, { useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Roadmap, User } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';

export type StrategyFormData = {
  strategies: {
    roadmap: number;
    name: string;
    tagline?: string;
    vision: string;
    time_horizon: string;
    executive_sponsors: number[];
    strategy_leads: number[];
    communication_leads: number[];
  }[];
};

export const StrategyForm: React.FC = () => {
  const { register, control, watch, setValue } = useFormContext<StrategyFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "strategies"
  });
  
  const { data: roadmaps, loading: loadingRoadmaps, error: errorRoadmaps } = useFetch<Roadmap>('http://127.0.0.1:8000/roadmaps/');
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User>('http://127.0.0.1:8000/users/');

  // Helper: map users to MultiSelect options
  const userOptions = users ? users.map(u => ({ label: u.username, value: u.id })) : [];

  // Add a new empty strategy
  const addStrategy = () => {
    append({
      roadmap: 0,
      name: "",
      tagline: "",
      vision: "",
      time_horizon: "",
      executive_sponsors: [],
      strategy_leads: [],
      communication_leads: []
    });
  };

  // Add an initial strategy if the array is empty
  useEffect(() => {
    if (fields.length === 0) {
      addStrategy();
    }
  }, [fields.length]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Strategies</h2>
        <button
          type="button"
          onClick={addStrategy}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Strategy
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Strategy {index + 1}</h3>
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
            {/* Roadmap Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Roadmap</label>
              {loadingRoadmaps ? (
                <p>Loading roadmaps...</p>
              ) : errorRoadmaps ? (
                <p>Error: {errorRoadmaps}</p>
              ) : (
                <select
                  {...register(`strategies.${index}.roadmap` as const)}
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
            
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                {...register(`strategies.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Tagline Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Tagline</label>
              <input
                {...register(`strategies.${index}.tagline` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Vision Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Vision</label>
              <textarea
                {...register(`strategies.${index}.vision` as const)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Time Horizon Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Time Horizon</label>
              <input
                {...register(`strategies.${index}.time_horizon` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* MultiSelect for Executive Sponsors */}
            <div>
              <MultiSelect
                label="Executive Sponsors"
                options={userOptions}
                value={watch(`strategies.${index}.executive_sponsors`) || []}
                onChange={(newValue) =>
                  setValue(`strategies.${index}.executive_sponsors`, newValue)
                }
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select executive sponsors..."
              />
            </div>
            
            {/* MultiSelect for Strategy Leads */}
            <div>
              <MultiSelect
                label="Strategy Leads"
                options={userOptions}
                value={watch(`strategies.${index}.strategy_leads`) || []}
                onChange={(newValue) =>
                  setValue(`strategies.${index}.strategy_leads`, newValue)
                }
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select strategy leads..."
              />
            </div>
            
            {/* MultiSelect for Communication Leads */}
            <div>
              <MultiSelect
                label="Communication Leads"
                options={userOptions}
                value={watch(`strategies.${index}.communication_leads`) || []}
                onChange={(newValue) =>
                  setValue(`strategies.${index}.communication_leads`, newValue)
                }
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select communication leads..."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StrategyForm;
