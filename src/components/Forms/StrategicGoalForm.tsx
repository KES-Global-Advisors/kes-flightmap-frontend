import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Strategy } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';

export type StrategicGoalFormData = {
  goals: {
    strategy: number;
    category: 'business' | 'organizational';
    goal_text: string;
  }[];
};

export const StrategicGoalForm: React.FC = () => {
  const { register, control } = useFormContext<StrategicGoalFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "goals"
  });
  
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy>('http://127.0.0.1:8000/strategies/');

  // Add a new empty strategic goal
  const addGoal = () => {
    append({
      strategy: 0,
      category: 'business',
      goal_text: ""
    });
  };

  // Add an initial goal if the array is empty
  React.useEffect(() => {
    if (fields.length === 0) {
      addGoal();
    }
  }, [fields.length]);

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
                  {strategies.map((strategy) => (
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