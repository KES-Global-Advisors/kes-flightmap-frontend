/* ------------------------------------------------------------------
   1) Type Definitions
   ------------------------------------------------------------------ */
 export interface Activity {
    id: number;
    name: string;
    status: 'not_started' | 'in_progress' | 'completed';
    target_start_date: string;
    target_end_date: string;
  }
  
export interface Milestone {
    id: number;
    name: string;
    deadline: string;
    status: 'not_started' | 'in_progress' | 'completed';
    activities: Activity[];
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
    description?: string;
    strategies: Strategy[];
  }