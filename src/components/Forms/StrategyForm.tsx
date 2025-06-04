// cSpell:ignore Flightmap Flightmaps
import React, { useCallback, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Flightmap, User } from '../../types/model';
import { PlusCircle, Trash2, Info } from 'lucide-react';
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

interface StrategyFormProps {
  editMode?: boolean;
}

export const StrategyForm: React.FC<StrategyFormProps> = ({ editMode = false }) => {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<StrategyFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "strategies",
  });

  // Fetch arrays for Flightmaps and users
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
  
  // Initialize with one empty strategy for creation mode
  useEffect(() => {
    if (!editMode && fields.length === 0) {
      addStrategy();
    }
  }, [editMode, fields.length, addStrategy]);

  // Validation helper for date fields
  const validateTimeHorizon = (value: string) => {
    if (!value) return 'Time horizon is required';
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      return 'Time horizon must be in the future';
    }
    return true;
  };

  // Enhanced validation for strategy name
  const validateStrategyName = (value: string, index: number) => {
    if (!value || value.trim().length === 0) {
      return 'Strategy name is required';
    }
    if (value.trim().length < 3) {
      return 'Strategy name must be at least 3 characters';
    }
    if (value.trim().length > 100) {
      return 'Strategy name must be less than 100 characters';
    }
    
    // Check for duplicate names within the same form
    const currentStrategies = watch('strategies') || [];
    const duplicateCount = currentStrategies.filter((s, i) => 
      i !== index && s.name && s.name.trim().toLowerCase() === value.trim().toLowerCase()
    ).length;
    
    if (duplicateCount > 0) {
      return 'Strategy names must be unique';
    }
    
    return true;
  };

  // Enhanced validation for vision field
  const validateVision = (value: string) => {
    if (!value || value.trim().length === 0) {
      return 'Vision is required';
    }
    if (value.trim().length < 20) {
      return 'Vision should be at least 20 characters for meaningful description';
    }
    if (value.trim().length > 1000) {
      return 'Vision must be less than 1000 characters';
    }
    return true;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">
            {editMode ? 'Edit Strategies' : 'Create Strategies'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {editMode 
              ? 'Modify existing strategy details and assignments'
              : 'Define strategic initiatives aligned with your flightmap objectives'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!editMode && (
            <div className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-full">
              Creation Mode
            </div>
          )}
          {!editMode && (
            <button
              type="button"
              onClick={addStrategy}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Strategy
            </button>
          )}
        </div>
      </div>
      
      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              {editMode ? 'Strategy Details' : `Strategy ${index + 1}`}
            </h3>
            {!editMode && fields.length > 1 && (
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
            {/* Flightmap Field */}
            <div>
              <FormLabel label="Flightmap" required />
              {loadingFlightmaps ? (
                <div className="mt-1 block w-full p-3 text-gray-500 bg-gray-50 rounded-md">
                  Loading flightmaps...
                </div>
              ) : errorFlightmaps ? (
                <div className="mt-1 block w-full p-3 text-red-600 bg-red-50 rounded-md">
                  Error loading flightmaps: {errorFlightmaps}
                </div>
              ) : (
                <>
                  <select
                    {...register(`strategies.${index}.flightmap` as const, {
                      required: 'Flightmap selection is required',
                      validate: value => value !== 0 || 'Please select a valid flightmap'
                    })}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                      errors.strategies?.[index]?.flightmap ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    disabled={editMode} // Disable flightmap changes in edit mode
                  >
                    <option value="">Select a flightmap</option>
                    {(flightmaps || []).map((flightmap: Flightmap) => (
                      <option key={flightmap.id} value={flightmap.id}>
                        {flightmap.name}
                      </option>
                    ))}
                  </select>
                  {editMode && (
                    <p className="mt-1 text-xs text-gray-500">
                      Flightmap association cannot be changed in edit mode
                    </p>
                  )}
                  {errors.strategies?.[index]?.flightmap && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.strategies[index]?.flightmap?.message}
                    </p>
                  )}
                </>
              )}
            </div>
            
            {/* Name Field */}
            <div>
              <FormLabel label="Name" required />
              <input
                {...register(`strategies.${index}.name` as const, {
                  validate: (value) => validateStrategyName(value, index)
                })}
                type="text"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.strategies?.[index]?.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="Enter strategy name (e.g., Digital Transformation Initiative)"
              />
              {errors.strategies?.[index]?.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.strategies[index]?.name?.message}
                </p>
              )}
            </div>
            
            {/* Tagline Field */}
            <div>
              <FormLabel label="Tagline" required={false} />
              <input
                {...register(`strategies.${index}.tagline` as const, {
                  maxLength: { value: 150, message: 'Tagline must be less than 150 characters' }
                })}
                type="text"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.strategies?.[index]?.tagline ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="Brief, memorable tagline for this strategy"
              />
              {errors.strategies?.[index]?.tagline && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.strategies[index]?.tagline?.message}
                </p>
              )}
            </div>
            
            {/* Vision Field */}
            <div>
              <FormLabel label="Vision" required />
              <textarea
                {...register(`strategies.${index}.vision` as const, {
                  validate: validateVision
                })}
                rows={4}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.strategies?.[index]?.vision ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="Describe the long-term vision and objectives of this strategy..."
              />
              {errors.strategies?.[index]?.vision && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.strategies[index]?.vision?.message}
                </p>
              )}
            </div>
            
            {/* Time Horizon Field */}
            <div>
              <FormLabel label="Time Horizon" required />
              <input
                {...register(`strategies.${index}.time_horizon` as const, {
                  validate: (value) => validateTimeHorizon(value)
                })}
                type="date"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.strategies?.[index]?.time_horizon ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors.strategies?.[index]?.time_horizon && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.strategies[index]?.time_horizon?.message}
                </p>
              )}
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
              {!editMode && (
                <p className="mt-1 text-xs text-gray-500">
                  Select senior leaders who will champion this strategy
                </p>
              )}
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
              {!editMode && (
                <p className="mt-1 text-xs text-gray-500">
                  Choose individuals responsible for strategy execution
                </p>
              )}
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
              {!editMode && (
                <p className="mt-1 text-xs text-gray-500">
                  Assign team members to handle strategy communication
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Creation Mode Guidance */}
      {!editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">Strategy Creation Guidelines:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ensure each strategy aligns with your flightmap objectives</li>
                <li>• Create meaningful, unique names that clearly identify each strategy</li>
                <li>• Provide comprehensive visions that guide strategic decision-making</li>
                <li>• Assign appropriate sponsors and leads for accountability</li>
                <li>• Set realistic time horizons that allow for proper execution</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyForm;