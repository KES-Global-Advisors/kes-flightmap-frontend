// cSpell:ignore workstream workstreams
import React, { useEffect, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Workstream, Milestone } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';

export type MilestoneFormData = {
  milestones: {
    id?: number;
    workstream: number;
    name: string;
    description?: string;
    deadline: string;
    status: 'not_started' | 'in_progress' | 'completed';
    strategic_goals: number[];
    parent_milestone?: number | null;
    dependencies?: number[];
    [key: string]: unknown;
  }[];
};

export type MilestoneFormProps = {
  openMilestoneModal: () => void;
  dependentMilestones: Milestone[];
};

const MilestoneForm: React.FC<MilestoneFormProps> = ({ openMilestoneModal, dependentMilestones }) => {
  const { register, control, watch, setValue } = useFormContext<MilestoneFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones",
    shouldUnregister: true
  });
  const API = import.meta.env.VITE_API_BASE_URL;
  
  // Fetch existing milestones, workstreams, and strategic goals.
  const { data: fetchedMilestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone[]>(`${API}/milestones/`);
  const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream[]>(`${API}/workstreams/`);
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal[]>(`${API}/strategic-goals/`);

  const strategicGoalOptions = strategicGoals
    ? strategicGoals.map((goal: StrategicGoal) => ({ label: goal.goal_text, value: goal.id }))
    : [];

  // Merge fetched milestones and any dependent milestones into options for parent milestone.
  const parentMilestoneOptions = [
    ...(fetchedMilestones ? fetchedMilestones.map((ms: Milestone) => ({ label: ms.name, value: ms.id })) : []),
    ...dependentMilestones.map((ms: Milestone) => ({ label: ms.name, value: ms.id }))
  ];

  const addMilestone = useCallback(() => {
    console.log("Adding milestone", { currentFields: fields.length });
    
    try {
      append({
        workstream: 0,
        name: "",
        description: "",
        deadline: "",
        status: "not_started",
        strategic_goals: [],
        parent_milestone: null
      });
      
      console.log("Milestone added successfully", { newFields: fields.length + 1 });
    } catch (error) {
      console.error("Error adding milestone:", error);
    }
  }, [append, fields.length]);
  
  useEffect(() => {
    if (fields.length === 0) {
      addMilestone();
    }
  }, [fields.length, addMilestone]);

  // Handler for selecting an existing milestone for a given index.
  const handleExistingSelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      const selected = fetchedMilestones?.find((ms: Milestone) => ms.id.toString() === id);
      if (selected) {
        setValue(`milestones.${index}`, selected);
      }
    } else {
      // Reset to default empty milestone
      setValue(`milestones.${index}`, {
        workstream: 0,
        name: "",
        description: "",
        deadline: "",
        status: "not_started",
        strategic_goals: [],
        parent_milestone: null
      });
    }
  };

  // Convert any incoming (string | number) array to number[] before saving.
  const handleMultiSelectChange = (
    index: number,
    fieldName: string,
    selectedValues: (string | number)[]
  ) => {
    setValue(`milestones.${index}.${fieldName}` as `milestones.${number}.${string}`, selectedValues.map(val => Number(val)));
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
          {/* Dropdown for existing milestone */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Select existing Milestone (Edit existing records)</label>
            <select onChange={(e) => handleExistingSelect(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="">New Milestone</option>
              {fetchedMilestones?.map((ms: Milestone) => (
                <option key={ms.id} value={ms.id}>
                  {ms.name}
                </option>
              ))}
            </select>
          </div>
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
                  {...register(`milestones.${index}.workstream` as never)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a workstream</option>
                  {workstreams?.map((ws: Workstream) => (
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
                {...register(`milestones.${index}.name` as never)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register(`milestones.${index}.description` as never)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Deadline Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Deadline</label>
              <input
                {...register(`milestones.${index}.deadline` as never)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            {/* Status Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                {...register(`milestones.${index}.status` as never)}
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
            
            {/* NEW: Parent Milestone Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent Milestone</label>
              {loadingMilestones ? (
                <p>Loading milestones...</p>
              ) : errorMilestones ? (
                <p>Error: {errorMilestones}</p>
              ) : (
                <select
                  {...register(`milestones.${index}.parent_milestone` as never)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">No Parent Milestone</option>
                  {parentMilestoneOptions.map((ms: { label: string, value: number }) => (
                    <option key={ms.value} value={ms.value}>
                      {ms.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {/* (Optional) Button to create a new milestone to be used as a parent */}
            <div className="mt-2">
              <button
                type="button"
                onClick={openMilestoneModal}
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                Create a new Milestone to use as Parent
              </button>
            </div>
            {/* Dependencies MultiSelect */}
            <div>
              <MultiSelect
                label="Dependencies"
                options={parentMilestoneOptions}  // You can reuse this list or create a dedicated one if needed
                value={watch(`milestones.${index}.dependencies`) || []}
                onChange={(newValue) =>
                  handleMultiSelectChange(index, 'dependencies', newValue)
                }
                isLoading={loadingMilestones}
                error={errorMilestones}
                placeholder="Select dependency milestones..."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MilestoneForm;
