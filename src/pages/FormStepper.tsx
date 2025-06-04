/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams flightmaps Renderable flightmap
import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Check, Save, AlertCircle } from 'lucide-react';
import { showToast } from '@/components/Forms/Utils/toastUtils';

import { FlightmapForm, FlightmapFormData } from '../components/Forms/FlightmapForm';
import { StrategyForm, StrategyFormData } from '../components/Forms/StrategyForm';
import { StrategicGoalForm, StrategicGoalFormData } from '../components/Forms/StrategicGoalForm';
import { ProgramForm, ProgramFormData } from '../components/Forms/ProgramForm';
import WorkstreamForm, { WorkstreamFormData } from '../components/Forms/WorkstreamForm';
import MilestoneForm, { MilestoneFormData } from '../components/Forms/MilestoneForm';
import ActivityForm, { ActivityFormData } from '../components/Forms/ActivityForm';
import DependentActivityModal from '../components/Forms/Utils/DependentActivityModal';
import DependentMilestoneModal from '../components/Forms/Utils/DependentMilestoneModal';
import { Activity, Milestone } from '../types/model';

type StepId =
  | 'flightmaps'
  | 'strategies'
  | 'strategic-goals'
  | 'programs'
  | 'workstreams'
  | 'milestones'
  | 'activities';

interface FormDataMap {
  flightmaps?: FlightmapFormData;
  strategies?: StrategyFormData;
  'strategic-goals'?: StrategicGoalFormData;
  programs?: ProgramFormData;
  workstreams?: WorkstreamFormData;
  milestones?: MilestoneFormData;
  activities?: ActivityFormData;
}

type AllFormData =
  | FlightmapFormData
  | StrategyFormData
  | StrategicGoalFormData
  | ProgramFormData
  | WorkstreamFormData
  | MilestoneFormData
  | ActivityFormData;

// Validation rules for each step
const VALIDATION_RULES = {
  flightmaps: {
    name: { required: 'Name is required' },
    description: { required: 'Description is required' },
    owner: { required: 'Owner is required' }
  },
  strategies: {
    required: ['flightmap', 'name', 'vision', 'time_horizon'],
    arrayField: 'strategies'
  },
  'strategic-goals': {
    required: ['strategy', 'category', 'goal_text'],
    arrayField: 'goals'
  },
  programs: {
    required: ['strategy', 'name', 'time_horizon'],
    arrayField: 'programs'
  },
  workstreams: {
    required: ['program', 'name', 'time_horizon', 'color'],
    arrayField: 'workstreams'
  },
  milestones: {
    required: ['workstream', 'name', 'deadline', 'status'],
    arrayField: 'milestones'
  },
  activities: {
    required: ['name', 'status', 'priority', 'target_start_date', 'target_end_date'],
    arrayField: 'activities'
  }
};

const FORM_STEPS = [
  { id: 'flightmaps' as StepId, label: 'Flightmap', component: FlightmapForm },
  { id: 'strategies' as StepId, label: 'Strategy', component: StrategyForm },
  { id: 'strategic-goals' as StepId, label: 'Strategic Goal', component: StrategicGoalForm },
  { id: 'programs' as StepId, label: 'Program', component: ProgramForm },
  { id: 'workstreams' as StepId, label: 'Workstream', component: WorkstreamForm },
  { id: 'milestones' as StepId, label: 'Milestone', component: MilestoneForm },
  { id: 'activities' as StepId, label: 'Activity', component: ActivityForm },
] as const;

