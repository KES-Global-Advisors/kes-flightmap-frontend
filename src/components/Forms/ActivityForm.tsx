import React, { useState, useEffect } from 'react';
import { useFormContext, useForm, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Workstream, Milestone, Activity } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
// Import the new MultiSelect component
import { MultiSelect } from './Utils/MultiSelect';

export type ActivityFormData = {
  activities: {
    workstream?: number;
    milestone?: number;
    name: string;
    status: 'not_started' | 'in_progress' | 'completed';
    priority: 1 | 2 | 3;
    target_start_date: string;
    target_end_date: string;
    prerequisite_activities: number[];
    parallel_activities: number[];
    successive_activities: number[];
    supported_milestones: number[];
    additional_milestones: number[];
    impacted_employee_groups: string[];
    change_leaders: string[];
    development_support: string[];
    external_resources: string[];
    corporate_resources: string[];
  }[];
};

type DependentActivityModalProps = {
  dependencyType: 'prerequisite' | 'parallel' | 'successive';
  onClose: () => void;
  onCreate: (activity: Activity) => void;
};

const DependentActivityModal: React.FC<DependentActivityModalProps> = ({
  dependencyType,
  onClose,
  onCreate,
}) => {
    const { register, handleSubmit, reset } = useForm<{
      name: string;
      status: 'not_started' | 'in_progress' | 'completed';
      priority: 1 | 2 | 3;
      target_start_date: string;
      target_end_date: string;
    }>();
  
    const onSubmit = async (data: {
      name: string;
      status: 'not_started' | 'in_progress' | 'completed';
      priority: 1 | 2 | 3;
      target_start_date: string;
      target_end_date: string;
    }) => {
      const payload = {
        name: data.name,
        status: data.status,
        priority: data.priority,
        target_start_date: data.target_start_date,
        target_end_date: data.target_end_date,
      };
  
      try {
        const response = await fetch('http://127.0.0.1:8000/activities/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Failed to create dependent activity');
        }
        const newActivity = await response.json();
        onCreate(newActivity);
        reset();
        onClose();
      } catch (error) {
        console.error(error);
      }
    };
  // The modal form remains unchanged
  // You can add your modal implementation here
  // For brevity, this example uses a placeholder
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-4 rounded-md shadow-lg w-1/2">
        <h3 className="text-lg font-medium mb-4">
          Create New {dependencyType.charAt(0).toUpperCase() + dependencyType.slice(1)} Activity
        </h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mt-2">
            <label className="block text-sm font-medium">Name</label>
            <input
              {...register('name')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Target Start Date</label>
            <input
              {...register('target_start_date')}
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Target End Date</label>
            <input
              {...register('target_end_date')}
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
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
            <label className="block text-sm font-medium">Priority</label>
            <select
              {...register('priority')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
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
};

export const ActivityForm: React.FC = () => {
  const { register, control, watch, setValue } = useFormContext<ActivityFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities"
  });

  const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>('http://127.0.0.1:8000/workstreams/');
  const { data: milestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone>('http://127.0.0.1:8000/milestones/');
  const { data: activities, loading: loadingActivities, error: errorActivities } = useFetch<Activity>('http://127.0.0.1:8000/activities/');

  // Build options arrays for MultiSelect fields
  const milestoneOptions = milestones ? milestones.map(m => ({ label: m.name, value: m.id })) : [];
  const activityOptions = activities ? activities.map(a => ({ label: a.name, value: a.id })) : [];

  const [dependentActivities, setDependentActivities] = useState<{
    prerequisite: Activity[];
    parallel: Activity[];
    successive: Activity[];
  }>({
    prerequisite: [],
    parallel: [],
    successive: [],
  });

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentDependencyType, setCurrentDependencyType] = useState<'prerequisite' | 'parallel' | 'successive' | null>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number | null>(null);

  const handleDependentActivityCreate = (activity: Activity) => {
    if (currentDependencyType && currentActivityIndex !== null) {
      setDependentActivities((prev) => ({
        ...prev,
        [currentDependencyType]: [...prev[currentDependencyType], activity],
      }));
    }
  };

  const openModalForType = (dependencyType: 'prerequisite' | 'parallel' | 'successive', index: number) => {
    setCurrentDependencyType(dependencyType);
    setCurrentActivityIndex(index);
    setModalOpen(true);
  };

  // Add a new empty activity to the form
  const addActivity = () => {
    append({
      workstream: undefined,
      milestone: undefined,
      name: "",
      status: "not_started",
      priority: 2,
      target_start_date: "",
      target_end_date: "",
      prerequisite_activities: [],
      parallel_activities: [],
      successive_activities: [],
      supported_milestones: [],
      additional_milestones: [],
      impacted_employee_groups: [],
      change_leaders: [],
      development_support: [],
      external_resources: [],
      corporate_resources: []
    });
  };

  useEffect(() => {
    if (fields.length === 0) {
      addActivity();
    }
  }, [fields.length]);

  // Helper to update multiselect values in the form state
  const handleMultiSelectChange = (index: number, fieldName: string, selectedValues: number[]) => {
    setValue(`activities.${index}.${fieldName}`, selectedValues);
  };

  return (
    <div className="space-y-8">
      {/* Header and add activity button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Activities</h2>
        <button
          type="button"
          onClick={addActivity}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Activity
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          {/* Activity header with remove button */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Activity {index + 1}</h3>
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
            {/* Workstream Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Workstream (optional)</label>
              {loadingWorkstreams ? (
                <p>Loading workstreams...</p>
              ) : errorWorkstreams ? (
                <p>Error: {errorWorkstreams}</p>
              ) : (
                <select
                  {...register(`activities.${index}.workstream` as const)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a workstream</option>
                  {workstreams.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {/* Milestone Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Milestone (optional)</label>
              {loadingMilestones ? (
                <p>Loading milestones...</p>
              ) : errorMilestones ? (
                <p>Error: {errorMilestones}</p>
              ) : (
                <select
                  {...register(`activities.${index}.milestone` as const)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">No milestone</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Warning if both milestone and workstream are selected */}
            {watch(`activities.${index}.milestone`) && watch(`activities.${index}.workstream`) && (
              <p className="text-red-500 text-sm mt-1">
                An activity should not be both under a milestone and directly under a workstream!
              </p>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                {...register(`activities.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Priority Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                {...register(`activities.${index}.priority` as const)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </div>
            
            {/* Status Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                {...register(`activities.${index}.status` as const)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            {/* Date Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Start Date</label>
              <input
                {...register(`activities.${index}.target_start_date` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Target End Date</label>
              <input
                {...register(`activities.${index}.target_end_date` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Dependency Fields using MultiSelect */}
            <div>
              <MultiSelect
                label="Prerequisite Activities"
                options={activityOptions}
                value={watch(`activities.${index}.prerequisite_activities`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'prerequisite_activities', newValue)
                }
                isLoading={loadingActivities}
                error={errorActivities}
                placeholder="Select prerequisite activities..."
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => openModalForType('prerequisite', index)}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                >
                  Create new Prerequisite Activity
                </button>
              </div>
            </div>
            
            <div>
              <MultiSelect
                label="Parallel Activities"
                options={activityOptions}
                value={watch(`activities.${index}.parallel_activities`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'parallel_activities', newValue)
                }
                isLoading={loadingActivities}
                error={errorActivities}
                placeholder="Select parallel activities..."
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => openModalForType('parallel', index)}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                >
                  Create new Parallel Activity
                </button>
              </div>
            </div>
            
            <div>
              <MultiSelect
                label="Successive Activities"
                options={activityOptions}
                value={watch(`activities.${index}.successive_activities`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'successive_activities', newValue)
                }
                isLoading={loadingActivities}
                error={errorActivities}
                placeholder="Select successive activities..."
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => openModalForType('successive', index)}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                >
                  Create new Successive Activity
                </button>
              </div>
            </div>
            
            {/* Milestone Connection Fields using MultiSelect */}
            <div>
              <MultiSelect
                label="Supported Milestones"
                options={milestoneOptions}
                value={watch(`activities.${index}.supported_milestones`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'supported_milestones', newValue)
                }
                isLoading={loadingMilestones}
                error={errorMilestones}
                placeholder="Select supported milestones..."
              />
            </div>
            
            <div>
              <MultiSelect
                label="Additional Milestones"
                options={milestoneOptions}
                value={watch(`activities.${index}.additional_milestones`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'additional_milestones', newValue)
                }
                isLoading={loadingMilestones}
                error={errorMilestones}
                placeholder="Select additional milestones..."
              />
            </div>
            
            {/* Resource Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Impacted Employee Groups (comma separated)
              </label>
              <input
                {...register(`activities.${index}.impacted_employee_groups` as const)}
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
                {...register(`activities.${index}.change_leaders` as const)}
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
                {...register(`activities.${index}.development_support` as const)}
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
                {...register(`activities.${index}.external_resources` as const)}
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
                {...register(`activities.${index}.corporate_resources` as const)}
                type="text"
                placeholder="e.g., Resource1, Resource2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      ))}
      {modalOpen && currentDependencyType && (
        <DependentActivityModal
          dependencyType={currentDependencyType}
          onClose={() => setModalOpen(false)}
          onCreate={handleDependentActivityCreate}
        />
      )}
    </div>
  );
};

export default ActivityForm;
