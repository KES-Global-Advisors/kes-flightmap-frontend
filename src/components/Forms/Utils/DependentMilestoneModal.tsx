import React from 'react';
import ReactDOM from 'react-dom';
import { useForm } from 'react-hook-form';
import useFetch from '../../../hooks/UseFetch';
import { StrategicGoal, Milestone } from '../../../types/model';
import { MultiSelect } from './MultiSelect';

const API = process.env.REACT_APP_API_BASE_URL;

export type DependentMilestoneModalProps = {
  onClose: () => void;
  onCreate: (milestone: Milestone) => void;
};

type FormValues = {
  name: string;
  description?: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed';
  strategic_goals: number[];
};

const DependentMilestoneModal: React.FC<DependentMilestoneModalProps> = ({ onClose, onCreate }) => {
  // Changed type parameter to StrategicGoal[] so that .map is available.
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal[]>(`${API}/strategic-goals/`);
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>();

  // Explicitly type the callback parameter to avoid implicit any.
  const strategicGoalOptions = strategicGoals
    ? strategicGoals.map((goal: StrategicGoal) => ({ label: goal.goal_text, value: goal.id }))
    : [];

  const onSubmit = async (data: FormValues) => {
    const accessToken = sessionStorage.getItem('accessToken');

    const payload = {
      name: data.name,
      deadline: data.deadline,
      status: data.status,
      description: data.description || '',
      strategic_goals: data.strategic_goals || [],
      workstream: null, // cSpell:ignore workstream
    };

    try {
      const response = await fetch(`${API}/milestones/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`, 
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to create dependent milestone');
      }
      const newMilestone = await response.json();
      onCreate(newMilestone);
      reset();
      onClose();
    } catch (error) {
      console.error(error);
      // Optionally, display an error message.
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white p-4 rounded-md shadow-lg w-1/2">
        <h3 className="text-lg font-medium mb-4">Create Dependent Milestone</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mt-2">
            <label className="block text-sm font-medium">Name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              {...register('description')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Deadline</label>
            <input
              {...register('deadline', { required: 'Deadline is required' })}
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
            {errors.deadline && <p className="text-red-500 text-sm mt-1">{errors.deadline.message}</p>}
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Status</label>
            <select
              {...register('status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="mt-2">
            <MultiSelect
              label="Strategic Goals"
              options={strategicGoalOptions}
              value={watch('strategic_goals') || []}
              // Convert newValue to number[] so that it matches FormValues type.
              onChange={(newValue) => setValue('strategic_goals', newValue.map(val => Number(val)))}
              isLoading={loadingGoals}
              error={errorGoals}
              placeholder="Select strategic goals..."
            />
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  
  return ReactDOM.createPortal(modalContent, document.body);
};

export default DependentMilestoneModal;
