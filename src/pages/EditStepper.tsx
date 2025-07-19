/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams flightmaps Renderable flightmap
import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Save, Edit } from 'lucide-react';
import { showToast } from '@/components/Forms/Utils/toastUtils';

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
  | 'strategies'
  | 'strategic-goals'
  | 'programs'
  | 'workstreams'
  | 'milestones'
  | 'activities';

interface FormDataMap {
  strategies?: StrategyFormData;
  'strategic-goals'?: StrategicGoalFormData;
  programs?: ProgramFormData;
  workstreams?: WorkstreamFormData;
  milestones?: MilestoneFormData;
  activities?: ActivityFormData;
}

type AllFormData =
  | StrategyFormData
  | StrategicGoalFormData
  | ProgramFormData
  | WorkstreamFormData
  | MilestoneFormData
  | ActivityFormData;

const FORM_STEPS = [
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
  initialStepId = 'strategies',
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

      // Clear previous selection when step changes
      if (!initialEntityId || currentStepId !== initialStepId) {
        setSelectedEntity(null);
        methods.reset({});
      }

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
          if (initialEntityId && currentStepId === initialStepId && !selectedEntity) {
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
  }, [currentStepId, API, accessToken]); // Remove selectedEntity and initialEntityId from dependencies

  // Load entity data into form
  const loadEntityData = (entity: any) => {
    if (!entity) return;
    // Array-based form - need to properly structure the data
    let formData: any = {};

    switch (currentStepId) {
      case 'strategies':
        formData = {
          strategies: [{
            id: entity.id,
            name: entity.name || '',
            tagline: entity.tagline || '',
            description: entity.description || '', // ADD this field
            owner: entity.owner || 0, // ADD this field
            vision: entity.vision || '',
            time_horizon: entity.time_horizon || '',
            // Ensure arrays are properly formatted for multiselect
            executive_sponsors: entity.executive_sponsors?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || [],
            strategy_leads: entity.strategy_leads?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || [],
            communication_leads: entity.communication_leads?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || []
          }]
        };
        break;

      case 'strategic-goals':
        formData = {
          goals: [{
            ...entity,
            // Ensure strategy is the ID, not an object
            strategy: typeof entity.strategy === 'object' ? entity.strategy.id : entity.strategy
          }]
        };
        break;

      case 'programs':
        formData = {
          programs: [{
            ...entity,
            // Ensure all multi-select fields are arrays of IDs
            executive_sponsors: entity.executive_sponsors?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || [],
            program_leads: entity.program_leads?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || [],
            workforce_sponsors: entity.workforce_sponsors?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || [],
            key_improvement_targets: entity.key_improvement_targets?.map((goal: any) => 
              typeof goal === 'object' ? goal.id : goal
            ) || [],
            key_organizational_goals: entity.key_organizational_goals?.map((goal: any) => 
              typeof goal === 'object' ? goal.id : goal
            ) || []
          }]
        };
        break;

      case 'workstreams':
        formData = {
          workstreams: [{
            ...entity,
            workstream_leads: entity.workstream_leads?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || [],
            team_members: entity.team_members?.map((user: any) => 
              typeof user === 'object' ? user.id : user
            ) || [],
            // Handle JSON fields that might be strings or arrays
            improvement_targets: Array.isArray(entity.improvement_targets) 
              ? entity.improvement_targets 
              : [],
            organizational_goals: Array.isArray(entity.organizational_goals) 
              ? entity.organizational_goals 
              : []
          }]
        };
        break;
           
      case 'milestones':
        formData = {
          milestones: [{
            // Preserve all original fields
            id: entity.id,
            name: entity.name || '',
            description: entity.description || '',
            deadline: entity.deadline || '',
            status: entity.status || 'not_started',

            // Handle workstream - should be a number based on your API data
            workstream: entity.workstream || null,

            // Handle parent_milestone - should be a number or null
            parent_milestone: entity.parent_milestone || null,

            // Transform strategic_goals array (if it contains objects, extract IDs)
            strategic_goals: entity.strategic_goals?.map((goal: any) => 
              typeof goal === 'object' ? goal.id : goal
            ) || [],

            // Transform dependencies array (if it contains objects, extract IDs)  
            dependencies: entity.dependencies?.map((dep: any) => 
              typeof dep === 'object' ? dep.id : dep
            ) || [],

            // Preserve other fields that might be needed
            completed_date: entity.completed_date || null,
            updated_at: entity.updated_at || null,
            updated_by: entity.updated_by || null
          }]
        };
        break;

      case 'activities':
        formData = {
          activities: [{
            ...entity,
            // Handle all the multiselect fields
            prerequisite_activities: entity.prerequisite_activities?.map((act: any) => 
              typeof act === 'object' ? act.id : act
            ) || [],
            parallel_activities: entity.parallel_activities?.map((act: any) => 
              typeof act === 'object' ? act.id : act
            ) || [],
            successive_activities: entity.successive_activities?.map((act: any) => 
              typeof act === 'object' ? act.id : act
            ) || [],
            supported_milestones: entity.supported_milestones?.map((ms: any) => 
              typeof ms === 'object' ? ms.id : ms
            ) || [],
            additional_milestones: entity.additional_milestones?.map((ms: any) => 
              typeof ms === 'object' ? ms.id : ms
            ) || [],
            // Handle JSON fields
            impacted_employee_groups: Array.isArray(entity.impacted_employee_groups) 
              ? entity.impacted_employee_groups 
              : [],
            change_leaders: Array.isArray(entity.change_leaders) 
              ? entity.change_leaders 
              : [],
            development_support: Array.isArray(entity.development_support) 
              ? entity.development_support 
              : [],
            external_resources: Array.isArray(entity.external_resources) 
              ? entity.external_resources 
              : [],
            corporate_resources: Array.isArray(entity.corporate_resources) 
              ? entity.corporate_resources 
              : []
          }]
        };
        break;

      default:
        formData = { [currentStepId]: [entity] };
    }

        // ADD THIS LOG BEFORE RESET
    console.log('About to reset form with:', formData);

    methods.reset(formData);
    setFormData(prev => ({ ...prev, [currentStepId]: formData }));

        // ADD THIS LOG AFTER RESET
    console.log('Form reset complete. Current form values:', methods.getValues());
  };

  // Handle entity selection
  const handleEntitySelect = async (entity: any) => {
    if (entity) {
      // For list-based entities, we need to fetch the complete details
      // because the list endpoint only returns summary data
      try {
        console.log('Fetching complete entity details for:', entity.id);

        const response = await fetch(`${API}/${currentStepId}/${entity.id}/`, {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const completeEntity = await response.json();
          console.log('Complete entity data fetched:', completeEntity);

          setSelectedEntity(completeEntity);
          loadEntityData(completeEntity);
        } else {
          console.error('Failed to fetch complete entity details');
          // Fallback to the summary data if detail fetch fails
          setSelectedEntity(entity);
          loadEntityData(entity);
        }
      } catch (error) {
        console.error('Error fetching complete entity details:', error);
        // Fallback to the summary data if detail fetch fails
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
      case 'strategies': {
        const strategy = (data as StrategyFormData).strategies[0];
        return {
          id: selectedEntity.id,
          name: strategy.name,
          tagline: strategy.tagline,
          description: strategy.description,
          owner: strategy.owner,
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
        return (data as ActivityFormData).activities.map(activity => ({
          source_milestone: activity.source_milestone,
          target_milestone: activity.target_milestone,
          name: activity.name,
          status: activity.status,
          priority: activity.priority,
          target_start_date: activity.target_start_date,
          target_end_date: activity.target_end_date,

          // Activity dependency relationships
          prerequisite_activities: Array.isArray(activity.prerequisite_activities)
            ? activity.prerequisite_activities.flat()
            : activity.prerequisite_activities,
          parallel_activities: Array.isArray(activity.parallel_activities)
            ? activity.parallel_activities.flat()
            : activity.parallel_activities,
          successive_activities: Array.isArray(activity.successive_activities)
            ? activity.successive_activities.flat()
            : activity.successive_activities,

          // Cross-workstream milestone support (maintained)
          supported_milestones: Array.isArray(activity.supported_milestones)
            ? activity.supported_milestones.flat()
            : activity.supported_milestones,
          additional_milestones: Array.isArray(activity.additional_milestones)
            ? activity.additional_milestones.flat()
            : activity.additional_milestones,

          // Resource allocation fields
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
    // Clear current selection when changing steps
    setSelectedEntity(null);
    methods.reset({});
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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

      {/* Grid Layout: Form Left, Side Panel Right */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Form Content */}
        <div className="col-span-8">
          {selectedEntity ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Editing {FORM_STEPS[currentStepIndex].label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedEntity.name || selectedEntity.goal_text || selectedEntity.tagline || `${FORM_STEPS[currentStepIndex].label} ${selectedEntity.id}`}
                </p>
              </div>

              <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSaveChanges)}>
                  {currentStepId === 'activities' && (
                    <ActivityForm openModalForType={openActivityModalForType} dependentActivities={dependentActivities} editMode={true}/>
                  )}
                  {currentStepId === 'milestones' && (
                    <MilestoneForm dependentMilestones={dependentMilestones} editMode={true}/>
                  )}
                  {currentStepId !== 'activities' && currentStepId !== 'milestones' && <RenderableComponent editMode={true}/>}

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
            <div className="bg-gray-50 rounded-lg p-8 text-center h-96 flex flex-col justify-center">
              <Edit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Entity Selected</h3>
              <p className="text-gray-500">
                Select a {FORM_STEPS[currentStepIndex].label.toLowerCase()} from the panel on the right to begin editing.
              </p>
            </div>
          )}
        </div>
        
        {/* Right Column: Side Panel */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Available {FORM_STEPS[currentStepIndex].label}s
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Click any item below to edit
              </p>
            </div>
        
            {/* Scrollable Entity List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingEntities ? (
                <div className="p-4 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading available {currentStepId}...</p>
                </div>
              ) : availableEntities.length > 0 ? (
                <div className="p-2">
                  {availableEntities.map((entity) => {
                    // Handle different entity types for display (same logic as dropdown)
                    const displayName = entity.name || entity.goal_text || entity.tagline;
                    let subtitle = '';
                  
                    // For entities with parent relationships, show parent context
                    if (currentStepId === 'strategic-goals' && entity.strategy) {
                      const strategyName = typeof entity.strategy === 'object' 
                        ? entity.strategy.name 
                        : `Strategy ${entity.strategy}`;
                      subtitle = strategyName;
                    }
                  
                    const isSelected = selectedEntity?.id === entity.id;
                  
                    return (
                      <button
                        key={entity.id}
                        onClick={() => handleEntitySelect(entity)}
                        className={`w-full text-left p-3 mb-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        style={{
                          borderColor: isSelected ? themeColor : undefined,
                          backgroundColor: isSelected ? `${themeColor}15` : undefined,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isSelected ? 'text-gray-900' : 'text-gray-800'
                            }`}>
                              {displayName || `${FORM_STEPS[currentStepIndex].label} ${entity.id}`}
                            </p>
                            {subtitle && (
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {subtitle}
                              </p>
                            )}
                            {entity.id && (
                              <p className="text-xs text-gray-400 mt-1">
                                ID: {entity.id}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="ml-2 flex-shrink-0">
                              <Edit className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <div className="text-gray-400 mb-2">
                    <Edit className="w-8 h-8 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-500">
                    No {currentStepId} available to edit
                  </p>
                </div>
              )}
            </div>
            
            {/* Panel Footer - Optional Stats */}
            {!isLoadingEntities && availableEntities.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  {availableEntities.length} {availableEntities.length === 1 ? 'item' : 'items'} available
                </p>
              </div>
            )}
          </div>
        </div>
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

export default EditStepper;