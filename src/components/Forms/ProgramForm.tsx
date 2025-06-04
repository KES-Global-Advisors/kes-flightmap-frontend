// cSpell:ignore workstream workstreams
import React, { useEffect, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Strategy, User } from '../../types/model';
import { PlusCircle, Trash2, Briefcase, AlertTriangle, Info } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';
import { FormLabel } from './Utils/RequiredFieldIndicator';

export type ProgramFormData = {
  programs: {
    id?: number;
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

const API = import.meta.env.VITE_API_BASE_URL;

interface ProgramFormProps {
  editMode?: boolean;
}

export const ProgramForm: React.FC<ProgramFormProps> = ({ editMode = false }) => {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<ProgramFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "programs",
  });

  // Data fetching with comprehensive error handling
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy[]>(`${API}/strategies/`);
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User[]>(`${API}/users/`);
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal[]>(`${API}/strategic-goals/`);

  // Optimized data transformation with null safety
  const userOptions = users ? users.map((u: User) => ({ label: u.username, value: u.id })) : [];
  const strategicGoalOptions = strategicGoals
    ? strategicGoals.map((goal: StrategicGoal) => ({ label: goal.goal_text, value: goal.id }))
    : [];

  const addProgram = useCallback(() => {
    console.log("Adding program");
    
    try {
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
      
      console.log("Program added successfully");
    } catch (error) {
      console.error("Error adding program:", error);
    }
  }, [append]);
  
  // Initialize with one empty program for creation mode
  useEffect(() => {
    if (!editMode && fields.length === 0) {
      addProgram();
    }
  }, [editMode, fields.length, addProgram]);

  // Advanced validation with business logic
  const validateProgramName = (value: string, index: number) => {
    if (!value || value.trim().length === 0) {
      return 'Program name is required';
    }
    if (value.trim().length < 5) {
      return 'Program name must be at least 5 characters for clarity';
    }
    if (value.trim().length > 100) {
      return 'Program name must be less than 100 characters';
    }

    // Check for duplicate names within the same form
    const currentPrograms = watch('programs') || [];
    const duplicateCount = currentPrograms.filter((p, i) => 
      i !== index && p.name && p.name.trim().toLowerCase() === value.trim().toLowerCase()
    ).length;
    
    if (duplicateCount > 0) {
      return 'Program names must be unique';
    }

    // Business naming conventions check
    const hasValidStructure = /^[A-Za-z][\w\s\-\\.]+[A-Za-z0-9]$/.test(value.trim());
    if (!hasValidStructure) {
      return 'Program name should start and end with alphanumeric characters';
    }

    return true;
  };

  const validateTimeHorizon = (value: string) => {
    if (!value) return 'Time horizon is required';
    
    const selectedDate = new Date(value);
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      return 'Time horizon must be in the future';
    }
    
    if (selectedDate < oneYearFromNow) {
      return 'Programs typically require at least one year for meaningful impact';
    }
    
    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(today.getFullYear() + 5);
    
    if (selectedDate > fiveYearsFromNow) {
      return 'Time horizon should not exceed 5 years for practical planning';
    }
    
    return true;
  };

  const validateVision = (value: string | undefined) => {
    if (!value || value.trim().length === 0) {
      return 'Program vision is required';
    }
    if (value.trim().length < 25) {
      return 'Vision should be at least 25 characters for meaningful description';
    }
    if (value.trim().length > 1000) {
      return 'Vision must be less than 1000 characters';
    }

    // Quality indicators for vision statements
    const hasOutcome = /\b(achieve|deliver|create|establish|improve|transform|enable|drive)\b/i.test(value);
    if (!hasOutcome) {
      console.warn('Vision may benefit from outcome-focused language');
    }

    return true;
  };

  // Role assignment validation
  const validateRoleAssignments = (programIndex: number) => {
    const program = watch(`programs.${programIndex}`);
    const warnings: string[] = [];

    if (program?.executive_sponsors?.length === 0) {
      warnings.push('Consider assigning executive sponsors for strategic alignment');
    }
    
    if (program?.program_leads?.length === 0) {
      warnings.push('Program leads are essential for execution accountability');
    }

    if (program?.executive_sponsors?.length > 3) {
      warnings.push('Too many executive sponsors may create decision-making complexity');
    }

    return warnings;
  };

  // Strategy-based filtering for strategic goals
