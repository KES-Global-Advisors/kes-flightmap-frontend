import React, { useCallback, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Strategy } from '../../types/model';
import { PlusCircle, Trash2, Target, Info } from 'lucide-react';
import { FormLabel } from './Utils/RequiredFieldIndicator';

export type StrategicGoalFormData = {
  goals: {
    id?: number;
    strategy: number;
    category: 'business' | 'organizational';
    goal_text: string;
  }[];
};

const API = import.meta.env.VITE_API_BASE_URL;

interface StrategicGoalFormProps {
  editMode?: boolean;
}

export const StrategicGoalForm: React.FC<StrategicGoalFormProps> = ({ editMode = false }) => {
  const { register, control, watch, formState: { errors } } = useFormContext<StrategicGoalFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "goals",
  });

  // Fetch strategies for the dropdown
  const { data: strategies, loading: loadingStrategies, error: errorStrategies } = useFetch<Strategy[]>(`${API}/strategies/`);

  const addGoal = useCallback(() => {
    console.log("Adding strategic goal");
    
    try {
      append({
        strategy: 0,
        category: 'business',
        goal_text: ""
      });
      
      console.log("Strategic goal added successfully");
    } catch (error) {
      console.error("Error adding strategic goal:", error);
    }
  }, [append]);
  
  // Initialize with one empty goal for creation mode
  useEffect(() => {
    if (!editMode && fields.length === 0) {
      addGoal();
    }
  }, [editMode, fields.length, addGoal]);

  // Enhanced validation for goal text
  const validateGoalText = (value: string, index: number) => {
    if (!value || value.trim().length === 0) {
      return 'Goal text is required';
    }
    if (value.trim().length < 10) {
      return 'Goal text should be at least 10 characters for meaningful description';
    }
    if (value.trim().length > 500) {
      return 'Goal text must be less than 500 characters';
    }

    // Check for duplicate goals within the same form
    const currentGoals = watch('goals') || [];
    const duplicateCount = currentGoals.filter((g, i) => 
      i !== index && g.goal_text && g.goal_text.trim().toLowerCase() === value.trim().toLowerCase()
    ).length;
    
    if (duplicateCount > 0) {
      return 'Goal descriptions must be unique';
    }

    // Basic quality checks
    const wordCount = value.trim().split(/\s+/).length;
    if (wordCount < 3) {
      return 'Goal should contain at least 3 words for clarity';
    }

    // Check for specific, measurable language patterns
    const hasAction = /\b(achieve|improve|increase|decrease|reduce|implement|develop|establish|create|enhance|optimize|streamline|deliver|complete)\b/i.test(value);
    if (!hasAction) {
      console.warn('Goal may benefit from action-oriented language');
    }

    return true;
  };

  // Strategy selection validation
  const validateStrategySelection = (value: number) => {
    if (!value || value === 0) {
      return 'Strategy selection is required';
    }
    return true;
  };

  // Category-specific guidance
  const getCategoryGuidance = (category: 'business' | 'organizational') => {
    const guidance = {
      business: {
        description: 'Focus on revenue, market position, customer satisfaction, or operational efficiency',
        examples: ['Increase market share by 15%', 'Achieve 95% customer satisfaction rating', 'Reduce operational costs by 20%']
      },
      organizational: {
        description: 'Focus on internal capabilities, culture, processes, or workforce development',
        examples: ['Improve employee engagement scores', 'Establish cross-functional collaboration', 'Implement agile methodologies']
      }
    };
    return guidance[category];
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Target className="w-6 h-6 mr-2 text-indigo-600" />
            {editMode ? 'Edit Strategic Goals' : 'Create Strategic Goals'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {editMode 
              ? 'Refine strategic objectives and their strategic alignment'
              : 'Define measurable objectives that drive strategic success'
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
              onClick={addGoal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Goal
            </button>
          )}
        </div>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              {editMode ? 'Strategic Goal Details' : `Strategic Goal ${index + 1}`}
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
            {/* Strategy Selection */}
            <div>
              <FormLabel label="Strategy" required />
              {loadingStrategies ? (
                <div className="mt-1 block w-full p-3 text-gray-500 bg-gray-50 rounded-md">
                  Loading strategies...
                </div>
              ) : errorStrategies ? (
                <div className="mt-1 block w-full p-3 text-red-600 bg-red-50 rounded-md">
                  Error loading strategies: {errorStrategies}
                </div>
              ) : (
                <>
                  <select
                    {...register(`goals.${index}.strategy` as const, {
                      validate: validateStrategySelection
                    })}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                      errors.goals?.[index]?.strategy ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    disabled={editMode} // Disable strategy changes in edit mode
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
                  {errors.goals?.[index]?.strategy && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.goals[index]?.strategy?.message}
                    </p>
                  )}
                </>
              )}
            </div>
            
            {/* Category Selection */}
            <div>
              <FormLabel label="Category" required />
              <select
                {...register(`goals.${index}.category` as const, {
                  required: 'Goal category is required'
                })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.goals?.[index]?.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
              >
                <option value="business">Business Goal</option>
                <option value="organizational">Organizational Goal</option>
              </select>
              {errors.goals?.[index]?.category && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.goals[index]?.category?.message}
                </p>
              )}
              
              {/* Category-specific guidance */}
              {watch(`goals.${index}.category`) && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    {watch(`goals.${index}.category`) === 'business' ? 'Business Goal' : 'Organizational Goal'} Focus:
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    {getCategoryGuidance(watch(`goals.${index}.category`))?.description}
                  </p>
                  <p className="text-xs text-blue-600">
                    Examples: {getCategoryGuidance(watch(`goals.${index}.category`))?.examples.join(' • ')}
                  </p>
                </div>
              )}
            </div>
            
            {/* Goal Text */}
            <div>
              <FormLabel label="Goal Description" required />
              <textarea
                {...register(`goals.${index}.goal_text` as const, {
                  validate: (value) => validateGoalText(value, index)
                })}
                rows={4}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                  errors.goals?.[index]?.goal_text ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder={`Describe a specific, measurable ${watch(`goals.${index}.category`) || 'strategic'} objective...`}
              />
              {errors.goals?.[index]?.goal_text && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.goals[index]?.goal_text?.message}
                </p>
              )}
              {!editMode && (
                <div className="mt-2 text-xs text-gray-500">
                  <p className="font-medium mb-1">Best Practices for Goal Writing:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use specific, action-oriented language</li>
                    <li>Include measurable outcomes when possible</li>
                    <li>Align with broader strategic initiatives</li>
                    <li>Consider timeframes and resource requirements</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Goal Quality Indicators */}
            {watch(`goals.${index}.goal_text`) && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-2">Goal Quality Check:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center ${
                    watch(`goals.${index}.goal_text`)?.length >= 10 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      watch(`goals.${index}.goal_text`)?.length >= 10 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    Sufficient detail
                  </div>
                  <div className={`flex items-center ${
                    /\b(achieve|improve|increase|decrease|reduce|implement|develop|establish|create|enhance|optimize|streamline|deliver|complete)\b/i.test(watch(`goals.${index}.goal_text`) || '') 
                      ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      /\b(achieve|improve|increase|decrease|reduce|implement|develop|establish|create|enhance|optimize|streamline|deliver|complete)\b/i.test(watch(`goals.${index}.goal_text`) || '') 
                        ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    Action-oriented
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Creation Mode Guidance */}
      {!editMode && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-900 mb-2">Strategic Goal Creation Guidelines:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Align each goal with specific strategic initiatives</li>
                <li>• Use SMART criteria: Specific, Measurable, Achievable, Relevant, Time-bound</li>
                <li>• Differentiate between business outcomes and organizational capabilities</li>
                <li>• Consider dependencies and resource requirements</li>
                <li>• Ensure goals support broader flightmap objectives</li>
                <li>• Review for clarity and actionability before proceeding</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategicGoalForm;