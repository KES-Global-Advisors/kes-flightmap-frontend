// cSpell:ignore workstream workstreams roadmaps Gantt hoverable strat
  export type User = {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
  };
  
  export type Strategy = {
    id: number;
    name: string;
    tagline?: string;
    vision: string;
    time_horizon: string; // Date string
    
    // Merged Flightmap fields
    description?: string;
    owner: number; // Reference to User
    created_at: string;
    updated_at: string;
    is_draft: boolean;
    draft_id?: number | null;
    completed_at?: string | null;
    
    // Governance
    executive_sponsors: (string | number)[];
    strategy_leads: (string | number)[];
    communication_leads: (string | number)[];
  };
  
  export type StrategicGoal = {
    id: number;
    strategy: {
      id: number;
      name: string;
    } | number;  // Union type to handle both cases // Reference to Strategy
    category: 'business' | 'organizational';
    goal_text: string;
  };
  
  export type Program = {
    id: number;
    strategy: number; // Reference to Strategy
    name: string;
    vision?: string;
    time_horizon: string; // Date string
    executive_sponsors: (string | number)[];
    program_leads: (string | number)[];
    workforce_sponsors: (string | number)[];
    key_improvement_targets: number[]; // Array of StrategicGoal IDs
    key_organizational_goals: number[]; // Array of StrategicGoal IDs
  };
  
  export type Workstream = {
    id: number;
    program: number | Program; // Reference to Program
    name: string;
    vision?: string;
    time_horizon: string; // Date string
    workstream_leads: (string | number)[];
    team_members: (string | number)[];
    improvement_targets: string[]; // JSON field
    organizational_goals: string[]; // JSON field
  };
  
  export type Milestone = {
    id: number;
    workstream: number; // Reference to Workstream
    name: string;
    description?: string;
    deadline: string; // Date string
    status: 'not_started' | 'in_progress' | 'completed';
    strategic_goals: number[]; // Array of StrategicGoal IDs
  };
  
  export type Activity = {
    id: number;
    source_milestone: number; // NEW: Required source milestone
    target_milestone: number; // NEW: Required target milestones
    name: string;
    status: 'not_started' | 'in_progress' | 'completed';
    priority: 1 | 2 | 3; // 1: High, 2: Medium, 3: Low
    target_start_date: string; // Date string
    target_end_date: string; // Date string
    prerequisite_activities: number[]; // Array of Activity IDs
    parallel_activities: number[]; // Array of Activity IDs
    successive_activities: number[]; // Array of Activity IDs
    impacted_employee_groups: string[]; // JSON field
    change_leaders: string[]; // JSON field
    development_support: string[]; // JSON field
    external_resources: string[]; // JSON field
    corporate_resources: string[]; // JSON field
    supported_milestones: number[];
    additional_milestones: number[];
  };
  