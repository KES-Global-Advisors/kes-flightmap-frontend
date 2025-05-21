// cSpell:ignore workstream workstreams roadmaps
import React, { useEffect, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Milestone, Activity } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';

export type ActivityFormData = {
  activities: {
    id?: number;
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

export type ActivityFormProps = {
  openModalForType: (dependencyType: 'prerequisite' | 'parallel' | 'successive', index: number) => void;
  dependentActivities: Activity[];
};

const ActivityForm: React.FC<ActivityFormProps> = ({ openModalForType, dependentActivities }) => {
  const { register, control, watch, setValue } = useFormContext<ActivityFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities",
    shouldUnregister: true // Helps with cleanup when fields are removed
  });

  const API = import.meta.env.VITE_API_BASE_URL;

  // Fetch existing activities for per-item dropdown
  const { data: fetchedActivities, loading: loadingActivities, error: errorActivities } = useFetch<Activity[]>(`${API}/activities/`);
  const { data: milestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone[]>(`${API}/milestones/`);


  const mergedActivityOptions = [
    ...(fetchedActivities ? fetchedActivities.map((a: Activity) => ({ label: a.name, value: a.id })) : []),
    ...dependentActivities.map((a: Activity) => ({ label: a.name, value: a.id }))
  ];

  const milestoneOptions = milestones ? milestones.map((m: Milestone) => ({ label: m.name, value: m.id })) : [];

  const addActivity = useCallback(() => {
    console.log("Adding activity", { currentFields: fields.length });
    
    try {
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
      
      console.log("Activity added successfully", { newFields: fields.length + 1 });
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  }, [append, fields.length]);
  
  useEffect(() => {
    if (fields.length === 0) {
      addActivity();
    }
  }, [fields.length, addActivity]);

  // Handler for selecting an existing activity for a specific row.
  const handleExistingSelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      const selected = fetchedActivities?.find((a: Activity) => a.id.toString() === id);
      if (selected) {
        setValue(`activities.${index}`, selected);
      }
    } else {
      setValue(`activities.${index}`, {
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
    }
  };

  // Convert selected values to number[]
  const handleMultiSelectChange = (
    index: number,
    fieldName: keyof ActivityFormData['activities'][0],
    selectedValues: (string | number)[]
  ) => {
    setValue(`activities.${index}.${fieldName}` as const, selectedValues.map(val => Number(val)));
  };

  return (
    <div className="space-y-8">
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
          {/* Existing Activity Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Select existing Activity (Edit existing records)</label>
            <select onChange={(e) => handleExistingSelect(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="">New Activity</option>
              {fetchedActivities?.map((a: Activity) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          
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
                  {milestones?.map((m: Milestone) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Existing record check warning */}
            {watch(`activities.${index}.milestone`) && watch(`activities.${index}.workstream`) && (
              <p className="text-red-500 text-sm mt-1">
                An activity should not be both under a milestone and directly under a workstream!
              </p>
            )}

            {/* Existing record is now handled; continue with other fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                {...register(`activities.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
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
                options={mergedActivityOptions}
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
                options={mergedActivityOptions}
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
                options={mergedActivityOptions}
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
    </div>
  );
};

export default ActivityForm;
