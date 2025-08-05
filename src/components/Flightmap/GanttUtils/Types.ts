// Gantt chart data types - Updated for Strategy Framework

export interface Activity {
  id: number;
  name: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'overdue';
  target_start_date: string;
  target_end_date: string;
  completed_date: string | null;
  is_overdue: boolean;
  source_milestone: number;
  target_milestone: number;
  supported_milestones: number[];
  additional_milestones: number[];
  priority: 1 | 2 | 3; // 1: High, 2: Medium, 3: Low
  prerequisite_activities?: number[];
  parallel_activities?: number[];
  successive_activities?: number[];
  impacted_employee_groups?: string[];
  change_leaders?: string[];
  development_support?: string[];
  external_resources?: string[];
  corporate_resources?: string[];
  workstream?: number; // Optional reference to workstream
  milestone?: number; // Optional reference to milestone
}

export interface Milestone {
  id: number;
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'overdue';
  deadline: string;
  completed_date: string | null;
  activities: Activity[];
  workstream: number;
  strategic_goals?: number[];
  current_progress?: number;
  timeframe_category?: string;
  parent_milestone?: number | null;
  dependencies?: number[];
}

export interface Workstream {
  id: number;
  name: string;
  vision: string;
  time_horizon: string;
  milestones: Milestone[];
  activities: Activity[];
  program: number;
  color?: string;
  workstream_leads?: (string | number)[];
  team_members?: (string | number)[];
  improvement_targets?: string[];
  organizational_goals?: string[];
  progress_summary?: {
    total_milestones: number;
    completed_milestones: number;
    in_progress_milestones: number;
  };
  contributors?: {
    id: number;
    username: string;
  }[];
}

export interface Program {
  id: number;
  name: string;
  vision: string;
  time_horizon: string;
  workstreams: Workstream[];
  strategy: number;
  executive_sponsors?: (string | number)[];
  program_leads?: (string | number)[];
  workforce_sponsors?: (string | number)[];
  key_improvement_targets?: number[];
  key_organizational_goals?: number[];
  progress?: {
    percentage: number;
    total: number;
    completed: number;
  };
  strategicObjectives?: {
    business?: string[];
    organizational?: string[];
  };
}

export interface StrategicGoal {
  id: number;
  strategy: number;
  category: 'business' | 'organizational';
  goal_text: string;
}

export interface Strategy {
  id: number;
  name: string;
  tagline?: string;
  vision: string;
  time_horizon: string;
  programs: Program[];
  
  // Administrative fields
  description?: string;
  owner: number;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  draft_id?: number | null;
  completed_at?: string | null;
  
  // Governance
  executive_sponsors?: (string | number)[];
  strategy_leads?: (string | number)[];
  communication_leads?: (string | number)[];
  
  // Strategic goals
  goals?: StrategicGoal[];
}

// User type for reference
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}