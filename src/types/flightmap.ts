// cSpell:ignore workstream workstreams roadmaps Gantt hoverable strat flightmap

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
  source_milestone: number;
  target_milestone: number;
  supported_milestones: number[];
  additional_milestones: number[];
  actual_duration: number | null | undefined;
  // Additional optional fields from Model.ts:
  prerequisite_activities?: number[];
  parallel_activities?: number[];
  successive_activities?: number[];
  impacted_employee_groups?: string[];
  change_leaders?: string[];
  development_support?: string[];
  external_resources?: string[];
  corporate_resources?: string[];
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
  parent_milestone?: number | null;
  dependencies?: number[]; 
  workstream?: number;
  strategic_goals?: number[];
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
  // Additional optional fields from Model.ts:
  program?: number;
  workstream_leads?: number[];
  team_members?: number[];
  improvement_targets?: string[];
  organizational_goals?: string[];
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
  // Additional optional fields from Model.ts:
  strategy?: number;
  executive_sponsors?: number[];
  program_leads?: number[];
  workforce_sponsors?: number[];
  key_improvement_targets?: number[];
  key_organizational_goals?: number[];
  strategicObjectives?: {
    business?: string[];
    organizational?: string[];
  };
}

export interface Strategy {
  id: number;
  name: string;
  tagline: string;
  vision: string;
  time_horizon: string;
  
  // Merged Flightmap fields
  description?: string;
  owner: number;
  created_at: string;
  updated_at: string;
  
  // Draft-related fields
  is_draft: boolean;
  draft_id?: number | null;
  completed_at?: string | null;
  
  // Draft badge info from backend
  draft_badge?: {
    show: boolean;
    text: string;
    color: string;
  };
  
  // Relationships
  programs: Program[];
  goal_summary: {
    business_goals: string[];
    organizational_goals: string[];
  };
  milestone_summary?: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
  };
  
  // Governance fields
  executive_sponsors?: number[];
  strategy_leads?: number[];
  communication_leads?: number[];
}

export type StrategicGoal = {
  id: number;
  strategy: number; // Reference to Strategy
  category: 'business' | 'organizational';
  goal_text: string;
};


