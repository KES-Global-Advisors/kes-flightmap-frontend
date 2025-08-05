/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams flightmaps Renderable flightmap
import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Save, Edit, Search, X, RotateCcw, PlusCircle } from 'lucide-react';
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

interface EditingContext {
  selectedStrategy: any | null;
  selectedProgram: any | null;
  selectedWorkstream: any | null;
  filteringEnabled: boolean;
}

interface ContextHeaderProps {
  context: EditingContext;
  onResetContext: () => void;
  themeColor: string;
  currentStepIndex: number;
  onStrategyChange: (strategy: any) => void;
  onProgramChange: (program: any) => void;
  onWorkstreamChange: (workstream: any) => void;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleItemCount, setVisibleItemCount] = useState(10);
  const [isCreationMode, setIsCreationMode] = useState(false);
  
  // Context state
  const [editingContext, setEditingContext] = useState<EditingContext>({
    selectedStrategy: null,
    selectedProgram: null,
    selectedWorkstream: null,
    filteringEnabled: true
  });

  // Context options for dropdowns
  const [contextOptions, setContextOptions] = useState<{
    strategies: any[];
    programs: any[];
    workstreams: any[];
  }>({
    strategies: [],
    programs: [],
    workstreams: []
  });
  const [isLoadingContextOptions, setIsLoadingContextOptions] = useState(false);

  const API = import.meta.env.VITE_API_BASE_URL;
  const accessToken = sessionStorage.getItem('accessToken');
  const currentStepId = FORM_STEPS[currentStepIndex].id;

  const methods = useForm<AllFormData>({
    defaultValues: formData[currentStepId] || {},
  });

  // Load all strategies on mount
  useEffect(() => {
    const loadStrategies = async () => {
      try {
        const response = await fetch(`${API}/strategies/`, {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const strategies = Array.isArray(data) ? data : (data.results || []);
          setContextOptions(prev => ({ ...prev, strategies }));
        }
      } catch (error) {
        console.error('Error loading strategies:', error);
      }
    };

    loadStrategies();
  }, [API, accessToken]);

  // Load programs when strategy changes
  useEffect(() => {
    const loadPrograms = async () => {
      if (!editingContext.selectedStrategy) {
        setContextOptions(prev => ({ ...prev, programs: [], workstreams: [] }));
        return;
      }

      setIsLoadingContextOptions(true);
      try {
        const response = await fetch(`${API}/programs/?strategy=${editingContext.selectedStrategy.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const programs = Array.isArray(data) ? data : (data.results || []);
          setContextOptions(prev => ({ ...prev, programs, workstreams: [] }));
        }
      } catch (error) {
        console.error('Error loading programs:', error);
      } finally {
        setIsLoadingContextOptions(false);
      }
    };

    loadPrograms();
  }, [editingContext.selectedStrategy, API, accessToken]);

  // Load workstreams when program changes
  useEffect(() => {
    const loadWorkstreams = async () => {
      if (!editingContext.selectedProgram) {
        setContextOptions(prev => ({ ...prev, workstreams: [] }));
        return;
      }

      setIsLoadingContextOptions(true);
      try {
        const response = await fetch(`${API}/workstreams/?program=${editingContext.selectedProgram.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const workstreams = Array.isArray(data) ? data : (data.results || []);
          setContextOptions(prev => ({ ...prev, workstreams }));
        }
      } catch (error) {
        console.error('Error loading workstreams:', error);
      } finally {
        setIsLoadingContextOptions(false);
      }
    };

    loadWorkstreams();
  }, [editingContext.selectedProgram, API, accessToken]);

  // Filtered entities based on context
  const filteredEntities = useMemo(() => {
    let entitiesToFilter = availableEntities;

    // Apply context-based filtering only if filtering is enabled
    if (editingContext.filteringEnabled) {
      switch (currentStepId) {
        case 'strategies':
          // For strategies, show all (no filtering needed)
          break;

        case 'strategic-goals':
          // Filter by selected strategy
          if (editingContext.selectedStrategy) {
            entitiesToFilter = availableEntities.filter(goal => {
              const goalStrategyId = typeof goal.strategy === 'object' 
                ? goal.strategy.id 
                : goal.strategy || goal.strategy_id;
              return goalStrategyId == editingContext.selectedStrategy.id;
            });
          }
          break;
        
        case 'programs':
          // Filter by selected strategy
          if (editingContext.selectedStrategy) {
            entitiesToFilter = availableEntities.filter(program => {
              const programStrategyId = typeof program.strategy === 'object' 
                ? program.strategy.id 
                : program.strategy || program.strategy_id;
              return programStrategyId == editingContext.selectedStrategy.id;
            });
          }
          break;

        case 'workstreams':
          // Filter by selected program (requires program context)
          if (editingContext.selectedProgram) {
            entitiesToFilter = availableEntities.filter(workstream => {
              const workstreamProgramId = typeof workstream.program === 'object' 
                ? workstream.program.id 
                : workstream.program || workstream.program_id;
              return workstreamProgramId == editingContext.selectedProgram.id;
            });
          } else if (editingContext.selectedStrategy) {
            // If only strategy selected, show workstreams from programs in that strategy
            entitiesToFilter = availableEntities.filter(workstream => {
              if (typeof workstream.program === 'object' && workstream.program.strategy) {
                const strategyId = typeof workstream.program.strategy === 'object'
                  ? workstream.program.strategy.id
                  : workstream.program.strategy;
                return strategyId == editingContext.selectedStrategy.id;
              }
              return false;
            });
          } else {
            // No context selected - show empty for workstreams step to encourage context selection
            entitiesToFilter = [];
          }
          break;
                
        case 'milestones':
          // Filter by selected workstream (requires workstream context)
          if (editingContext.selectedWorkstream) {
            entitiesToFilter = availableEntities.filter(milestone => {
              const matches = milestone.workstream == editingContext.selectedWorkstream.id;
              return matches;
            });
          } else {
            entitiesToFilter = [];
          }
          break;

        case 'activities':
          // Filter by selected workstream through milestone relationships
          if (editingContext.selectedWorkstream) {
            entitiesToFilter = availableEntities.filter(activity => {
              // Check if source or target milestone belongs to selected workstream
              const sourceWorkstreamId = activity.source_milestone?.workstream_id || 
                                       activity.source_milestone?.workstream;
              const targetWorkstreamId = activity.target_milestone?.workstream_id || 
                                       activity.target_milestone?.workstream;

              return sourceWorkstreamId == editingContext.selectedWorkstream.id ||
                     targetWorkstreamId == editingContext.selectedWorkstream.id;
            });
          } else {
            // No workstream context - show empty to encourage context selection
            entitiesToFilter = [];
          }
          break;

        default:
          // Default case - no filtering
          break;
      }
    }

    // Apply search query filtering on top of context filtering
    if (!searchQuery.trim()) {
      return entitiesToFilter;
    }

    const query = searchQuery.toLowerCase();
    return entitiesToFilter.filter((entity) => {
      const searchableText = `${entity.name || ''} ${entity.goal_text || ''} ${entity.tagline || ''}`.toLowerCase();
      return searchableText.includes(query);
    });
  }, [availableEntities, searchQuery, editingContext, currentStepId]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleItemCount(10);
  }, [searchQuery]);

  // Reset search when step changes
  useEffect(() => {
    setSearchQuery('');
    setVisibleItemCount(10);
  }, [currentStepId]);

  // Load available entities for current step
  useEffect(() => {
    const loadEntitiesForStep = async () => {
      setIsLoadingEntities(true);

      try {
        if (currentStepId === 'milestones') {

          // Extract all milestones from contextOptions which has full data
          let allMilestones: any[] = [];

          // Get milestones from workstreams in contextOptions
          contextOptions.workstreams.forEach(workstream => {
            if (workstream.milestones && Array.isArray(workstream.milestones)) {
              allMilestones = allMilestones.concat(workstream.milestones);
            }
          });

          // Remove duplicates by ID (in case same milestone appears in multiple places)
          const uniqueMilestones = allMilestones.reduce((acc, milestone) => {
            if (!acc.find((m: any) => m.id === milestone.id)) {
              acc.push(milestone);
            }
            return acc;
          }, []);


          setAvailableEntities(uniqueMilestones);
        } else {
          // For all other steps, use regular API
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
        }
      } catch (error) {
        console.error('Error loading entities:', error);
        showToast.error(`Failed to load ${currentStepId}`);
      } finally {
        setIsLoadingEntities(false);
      }
    };

    loadEntitiesForStep();
  }, [currentStepId, API, accessToken, initialEntityId, initialStepId, contextOptions]);

  // Clear selected entity when context changes to avoid confusion
  useEffect(() => {
    // Only clear if we have a selected entity and context filtering is enabled
    if (selectedEntity && editingContext.filteringEnabled) {
      const isEntityStillVisible = filteredEntities.some(entity => entity.id === selectedEntity.id);
      if (!isEntityStillVisible) {
        setSelectedEntity(null);
        methods.reset({});
      }
    }
  }, [editingContext, filteredEntities, selectedEntity, methods]);

  // Load entity data into form
  const loadEntityData = (entity: any) => {
    if (!entity) return;
    let formData: any = {};

    switch (currentStepId) {
      case 'strategies':
        formData = {
          strategies: [{
            id: entity.id,
            name: entity.name || '',
            tagline: entity.tagline || '',
            description: entity.description || '',
            owner: entity.owner || 0,
            vision: entity.vision || '',
            time_horizon: entity.time_horizon || '',
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
            strategy: typeof entity.strategy === 'object' ? entity.strategy.id : entity.strategy
          }]
        };
        break;

      case 'programs':
        formData = {
          programs: [{
            ...entity,
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
          // Find the program ID from the workstream to populate the form
          { let programId = 0;
          if (entity.workstream) {
            // Look up the workstream in contextOptions to get its program
            const workstream = contextOptions.workstreams.find(
              ws => ws.id === entity.workstream || ws.id === entity.workstream?.id
            );
            if (workstream && workstream.program) {
              programId = typeof workstream.program === 'object' 
                ? workstream.program.id 
                : workstream.program;
            }
          }

        formData = {
          milestones: [{
            id: entity.id,
            name: entity.name || '',
            description: entity.description || '',
            deadline: entity.deadline || '',
            status: entity.status || 'not_started',
            program: programId, // Populate the program field for form validation
            workstream: entity.workstream || null,
            parent_milestone: entity.parent_milestone || null,
            strategic_goals: entity.strategic_goals?.map((goal: any) => 
              typeof goal === 'object' ? goal.id : goal
            ) || [],
            dependencies: entity.dependencies?.map((dep: any) => 
              typeof dep === 'object' ? dep.id : dep
            ) || [],
            completed_date: entity.completed_date || null,
            updated_at: entity.updated_at || null,
            updated_by: entity.updated_by || null
          }]
        };
        break; }

      case 'activities':
        formData = {
          activities: [{
            ...entity,
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

    methods.reset(formData);
    setFormData(prev => ({ ...prev, [currentStepId]: formData }));
  };

  // Handle entity selection
  const handleEntitySelect = (entity: any) => {
    setSelectedEntity(entity);
    loadEntityData(entity);
  };

  // Context change handlers - IMPROVED
  const handleStrategyChange = useCallback((strategy: any) => {
    setEditingContext(prev => {
      const newContext = {
        ...prev,
        selectedStrategy: strategy,
        selectedProgram: null,
        selectedWorkstream: null
      };
      return newContext;
    });
  }, []);

  const handleProgramChange = useCallback((program: any) => {
    setEditingContext(prev => {
      const newContext = {
        ...prev,
        selectedProgram: program,
        selectedWorkstream: null
      };
      return newContext;
    });
  }, []);

  const handleWorkstreamChange = useCallback((workstream: any) => {
    setEditingContext(prev => {
      const newContext = {
        ...prev,
        selectedWorkstream: workstream
      };
      return newContext;
    });
  }, []);

  const handleResetContext = useCallback(() => {
    setEditingContext({
      selectedStrategy: null,
      selectedProgram: null,
      selectedWorkstream: null,
      filteringEnabled: true
    });
    setSelectedEntity(null);
    methods.reset({});
  }, [methods]);

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
        const activity = (data as ActivityFormData).activities[0];
        return {
          id: selectedEntity.id,
          source_milestone: activity.source_milestone,
          target_milestone: activity.target_milestone,
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
      
      // Update the entity in availableEntities list
      setAvailableEntities(prev => 
        prev.map(entity => entity.id === result.id ? result : entity)
      );
      
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

  // Step navigation
  const handleStepClick = (index: number) => {
    setSelectedEntity(null);
    methods.reset({});
    setCurrentStepIndex(index);
    // Don't clear context - let it persist across steps
  };

  // Helper function to get context description
  const getContextDescription = () => {
    const parts = [];
    if (editingContext.selectedStrategy) parts.push(` in ${editingContext.selectedStrategy.name}`);
    if (editingContext.selectedProgram) parts.push(`under ${editingContext.selectedProgram.name}`);
    if (editingContext.selectedWorkstream) parts.push(`within ${editingContext.selectedWorkstream.name}`);
    return parts.length > 0 ? parts.join(' ') : '';
  };

  // Initialize form with context when entering creation mode
  const initializeFormWithContext = useCallback(() => {
    if (!isCreationMode) return;

    let initialData: any = {};

    switch (currentStepId) {
      case 'strategic-goals':
        if (editingContext.selectedStrategy) {
          initialData = {
            goals: [{
              strategy: editingContext.selectedStrategy.id,
              category: 'business',
              goal_text: ''
            }]
          };
        }
        break;

      case 'programs':
        if (editingContext.selectedStrategy) {
          initialData = {
            programs: [{
              strategy: editingContext.selectedStrategy.id,
              name: '',
              vision: '',
              time_horizon: '',
              executive_sponsors: [],
              program_leads: [],
              workforce_sponsors: [],
              key_improvement_targets: [],
              key_organizational_goals: []
            }]
          };
        }
        break;

      case 'workstreams':
        if (editingContext.selectedProgram) {
          initialData = {
            workstreams: [{
              program: editingContext.selectedProgram.id,
              name: '',
              vision: '',
              time_horizon: '',
              workstream_leads: [],
              team_members: [],
              improvement_targets: [],
              organizational_goals: [],
              color: '#3B82F6'
            }]
          };
        }
        break;

      case 'milestones':
        if (editingContext.selectedWorkstream) {
          const defaultDeadline = new Date();
          defaultDeadline.setMonth(defaultDeadline.getMonth() + 3);

          initialData = {
            milestones: [{
              program: editingContext.selectedProgram?.id || 0,
              workstream: editingContext.selectedWorkstream.id,
              name: '',
              description: '',
              deadline: defaultDeadline.toISOString().split('T')[0],
              status: 'not_started',
              strategic_goals: [],
              dependencies: []
            }]
          };
        }
        break;

      case 'activities':
        // Activities require both source and target milestones to be selected
        initialData = {
          activities: [{
            source_milestone: 0,
            target_milestone: 0,
            name: '',
            status: 'not_started',
            priority: 2,
            target_start_date: new Date().toISOString().split('T')[0],
            target_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            prerequisite_activities: [],
            parallel_activities: [],
            successive_activities: [],
            supported_milestones: [],
            additional_milestones: [],
            impacted_employee_groups: [],
            change_leaders: [],
            development_support: [],
            external_resources: [],
            corporate_resources: []
          }]
        };
        break;
    }

    methods.reset(initialData);
  }, [isCreationMode, currentStepId, editingContext, methods]);

  // Run initialization when creation mode is enabled or step changes
  useEffect(() => {
    if (isCreationMode) {
      initializeFormWithContext();
    }
  }, [isCreationMode, currentStepIndex, initializeFormWithContext]);

  // Enhanced onCreateNew function to handle multiple entities (simplified version)
  const onCreateNew = async (data: AllFormData) => {
    if (!isCreationMode) return;
  
    setIsSaving(true);
  
    try {
      // Transform data for creation - now handles arrays like FormStepper
      const payloadArray = transformDataForBatchCreation(currentStepId, data);
      const results: any[] = [];
    
      // Submit each entity individually (like FormStepper.tsx does)
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
          throw new Error(errorData.detail || 'Failed to create');
        }
      
        const result = await response.json();
        results.push(result);
      }
    
      // Update available entities list with all new entities
      setAvailableEntities(prev => [...prev, ...results]);
    
      // Success message with count
      const entityCount = results.length;
      const entityLabel = FORM_STEPS[currentStepIndex].label;
      showToast.success(
        `${entityCount} ${entityLabel}${entityCount > 1 ? 's' : ''} created successfully!`
      );
    
      // Switch back to edit mode and select the last created entity
      setIsCreationMode(false);
      const entityToSelect = results[results.length - 1]; // Select the last created entity
      setSelectedEntity(entityToSelect);
      loadEntityData(entityToSelect);
    
    } catch (error) {
      console.error('Error creating entities:', error);
      showToast.error(`Failed to create ${FORM_STEPS[currentStepIndex].label}: ${
        error instanceof Error ? error.message : String(error)
      }`);
    } finally {
      setIsSaving(false);
    }
  };

  // Updated transform function to handle arrays (like FormStepper.tsx)
  const transformDataForBatchCreation = (stepId: StepId, data: AllFormData): any[] => {
    switch (stepId) {
      case 'strategies': {
        // Handle multiple strategies
        return (data as StrategyFormData).strategies.map(strategy => ({
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
        }));
      }
      case 'strategic-goals': {
        // Handle multiple goals
        return (data as StrategicGoalFormData).goals.map(goal => ({
          strategy: goal.strategy,
          category: goal.category,
          goal_text: goal.goal_text,
        }));
      }
      case 'programs': {
        // Handle multiple programs
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
        // Handle multiple workstreams
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
        // Handle multiple milestones
        return (data as MilestoneFormData).milestones.map(milestone => ({
          program: milestone.program,
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
        // Handle multiple activities
        return (data as ActivityFormData).activities.map(activity => ({
          source_milestone: activity.source_milestone,
          target_milestone: activity.target_milestone,
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
  // Render form with context - handles special cases for activities and milestones
  const renderFormWithContext = () => {
    if (currentStepId === 'activities') {
      return (
        <ActivityForm 
          openModalForType={openActivityModalForType} 
          dependentActivities={dependentActivities} 
          editMode={false} // Creation mode
        />
      );
    }
    
    if (currentStepId === 'milestones') {
      return (
        <MilestoneForm 
          dependentMilestones={dependentMilestones} 
          editMode={false} // Creation mode
        />
      );
    }
    
    // For all other form types, use the generic component
    return <RenderableComponent editMode={false} />;
  };

  // Helper to show what context is needed for creation
  const getCreationRequirements = () => {
    const requirements = {
      'strategies': null, // Strategies don't need context
      'strategic-goals': 'Strategy',
      'programs': 'Strategy', 
      'workstreams': 'Strategy and Program',
      'milestones': 'Strategy, Program, and Workstream',
      'activities': 'Available Milestones (any context)'
    };

    const required = requirements[currentStepId as keyof typeof requirements];

    if (!required) {
      return (
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-2">No additional context required.</p>
          <p>You can create strategies directly.</p>
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-600">
        <p className="font-medium mb-3">Required Context:</p>
        <p className="mb-4">{required}</p>

        {/* Show current context status */}
        <div className="space-y-2">
          <div className={`flex items-center p-2 rounded ${
            editingContext.selectedStrategy ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {editingContext.selectedStrategy ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Strategy: {editingContext.selectedStrategy.name}
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                No strategy selected
              </>
            )}
          </div>
          
          {(currentStepId === 'workstreams' || currentStepId === 'milestones' || currentStepId === 'activities') && (
            <div className={`flex items-center p-2 rounded ${
              editingContext.selectedProgram ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {editingContext.selectedProgram ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Program: {editingContext.selectedProgram.name}
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  No program selected
                </>
              )}
            </div>
          )}

          {(currentStepId === 'milestones' || currentStepId === 'activities') && (
            <div className={`flex items-center p-2 rounded ${
              editingContext.selectedWorkstream ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {editingContext.selectedWorkstream ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Workstream: {editingContext.selectedWorkstream.name}
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  No workstream selected
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Context guidance */}
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-xs text-blue-700 font-medium mb-1">💡 Tip:</p>
          <p className="text-xs text-blue-600">
            Use the context header above to select the required {currentStepId === 'activities' ? 'context' : required.toLowerCase()}.
          </p>
        </div>
      </div>
    );
  };

  // Modal states
  const [activityModalOpen, setActivityModalOpen] = useState<boolean>(false);
  const [currentDependencyType, setCurrentDependencyType] = useState<'prerequisite' | 'parallel' | 'successive' | null>(null);
  const [, setCurrentActivityIndex] = useState<number | null>(null);

  const openActivityModalForType = (dependencyType: 'prerequisite' | 'parallel' | 'successive', index: number) => {
    setCurrentDependencyType(dependencyType);
    setCurrentActivityIndex(index);
    setActivityModalOpen(true);
  };

  const [milestoneModalOpen, setMilestoneModalOpen] = useState<boolean>(false);

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

  // Context Header Component
  const EditingContextHeader: React.FC<ContextHeaderProps> = ({ 
    context, 
    onResetContext, 
    themeColor,
    currentStepIndex,
    onStrategyChange,
    onProgramChange,
    onWorkstreamChange
  }) => {
    // Show context selections based on current step
    const showProgramSelect = currentStepIndex >= 3; // workstreams, milestones, activities
    const showWorkstreamSelect = currentStepIndex >= 4; // milestones, activities


    return (
      <div className="mb-6 p-4 rounded-lg border-2" style={{ 
        borderColor: `${themeColor}40`, 
        backgroundColor: `${themeColor}08` 
      }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-3">Editing Context</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select context to filter available entities in the side panel
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Strategy Selection - Always visible */}
              <div>
                <label htmlFor="strategy-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Strategy Context:
                </label>
                <select
                  id="strategy-select"
                  value={context.selectedStrategy?.id || ''}
                  onChange={(e) => {
                    const strategyId = e.target.value;
                    if (strategyId) {
                      const strategy = contextOptions.strategies.find(s => s.id == strategyId);
                      onStrategyChange(strategy || null);
                    } else {
                      onStrategyChange(null);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Strategies</option>
                  {contextOptions.strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Program Selection - Show for workstreams, milestones, activities */}
              {showProgramSelect && (
                <div>
                  <label htmlFor="program-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Program Context:
                  </label>
                  <select
                    id="program-select"
                    value={context.selectedProgram?.id || ''}
                    onChange={(e) => {
                      const programId = e.target.value;
                      if (programId) {
                        const program = contextOptions.programs.find(p => p.id == programId);
                        onProgramChange(program || null);
                      } else {
                        onProgramChange(null);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!context.selectedStrategy || isLoadingContextOptions}
                  >
                    <option value="">
                      {!context.selectedStrategy 
                        ? 'Select Strategy First' 
                        : isLoadingContextOptions 
                        ? 'Loading...' 
                        : 'All Programs'
                      }
                    </option>
                    {contextOptions.programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Workstream Selection - Show for milestones, activities */}
              {showWorkstreamSelect && (
                <div>
                  <label htmlFor="workstream-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Workstream Context:
                  </label>
                  <select
                    id="workstream-select"
                    value={context.selectedWorkstream?.id || ''}
                    onChange={(e) => {
                      const workstreamId = e.target.value;
                      if (workstreamId) {
                        const workstream = contextOptions.workstreams.find(w => w.id == workstreamId);
                        onWorkstreamChange(workstream || null);
                      } else {
                        onWorkstreamChange(null);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!context.selectedProgram || isLoadingContextOptions}
                  >
                    <option value="">
                      {!context.selectedProgram 
                        ? 'Select Program First' 
                        : isLoadingContextOptions 
                        ? 'Loading...' 
                        : 'All Workstreams'
                      }
                    </option>
                    {contextOptions.workstreams.map((workstream) => (
                      <option key={workstream.id} value={workstream.id}>
                        {workstream.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Active Context Breadcrumb */}
            {(context.selectedStrategy || context.selectedProgram || context.selectedWorkstream) && (
              <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-md border border-gray-200">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Active Context:</span>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {context.selectedStrategy && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        📋 {context.selectedStrategy.name}
                      </span>
                    )}
                    {context.selectedProgram && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        📁 {context.selectedProgram.name}
                      </span>
                    )}
                    {context.selectedWorkstream && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        🔀 {context.selectedWorkstream.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={onResetContext}
            className="ml-4 px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center gap-2 bg-white"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Context
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Context Header */}
      <EditingContextHeader 
        context={editingContext} 
        onResetContext={handleResetContext} 
        themeColor={themeColor}
        currentStepIndex={currentStepIndex}
        onStrategyChange={handleStrategyChange}
        onProgramChange={handleProgramChange}
        onWorkstreamChange={handleWorkstreamChange}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isCreationMode ? 'Add New Components' : 'Edit Existing Data'}
            </h1>
            <p className="text-gray-600">
              {isCreationMode 
                ? 'Add new components to your existing strategy'
                : 'Select and modify existing records across all entity types.'
              }
            </p>
          </div>
            
          {/* Toggle Button */}
          <button
            onClick={() => {
              setIsCreationMode(!isCreationMode);
              setSelectedEntity(null);
              methods.reset({});
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {isCreationMode ? (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Switch to Edit Mode
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add New Components
              </>
            )}
          </button>
        </div>
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
        {isCreationMode ? (
          // Creation Mode - Show form directly
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New {FORM_STEPS[currentStepIndex].label}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Create a new {FORM_STEPS[currentStepIndex].label.toLowerCase()} 
                {getContextDescription()}
              </p>
            </div>

            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onCreateNew)}>
                {renderFormWithContext()}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreationMode(false);
                      methods.reset({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ backgroundColor: themeColor }}
                    className="inline-flex items-center px-6 py-3 rounded-md text-white hover:opacity-90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Creating...' : `Create ${FORM_STEPS[currentStepIndex].label}`}
                  </button>
                </div>
              </form>
            </FormProvider>
          </div>
        ) : (
          selectedEntity ? (
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
                    <ActivityForm 
                      openModalForType={openActivityModalForType} 
                      dependentActivities={dependentActivities} 
                      editMode={true}
                    />
                  )}
                  {currentStepId === 'milestones' && (
                    <MilestoneForm 
                      dependentMilestones={dependentMilestones} 
                      editMode={true}
                    />
                  )}
                  {currentStepId !== 'activities' && currentStepId !== 'milestones' && (
                    <RenderableComponent editMode={true}/>
                  )}

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
          )
          )}
        </div>
        
        {/* Right Column: Side Panel */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow-md h-[600px] flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {isCreationMode ? 'Context Required' : `Available ${FORM_STEPS[currentStepIndex].label}s`}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isCreationMode 
                  ? 'Ensure required context is selected above' 
                  : 'Click any item below to edit'
                }
              </p>

              {/* Search Input - Only show in edit mode */}
              {!isCreationMode && !isLoadingEntities && availableEntities.length > 0 && (
                <div className="mt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`Search ${currentStepId}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-2">
              {isCreationMode ? (
                // Creation Mode - Show Context Requirements
                <div className="space-y-4">
                  {getCreationRequirements()}
                </div>
              ) : (
                // Edit Mode - Show Entity List (existing logic)
                <>
                  {isLoadingEntities ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading {currentStepId}...</p>
                      </div>
                    </div>
                  ) : filteredEntities.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-sm">
                        <div className="text-gray-400 mb-4">
                          <Search className="w-12 h-12 mx-auto" />
                        </div>
                  
                        {searchQuery ? (
                          <>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h4>
                            <p className="text-gray-500 mb-4">
                              No {currentStepId} found matching "{searchQuery}"
                            </p>
                            <button
                              onClick={() => setSearchQuery('')}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Clear search
                            </button>
                          </>
                        ) : (
                          <>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                              {currentStepIndex === 0 ? 'No Strategies Available' : 'Select Context Above'}
                            </h4>
                        
                            {currentStepIndex === 0 ? (
                              <p className="text-gray-500">
                                No strategies have been created yet.
                              </p>
                            ) : currentStepIndex <= 2 ? (
                              // Strategic goals and programs need strategy context
                              <div className="text-gray-500">
                                <p className="mb-2">
                                  Select a <strong>Strategy</strong> in the context header above to see available {currentStepId}.
                                </p>
                                {!editingContext.selectedStrategy && (
                                  <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                                    💡 Tip: The context header filters what appears in this panel
                                  </div>
                                )}
                              </div>
                            ) : currentStepIndex === 3 ? (
                              // Workstreams need program context
                              <div className="text-gray-500">
                                <p className="mb-2">
                                  Select a <strong>Program</strong> in the context header above to see available workstreams.
                                </p>
                                {!editingContext.selectedProgram && (
                                  <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                                    💡 First select a Strategy, then a Program
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Milestones and activities need workstream context
                              <div className="text-gray-500">
                                <p className="mb-2">
                                  Select a <strong>Workstream</strong> in the context header above to see available {currentStepId}.
                                </p>
                                {!editingContext.selectedWorkstream && (
                                  <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                                    💡 Select Strategy → Program → Workstream for full context
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {filteredEntities.slice(0, visibleItemCount).map((entity) => {
                        const displayName = entity.name || entity.goal_text || entity.tagline;
                        let subtitle = '';
                      
                        if (currentStepId === 'strategic-goals' && entity.strategy) {
                          const strategyName = typeof entity.strategy === 'object' 
                            ? entity.strategy.name 
                            : editingContext.selectedStrategy?.name || `Strategy ${entity.strategy}`;
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
                                  isSelected ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {displayName}
                                </p>
                                {subtitle && (
                                  <p className="text-xs text-gray-500 truncate mt-1">
                                    {subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {/* Load More Button */}
                      {filteredEntities.length > visibleItemCount && (
                        <div className="p-3 text-center">
                          <button
                            onClick={() => setVisibleItemCount(prev => prev + 10)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Load {Math.min(10, filteredEntities.length - visibleItemCount)} more...
                          </button>
                          <p className="text-xs text-gray-500 mt-1">
                            Showing {visibleItemCount} of {filteredEntities.length}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            
            {/* Panel Footer - Only show in edit mode */}
            {!isCreationMode && !isLoadingEntities && availableEntities.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <p className="text-xs text-gray-500 text-center">
                  {searchQuery ? (
                    <>
                      Showing {Math.min(visibleItemCount, filteredEntities.length)} of {filteredEntities.length} filtered results
                      {filteredEntities.length !== availableEntities.length && (
                        <span className="text-gray-400"> ({availableEntities.length} total)</span>
                      )}
                    </>
                  ) : (
                    <>
                      Showing {Math.min(visibleItemCount, filteredEntities.length)} of {filteredEntities.length} {filteredEntities.length === 1 ? 'item' : 'items'}
                    </>
                  )}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setVisibleItemCount(10);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 block mx-auto"
                  >
                    Clear search
                  </button>
                )}
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