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
  }
  
  export interface Workstream {
    id: number;
    name: string;
    vision: string;
    time_horizon: string;
    milestones: Milestone[];
    activities: Activity[];
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
  
// export interface Activity {
//   id: number;
//   name: string;
//   status: string;
//   target_start_date: string;
//   target_end_date: string;
//   is_overdue: boolean;
// }

// export interface Milestone {
//   id: number;
//   name: string;
//   deadline: string;
//   activities: Activity[];
//   timeframe_category: string;
// }

// export interface Workstream {
//   id: number;
//   name: string;
//   milestones: Milestone[];
//   activities: Activity[];
// }

// export interface Program {
//   id: number;
//   name: string;
//   workstreams: Workstream[];
// }

// export interface Strategy {
//   id: number;
//   name: string;
//   programs: Program[];
// }

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

// interface RoadmapData {
//   id: number;
//   name: string;
//   description: string;
//   created_at: string;
//   updated_at: string;
//   strategies: Strategy[];
//   milestone_summary: {
//     total: number;
//     completed: number;
//     in_progress: number;
//     overdue: number;
//   };
// }