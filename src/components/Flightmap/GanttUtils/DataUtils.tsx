/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy, Activity } from './Types';

// Data utility functions for the Gantt chart

/**
 * Calculate the date range for a parent item based on its children's dates
 * This is useful for programs, workstreams, and milestones
 */
export const calculateDateRange = (activities: Activity[]): { startDate: Date | null, endDate: Date | null } => {
  if (!activities || activities.length === 0) {
    return { startDate: null, endDate: null };
  }
  
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  activities.forEach(activity => {
    const start = new Date(activity.target_start_date);
    const end = new Date(activity.target_end_date);
    
    if (!startDate || start < startDate) {
      startDate = start;
    }
    
    if (!endDate || end > endDate) {
      endDate = end;
    }
  });
  
  return { startDate, endDate };
};

/**
 * Calculate overall status for a parent item based on its children's statuses
 */
export const calculateOverallStatus = (activities: Activity[]): string => {
  if (!activities || activities.length === 0) {
    return 'not_started';
  }
  
  const statuses = activities.map(a => a.status);
  
  if (statuses.every(s => s === 'completed')) {
    return 'completed';
  }
  
  if (statuses.some(s => s === 'overdue')) {
    return 'overdue';
  }
  
  if (statuses.some(s => s === 'in_progress')) {
    return 'in_progress';
  }
  
  return 'not_started';
};

/**
 * Get all activities from the entire strategy hierarchy
 */
export const getAllActivities = (strategy: Strategy): Activity[] => {
  const activities: Activity[] = [];
  
  strategy.programs.forEach(program => {
    program.workstreams.forEach(workstream => {
      activities.push(...workstream.activities);
    });
  });
  
  return activities;
};

/**
 * Find an activity by ID across the entire strategy hierarchy
 */
export const findActivityById = (strategy: Strategy, activityId: number): Activity | null => {
  const allActivities = getAllActivities(strategy);
  return allActivities.find(a => a.id === activityId) || null;
};

/**
 * Get all milestones from the entire strategy hierarchy
 */
export const getAllMilestones = (strategy: Strategy): any[] => {
  const milestones: any[] = [];
  
  strategy.programs.forEach(program => {
    program.workstreams.forEach(workstream => {
      milestones.push(...workstream.milestones);
    });
  });
  
  return milestones;
};

/**
 * Get all workstreams from the entire strategy hierarchy
 */
export const getAllWorkstreams = (strategy: Strategy): any[] => {
  const workstreams: any[] = [];
  
  strategy.programs.forEach(program => {
    workstreams.push(...program.workstreams);
  });
  
  return workstreams;
};

/**
 * Get all programs from the strategy
 */
export const getAllPrograms = (strategy: Strategy): any[] => {
  return strategy.programs || [];
};

/**
 * Find a program by ID within the strategy
 */
export const findProgramById = (strategy: Strategy, programId: number): any | null => {
  return strategy.programs.find(p => p.id === programId) || null;
};

/**
 * Find a workstream by ID across the entire strategy hierarchy
 */
export const findWorkstreamById = (strategy: Strategy, workstreamId: number): any | null => {
  const allWorkstreams = getAllWorkstreams(strategy);
  return allWorkstreams.find(w => w.id === workstreamId) || null;
};

/**
 * Find a milestone by ID across the entire strategy hierarchy
 */
export const findMilestoneById = (strategy: Strategy, milestoneId: number): any | null => {
  const allMilestones = getAllMilestones(strategy);
  return allMilestones.find(m => m.id === milestoneId) || null;
};

/**
 * Get activities for a specific workstream
 */
export const getActivitiesForWorkstream = (strategy: Strategy, workstreamId: number): Activity[] => {
  const workstream = findWorkstreamById(strategy, workstreamId);
  return workstream?.activities || [];
};

/**
 * Get milestones for a specific workstream
 */
export const getMilestonesForWorkstream = (strategy: Strategy, workstreamId: number): any[] => {
  const workstream = findWorkstreamById(strategy, workstreamId);
  return workstream?.milestones || [];
};

/**
 * Get workstreams for a specific program
 */
export const getWorkstreamsForProgram = (strategy: Strategy, programId: number): any[] => {
  const program = findProgramById(strategy, programId);
  return program?.workstreams || [];
};

/**
 * Calculate progress statistics for the entire strategy
 */
export const calculateStrategyProgress = (strategy: Strategy): {
  totalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  notStartedActivities: number;
  overdueActivities: number;
  progressPercentage: number;
} => {
  const allActivities = getAllActivities(strategy);
  
  const totalActivities = allActivities.length;
  const completedActivities = allActivities.filter(a => a.status === 'completed').length;
  const inProgressActivities = allActivities.filter(a => a.status === 'in_progress').length;
  const notStartedActivities = allActivities.filter(a => a.status === 'not_started').length;
  const overdueActivities = allActivities.filter(a => a.is_overdue).length;
  
  const progressPercentage = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
  
  return {
    totalActivities,
    completedActivities,
    inProgressActivities,
    notStartedActivities,
    overdueActivities,
    progressPercentage: Math.round(progressPercentage)
  };
};