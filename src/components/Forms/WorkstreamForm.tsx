// cSpell:ignore workstream workstreams
import React, { useEffect, useCallback, useMemo } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { SketchPicker } from 'react-color';
import useFetch from '../../hooks/UseFetch';
import { Program, User } from '../../types/model';
import { PlusCircle, Trash2, Users, Palette, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { MultiSelect } from './Utils/MultiSelect';
import { FormLabel } from './Utils/RequiredFieldIndicator';
import { useStrategyScoped } from '../../contexts/StrategyContext'; 

export type WorkstreamFormData = {
  workstreams: {
    id?: number;
    program: number;
    name: string;
    vision?: string;
    time_horizon: string;
    workstream_leads: (string | number)[];
    team_members: (string | number)[];
    improvement_targets: string[];
    organizational_goals: string[];
    color: string;
  }[];
};

const API = import.meta.env.VITE_API_BASE_URL;

interface WorkstreamFormProps {
  editMode?: boolean;
}

/**
 * Enhanced WorkstreamForm with comprehensive validation framework
 * Implements technical excellence principles:
 * - Precision in validation logic
 * - Comprehensive error prevention
 * - Performance-optimized rendering
 * - Robust state management
 */
const WorkstreamForm: React.FC<WorkstreamFormProps> = ({ editMode = false }) => {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<WorkstreamFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "workstreams",
  });

  // NEW: Get strategy-scoped filtering functions
  const { getStrategyFilteredUrl, getCurrentStrategyId } = useStrategyScoped();

  // Lines 40-45: Update data fetching to use strategy-scoped filtering
  // Data fetching with comprehensive error boundary handling
  const programsUrl = getStrategyFilteredUrl(`${API}/programs/`);
  const { data: programs, loading: loadingPrograms, error: errorPrograms } = useFetch<Program[]>(programsUrl);
  const { data: users, loading: loadingUsers, error: errorUsers } = useFetch<User[]>(`${API}/users/`);

  // Memoized data transformations for performance optimization
  const userOptions = useMemo(() => 
    users ? users.map((u: User) => ({ label: u.username, value: u.id })) : [],
    [users]
  );

  // Strategic color palette for visual coherence
  const STRATEGIC_COLOR_PALETTE = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  const addWorkstream = useCallback(() => {
    console.log("Adding workstream with technical precision");
    
    try {
      const nextColorIndex = fields.length % STRATEGIC_COLOR_PALETTE.length;
      const defaultColor = STRATEGIC_COLOR_PALETTE[nextColorIndex];
      
      append({
        program: 0,
        name: "",
        vision: "",
        time_horizon: "",
        workstream_leads: [],
        team_members: [],
        improvement_targets: [],
        organizational_goals: [],
        color: defaultColor
      });
      
      console.log("Workstream added successfully with optimized color assignment");
    } catch (error) {
      console.error("Critical error in workstream addition:", error);
    }
  }, [append, fields.length]);
  
  // Initialize with one empty workstream for creation mode
  useEffect(() => {
    if (!editMode && fields.length === 0) {
      addWorkstream();
    }
  }, [editMode, fields.length, addWorkstream]);

  /**
   * Advanced workstream name validation with business logic enforcement
   * Implements multiple validation layers for comprehensive error prevention
   */
  const validateWorkstreamName = (value: string, index: number): string | true => {
    // Null/undefined guard with precise error messaging
    if (!value || value.trim().length === 0) {
      return 'Workstream name is required for organizational clarity';
    }

    // Length validation with business context
    const trimmedValue = value.trim();
    if (trimmedValue.length < 3) {
      return 'Workstream name must be at least 3 characters for meaningful identification';
    }
    if (trimmedValue.length > 80) {
      return 'Workstream name should not exceed 80 characters for practical usability';
    }

    // Duplicate detection within form scope
    const currentWorkstreams = watch('workstreams') || [];
    const duplicateCount = currentWorkstreams.filter((w, i) => 
      i !== index && w.name && w.name.trim().toLowerCase() === trimmedValue.toLowerCase()
    ).length;
    
    if (duplicateCount > 0) {
      return 'Workstream names must be unique within the same program for clarity';
    }

    // Business naming convention validation
    const hasValidStructure = /^[A-Za-z][\w\s\-&\\.]+[A-Za-z0-9]$/.test(trimmedValue);
    if (!hasValidStructure && trimmedValue.length > 1) {
      return 'Workstream name should follow standard naming conventions';
    }

    // Semantic quality indicators
    const hasDescriptiveContent = trimmedValue.split(/\s+/).length >= 2;
    if (!hasDescriptiveContent) {
      console.warn(`Workstream ${index + 1}: Consider using a more descriptive name`);
    }

    return true;
  };

  /**
   * Time horizon validation with strategic planning principles
   * Enforces realistic project timelines and business constraints
   */
  const validateTimeHorizon = (value: string): string | true => {
    if (!value) return 'Time horizon is essential for project planning';
    
    const selectedDate = new Date(value);
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);
    
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      return 'Time horizon must be in the future for meaningful planning';
    }
    
    if (selectedDate < threeMonthsFromNow) {
      return 'Workstreams typically require at least 3 months for meaningful deliverables';
    }
    
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(today.getFullYear() + 2);
    
    if (selectedDate > twoYearsFromNow) {
      return 'Consider breaking down workstreams longer than 2 years into phases';
    }
    
    return true;
  };

  /**
   * Vision validation with quality assessment framework
   * Ensures strategic alignment and meaningful content
   */
  const validateVision = (value: string | undefined): string | true => {
    if (!value || value.trim().length === 0) {
      return 'Vision statement is required for strategic alignment';
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue.length < 20) {
      return 'Vision should be at least 20 characters for meaningful guidance';
    }
    if (trimmedValue.length > 800) {
      return 'Vision should be concise (under 800 characters) for clarity';
    }

    // Quality indicators for vision statements
    const hasActionableLanguage = /\b(deliver|achieve|create|establish|improve|transform|enable|drive|develop|implement)\b/i.test(trimmedValue);
    const hasOutcomeOrientation = /\b(outcome|result|value|benefit|impact|success|excellence)\b/i.test(trimmedValue);
    
    if (!hasActionableLanguage) {
      console.warn('Vision may benefit from more actionable language');
    }
    if (!hasOutcomeOrientation) {
      console.warn('Consider including outcome-oriented language in vision');
    }

    return true;
  };

  /**
   * Team composition analysis for organizational effectiveness
   * Provides insights into team structure and potential risks
   */
  const analyzeTeamComposition = (workstreamIndex: number) => {
    const workstream = watch(`workstreams.${workstreamIndex}`);
    const analysis = {
      insights: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    if (!workstream) return analysis;

    const leadCount = workstream.workstream_leads?.length || 0;
    const memberCount = workstream.team_members?.length || 0;
    const totalTeamSize = leadCount + memberCount;

    // Leadership analysis
    if (leadCount === 0) {
      analysis.warnings.push('No workstream leads assigned - critical for accountability');
    } else if (leadCount === 1) {
      analysis.insights.push('Single lead structure - ensure succession planning');
    } else if (leadCount > 2) {
      analysis.warnings.push('Multiple leads may create coordination challenges');
    }

    // Team size analysis
    if (totalTeamSize === 0) {
      analysis.warnings.push('No team members assigned - workstream may lack execution capacity');
    } else if (totalTeamSize < 3) {
      analysis.insights.push('Small team - suitable for focused initiatives');
    } else if (totalTeamSize > 12) {
      analysis.warnings.push('Large team - consider sub-workstream organization');
    }

    // Leadership ratio analysis
    if (totalTeamSize > 0) {
      const leadershipRatio = leadCount / totalTeamSize;
      if (leadershipRatio > 0.5) {
        analysis.warnings.push('High leadership ratio - may indicate over-management');
      }
    }

    // Overlap detection
    const leadIds = new Set(workstream.workstream_leads || []);
    const memberIds = new Set(workstream.team_members || []);
    const overlap = [...leadIds].filter(id => memberIds.has(id));
    
    if (overlap.length > 0) {
      analysis.warnings.push('Users assigned to both lead and member roles');
    }

    return analysis;
  };

  /**
   * Color validation with accessibility and brand considerations
   * Ensures visual accessibility and organizational consistency
   */
  const validateColor = (value: string): string | true => {
    if (!value) return 'Color selection is required for visual organization';
    
    // Hex color format validation
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexPattern.test(value)) {
      return 'Color must be in valid hex format';
    }

    // Accessibility check - ensure sufficient contrast potential
    const r = parseInt(value.slice(1, 3), 16);
    const g = parseInt(value.slice(3, 5), 16);
    const b = parseInt(value.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    if (luminance > 0.9) {
      console.warn('Very light color may have accessibility issues');
    }
    if (luminance < 0.1) {
      console.warn('Very dark color may have accessibility issues');
    }

    return true;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Users className="w-6 h-6 mr-2 text-indigo-600" />
            {editMode ? 'Edit Workstreams' : 'Create Workstreams'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {editMode 
              ? 'Modify workstream organization, team composition, and strategic focus'
              : 'Define execution-focused teams that deliver program objectives'
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
              onClick={addWorkstream}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Workstream
            </button>
          )}
        </div>
      </div>
      
      {fields.map((field, index) => {
        const teamAnalysis = analyzeTeamComposition(index);
        const hasTeamInsights = teamAnalysis.insights.length > 0 || teamAnalysis.warnings.length > 0;

        return (
          <div key={field.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-3 border border-gray-300"
                  style={{ backgroundColor: watch(`workstreams.${index}.color`) || '#3B82F6' }}
                />
                {editMode ? 'Workstream Details' : `Workstream ${index + 1}`}
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
              {/* Program Selection with Enhanced Error Handling and Strategy-Scoped Filtering */}
              <div>
                <FormLabel label="Program" required />
                {getCurrentStrategyId() && (
                  <div className="mb-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Showing programs for current strategy only
                  </div>
                )}
                {loadingPrograms ? (
                  <div className="mt-1 block w-full p-3 text-gray-500 bg-gray-50 rounded-md animate-pulse">
                    Loading strategy programs...
                  </div>
                ) : errorPrograms ? (
                  <div className="mt-1 block w-full p-3 text-red-600 bg-red-50 rounded-md">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Error loading programs: {errorPrograms}
                  </div>
                ) : !programs || programs.length === 0 ? (
                  <div className="mt-1 block w-full p-3 text-yellow-600 bg-yellow-50 rounded-md">
                    <Info className="w-4 h-4 inline mr-2" />
                    No programs available for the current strategy. Create programs first.
                  </div>
                ) : (
                  <>
                    <select
                      {...register(`workstreams.${index}.program` as const, {
                        required: 'Program selection is required for organizational structure',
                        validate: value => value !== 0 || 'Please select a valid program'
                      })}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                        errors.workstreams?.[index]?.program ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      disabled={editMode}
                    >
                      <option value="">Select a program</option>
                      {programs.map((program: Program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </select>
                    {editMode && (
                      <p className="mt-1 text-xs text-gray-500">
                        Program association is immutable in edit mode for data integrity
                      </p>
                    )}
                    {!editMode && (
                      <p className="mt-1 text-xs text-gray-500">
                        Only programs within the current strategy are shown for focused execution
                      </p>
                    )}
                    {errors.workstreams?.[index]?.program && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.workstreams[index]?.program?.message}
                      </p>
                    )}
                  </>
                )}
              </div>        
              {/* Workstream Name with Advanced Validation */}
              <div>
                <FormLabel label="Name" required />
                <input
                  {...register(`workstreams.${index}.name` as const, {
                    validate: (value) => validateWorkstreamName(value, index)
                  })}
                  type="text"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.workstreams?.[index]?.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Enter descriptive workstream name (e.g., Customer Onboarding Optimization)"
                />
                {errors.workstreams?.[index]?.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.workstreams[index]?.name?.message}
                  </p>
                )}
              </div>
              
              {/* Vision with Quality Assessment */}
              <div>
                <FormLabel label="Vision" required={false} />
                <textarea
                  {...register(`workstreams.${index}.vision` as const, {
                    validate: validateVision
                  })}
                  rows={3}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.workstreams?.[index]?.vision ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Articulate the workstream's purpose, expected outcomes, and success criteria..."
                />
                {errors.workstreams?.[index]?.vision && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.workstreams[index]?.vision?.message}
                  </p>
                )}
              </div>
              
              {/* Time Horizon with Strategic Validation */}
              <div>
                <FormLabel label="Time Horizon" required />
                <input
                  {...register(`workstreams.${index}.time_horizon` as const, {
                    validate: validateTimeHorizon
                  })}
                  type="date"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${
                    errors.workstreams?.[index]?.time_horizon ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.workstreams?.[index]?.time_horizon && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.workstreams[index]?.time_horizon?.message}
                  </p>
                )}
              </div>
              
              {/* Color Selection with Accessibility Considerations */}
              <div>
                <FormLabel label="Workstream Color" required />
                <Controller
                  name={`workstreams.${index}.color` as const}
                  control={control}
                  defaultValue="#3B82F6"
                  rules={{ validate: validateColor }}
                  render={({ field }) => (
                    <div className="mt-1">
                      <div className="flex items-center gap-4 mb-3">
                        <Palette className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Select a color for visual identification and organizational clarity
                        </span>
                      </div>
                      <SketchPicker 
                        color={field.value} 
                        onChangeComplete={(color) => field.onChange(color.hex)}
                        presetColors={STRATEGIC_COLOR_PALETTE}
                      />
                      {errors.workstreams?.[index]?.color && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.workstreams[index]?.color?.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>
              
              {/* Team Assignment with Composition Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <MultiSelect
                    label="Workstream Leads"
                    options={userOptions}
                    value={watch(`workstreams.${index}.workstream_leads`) || []}
                    onChange={(newValue) => setValue(`workstreams.${index}.workstream_leads`, newValue)}
                    isLoading={loadingUsers}
                    error={errorUsers}
                    placeholder="Assign workstream leadership..."
                    allowCustomInput={true} // NEW
                    customInputPlaceholder="Add workstream lead by name..." // NEW
                  />
                </div>
                <div>
                  <MultiSelect
                    label="Team Members"
                    options={userOptions}
                    value={watch(`workstreams.${index}.team_members`) || []}
                    onChange={(newValue) => setValue(`workstreams.${index}.team_members`, newValue)}
                    isLoading={loadingUsers}
                    error={errorUsers}
                    placeholder="Assign team members..."
                    allowCustomInput={true} // NEW
                    customInputPlaceholder="Add team member by name..." // NEW
                  />
                </div>
              </div>

              {/* Team Composition Analysis */}
              {hasTeamInsights && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-2">Team Composition Analysis:</p>
                      {teamAnalysis.insights.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-blue-800 font-medium">Insights:</p>
                          <ul className="text-xs text-blue-700 list-disc list-inside">
                            {teamAnalysis.insights.map((insight, i) => (
                              <li key={i}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {teamAnalysis.warnings.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-800 font-medium">Considerations:</p>
                          <ul className="text-xs text-blue-700 list-disc list-inside">
                            {teamAnalysis.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Strategic Targets with Input Processing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Improvement Targets (comma separated)
                  </label>
                  <input
                    {...register(`workstreams.${index}.improvement_targets` as const)}
                    type="text"
                    placeholder="e.g., Efficiency +20%, Cost Reduction 15%, Quality Score 95%"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Define measurable improvement objectives for this workstream
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Organizational Goals (comma separated)
                  </label>
                  <input
                    {...register(`workstreams.${index}.organizational_goals` as const)}
                    type="text"
                    placeholder="e.g., Culture Enhancement, Process Optimization, Capability Building"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Specify organizational development goals supported by this workstream
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Technical Excellence Framework for Creation Mode */}
      {!editMode && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-indigo-900 mb-3">Workstream Creation Excellence Framework:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-indigo-800">
                <div>
                  <p className="font-medium mb-2">Structural Design:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Clear scope definition</li>
                    <li>• Logical team composition</li>
                    <li>• Realistic time horizons</li>
                    <li>• Visual organization</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Team Dynamics:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Balanced leadership ratios</li>
                    <li>• Complementary skills</li>
                    <li>• Clear accountability</li>
                    <li>• Succession planning</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Strategic Alignment:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Program integration</li>
                    <li>• Measurable targets</li>
                    <li>• Organizational goals</li>
                    <li>• Resource optimization</li>
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

export default WorkstreamForm;