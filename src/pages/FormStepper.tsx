/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams flightmaps Renderable flightmap
import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Check } from 'lucide-react';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(FORM_STEPS.length).fill(false));
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state
  const API = import.meta.env.VITE_API_BASE_URL;

  // Global state for editing single-record forms.
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const currentStepId = FORM_STEPS[currentStepIndex].id;

  const methods = useForm<AllFormData>({
    defaultValues: formData[currentStepId] || {},
  });

  useEffect(() => {
    methods.reset(formData[currentStepId] || {});
  }, [currentStepIndex, formData, currentStepId, methods]);

  const accessToken = sessionStorage.getItem('accessToken');

  // For single-record forms (like flightmaps) we show a global dropdown.
  useEffect(() => {
    if (currentStepId === 'flightmaps') {
      fetch(`${API}/${currentStepId}/`, {
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : (data.results || []);
          setExistingItems(items);
        })
        .catch((err) => console.error("Error fetching existing items", err));
      setSelectedItemId(null);
    }
  }, [currentStepId, API, accessToken]);

  const handleExistingSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedItemId(id || null);
    if (id) {
      const selectedRecord = existingItems.find((item) => item.id.toString() === id);
      if (selectedRecord) {
        methods.reset(selectedRecord);
      }
    } else {
      methods.reset(formData[currentStepId] || {});
    }
  };

  // Updated transformData: if an item already has an id, include it.
  const transformData = (stepId: StepId, data: AllFormData): unknown[] => {
    switch (stepId) {
      case 'flightmaps': {
        const { name, description, owner } = data as FlightmapFormData;
        // For single-record form, check global selectedItemId if needed.
        const payload: any = { name, description, owner };
        return [selectedItemId ? { ...payload, id: Number(selectedItemId) } : payload];
      }
      case 'strategies': {
        return (data as StrategyFormData).strategies.map(strategy => {
          const payload: any = {
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
          };
          if ((strategy as any).id) {
            payload.id = (strategy as any).id;
          }
          return payload;
        });
      }
      case 'strategic-goals': {
        return (data as StrategicGoalFormData).goals.map(goal => {
          const payload: any = {
            strategy: goal.strategy,
            category: goal.category,
            goal_text: goal.goal_text,
          };
          if ((goal as any).id) {
            payload.id = (goal as any).id;
          }
          return payload;
        });
      }
      case 'programs': {
        return (data as ProgramFormData).programs.map(program => {
          const payload: any = {
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
          };
          if ((program as any).id) {
            payload.id = (program as any).id;
          }
          return payload;
        });
      }
      case 'workstreams': {
        return (data as WorkstreamFormData).workstreams.map(workstream => {
          const payload: any = {
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
                ? (workstream.improvement_targets as string).split(',').map((s: string) => s.trim()).filter(Boolean)
                : Array.isArray(workstream.improvement_targets)
                ? workstream.improvement_targets.flat()
                : workstream.improvement_targets,
            organizational_goals:
              typeof workstream.organizational_goals === 'string'
                ? (workstream.organizational_goals as string).split(',').map((s: string) => s.trim()).filter(Boolean)
                : Array.isArray(workstream.organizational_goals)
                ? workstream.organizational_goals.flat()
                : workstream.organizational_goals,
            color: workstream.color,
          };
          if ((workstream as any).id) {
            payload.id = (workstream as any).id;
          }
          return payload;
        });
      }
      case 'milestones': {
        return (data as MilestoneFormData).milestones.map(milestone => {
          const payload: any = {
            workstream: milestone.workstream,
            name: milestone.name,
            description: milestone.description,
            deadline: milestone.deadline,
            status: milestone.status,
            strategic_goals: Array.isArray(milestone.strategic_goals)
              ? milestone.strategic_goals.flat()
              : milestone.strategic_goals,
            // NEW: send the parent milestone field instead of dependencies
            parent_milestone: milestone.parent_milestone || null,
            dependencies: milestone.dependencies || []
          };
          if ((milestone as any).id) {
            payload.id = (milestone as any).id;
          }
          return payload;
        });
      }
      case 'activities': {
        return (data as ActivityFormData).activities.map(activity => {
          const payload: any = {
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
          };
          if ((activity as any).id) {
            payload.id = (activity as any).id;
          }
          return payload;
        });
      }
      default:
        return [];
    }
  };

  const onSubmitStep = async (data: AllFormData) => {
    setIsSubmitting(true); // Set loading state to true when form is submitted
    
    const isLastStep = currentStepIndex === FORM_STEPS.length - 1;
    const payloadArray = transformData(currentStepId, data);
    const results: unknown[] = [];

    try {
      for (const item of payloadArray) {
        let url: string;
        let method: string;
        if (currentStepId === 'flightmaps') {
          if (selectedItemId) {
            url = `${API}/${currentStepId}/${selectedItemId}/`;
            method = 'PATCH';
          } else {
            url = `${API}/${currentStepId}/`;
            method = 'POST';
          }
        } else {
          // For array-based forms like strategies, if item has id, use PATCH.
          if ((item as any).id) {
            url = `${API}/${currentStepId}/${(item as any).id}/`;
            method = 'PATCH';
          } else {
            url = `${API}/${currentStepId}/`;
            method = 'POST';
          }
        }
        const response = await fetch(url, {
          method,
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

      const formattedData = (() => {
        switch (currentStepId) {
          case 'flightmaps':
            // Single record form - store as-is
            return results[0] || data;
          case 'strategies':
            return { strategies: results };
          case 'strategic-goals':
            return { goals: results };
          case 'programs':
            return { programs: results };
          case 'workstreams':
            return { workstreams: results };
          case 'milestones':
            return { milestones: results };
          case 'activities':
            return { activities: results };
          default:
            return data;
        }
      })();

      setFormData(prev => ({
        ...prev,
        [currentStepId]: formattedData,
      }));

      if (currentStepId === 'flightmaps') {
        setSelectedItemId(null);
      }

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
    } finally {
      setIsSubmitting(false); // Set loading state back to false after submission completes
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

  // Modal states (unchanged)
  const [activityModalOpen, setActivityModalOpen] = useState<boolean>(false);
  const [currentDependencyType, setCurrentDependencyType] = useState<'prerequisite' | 'parallel' | 'successive' | null>(null);
  const [, setCurrentActivityIndex] = useState<number | null>(null);

  const openActivityModalForType = (dependencyType: 'prerequisite' | 'parallel' | 'successive', index: number) => {
    setCurrentDependencyType(dependencyType);
    setCurrentActivityIndex(index);
    setActivityModalOpen(true);
  };

  const [milestoneModalOpen, setMilestoneModalOpen] = useState<boolean>(false);
  const openMilestoneModal = () => {
    setMilestoneModalOpen(true);
  };

  const [dependentActivities, setDependentActivities] = useState<Activity[]>([]);
  const handleDependentActivityCreate = (activity: Activity) => {
    setDependentActivities(prev => [...prev, activity]);
  };

  const [dependentMilestones, setDependentMilestones] = useState<Milestone[]>([]);
  const handleDependentMilestoneCreate = (milestone: Milestone) => {
    setDependentMilestones(prev => [...prev, milestone]);
  };

  const CurrentStepComponent = FORM_STEPS[currentStepIndex].component;
  const RenderableComponent = CurrentStepComponent as React.FC;

  // If submitting, show loading animation instead of the form
  if (isSubmitting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: themeColor }}></div>
      </div>
    );
  }

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

      {/* Global Existing Item Dropdown (only for single-record forms) */}
      {currentStepId === 'flightmaps' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Select existing {currentStepId.slice(0, -1)}
          </label>
          <select
            onChange={handleExistingSelect}
            value={selectedItemId || ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">New {currentStepId.slice(0, -1)}</option>
            {existingItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || item.goal_text || item.tagline || `Record ${item.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmitStep)}>
            {currentStepId === 'activities' && (
              <ActivityForm openModalForType={openActivityModalForType} dependentActivities={dependentActivities} />
            )}
            {currentStepId === 'milestones' && (
              <MilestoneForm openMilestoneModal={openMilestoneModal} dependentMilestones={dependentMilestones} />
            )}
            {currentStepId !== 'activities' && currentStepId !== 'milestones' && <RenderableComponent />}
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
              <button 
                type="submit" 
                style={{ backgroundColor: themeColor, cursor: 'pointer' }} 
                className="text-white px-4 py-2 rounded-md"
                disabled={isSubmitting}
              >
                {currentStepIndex === FORM_STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>

      {/* Render dependent modals */}
      {activityModalOpen && currentDependencyType && (
        <DependentActivityModal
          dependencyType={currentDependencyType}
          onClose={() => setActivityModalOpen(false)}
          onCreate={handleDependentActivityCreate}
        />
      )}
      {milestoneModalOpen && (
        <DependentMilestoneModal onClose={() => setMilestoneModalOpen(false)} onCreate={handleDependentMilestoneCreate} />
      )}
    </div>
  );
};

export default FormStepper;