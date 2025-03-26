import { Roadmap, Activity } from './Types';

// Data utility functions for the Gantt chart

/**
 * Calculate the date range for a parent item based on its children's dates
 * This is useful for strategies, programs, workstreams, and milestones
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
 * Get all activities from the entire hierarchy
 */
export const getAllActivities = (roadmap: Roadmap): Activity[] => {
  const activities: Activity[] = [];
  
  roadmap.strategies.forEach(strategy => {
    strategy.programs.forEach(program => {
      program.workstreams.forEach(workstream => {
        activities.push(...workstream.activities);
      });
    });
  });
  
  return activities;
};

/**
 * Find an activity by ID across the entire hierarchy
 */
export const findActivityById = (roadmap: Roadmap, activityId: number): Activity | null => {
  const allActivities = getAllActivities(roadmap);
  return allActivities.find(a => a.id === activityId) || null;
};