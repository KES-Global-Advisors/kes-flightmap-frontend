/* ------------------------------------------------------------------
   1) Type Definitions
   ------------------------------------------------------------------ */
   export interface Contributor {
    id: number;
    username?: string;
    activity?: number;
    user?: number;
    milestone?: number;
  }
   export interface Activity {
    id: number;
    name: string;
    status: 'not_started' | 'in_progress' | 'completed';
    priority: number;
    target_start_date: string;
    target_end_date: string;
    completed_date: string | null;
    delay_days: number;
    is_overdue: boolean;
    contributors: Contributor[];
    milestone: number;
    workstream: number;
    supported_milestones: number[];
    additional_milestones: number[];
    actual_duration: number | null | undefined;
  }
  
  export interface Milestone {
    id: number;
    name: string;
    description: string;
    status: string;
    deadline: string;
    completed_date: string | null;
    timeframe_category: string;
    current_progress: number;
    activities: Activity[];
    contributors: Contributor[];
    dependentMilestones?: Milestone[];
  }
  
  export interface Workstream {
    id: number;
    name: string;
    vision: string;
    time_horizon: string;
    milestones: Milestone[];
    activities: Activity[];
    color: string;
    contributors: {
      id: number;
      username: string;
    }[];
    progress_summary: {
      total_milestones: number;
      completed_milestones: number;
      in_progress_milestones: number;
    };
  }
  
  export interface Program {
    id: number;
    name: string;
    vision: string;
    time_horizon: string;
    workstreams: Workstream[];
    progress: {
      percentage: number;
      total: number;
      completed: number;
    };
  }
  
  export interface Strategy {
    id: number;
    name: string;
    tagline: string;
    vision: string;
    time_horizon: string;
    programs: Program[];
    goal_summary: {
      business_goals: number;
      organizational_goals: number;
    };
  }

export interface RoadmapData {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  strategies: Strategy[];
  milestone_summary: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
  };
}
