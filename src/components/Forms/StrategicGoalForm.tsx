/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Strategy } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';

export type StrategicGoalFormData = {
  goals: {
    id?: number;
    strategy: number;
    category: 'business' | 'organizational';
    goal_text: string;
  }[];
};

const API = import.meta.env.VITE_API_BASE_URL;

export const StrategicGoalForm: React.FC = () => {
  const { register, control, setValue } = useFormContext<StrategicGoalFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "goals"
  });
  
  // Fetch existing strategic goals for per-item editing.
  const [existingGoals, setExistingGoals] = useState<any[]>([]);
  const accessToken = sessionStorage.getItem('accessToken');
  useEffect(() => {
    fetch(`${API}/strategic-goals/`, {
      headers: {
        'Authorization': `Bearer ${accessToken || ''}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setExistingGoals(items);
      })
      .catch((err) => console.error("Error fetching strategic goals", err));
  }, [API, accessToken]);

  // Fetch strategies for the dropdown.
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy[]>(`${API}/strategies/`);

  const addGoal = useCallback(() => {
    append({
      strategy: 0,
      category: 'business',
      goal_text: ""
    });
  }, [append]);

  useEffect(() => {
    if (fields.length === 0) {
      addGoal();
    }
  }, [fields.length, addGoal]);

  const handleExistingSelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      const selected = existingGoals.find((goal) => goal.id.toString() === id);
      if (selected) {
        // Ensure the strategy field is a number. If it comes as an object, extract its id.
        const goalToSet = {
          ...selected,
          strategy: typeof selected.strategy === 'object' ? selected.strategy.id : selected.strategy,
        };
        setValue(`goals.${index}`, goalToSet);
      }
    } else {
      setValue(`goals.${index}`, {
        strategy: 0,
        category: 'business',
        goal_text: ""
      });
    }
  };
  

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Strategic Goals</h2>
        <button
          type="button"
          onClick={addGoal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Goal
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          {/* Existing Goal Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Select existing Strategic Goal (Edit existing records)</label>
            <select onChange={(e) => handleExistingSelect(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="">New Goal</option>
              {existingGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.goal_text.slice(0, 50)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Strategic Goal {index + 1}</h3>
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
              <label className="block text-sm font-medium text-gray-700">Strategy</label>
              {loadingStrategies ? (
                <p>Loading strategies...</p>
              ) : errorStrategies ? (
                <p>Error: {errorStrategies}</p>
              ) : (
                <select
                  {...register(`goals.${index}.strategy` as const)}
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register(`goals.${index}.category` as const)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="business">Business Goal</option>
                <option value="organizational">Organizational Goal</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Goal Text</label>
              <textarea
                {...register(`goals.${index}.goal_text` as const)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StrategicGoalForm;
