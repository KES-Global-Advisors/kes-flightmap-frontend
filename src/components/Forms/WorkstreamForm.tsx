/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams
import React, { useEffect, useCallback, useState } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { SketchPicker } from 'react-color';
import useFetch from '../../hooks/UseFetch';
import { Program, User } from '../../types/model';
import { PlusCircle, Trash2 } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';
import { FormLabel } from './Utils/RequiredFieldIndicator';

export type WorkstreamFormData = {
  workstreams: {
    id?: number;
    program: number;
    name: string;
    vision?: string;
    time_horizon: string;
    workstream_leads: number[];
    team_members: number[];
    improvement_targets: string[];
    organizational_goals: string[];
    color: string;
  }[];
};

const WorkstreamForm: React.FC = () => {
  const { register, control, watch, setValue } = useFormContext<WorkstreamFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "workstreams",
    shouldUnregister: true
  });
  
  // State for existing workstreams for per-item editing.
  const [existingWorkstreams, setExistingWorkstreams] = useState<any[]>([]);
  const accessToken = sessionStorage.getItem('accessToken');
  const API = import.meta.env.VITE_API_BASE_URL;
  useEffect(() => {
    fetch(`${API}/workstreams/`, {
      headers: {
        'Authorization': `Bearer ${accessToken || ''}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.results || []);
        setExistingWorkstreams(items);
      })
      .catch((err) => console.error("Error fetching workstreams", err));
  }, [API, accessToken]);

  const { data: programs, loading: loadingPrograms, error: errorPrograms } = useFetch<Program[]>(`${API}/programs/`);
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User[]>(`${API}/users/`);

  const userOptions = users ? users.map((u: User) => ({ label: u.username, value: u.id })) : [];

  const addWorkstream = useCallback(() => {
    console.log("Adding workstream", { currentFields: fields.length });
    
    try {
      append({
        program: 0,
        name: "",
        vision: "",
        time_horizon: "",
        workstream_leads: [],
        team_members: [],
        improvement_targets: [],
        organizational_goals: [],
        color: "#0000FF"
      });
      
      console.log("Workstream added successfully", { newFields: fields.length + 1 });
    } catch (error) {
      console.error("Error adding workstream:", error);
    }
  }, [append, fields.length]);
  
  useEffect(() => {
    if (fields.length === 0) {
      addWorkstream();
    }
  }, [fields.length, addWorkstream]);

  const handleExistingSelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      const selected = existingWorkstreams.find((w) => w.id.toString() === id);
      if (selected) {
        setValue(`workstreams.${index}`, selected);
      }
    } else {
      setValue(`workstreams.${index}`, {
        program: 0,
        name: "",
        vision: "",
        time_horizon: "",
        workstream_leads: [],
        team_members: [],
        improvement_targets: [],
        organizational_goals: [],
        color: "#0000FF"
      });
    }
  };

  const handleMultiSelectChange = (
    index: number,
    fieldName: string,
    selectedValues: (string | number)[]
  ) => {
    setValue(`workstreams.${index}.${fieldName}` as any, selectedValues.map(val => Number(val)));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Workstreams</h2>
        <button
          type="button"
          onClick={addWorkstream}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Workstream
        </button>
      </div>
      
      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          {/* Existing Workstream Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Select existing Workstream (Edit existing records)</label>
            <select onChange={(e) => handleExistingSelect(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="">New Workstream</option>
              {existingWorkstreams.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Workstream {index + 1}</h3>
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
            {/* Program Dropdown */}
            <div>
              <FormLabel label="Program" required />
              {loadingPrograms ? (
                <p>Loading programs...</p>
              ) : errorPrograms ? (
                <p>Error: {errorPrograms}</p>
              ) : (
                <select
                  {...register(`workstreams.${index}.program` as const)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a program</option>
                  {programs?.map((program: Program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {/* Name Field */}
            <div>
              <FormLabel label="Name" required />
              <input
                {...register(`workstreams.${index}.name` as const)}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            {/* Vision Field */}
            <div>
              <FormLabel label="Vision" required={false} />
              <textarea
                {...register(`workstreams.${index}.vision` as const)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            {/* Time Horizon Field */}
            <div>
              <FormLabel label="Time Horizon" required />
              <input
                {...register(`workstreams.${index}.time_horizon` as const)}
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            {/* Color Picker */}
            <div>
              <FormLabel label="Workstream Color" required />
              <Controller
                name={`workstreams.${index}.color` as const}
                control={control}
                defaultValue="#0000FF"
                render={({ field }) => (
                  <div className="mt-1">
                    <SketchPicker color={field.value} onChangeComplete={(color) => field.onChange(color.hex)} />
                  </div>
                )}
              />
            </div>
            {/* MultiSelect for Workstream Leads */}
            <div>
              <MultiSelect
                label="Workstream Leads"
                options={userOptions}
                value={watch(`workstreams.${index}.workstream_leads`) || []}
                onChange={(newValue) => handleMultiSelectChange(index, 'workstream_leads', newValue)}
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select workstream leads..."
              />
            </div>
            {/* MultiSelect for Team Members */}
            <div>
              <MultiSelect
                label="Team Members"
                options={userOptions}
                value={watch(`workstreams.${index}.team_members`) || []}
                onChange={(newValue) => handleMultiSelectChange(index, 'team_members', newValue)}
                isLoading={loadingUsers}
                error={errorUsers}
                placeholder="Select team members..."
              />
            </div>
            {/* Improvement Targets */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Improvement Targets (comma separated)</label>
              <input
                {...register(`workstreams.${index}.improvement_targets` as const)}
                type="text"
                placeholder="e.g., Target1, Target2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            {/* Organizational Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Organizational Goals (comma separated)</label>
              <input
                {...register(`workstreams.${index}.organizational_goals` as const)}
                type="text"
                placeholder="e.g., Goal1, Goal2"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkstreamForm;
