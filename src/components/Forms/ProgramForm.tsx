/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams
import React, { useEffect, useCallback, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Strategy, User } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';

export type ProgramFormData = {
  programs: {
    id?: number;
    strategy: number;
    name: string;
    vision?: string;
    time_horizon: string;
    executive_sponsors: number[];
    program_leads: number[];
    workforce_sponsors: number[];
    key_improvement_targets: number[];
    key_organizational_goals: number[];
  }[];
};

const API = import.meta.env.VITE_API_BASE_URL;

export const ProgramForm: React.FC = () => {
  const { register, control, watch, setValue } = useFormContext<ProgramFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "programs"
  });
  
  // State for existing programs for per-item editing.
  const [existingPrograms, setExistingPrograms] = useState<any[]>([]);
  const accessToken = sessionStorage.getItem('accessToken');
  useEffect(() => {
    fetch(`${API}/programs/`, {
      headers: {
        'Authorization': `Bearer ${accessToken || ''}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setExistingPrograms(items);
      })
      .catch((err) => console.error("Error fetching programs", err));
  }, [API, accessToken]);

  // Fetch strategies, users, and strategic goals.
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy[]>(`${API}/strategies/`);
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User[]>(`${API}/users/`);
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal[]>(`${API}/strategic-goals/`);

  const userOptions = users ? users.map((u: User) => ({ label: u.username, value: u.id })) : [];
  const strategicGoalOptions = strategicGoals
    ? strategicGoals.map((goal: StrategicGoal) => ({ label: goal.goal_text, value: goal.id }))
    : [];

  const addProgram = useCallback(() => {
    append({
      strategy: 0,
      name: "",
      vision: "",
      time_horizon: "",
      executive_sponsors: [],
      program_leads: [],
      workforce_sponsors: [],
      key_improvement_targets: [],
      key_organizational_goals: []
    });
  }, [append]);

  useEffect(() => {
    if (fields.length === 0) {
      addProgram();
    }
  }, [fields.length, addProgram]);

  const handleExistingSelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      const selected = existingPrograms.find((p) => p.id.toString() === id);
      if (selected) {
        setValue(`programs.${index}`, selected);
      }
    } else {
      setValue(`programs.${index}`, {
        strategy: 0,
        name: "",
        vision: "",
        time_horizon: "",
        executive_sponsors: [],
        program_leads: [],
        workforce_sponsors: [],
        key_improvement_targets: [],
        key_organizational_goals: []
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Programs</h2>
        <button
          type="button"
          onClick={addProgram}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Program
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          {/* Existing Program Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Select existing Program (Edit existing records)</label>
            <select onChange={(e) => handleExistingSelect(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="">New Program</option>
              {existingPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Program {index + 1}</h3>
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
            {/* Strategy (single select) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Strategy</label>
              {loadingStrategies ? (
                <p>Loading strategies...</p>
              ) : errorStrategies ? (
                <p>Error: {errorStrategies}</p>
              ) : (
                <select
                  {...register(`programs.${index}.strategy` as const)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a strategy</option>
                  {(strategies || []).map((strategy: Strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                {...register(`programs.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            {/* Vision Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Vision</label>
              <textarea
                {...register(`programs.${index}.vision` as const)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            {/* Time Horizon Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Time Horizon</label>
              <input
                {...register(`programs.${index}.time_horizon` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            {/* MultiSelect for Executive Sponsors */}
            <div>
              <MultiSelect
                label="Executive Sponsors"
                options={userOptions}
                value={watch(`programs.${index}.executive_sponsors`) || []}
                onChange={(newValue) => setValue(`programs.${index}.executive_sponsors`, newValue.map(val => Number(val)))}
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select executive sponsors..."
              />
            </div>
            <div>
              <MultiSelect
                label="Program Leads"
                options={userOptions}
                value={watch(`programs.${index}.program_leads`) || []}
                onChange={(newValue) => setValue(`programs.${index}.program_leads`, newValue.map(val => Number(val)))}
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select program leads..."
              />
            </div>
            <div>
              <MultiSelect
                label="Workforce Sponsors"
                options={userOptions}
                value={watch(`programs.${index}.workforce_sponsors`) || []}
                onChange={(newValue) => setValue(`programs.${index}.workforce_sponsors`, newValue.map(val => Number(val)))}
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select workforce sponsors..."
              />
            </div>
            <div>
              <MultiSelect
                label="Key Improvement Targets"
                options={strategicGoalOptions}
                value={watch(`programs.${index}.key_improvement_targets`) || []}
                onChange={(newValue) => setValue(`programs.${index}.key_improvement_targets`, newValue.map(val => Number(val)))}
                isLoading={loadingGoals}
                error={errorGoals}
                placeholder="Select key improvement targets..."
              />
            </div>
            <div>
              <MultiSelect
                label="Key Organizational Goals"
                options={strategicGoalOptions}
                value={watch(`programs.${index}.key_organizational_goals`) || []}
                onChange={(newValue) => setValue(`programs.${index}.key_organizational_goals`, newValue.map(val => Number(val)))}
                isLoading={loadingGoals}
                error={errorGoals}
                placeholder="Select key organizational goals..."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgramForm;
