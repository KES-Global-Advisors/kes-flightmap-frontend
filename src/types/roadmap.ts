/* ------------------------------------------------------------------
   1) Type Definitions
   ------------------------------------------------------------------ */
export interface Activity {
  id: number;
  name: string;
  status: string;
  target_start_date: string;
  target_end_date: string;
  is_overdue: boolean;
}

export interface Milestone {
  id: number;
  name: string;
  deadline: string;
  activities: Activity[];
  timeframe_category: string;
}

export interface Workstream {
  id: number;
  name: string;
  milestones: Milestone[];
  activities: Activity[];
}

export interface Program {
  id: number;
  name: string;
  workstreams: Workstream[];
}

export interface Strategy {
  id: number;
  name: string;
  programs: Program[];
}

export interface RoadmapData {
  id: number;
  name: string;
  strategies: Strategy[];
  description: string;
  milestone_summary: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
  };
}