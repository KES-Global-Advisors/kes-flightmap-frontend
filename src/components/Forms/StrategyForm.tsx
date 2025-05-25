// cSpell:ignore Flightmap Flightmaps
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Flightmap, User } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';
import { FormLabel } from './Utils/RequiredFieldIndicator';

const API = import.meta.env.VITE_API_BASE_URL;

export type StrategyFormData = {
  strategies: {
    id?: number;
    flightmap: number;
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
    name: "strategies",
  });

  // State for existing strategies (for per-item selection)
  const [existingStrategies, setExistingStrategies] = useState<any[]>([]);
  const accessToken = sessionStorage.getItem('accessToken');

  useEffect(() => {
    fetch(`${API}/strategies/`, {
      headers: {
        'Authorization': `Bearer ${accessToken || ''}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setExistingStrategies(items);
      })
      .catch((err) => console.error("Error fetching strategies", err));
  }, [accessToken]);

  // Fetch arrays for Flightmaps and users.
  const { data: flightmaps, loading: loadingFlightmaps, error: errorFlightmaps } = useFetch<Flightmap[]>(`${API}/flightmaps/`);
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User[]>(`${API}/users/`);

  const userOptions = users ? users.map((u: User) => ({ label: u.username, value: u.id })) : [];

  const addStrategy = useCallback(() => {
    console.log("Adding strategy");
    
    try {
      append({
        flightmap: 0,
        name: "",
        tagline: "",
        vision: "",
        time_horizon: "",
        executive_sponsors: [],
        strategy_leads: [],
        communication_leads: []
      });
      
      console.log("Strategy added successfully");
    } catch (error) {
      console.error("Error adding strategy:", error);
    }
  }, [append]);
  
  useEffect(() => {
    if (fields.length === 0) {
      addStrategy();
    }
  }, [fields.length, addStrategy]);

  // Handler for selecting an existing strategy for a specific field array item.
  const handleExistingSelectForIndex = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      const selectedStrategy = existingStrategies.find((s) => s.id.toString() === id);
      if (selectedStrategy) {
        // Update the field array item; note that we merge the selected strategy (which contains an id) into the form.
        setValue(`strategies.${index}`, selectedStrategy);
      }
    } else {
      // Reset to default empty values if "New" is selected.
      setValue(`strategies.${index}`, {
        flightmap: 0,
        name: "",
        tagline: "",
        vision: "",
        time_horizon: "",
        executive_sponsors: [],
        strategy_leads: [],
        communication_leads: []
      });
    }
  };

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
          {/* Existing record dropdown for this strategy */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Select existing Strategy (Edit existing records)
            </label>
            <select onChange={(e) => handleExistingSelectForIndex(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="">New Strategy</option>
              {existingStrategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.tagline || `Strategy ${s.id}`}
                </option>
              ))}
            </select>
          </div>

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
              <FormLabel label="Flightmap" required />
              {loadingFlightmaps ? (
                <p>Loading flightmaps...</p>
              ) : errorFlightmaps ? (
                <p>Error: {errorFlightmaps}</p>
              ) : (
                <select
                  {...register(`strategies.${index}.flightmap` as const)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a flightmap</option>
                  {(flightmaps || []).map((flightmap: Flightmap) => (
                    <option key={flightmap.id} value={flightmap.id}>
                      {flightmap.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {/* Name Field */}
            <div>
              <FormLabel label="Name" required />
              <input
                {...register(`strategies.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Tagline Field */}
            <div>
              <FormLabel label="Tagline" required={false} />
              <input
                {...register(`strategies.${index}.tagline` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Vision Field */}
            <div>
              <FormLabel label="Vision" required />
              <textarea
                {...register(`strategies.${index}.vision` as const)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Time Horizon Field */}
            <div>
              <FormLabel label="Time Horizon" required />
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
                onChange={(newValue) => setValue(`strategies.${index}.executive_sponsors`, newValue.map(val => Number(val)))}
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
                onChange={(newValue) => setValue(`strategies.${index}.strategy_leads`, newValue.map(val => Number(val)))}
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
                onChange={(newValue) => setValue(`strategies.${index}.communication_leads`, newValue.map(val => Number(val)))}
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
