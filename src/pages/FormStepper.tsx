import React, { useState, useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Check } from 'lucide-react';

import { RoadmapForm, RoadmapFormData } from '../components/Forms/RoadmapForm';
import { StrategyForm, StrategyFormData } from '../components/Forms/StrategyForm';
import { StrategicGoalForm, StrategicGoalFormData } from '../components/Forms/StrategicGoalForm';
import { ProgramForm, ProgramFormData } from '../components/Forms/ProgramForm';
import { WorkstreamForm, WorkstreamFormData } from '../components/Forms/WorkstreamForm';
import { MilestoneForm, MilestoneFormData } from '../components/Forms/MilestoneForm';
import { ActivityForm, ActivityFormData } from '../components/Forms/ActivityForm';

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

  // Get current step id.
  const currentStepId = FORM_STEPS[currentStepIndex].id;

  // Initialize form methods.
  const methods = useForm<AllFormData>({
    defaultValues: formData[currentStepId] || {},
  });

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

  // Submission handler: iterate over the transformed array and POST each item individually.
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

      // Optionally store the last created object or the entire array in state.
      setFormData(prev => ({
        ...prev,
        [currentStepId]: results,
      }));

      if (isLastStep) {
        setShowSuccess(true);
        setFormData({});
        setCurrentStepIndex(0);
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

  const CurrentStepComponent = FORM_STEPS[currentStepIndex].component;

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
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index <= currentStepIndex ? 'text-white' : 'text-gray-500'
                }`}
                style={{
                  backgroundColor: index <= currentStepIndex ? themeColor : '#e5e7eb'
                }}
              >
                {index < currentStepIndex ? <Check className="w-5 h-5" /> : <span>{index + 1}</span>}
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5"
                  style={{
                    backgroundColor: index < currentStepIndex ? themeColor : '#e5e7eb'
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
            <CurrentStepComponent />
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
    </div>
  );
};

export default FormStepper;