const FormStepper: React.FC = () => {
  const { themeColor } = useContext(ThemeContext);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<FormDataMap>({});
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(FORM_STEPS.length).fill(false));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const API = import.meta.env.VITE_API_BASE_URL;
  const accessToken = sessionStorage.getItem('accessToken');
  const currentStepId = FORM_STEPS[currentStepIndex].id;

  const methods = useForm<AllFormData>({
    mode: 'onChange', // Enable real-time validation
    defaultValues: formData[currentStepId] || {},
  });

  // Reset form when step changes, preserving saved data
  useEffect(() => {
    const currentData = formData[currentStepId];
    if (currentData && Array.isArray(currentData)) {
      // For array-based forms, preserve the structure
      methods.reset({ [currentStepId.slice(0, -1) + 's']: currentData });
    } else if (currentData) {
      methods.reset(currentData);
    } else {
      // Reset to empty form for new step
      methods.reset({});
    }
    // Clear validation errors when switching steps
    setValidationErrors([]);
  }, [currentStepIndex, formData, currentStepId, methods]);

  // Validation function for current step
  const validateCurrentStep = (data: AllFormData): string[] => {
    const errors: string[] = [];
    const rules = VALIDATION_RULES[currentStepId];

    if (currentStepId === 'flightmaps') {
      // Single entity validation
      const flightmapData = data as FlightmapFormData;
      Object.entries(rules).forEach(([field, rule]: [string, any]) => {
        if (rule.required && (!flightmapData[field as keyof FlightmapFormData] || flightmapData[field as keyof FlightmapFormData] === '')) {
          errors.push(rule.required);
        }
      });
    } else {
      // Array-based entity validation
      if ('arrayField' in rules && typeof rules.arrayField === 'string') {
        const arrayField = rules.arrayField;
        const arrayData = (data as any)[arrayField];

        if (!arrayData || arrayData.length === 0) {
          errors.push(`At least one ${FORM_STEPS[currentStepIndex].label.toLowerCase()} is required`);
        } else {
          arrayData.forEach((item: any, index: number) => {
            rules.required.forEach((field: string) => {
              if (!item[field] || item[field] === '' || (Array.isArray(item[field]) && item[field].length === 0)) {
                errors.push(`${FORM_STEPS[currentStepIndex].label} ${index + 1}: ${field.replace('_', ' ')} is required`);
              }
            });
          });
        }
      }
    }

    return errors;
  };

  // Transform data for API submission (unchanged from original)
  const transformData = (stepId: StepId, data: AllFormData): unknown[] => {
    switch (stepId) {
      case 'flightmaps': {
        const { name, description, owner } = data as FlightmapFormData;
        return [{ name, description, owner }];
      }
      case 'strategies': {
        return (data as StrategyFormData).strategies.map(strategy => ({
          flightmap: strategy.flightmap,
          name: strategy.name,
          tagline: strategy.tagline,
          vision: strategy.vision,
          time_horizon: strategy.time_horizon,
          executive_sponsors: Array.isArray(strategy.executive_sponsors)
            ? strategy.executive_sponsors.flat()
            : strategy.executive_sponsors,
          strategy_leads: Array.isArray(strategy.strategy_leads)
            ? strategy.strategy_leads.flat()
            : strategy.strategy_leads,
          communication_leads: Array.isArray(strategy.communication_leads)
            ? strategy.communication_leads.flat()
            : strategy.communication_leads,
        }));
      }
      case 'strategic-goals': {
        return (data as StrategicGoalFormData).goals.map(goal => ({
          strategy: goal.strategy,
          category: goal.category,
          goal_text: goal.goal_text,
        }));
      }
      case 'programs': {
        return (data as ProgramFormData).programs.map(program => ({
          strategy: program.strategy,
          name: program.name,
          vision: program.vision,
          time_horizon: program.time_horizon,
          executive_sponsors: Array.isArray(program.executive_sponsors)
            ? program.executive_sponsors.flat()
            : program.executive_sponsors,
          program_leads: Array.isArray(program.program_leads)
            ? program.program_leads.flat()
            : program.program_leads,
          workforce_sponsors: Array.isArray(program.workforce_sponsors)
            ? program.workforce_sponsors.flat()
            : program.workforce_sponsors,
          key_improvement_targets: Array.isArray(program.key_improvement_targets)
            ? program.key_improvement_targets.flat()
            : program.key_improvement_targets,
          key_organizational_goals: Array.isArray(program.key_organizational_goals)
            ? program.key_organizational_goals.flat()
            : program.key_organizational_goals,
        }));
      }
      case 'workstreams': {
        return (data as WorkstreamFormData).workstreams.map(workstream => ({
          program: workstream.program,
          name: workstream.name,
          vision: workstream.vision,
          time_horizon: workstream.time_horizon,
          workstream_leads: Array.isArray(workstream.workstream_leads)
            ? workstream.workstream_leads.flat()
            : workstream.workstream_leads,
          team_members: Array.isArray(workstream.team_members)
            ? workstream.team_members.flat()
            : workstream.team_members,
          improvement_targets: typeof workstream.improvement_targets === 'string'
            ? (workstream.improvement_targets as string).split(',').map((s: string) => s.trim()).filter(Boolean)
            : Array.isArray(workstream.improvement_targets)
            ? workstream.improvement_targets.flat()
            : workstream.improvement_targets,
          organizational_goals: typeof workstream.organizational_goals === 'string'
            ? (workstream.organizational_goals as string).split(',').map((s: string) => s.trim()).filter(Boolean)
            : Array.isArray(workstream.organizational_goals)
            ? workstream.organizational_goals.flat()
            : workstream.organizational_goals,
          color: workstream.color,
        }));
      }
      case 'milestones': {
        return (data as MilestoneFormData).milestones.map(milestone => ({
          workstream: milestone.workstream,
          name: milestone.name,
          description: milestone.description,
          deadline: milestone.deadline,
          status: milestone.status,
          strategic_goals: Array.isArray(milestone.strategic_goals)
            ? milestone.strategic_goals.flat()
            : milestone.strategic_goals,
          parent_milestone: milestone.parent_milestone || null,
          dependencies: milestone.dependencies || []
        }));
      }
      case 'activities': {
        return (data as ActivityFormData).activities.map(activity => ({
          workstream: activity.workstream,
          milestone: activity.milestone,
          name: activity.name,
          status: activity.status,
          priority: activity.priority,
          target_start_date: activity.target_start_date,
          target_end_date: activity.target_end_date,
          prerequisite_activities: Array.isArray(activity.prerequisite_activities)
            ? activity.prerequisite_activities.flat()
            : activity.prerequisite_activities,
          parallel_activities: Array.isArray(activity.parallel_activities)
            ? activity.parallel_activities.flat()
            : activity.parallel_activities,
          successive_activities: Array.isArray(activity.successive_activities)
            ? activity.successive_activities.flat()
            : activity.successive_activities,
          supported_milestones: Array.isArray(activity.supported_milestones)
            ? activity.supported_milestones.flat()
            : activity.supported_milestones,
          additional_milestones: Array.isArray(activity.additional_milestones)
            ? activity.additional_milestones.flat()
            : activity.additional_milestones,
          impacted_employee_groups: Array.isArray(activity.impacted_employee_groups)
            ? activity.impacted_employee_groups.flat()
            : activity.impacted_employee_groups,
          change_leaders: Array.isArray(activity.change_leaders)
            ? activity.change_leaders.flat()
            : activity.change_leaders,
          development_support: Array.isArray(activity.development_support)
            ? activity.development_support.flat()
            : activity.development_support,
          external_resources: Array.isArray(activity.external_resources)
            ? activity.external_resources.flat()
            : activity.external_resources,
          corporate_resources: Array.isArray(activity.corporate_resources)
            ? activity.corporate_resources.flat()
            : activity.corporate_resources,
        }));
      }
      default:
        return [];
    }
  };

  // Save function (saves without navigation)
  const onSaveStep = async (data: AllFormData) => {
    setIsSaving(true);
    const payloadArray = transformData(currentStepId, data);
    const results: unknown[] = [];

    try {
      for (const item of payloadArray) {
        const response = await fetch(`${API}/${currentStepId}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || ''}`,
          },
          credentials: 'include',
          body: JSON.stringify(item),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to save');
        }
        
        const result = await response.json();
        results.push(result);
      }

      // Update form data with saved results
      setFormData(prev => ({
        ...prev,
        [currentStepId]: results,
      }));
      
      showToast.success(`${FORM_STEPS[currentStepIndex].label} saved successfully!`);
    } catch (error) {
      console.error('Error saving form data:', error);
      showToast.error(`Failed to save ${FORM_STEPS[currentStepIndex].label}: ${
          error instanceof Error ? error.message : String(error)
        }`);
    } finally {
      setIsSaving(false);
    }
  };

  // Submit function with validation
  const onSubmitStep = async (data: AllFormData) => {
    // Validate current step before proceeding
    const errors = validateCurrentStep(data);
    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast.error('Please fix the validation errors before proceeding');
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);
    
    const isLastStep = currentStepIndex === FORM_STEPS.length - 1;
    const payloadArray = transformData(currentStepId, data);
    const results: unknown[] = [];

    try {
      for (const item of payloadArray) {
        const response = await fetch(`${API}/${currentStepId}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || ''}`,
          },
          credentials: 'include',
          body: JSON.stringify(item),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to submit');  
        }
        
        const result = await response.json();
        results.push(result);
      }

      const newCompletedSteps = [...completedSteps];
      newCompletedSteps[currentStepIndex] = true;
      setCompletedSteps(newCompletedSteps);

      setFormData(prev => ({
        ...prev,
        [currentStepId]: results,
      }));

      if (isLastStep) {
        showToast.success('Process completed successfully!');
        setFormData({});
        setCurrentStepIndex(0);
        setCompletedSteps(Array(FORM_STEPS.length).fill(false));
      } else {
        showToast.success(`${FORM_STEPS[currentStepIndex].label} submitted successfully!`);
        setCurrentStepIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving form data:', error);
      showToast.error(`Failed to submit ${FORM_STEPS[currentStepIndex].label}: ${
          error instanceof Error ? error.message : String(error)
        }`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced back navigation - preserves form data for "quick edit"
  const handleBack = () => {
    if (currentStepIndex > 0) {
      // Save current form state before going back
      const currentData = methods.getValues();
      setFormData(prev => ({
        ...prev,
        [currentStepId]: currentData,
      }));
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Step click navigation - only allow completed steps or adjacent step
  const handleStepClick = (index: number) => {
    if (completedSteps[index] || index === 0 || (index > 0 && completedSteps[index - 1])) {
      // Save current form state before switching
      const currentData = methods.getValues();
      setFormData(prev => ({
        ...prev,
        [currentStepId]: currentData,
      }));
      setCurrentStepIndex(index);
    }
  };

  // Modal states for dependent entities
  const [activityModalOpen, setActivityModalOpen] = useState<boolean>(false);
  const [currentDependencyType, setCurrentDependencyType] = useState<'prerequisite' | 'parallel' | 'successive' | null>(null);
  const [, setCurrentActivityIndex] = useState<number | null>(null);

  const openActivityModalForType = (dependencyType: 'prerequisite' | 'parallel' | 'successive', index: number) => {
    setCurrentDependencyType(dependencyType);
    setCurrentActivityIndex(index);
    setActivityModalOpen(true);
  };

  const [milestoneModalOpen, setMilestoneModalOpen] = useState<boolean>(false);
  // const openMilestoneModal = () => {
  //   setMilestoneModalOpen(true);
  // };

  const [dependentActivities, setDependentActivities] = useState<Activity[]>([]);
  const handleDependentActivityCreate = (activity: Activity) => {
    setDependentActivities(prev => [...prev, activity]);
  };

  const [dependentMilestones, setDependentMilestones] = useState<Milestone[]>([]);
  const handleDependentMilestoneCreate = (milestone: Milestone) => {
    setDependentMilestones(prev => [...prev, milestone]);
  };

  const CurrentStepComponent = FORM_STEPS[currentStepIndex].component;
  const RenderableComponent = CurrentStepComponent as React.FC<{ editMode?: boolean }>;

  // Show loading animation during submission
  if (isSubmitting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: themeColor }}></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Flightmap Data</h1>
        <p className="text-gray-600">Step-by-step process to create complete flightmap structure.</p>
      </div>

      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {FORM_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    completedSteps[index]
                      ? 'text-white'
                      : index === currentStepIndex
                      ? 'text-white'
                      : index === 0 || (index > 0 && completedSteps[index - 1])
                      ? 'text-gray-500 hover:bg-gray-100'
                      : 'text-gray-400 cursor-not-allowed'
                  } transition-all duration-200`}
                  disabled={!(completedSteps[index] || index === 0 || (index > 0 && completedSteps[index - 1]))}
                  style={{
                    backgroundColor: completedSteps[index]
                      ? themeColor
                      : index === currentStepIndex
                      ? themeColor
                      : '#e5e7eb',
                    cursor: completedSteps[index] || index === 0 || (index > 0 && completedSteps[index - 1])
                      ? 'pointer'
                      : 'not-allowed',
                  }}
                >
                  {completedSteps[index] ? <Check className="w-5 h-5" /> : <span>{index + 1}</span>}
                </button>
                <span className={`text-xs mt-2 ${index === currentStepIndex ? 'font-semibold' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5"
                  style={{
                    backgroundColor: completedSteps[index] ? themeColor : index < currentStepIndex ? themeColor : '#e5e7eb',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Validation Errors Display */}
      {validationErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmitStep)}>
            {/* Pass creation mode to components */}
            {currentStepId === 'activities' && (
              <ActivityForm 
                openModalForType={openActivityModalForType} 
                dependentActivities={dependentActivities}
                editMode={false}
              />
            )}
            {currentStepId === 'milestones' && (
              <MilestoneForm 
                // openMilestoneModal={openMilestoneModal} 
                dependentMilestones={dependentMilestones}
                editMode={false}
              />
            )}
            {currentStepId !== 'activities' && currentStepId !== 'milestones' && (
              <RenderableComponent
                editMode={false}
              />
            )}
            
            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className={`px-4 py-2 rounded-md ${
                  currentStepIndex === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={methods.handleSubmit(onSaveStep)}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: themeColor, cursor: 'pointer' }}
                  className="text-white px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  disabled={isSubmitting}
                >
                  {currentStepIndex === FORM_STEPS.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>

      {/* Dependent Modals */}
      {activityModalOpen && currentDependencyType && (
        <DependentActivityModal
          dependencyType={currentDependencyType}
          onClose={() => setActivityModalOpen(false)}
          onCreate={handleDependentActivityCreate}
        />
      )}
      {milestoneModalOpen && (
        <DependentMilestoneModal 
          onClose={() => setMilestoneModalOpen(false)} 
          onCreate={handleDependentMilestoneCreate} 
        />
      )}
    </div>
  );
};

export default FormStepper;