import React from 'react';
import { useFormContext } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Strategy, User } from '../../types/model';

export type ProgramFormData = {
  strategy: number;
  name: string;
  vision?: string;
  time_horizon: string;
  executive_sponsors: number[];
  program_leads: number[];
  workforce_sponsors: number[];
  key_improvement_targets: number[];
  key_organizational_goals: number[];
};

export const ProgramForm: React.FC = () => {
  const { register } = useFormContext<ProgramFormData>();
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy>('http://127.0.0.1:8000/strategies/');
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User>('http://127.0.0.1:8000/users/');
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal>('http://127.0.0.1:8000/strategic-goals/');

  return (
    <div className="space-y-4">
      <h2>Program Form</h2>
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
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          {...register('name')}
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Vision</label>
        <textarea
          {...register('vision')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Time Horizon</label>
        <input
          {...register('time_horizon')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      {/* Multi-selects for sponsors/leads and strategic goals */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Executive Sponsors</label>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : errorUsers ? (
          <p>Error: {errorUsers}</p>
        ) : (
          <select
            {...register('executive_sponsors')}
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
            {...register('program_leads')}
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
            {...register('workforce_sponsors')}
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
            {...register('key_improvement_targets')}
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
            {...register('key_organizational_goals')}
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
  );
};
