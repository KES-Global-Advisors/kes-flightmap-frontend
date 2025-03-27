import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useForm } from 'react-hook-form';
import { Activity } from '../../../types/model';

const API = import.meta.env.VITE_API_BASE_URL;

type DependentActivityModalProps = {
  dependencyType: 'prerequisite' | 'parallel' | 'successive';
  onClose: () => void;
  onCreate: (activity: Activity) => void;
};

type FormValues = {
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 1 | 2 | 3;
  target_start_date: string;
  target_end_date: string;
  impacted_employee_groups: string;
  change_leaders: string;
  development_support: string;
  external_resources: string;
  corporate_resources: string;
};

const DependentActivityModal: React.FC<DependentActivityModalProps> = ({
  dependencyType,
  onClose,
  onCreate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const accessToken = sessionStorage.getItem('accessToken');

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    // Process comma-separated strings into arrays.
    const impactedGroups = data.impacted_employee_groups 
      ? data.impacted_employee_groups.split(',').map(item => item.trim()) 
      : [];
    const changeLeaders = data.change_leaders 
      ? data.change_leaders.split(',').map(item => item.trim()) 
      : [];
    const devSupport = data.development_support 
      ? data.development_support.split(',').map(item => item.trim()) 
      : [];
    const externalRes = data.external_resources 
      ? data.external_resources.split(',').map(item => item.trim()) 
      : [];
    const corporateRes = data.corporate_resources 
      ? data.corporate_resources.split(',').map(item => item.trim()) 
      : [];

    const payload = {
      name: data.name,
      status: data.status,
      priority: data.priority,
      target_start_date: data.target_start_date,
      target_end_date: data.target_end_date,
      prerequisite_activities: [],
      parallel_activities: [],
      successive_activities: [],
      impacted_employee_groups: impactedGroups,
      change_leaders: changeLeaders,
      development_support: devSupport,
      external_resources: externalRes,
      corporate_resources: corporateRes,
    };

    try {
      const response = await fetch(`${API}/activities/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`, 
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create dependent activity');
      }

      const newActivity = await response.json();
      onCreate(newActivity);
      onClose(); // Close the modal without refreshing the page
    } catch (error) {
      console.error('Error creating activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white p-6 rounded-md shadow-lg w-1/2 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium mb-4">
          Create New {dependencyType.charAt(0).toUpperCase() + dependencyType.slice(1)} Activity
        </h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                {...register('name', { required: 'Activity name is required' })}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Target Start Date *</label>
                <input
                  {...register('target_start_date', { required: 'Start date is required' })}
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.target_start_date && <p className="text-red-500 text-sm mt-1">{errors.target_start_date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Target End Date *</label>
                <input
                  {...register('target_end_date', { required: 'End date is required' })}
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.target_end_date && <p className="text-red-500 text-sm mt-1">{errors.target_end_date.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  {...register('status')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  {...register('priority')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value={1}>High</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Low</option>
                </select>
              </div>
            </div>
            {/* Resource Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Impacted Employee Groups (comma separated)
              </label>
              <input
                {...register('impacted_employee_groups')}
                type="text"
                placeholder="e.g., Group1, Group2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Change Leaders (comma separated)
              </label>
              <input
                {...register('change_leaders')}
                type="text"
                placeholder="e.g., Leader1, Leader2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Development Support (comma separated)
              </label>
              <input
                {...register('development_support')}
                type="text"
                placeholder="e.g., Support1, Support2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                External Resources (comma separated)
              </label>
              <input
                {...register('external_resources')}
                type="text"
                placeholder="e.g., Resource1, Resource2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Corporate Resources (comma separated)
              </label>
              <input
                {...register('corporate_resources')}
                type="text"
                placeholder="e.g., Resource1, Resource2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default DependentActivityModal;
