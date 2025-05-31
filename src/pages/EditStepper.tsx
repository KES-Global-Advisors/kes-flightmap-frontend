/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams flightmaps Renderable flightmap
import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Save, Edit } from 'lucide-react';
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

const FORM_STEPS = [
  { id: 'flightmaps' as StepId, label: 'Flightmap', component: FlightmapForm },
  { id: 'strategies' as StepId, label: 'Strategy', component: StrategyForm },
  { id: 'strategic-goals' as StepId, label: 'Strategic Goal', component: StrategicGoalForm },
  { id: 'programs' as StepId, label: 'Program', component: ProgramForm },
  { id: 'workstreams' as StepId, label: 'Workstream', component: WorkstreamForm },
  { id: 'milestones' as StepId, label: 'Milestone', component: MilestoneForm },
  { id: 'activities' as StepId, label: 'Activity', component: ActivityForm },
] as const;

interface EditStepperProps {
  initialStepId?: StepId;
  initialEntityId?: string;
}

const EditStepper: React.FC<EditStepperProps> = ({ 
  initialStepId = 'flightmaps',
  initialEntityId 
}) => {
  const { themeColor } = useContext(ThemeContext);
  const [currentStepIndex, setCurrentStepIndex] = useState(
    FORM_STEPS.findIndex(step => step.id === initialStepId)
  );
  const [formData, setFormData] = useState<FormDataMap>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [availableEntities, setAvailableEntities] = useState<any[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  
  const API = import.meta.env.VITE_API_BASE_URL;
  const accessToken = sessionStorage.getItem('accessToken');
  const currentStepId = FORM_STEPS[currentStepIndex].id;

  const methods = useForm<AllFormData>({
    defaultValues: formData[currentStepId] || {},
  });

  // Load available entities for current step
  useEffect(() => {
    const loadEntitiesForStep = async () => {
      setIsLoadingEntities(true);
      try {
        const response = await fetch(`${API}/${currentStepId}/`, {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          const entities = Array.isArray(data) ? data : (data.results || []);
          setAvailableEntities(entities);
          
          // Auto-select if initialEntityId provided and matches current step
          if (initialEntityId && !selectedEntity) {
            const entity = entities.find((e: any) => e.id.toString() === initialEntityId);
            if (entity) {
              setSelectedEntity(entity);
              loadEntityData(entity);
            }
          }
        }
      } catch (error) {
        console.error('Error loading entities:', error);
        showToast.error(`Failed to load ${currentStepId}`);
      } finally {
        setIsLoadingEntities(false);
      }
    };

    loadEntitiesForStep();
  }, [currentStepId, API, accessToken, initialEntityId, selectedEntity]);

  // Load entity data into form
  const loadEntityData = (entity: any) => {
    if (currentStepId === 'flightmaps') {
      // Single entity form
      methods.reset(entity);
      setFormData(prev => ({ ...prev, [currentStepId]: entity }));
    } else {
      // Array-based form - wrap in array
      const arrayData = { [currentStepId]: [entity] };
      methods.reset(arrayData);
      setFormData(prev => ({ ...prev, [currentStepId]: [entity] }));
    }
  };

  // Handle entity selection
  const handleEntitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const entityId = e.target.value;
    if (entityId) {
      const entity = availableEntities.find((e: any) => e.id.toString() === entityId);
      if (entity) {
        setSelectedEntity(entity);
        loadEntityData(entity);
      }
    } else {
      setSelectedEntity(null);
      methods.reset({});
      setFormData(prev => ({ ...prev, [currentStepId]: undefined }));
    }
  };

  // Transform data for PATCH request
  const transformDataForPatch = (stepId: StepId, data: AllFormData): any => {
    if (!selectedEntity) return null;

    switch (stepId) {
      case 'flightmaps': {
        const { name, description, owner } = data as FlightmapFormData;
        return { id: selectedEntity.id, name, description, owner };
      }
      case 'strategies': {
        const strategy = (data as StrategyFormData).strategies[0];
        return {
          id: selectedEntity.id,
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
      }
      case 'strategic-goals': {
        const goal = (data as StrategicGoalFormData).goals[0];
        return {
          id: selectedEntity.id,
          strategy: goal.strategy,
          category: goal.category,
          goal_text: goal.goal_text,
        };
      }
      case 'programs': {
        const program = (data as ProgramFormData).programs[0];
        return {
          id: selectedEntity.id,
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
      }
      case 'workstreams': {
        const workstream = (data as WorkstreamFormData).workstreams[0];
        return {
          id: selectedEntity.id,
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
        };
      }
      case 'milestones': {
        const milestone = (data as MilestoneFormData).milestones[0];
        return {
          id: selectedEntity.id,
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
        };
      }
      case 'activities': {
        const activity = (data as ActivityFormData).activities[0];
        return {
          id: selectedEntity.id,
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
      }
      default:
        return null;
    }
  };

  // Save changes to existing entity
  const onSaveChanges = async (data: AllFormData) => {
    if (!selectedEntity) {
      showToast.error('No entity selected for editing');
      return;
    }

    setIsSaving(true);
    const payload = transformDataForPatch(currentStepId, data);

    try {
      const response = await fetch(`${API}/${currentStepId}/${selectedEntity.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save changes');
      }

      const result = await response.json();
      setSelectedEntity(result);
      loadEntityData(result);
      
      showToast.success(`${FORM_STEPS[currentStepIndex].label} updated successfully!`);
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast.error(`Failed to update ${FORM_STEPS[currentStepIndex].label}: ${
        error instanceof Error ? error.message : String(error)
      }`);
    } finally {
      setIsSaving(false);
    }
  };

  // Free navigation - can jump to any step
  const handleStepClick = (index: number) => {
    setCurrentStepIndex(index);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Existing Data</h1>
        <p className="text-gray-600">Select and modify existing records across all entity types.</p>
      </div>

      {/* Stepper Header - All steps always clickable */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {FORM_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-80 ${
                    index === currentStepIndex
                      ? 'text-white'
                      : 'text-gray-500 bg-gray-200 hover:bg-gray-300'
                  }`}
                  style={{
                    backgroundColor: index === currentStepIndex ? themeColor : undefined,
                  }}
                >
                  {index === currentStepIndex ? <Edit className="w-5 h-5" /> : <span>{index + 1}</span>}
                </button>
                <span className={`text-xs mt-2 ${index === currentStepIndex ? 'font-semibold' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 bg-gray-200"
                  style={{
                    backgroundColor: index < currentStepIndex ? themeColor : '#e5e7eb',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Entity Selection */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select {FORM_STEPS[currentStepIndex].label} to Edit
        </label>
        {isLoadingEntities ? (
          <p className="text-gray-500">Loading available {currentStepId}...</p>
        ) : (
          <select
            onChange={handleEntitySelect}
            value={selectedEntity?.id || ""}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select {FORM_STEPS[currentStepIndex].label} to Edit</option>
            {availableEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name || entity.goal_text || entity.tagline || `${FORM_STEPS[currentStepIndex].label} ${entity.id}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Form Content */}
      {selectedEntity ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSaveChanges)}>
              {currentStepId === 'activities' && (
                <ActivityForm openModalForType={openActivityModalForType} dependentActivities={dependentActivities} />
              )}
              {currentStepId === 'milestones' && (
                <MilestoneForm openMilestoneModal={openMilestoneModal} dependentMilestones={dependentMilestones} />
              )}
              {currentStepId !== 'activities' && currentStepId !== 'milestones' && <RenderableComponent />}
              
              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ backgroundColor: themeColor }}
                  className="inline-flex items-center px-6 py-3 rounded-md text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </FormProvider>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Edit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Entity Selected</h3>
          <p className="text-gray-500">
            Select a {FORM_STEPS[currentStepIndex].label.toLowerCase()} from the dropdown above to begin editing.
          </p>
        </div>
      )}

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

export default EditStepper;