const getFilteredStrategicGoals = (strategyId: number) => {
  if (!strategicGoals || !strategyId) return strategicGoalOptions;
  
  return strategicGoals
    .filter(goal => {
      // Handle both object and number formats for robustness
      const goalStrategyId = typeof goal.strategy === 'object' 
        ? goal.strategy.id 
        : goal.strategy;
      return goalStrategyId === strategyId;
    })
    .map(goal => ({ label: goal.goal_text, value: goal.id }));
};

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Briefcase className="w-6 h-6 mr-2 text-indigo-600" />
            {editMode ? 'Edit Programs' : 'Create Programs'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {editMode 
              ? 'Modify program structure, assignments, and strategic alignment'
              : 'Define execution-focused programs that implement strategic initiatives'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!editMode && (
            <div className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-full">
              Creation Mode
            </div>
          )}
          {!editMode && (
            <button
              type="button"
              onClick={addProgram}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Program
            </button>
          )}
        </div>
      </div>

      {fields.map((field, index) => {
        const roleWarnings = validateRoleAssignments(index);
        const selectedStrategy = watch(`programs.${index}.strategy`);
        const filteredGoals = selectedStrategy ? getFilteredStrategicGoals(selectedStrategy) : strategicGoalOptions;

        return (
          <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">
                {editMode ? 'Program Details' : `Program ${index + 1}`}
              </h3>
              {!editMode && fields.length > 1 && (
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
              {/* Strategy Selection with Enhanced UX */}
              <div>
                <FormLabel label="Strategy" required />
                {loadingStrategies ? (
                  <div className="mt-1 block w-full p-3 text-gray-500 bg-gray-50 rounded-md animate-pulse">
                    Loading strategies...
                  </div>
                ) : errorStrategies ? (
                  <div className="mt-1 block w-full p-3 text-red-600 bg-red-50 rounded-md">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Error loading strategies: {errorStrategies}
                  </div>
                ) : (
                  <>
                    <select
                      {...register(`programs.${index}.strategy` as const, {
                        required: 'Strategy selection is required',
                        validate: value => value !== 0 || 'Please select a valid strategy'
                      })}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors.programs?.[index]?.strategy ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      disabled={editMode}
                    >
                      <option value="">Select a strategy</option>
                      {(strategies || []).map((strategy: Strategy) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </option>
                      ))}
                    </select>
                    {editMode && (
                      <p className="mt-1 text-xs text-gray-500">
                        Strategy association cannot be changed in edit mode
                      </p>
                    )}
                    {errors.programs?.[index]?.strategy && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.programs[index]?.strategy?.message}
                      </p>
                    )}
                  </>
                )}
              </div>
              
              {/* Program Name with Advanced Validation */}
              <div>
                <FormLabel label="Name" required />
                <input
                  {...register(`programs.${index}.name` as const, {
                    validate: (value) => validateProgramName(value, index)
                  })}
                  type="text"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.programs?.[index]?.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Enter program name (e.g., Customer Experience Transformation Program)"
                />
                {errors.programs?.[index]?.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.programs[index]?.name?.message}
                  </p>
                )}
              </div>
              
              {/* Enhanced Vision Field */}
              <div>
                <FormLabel label="Vision" required={false} />
                <textarea
                  {...register(`programs.${index}.vision` as const, {
                    validate: validateVision
                  })}
                  rows={4}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.programs?.[index]?.vision ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Describe the program's vision, expected outcomes, and success criteria..."
                />
                {errors.programs?.[index]?.vision && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.programs[index]?.vision?.message}
                  </p>
                )}
              </div>
              
              {/* Time Horizon with Business Logic */}
              <div>
                <FormLabel label="Time Horizon" required />
                <input
                  {...register(`programs.${index}.time_horizon` as const, {
                    validate: validateTimeHorizon
                  })}
                  type="date"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.programs?.[index]?.time_horizon ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.programs?.[index]?.time_horizon && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.programs[index]?.time_horizon?.message}
                  </p>
                )}
              </div>
              
              {/* Role Assignment with Validation Warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <MultiSelect
                    label="Executive Sponsors"
                    options={userOptions}
                    value={watch(`programs.${index}.executive_sponsors`) || []}
                    onChange={(newValue) => setValue(`programs.${index}.executive_sponsors`, newValue.map(val => Number(val)))}
                    isLoading={loadingUsers}
                    error={errorUsers}
                    placeholder="Select executive sponsors..."
                  />
                </div>
                <div>
                  <MultiSelect
                    label="Program Leads"
                    options={userOptions}
                    value={watch(`programs.${index}.program_leads`) || []}
                    onChange={(newValue) => setValue(`programs.${index}.program_leads`, newValue.map(val => Number(val)))}
                    isLoading={loadingUsers}
                    error={errorUsers}
                    placeholder="Select program leads..."
                  />
                </div>
              </div>

              <div>
                <MultiSelect
                  label="Workforce Sponsors"
                  options={userOptions}
                  value={watch(`programs.${index}.workforce_sponsors`) || []}
                  onChange={(newValue) => setValue(`programs.${index}.workforce_sponsors`, newValue.map(val => Number(val)))}
                  isLoading={loadingUsers}
                  error={errorUsers}
                  placeholder="Select workforce sponsors..."
                />
              </div>

              {/* Strategic Goal Alignment with Context-Aware Filtering */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <MultiSelect
                    label="Key Improvement Targets"
                    options={filteredGoals}
                    value={watch(`programs.${index}.key_improvement_targets`) || []}
                    onChange={(newValue) => setValue(`programs.${index}.key_improvement_targets`, newValue.map(val => Number(val)))}
                    isLoading={loadingGoals}
                    error={errorGoals}
                    placeholder="Select improvement targets..."
                  />
                  {selectedStrategy && filteredGoals.length === 0 && (
                    <p className="mt-1 text-xs text-yellow-600">
                      No strategic goals found for selected strategy
                    </p>
                  )}
                </div>
                <div>
                  <MultiSelect
                    label="Key Organizational Goals"
                    options={filteredGoals}
                    value={watch(`programs.${index}.key_organizational_goals`) || []}
                    onChange={(newValue) => setValue(`programs.${index}.key_organizational_goals`, newValue.map(val => Number(val)))}
                    isLoading={loadingGoals}
                    error={errorGoals}
                    placeholder="Select organizational goals..."
                  />
                </div>
              </div>

              {/* Role Assignment Warnings */}
              {roleWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Assignment Considerations:</p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {roleWarnings.map((warning, i) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Creation Mode Guidance with Strategic Context */}
      {!editMode && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-indigo-900 mb-2">Program Creation Excellence Framework:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-800">
                <div>
                  <p className="font-medium mb-1">Strategic Alignment:</p>
                  <ul className="space-y-1">
                    <li>• Link directly to strategic initiatives</li>
                    <li>• Align with organizational capabilities</li>
                    <li>• Consider resource constraints</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Execution Planning:</p>
                  <ul className="space-y-1">
                    <li>• Define clear success metrics</li>
                    <li>• Establish governance structure</li>
                    <li>• Plan for risk mitigation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramForm;