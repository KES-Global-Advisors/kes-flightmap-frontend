/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams flightmaps Renderable flightmap
import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Check, AlertCircle, FolderOpen, Clock } from 'lucide-react';
import { showToast } from '@/components/Forms/Utils/toastUtils';

import { StrategyForm, StrategyFormData } from '../components/Forms/StrategyForm';
import { StrategicGoalForm, StrategicGoalFormData } from '../components/Forms/StrategicGoalForm';
import { ProgramForm, ProgramFormData } from '../components/Forms/ProgramForm';
import WorkstreamForm, { WorkstreamFormData } from '../components/Forms/WorkstreamForm';
import MilestoneForm, { MilestoneFormData } from '../components/Forms/MilestoneForm';
import ActivityForm, { ActivityFormData } from '../components/Forms/ActivityForm';
import DependentActivityModal from '../components/Forms/Utils/DependentActivityModal';
import DependentMilestoneModal from '../components/Forms/Utils/DependentMilestoneModal';
import { DraftRecoveryModal } from '../components/Forms/Utils/DraftRecoveryModal';
import { DraftListModal } from '../components/Forms/Utils/DraftListModal';

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

// Validation rules for each step
const VALIDATION_RULES = {
  strategies: {
    required: ['name', 'owner', 'time_horizon'],
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
    required: ['source_milestone', 'target_milestone', 'name', 'status', 'priority', 'target_start_date', 'target_end_date'],
    arrayField: 'activities'
  }
};

const FORM_STEPS = [
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Flightmap Draft States
  const [draftId, setDraftId] = useState<number | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [availableDrafts, setAvailableDrafts] = useState<any[]>([]);
  const [draftName, setDraftName] = useState('');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryDraftData, setRecoveryDraftData] = useState<any>(null);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  // Add state for auto-save
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const API = import.meta.env.VITE_API_BASE_URL;
  const accessToken = sessionStorage.getItem('accessToken');
  const currentStepId = FORM_STEPS[currentStepIndex].id;

  const methods = useForm<AllFormData>({
    mode: 'onChange', // Enable real-time validation
    defaultValues: formData[currentStepId] || {},
  });

  // Auto-save implementation with debouncing
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const autoSaveTimer = setTimeout(() => {
      // Only auto-save if there's actual data and it's been modified
      const currentData = methods.getValues();
      const hasData = Object.keys(currentData).length > 0;

      if (hasData && draftId) {
        saveSession().then(() => {
          setLastAutoSave(new Date());
        });
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [methods.watch(), autoSaveEnabled, draftId]);

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

      if (currentStepId === 'activities') {
        // ✅ SPECIAL HANDLING: Activities need custom validation for new structure
        const activityData = data as ActivityFormData;

        if (!activityData.activities || activityData.activities.length === 0) {
          errors.push('At least one activity is required');
        } else {
          activityData.activities.forEach((activity, index) => {
            // ✅ UPDATED: Validate new required fields
            if (!activity.source_milestone || activity.source_milestone === 0) {
              errors.push(`Activity ${index + 1}: Source milestone is required`);
            }
            if (!activity.target_milestone || activity.target_milestone === 0) {
              errors.push(`Activity ${index + 1}: Target milestone is required`);
            }
            if (!activity.name || activity.name.trim() === '') {
              errors.push(`Activity ${index + 1}: Name is required`);
            }
            if (!activity.status) {
              errors.push(`Activity ${index + 1}: Status is required`);
            }
            if (!activity.priority) {
              errors.push(`Activity ${index + 1}: Priority is required`);
            }
            if (!activity.target_start_date) {
              errors.push(`Activity ${index + 1}: Target start date is required`);
            }
            if (!activity.target_end_date) {
              errors.push(`Activity ${index + 1}: Target end date is required`);
            }

            // ✅ NEW VALIDATION: Source and target cannot be the same
            if (activity.source_milestone === activity.target_milestone) {
              errors.push(`Activity ${index + 1}: Source and target milestone cannot be the same`);
            }

            // ✅ NEW VALIDATION: Date logic validation
            if (activity.target_start_date && activity.target_end_date) {
              const startDate = new Date(activity.target_start_date);
              const endDate = new Date(activity.target_end_date);
              if (startDate >= endDate) {
                errors.push(`Activity ${index + 1}: End date must be after start date`);
              }

              // Validate future dates
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              startDate.setHours(0, 0, 0, 0);

              if (startDate < today) {
                errors.push(`Activity ${index + 1}: Start date should be today or in the future`);
              }
            }

            // ✅ NEW VALIDATION: Check for self-referencing dependencies
            const allDependencies = [
              ...(activity.prerequisite_activities || []),
              ...(activity.parallel_activities || []),
              ...(activity.successive_activities || [])
            ];

            if (activity.id && allDependencies.includes(activity.id)) {
              errors.push(`Activity ${index + 1}: Cannot depend on itself`);
            }

            // ✅ NEW VALIDATION: Check for duplicate dependencies across types
            const duplicateDeps = allDependencies.filter((dep, idx) => 
              allDependencies.indexOf(dep) !== idx
            );

            if (duplicateDeps.length > 0) {
              errors.push(`Activity ${index + 1}: Cannot list the same activity in multiple dependency types`);
            }
          });
        } 
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
      case 'strategies': {
        return (data as StrategyFormData).strategies.map(strategy => ({
          name: strategy.name,
          tagline: strategy.tagline,
          description: strategy.description, // ADD this field
          owner: strategy.owner,
          is_draft: true,  // Mark as draft when creating
          draft_id: draftId,  // Link to the draft session
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
        return [];
    }
  };

  // Enhanced save session function to save the entire session with automatic draft naming
  const saveSession = async (isAutoSave = false) => {
    if (!isAutoSave) {
      setIsSavingDraft(true);
    }

    try {
      // Collect all form data from all steps
      const fullFormData = {
        ...formData,
        [currentStepId]: methods.getValues() // Include current unsaved data
      };

      // Generate draft name based on strategy name if available
      let generatedDraftName = draftName;
      if (!generatedDraftName && fullFormData.strategies) {
        const strategyData = fullFormData.strategies as StrategyFormData;
        if (strategyData.strategies && strategyData.strategies[0]?.name) {
          generatedDraftName = `${strategyData.strategies[0].name} - Draft`;
        }
      }

      const sessionData = {
        name: generatedDraftName || `Untitled Strategy Draft - ${new Date().toLocaleDateString()}`,
        current_step: currentStepId,
        form_data: fullFormData,
        completed_steps: completedSteps,
        progress_percentage: Math.round((completedSteps.filter(Boolean).length / FORM_STEPS.length) * 100)
      };

      const url = draftId 
        ? `${API}/flightmap-drafts/${draftId}/`  // Note: API endpoint remains same for backward compatibility
        : `${API}/flightmap-drafts/`;

      const response = await fetch(url, {
        method: draftId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const draft = await response.json();
        setDraftId(draft.id);
        setDraftName(draft.name);

        // Also save to localStorage as backup
        localStorage.setItem('strategy_draft_backup', JSON.stringify({  // Updated key name
          ...sessionData,
          draftId: draft.id,
          timestamp: new Date().toISOString()
        }));

        if (!isAutoSave) {
          showToast.success('Progress saved successfully!');
        }
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      if (!isAutoSave) {
        showToast.error('Failed to save progress. Please try again.');
      }
    } finally {
      if (!isAutoSave) {
        setIsSavingDraft(false);
      }
    }
  };

  // Enhanced function to load available drafts with loading state
  const loadAvailableDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const response = await fetch(`${API}/flightmap-drafts/`, {
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const drafts = await response.json();
        setAvailableDrafts(drafts.map((draft: any) => ({
          ...draft,
          progress_percentage: draft.completed_steps 
            ? Math.round((draft.completed_steps.filter(Boolean).length / FORM_STEPS.length) * 100)
            : 0
        })));
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
      showToast.error('Failed to load drafts');
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  // Enhanced function to load draft function with completion handling
  const loadDraft = async (draft: any) => {
    try {
      setFormData(draft.form_data);
      setCompletedSteps(draft.completed_steps);
      setCurrentStepIndex(FORM_STEPS.findIndex(step => step.id === draft.current_step));
      setDraftId(draft.id);
      setDraftName(draft.name);
      setShowDraftModal(false);
      
      showToast.success(`Loaded draft: ${draft.name}`);
    } catch (error) {
      console.error('Error loading draft:', error);
      showToast.error('Failed to load draft');
    }
  };

  // Delete draft function
  const deleteDraft = async (draftIdToDelete: number) => {
    try {
      const response = await fetch(`${API}/flightmap-drafts/${draftIdToDelete}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        setAvailableDrafts(prev => prev.filter(d => d.id !== draftIdToDelete));
        showToast.success('Draft deleted successfully');

        // If we just deleted the current draft, reset the draft ID
        if (draftIdToDelete === draftId) {
          setDraftId(null);
          setDraftName('');
        }
      } else {
        throw new Error('Failed to delete draft');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      showToast.error('Failed to delete draft');
    }
  };

  // Enhanced check for local backup on component mount with in-app modal
  useEffect(() => {
    const checkLocalBackup = () => {
      const backup = localStorage.getItem('flightmap_draft_backup');
      if (backup) {
        try {
          const data = JSON.parse(backup);
          const hoursSinceBackup = (Date.now() - new Date(data.timestamp).getTime()) / (1000 * 60 * 60);

          if (hoursSinceBackup < 24) { // Only show if less than 24 hours old
            const currentStep = FORM_STEPS.find(step => step.id === data.current_step);
            setRecoveryDraftData({
              name: data.name,
              lastSaved: new Date(data.timestamp).toLocaleString(),
              currentStep: currentStep?.label || data.current_step,
              data: data
            });
            setShowRecoveryModal(true);
          } else {
            // Clear old backup
            localStorage.removeItem('flightmap_draft_backup');
          }
        } catch (error) {
          console.error('Error checking backup:', error);
          localStorage.removeItem('flightmap_draft_backup');
        }
      }
    };

    checkLocalBackup();
    loadAvailableDrafts();
  }, []);

  // Enhanced submit function that removes draft on completion
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
          // Mark the flightmap as complete (no longer a draft)
        if (formData.strategies && Array.isArray(formData.strategies) && formData.strategies[0]?.id) {
          try {
            await fetch(`${API}/flightmaps/${formData.strategies[0].id}/mark_complete/`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken || ''}`,
              },
              credentials: 'include',
            });
          } catch (error) {
            console.error('Error marking strategy as complete:', error);
          }
        }

        // Delete the draft from backend when completed
        if (draftId) {
          try {
            await fetch(`${API}/flightmap-drafts/${draftId}/`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken || ''}`,
              },
              credentials: 'include',
            });
            // Clear local storage backup
            localStorage.removeItem('flightmap_draft_backup');
          } catch (error) {
            console.error('Error deleting draft:', error);
          }
        }

        showToast.success('Strategy created successfully!');

        // Reset everything
        setFormData({});
        setCurrentStepIndex(0);
        setCompletedSteps(Array(FORM_STEPS.length).fill(false));
        setDraftId(null);
        setDraftName('');
      } else {
        showToast.success(`${FORM_STEPS[currentStepIndex].label} submitted successfully!`);
        setCurrentStepIndex(prev => prev + 1);

        // Auto-save after each step completion
        await saveSession(true);
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create Strategic Initiative  {/* Updated title */}
            </h1>
            <p className="text-gray-600">
              Step-by-step process to create comprehensive strategy execution framework.
            </p>
            {formData.strategies && formData.strategies.strategies?.[0] && (
              <div className="mt-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                Strategy: {formData.strategies.strategies[0].name}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDraftModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Draft
            </button>
            <button
              type="button"
              onClick={() => saveSession()}
              disabled={isSavingDraft}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Clock className="w-4 h-4 mr-2" />
              {isSavingDraft ? 'Saving...' : 'Save Progress'}
            </button>

            {/* Add auto-save toggle here */}
            <label className="flex items-center gap-2 text-sm text-gray-600 ml-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded"
              />
              Auto-save
            </label>
          </div>
        </div>

        {/* Draft name input - show when draft is being saved */}
        {draftId && (
          <div className="mt-4 flex items-center gap-2">
            <label className="text-sm text-gray-600">Draft name:</label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="flex-1 text-sm rounded-md border-gray-300"
              placeholder="Enter a name for this draft..."
            />
          </div>
        )}
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
      {showRecoveryModal && (
        <DraftRecoveryModal
          isOpen={showRecoveryModal}
          onClose={() => {
            setShowRecoveryModal(false);
            localStorage.removeItem('flightmap_draft_backup');
          }}
          onRestore={() => {
            if (recoveryDraftData?.data) {
              setFormData(recoveryDraftData.data.form_data);
              setCompletedSteps(recoveryDraftData.data.completed_steps);
              setCurrentStepIndex(FORM_STEPS.findIndex(step => step.id === recoveryDraftData.data.current_step));
              setDraftId(recoveryDraftData.data.draftId);
              setShowRecoveryModal(false);
              localStorage.removeItem('flightmap_draft_backup');
              showToast.success('Draft restored successfully');
            }
          }}
          onDiscard={() => {
            setShowRecoveryModal(false);
            localStorage.removeItem('flightmap_draft_backup');
          }}
          draftData={recoveryDraftData}
        />
      )}

      {showDraftModal && (
        <DraftListModal
          isOpen={showDraftModal}
          onClose={() => setShowDraftModal(false)}
          drafts={availableDrafts}
          onLoadDraft={loadDraft}
          onDeleteDraft={deleteDraft}
          isLoading={isLoadingDrafts}
        />
      )}
      {lastAutoSave && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last saved: {lastAutoSave.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default FormStepper;