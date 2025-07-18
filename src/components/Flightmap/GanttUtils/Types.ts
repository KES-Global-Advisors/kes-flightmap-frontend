// Gantt chart data types
export interface Activity {
  id: number;
  name: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'overdue';
  target_start_date: string;
  target_end_date: string;
  completed_date: string | null;
  is_overdue: boolean;
  milestone: number;
  workstream: number;
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
}

export interface Workstream {
  id: number;
  name: string;
  vision: string;
  time_horizon: string;
  milestones: Milestone[];
  activities: Activity[];
  program: number;
}

export interface Program {
  id: number;
  name: string;
  vision: string;
  time_horizon: string;
  workstreams: Workstream[];
  strategy: number;
}

export interface Strategy {
  id: number;
  name: string;
  vision: string;
  time_horizon: string;
  programs: Program[];
}

export interface Roadmap {
  id: number;
  name: string;
  description: string;
  strategies: Strategy[];
}
