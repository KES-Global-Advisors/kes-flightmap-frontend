import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Check } from 'lucide-react';

import { RoadmapForm, RoadmapFormData } from '../components/Forms/RoadmapForm';
import { StrategyForm, StrategyFormData } from '../components/Forms/StrategyForm';
import { StrategicGoalForm, StrategicGoalFormData } from '../components/Forms/StrategicGoalForm';
import { ProgramForm, ProgramFormData } from '../components/Forms/ProgramForm';
import { WorkstreamForm, WorkstreamFormData } from '../components/Forms/WorkstreamForm';
import MilestoneForm, { MilestoneFormData } from '../components/Forms/MilestoneForm';
import { ActivityForm, ActivityFormData } from '../components/Forms/ActivityForm';
import DependentActivityModal from '../components/Forms/Utils/DependentActivityModal';
import DependentMilestoneModal from '../components/Forms/Utils/DependentMilestoneModal';

// Allowed step IDs.
type StepId =
  | 'roadmaps'
  | 'strategies'
  | 'strategic-goals'
  | 'programs'
  | 'workstreams'
  | 'milestones'
  | 'activities';

// Map of stored form data per step.
interface FormDataMap {
  roadmaps?: RoadmapFormData;
  strategies?: StrategyFormData;
  'strategic-goals'?: StrategicGoalFormData;
  programs?: ProgramFormData;
  workstreams?: WorkstreamFormData;
  milestones?: MilestoneFormData;
  activities?: ActivityFormData;
}

// Union of all possible form data shapes.
type AllFormData =
  | RoadmapFormData
  | StrategyFormData
  | StrategicGoalFormData
  | ProgramFormData
  | WorkstreamFormData
  | MilestoneFormData
  | ActivityFormData;

// Define steps with IDs, labels, and associated components.
const FORM_STEPS = [
  { id: 'roadmaps' as StepId, label: 'Roadmap', component: RoadmapForm },
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(FORM_STEPS.length).fill(false));

  // Get current step id.
  const currentStepId = FORM_STEPS[currentStepIndex].id;

  // Initialize form methods.
  const methods = useForm<AllFormData>({
    defaultValues: formData[currentStepId] || {},
  });

  // Reset form when step changes.
  useEffect(() => {
    methods.reset(formData[currentStepId] || {});
  }, [currentStepIndex, formData, currentStepId, methods]);

  // Retrieve access token.
  const accessToken = sessionStorage.getItem('accessToken');

  // Transformation helper: returns an array of objects with flattened fields.
  const transformData = (stepId: StepId, data: AllFormData): any[] => {
    switch (stepId) {
      case 'roadmaps': {
        const { name, description, owner } = data as RoadmapFormData;
        return [{ name, description, owner }];
      }
      case 'strategies': {
        return (data as StrategyFormData).strategies.map(strategy => ({
          roadmap: strategy.roadmap,
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
          improvement_targets:
            typeof workstream.improvement_targets === 'string'
              ? workstream.improvement_targets.split(',').map(s => s.trim()).filter(Boolean)
              : Array.isArray(workstream.improvement_targets)
              ? workstream.improvement_targets.flat()
              : workstream.improvement_targets,
          organizational_goals:
            typeof workstream.organizational_goals === 'string'
              ? workstream.organizational_goals.split(',').map(s => s.trim()).filter(Boolean)
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
          dependencies: Array.isArray(milestone.dependencies)
            ? milestone.dependencies.flat()
            : milestone.dependencies,
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

  // Submission handler.
  const onSubmitStep = async (data: AllFormData) => {
    const isLastStep = currentStepIndex === FORM_STEPS.length - 1;
    const payloadArray = transformData(currentStepId, data);

    try {
      const results = [];
      for (const item of payloadArray) {
        const response = await fetch(`http://127.0.0.1:8000/${currentStepId}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || ''}`,
          },
          credentials: 'include',
          body: JSON.stringify(item),
        });
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
        setShowSuccess(true);
        setFormData({});
        setCurrentStepIndex(0);
        setCompletedSteps(Array(FORM_STEPS.length).fill(false));
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (completedSteps[index] || index === 0 || (index > 0 && completedSteps[index - 1])) {
      setCurrentStepIndex(index);
    }
  };

  // Modal state for dependent activities.
  const [activityModalOpen, setActivityModalOpen] = useState<boolean>(false);
  const [currentDependencyType, setCurrentDependencyType] = useState<'prerequisite' | 'parallel' | 'successive' | null>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number | null>(null);

  const openActivityModalForType = (dependencyType: 'prerequisite' | 'parallel' | 'successive', index: number) => {
    setCurrentDependencyType(dependencyType);
    setCurrentActivityIndex(index);
    setActivityModalOpen(true);
  };

  // Modal state for dependent milestones.
  const [milestoneModalOpen, setMilestoneModalOpen] = useState<boolean>(false);
  const openMilestoneModal = () => {
    setMilestoneModalOpen(true);
  };

  // Dependent creation callbacks.
  const handleDependentActivityCreate = (activity: any) => {
    console.log("Dependent activity created:", activity);
    // Update state as needed.
  };

  const handleDependentMilestoneCreate = (milestone: any) => {
    console.log("Dependent milestone created:", milestone);
    // Update state as needed.
  };

  // Determine the component to render for the current step.
  const CurrentStepComponent = (() => {
    if (currentStepId === 'activities') {
      return FORM_STEPS[currentStepIndex].component as React.FC<{ openModalForType: (dependencyType: 'prerequisite' | 'parallel' | 'successive', index: number) => void }>;
    } else if (currentStepId === 'milestones') {
      return FORM_STEPS[currentStepIndex].component as React.FC<{ openMilestoneModal: () => void }>;
    }
    return FORM_STEPS[currentStepIndex].component;
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg">
          Process completed successfully!
        </div>
      )}

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
                <span 
                  className={`text-xs mt-2 ${
                    index === currentStepIndex ? 'font-semibold' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5"
                  style={{
                    backgroundColor: 
                      completedSteps[index] ? themeColor : 
                      index < currentStepIndex ? themeColor : '#e5e7eb'
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmitStep)}>
            {currentStepId === 'activities'
              ? <CurrentStepComponent openModalForType={openActivityModalForType} />
              : currentStepId === 'milestones'
                ? <CurrentStepComponent openMilestoneModal={openMilestoneModal} />
                : <CurrentStepComponent />
            }
            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className={`px-4 py-2 rounded-md ${
                  currentStepIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Back
              </button>
              <button
                type="submit"
                style={{ backgroundColor: themeColor, cursor: 'pointer' }}
                className="text-white px-4 py-2 rounded-md"
              >
                {currentStepIndex === FORM_STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
      
      {/* Render dependent modals at the stepper level */}
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
