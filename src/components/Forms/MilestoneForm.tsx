import React, { useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Workstream, Milestone } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';

export type MilestoneFormData = {
  milestones: {
    workstream: number;
    name: string;
    description?: string;
    deadline: string;
    status: 'not_started' | 'in_progress' | 'completed';
    strategic_goals: number[];
    dependencies?: number[];
  }[];
};

type MilestoneFormProps = {
  openMilestoneModal: () => void;
  // Pass dependent milestones from the parent (FormStepper)
  dependentMilestones: Milestone[];
};

const MilestoneForm: React.FC<MilestoneFormProps> = ({ openMilestoneModal, dependentMilestones }) => {
  const { register, control, watch, setValue } = useFormContext<MilestoneFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones"
  });
  
  const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>('http://127.0.0.1:8000/workstreams/');
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal>('http://127.0.0.1:8000/strategic-goals/');
  const { data: fetchedMilestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone>('http://127.0.0.1:8000/milestones/');

  const strategicGoalOptions = strategicGoals ? strategicGoals.map(goal => ({ label: goal.goal_text, value: goal.id })) : [];

  // Merge fetched milestones with dependent milestones passed from the parent.
  const dependencyOptions = [
    ...(fetchedMilestones ? fetchedMilestones.map(ms => ({ label: ms.name, value: ms.id })) : []),
    ...dependentMilestones.map(ms => ({ label: ms.name, value: ms.id }))
  ];

  // Add a new empty milestone entry.
  const addMilestone = () => {
    append({
      workstream: 0,
      name: "",
      description: "",
      deadline: "",
      status: "not_started",
      strategic_goals: [],
      dependencies: []
    });
  };

  useEffect(() => {
    if (fields.length === 0) {
      addMilestone();
    }
  }, [fields.length]);

  const handleMultiSelectChange = (index: number, fieldName: string, selectedValues: number[]) => {
    setValue(`milestones.${index}.${fieldName}`, selectedValues);
  };

  return (
    <div className="space-y-8">
      {/* Header and add milestone button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Milestones</h2>
        <button
          type="button"
          onClick={addMilestone}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Milestone
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Milestone {index + 1}</h3>
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
              <label className="block text-sm font-medium text-gray-700">Workstream</label>
              {loadingWorkstreams ? (
                <p>Loading workstreams...</p>
              ) : errorWorkstreams ? (
                <p>Error: {errorWorkstreams}</p>
              ) : (
                <select
                  {...register(`milestones.${index}.workstream` as const)}
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
            
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                {...register(`milestones.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register(`milestones.${index}.description` as const)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Deadline Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Deadline</label>
              <input
                {...register(`milestones.${index}.deadline` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Status Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                {...register(`milestones.${index}.status` as const)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            {/* Strategic Goals MultiSelect */}
            <div>
              <MultiSelect
                label="Strategic Goals"
                options={strategicGoalOptions}
                value={watch(`milestones.${index}.strategic_goals`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'strategic_goals', newValue)
                }
                isLoading={loadingGoals}
                error={errorGoals}
                placeholder="Select strategic goals..."
              />
            </div>
            
            {/* Dependent Milestones MultiSelect */}
            <div>
              <MultiSelect
                label="Dependent Milestones"
                options={dependencyOptions}
                value={watch(`milestones.${index}.dependencies`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'dependencies', newValue)
                }
                isLoading={loadingMilestones}
                error={errorMilestones}
                placeholder="Select dependent milestones..."
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={openMilestoneModal}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                >
                  Create dependent Milestone
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MilestoneForm;
