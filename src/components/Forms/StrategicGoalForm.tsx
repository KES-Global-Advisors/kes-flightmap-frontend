import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Strategy } from '../../types/model';

export type StrategicGoalFormData = {
  strategy: number;
  category: 'business' | 'organizational';
  goal_text: string;
};

export const StrategicGoalForm: React.FC = () => {
  const { register } = useFormContext<StrategicGoalFormData>();
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy>('http://127.0.0.1:8000/strategies/');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-10">Strategic Goal Form</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Strategy</label>
        {loadingStrategies ? (
          <p>Loading strategies...</p>
        ) : errorStrategies ? (
          <p>Error: {errorStrategies}</p>
        ) : (
          <select
            {...register('strategy')}
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
          {...register('category')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="business">Business Goal</option>
          <option value="organizational">Organizational Goal</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Goal Text</label>
        <textarea
          {...register('goal_text')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
};
