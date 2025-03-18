import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Strategy, User } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';

export type ProgramFormData = {
  programs: {
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

export const ProgramForm: React.FC = () => {
  const { register, control } = useFormContext<ProgramFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "programs"
  });
  
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy>('http://127.0.0.1:8000/strategies/');
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User>('http://127.0.0.1:8000/users/');
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal>('http://127.0.0.1:8000/strategic-goals/');

  // Add a new empty program
  const addProgram = () => {
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
  };

  // Add an initial program if the array is empty
  React.useEffect(() => {
    if (fields.length === 0) {
      addProgram();
    }
  }, [fields.length]);

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
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                {...register(`programs.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Vision</label>
              <textarea
                {...register(`programs.${index}.vision` as const)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Time Horizon</label>
              <input
                {...register(`programs.${index}.time_horizon` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Executive Sponsors</label>
              {loadingUsers ? (
                <p>Loading users...</p>
              ) : errorUsers ? (
                <p>Error: {errorUsers}</p>
              ) : (
                <select
                  {...register(`programs.${index}.executive_sponsors` as const)}
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
              <label className="block text-sm font-medium text-gray-700">Program Leads</label>
              {loadingUsers ? (
                <p>Loading users...</p>
              ) : errorUsers ? (
                <p>Error: {errorUsers}</p>
              ) : (
                <select
                  {...register(`programs.${index}.program_leads` as const)}
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
              <label className="block text-sm font-medium text-gray-700">Workforce Sponsors</label>
              {loadingUsers ? (
                <p>Loading users...</p>
              ) : errorUsers ? (
                <p>Error: {errorUsers}</p>
              ) : (
                <select
                  {...register(`programs.${index}.workforce_sponsors` as const)}
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
              <label className="block text-sm font-medium text-gray-700">Key Improvement Targets</label>
              {loadingGoals ? (
                <p>Loading strategic goals...</p>
              ) : errorGoals ? (
                <p>Error: {errorGoals}</p>
              ) : (
                <select
                  {...register(`programs.${index}.key_improvement_targets` as const)}
                  multiple
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {strategicGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.goal_text}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Key Organizational Goals</label>
              {loadingGoals ? (
                <p>Loading strategic goals...</p>
              ) : errorGoals ? (
                <p>Error: {errorGoals}</p>
              ) : (
                <select
                  {...register(`programs.${index}.key_organizational_goals` as const)}
                  multiple
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {strategicGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.goal_text}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};