  export type User = {
    id: number;
    username: string;
  };
  
  export type Roadmap = {
    id: number;
    name: string;
    description?: string;
    owner: number; // Reference to User
    created_at: string;
    updated_at: string;
  };
  
  export type Strategy = {
    id: number;
    roadmap: number; // Reference to Roadmap
    name: string;
    tagline?: string;
    vision: string;
    time_horizon: string; // Date string
    executive_sponsors: number[]; // Array of User IDs
    strategy_leads: number[]; // Array of User IDs
    communication_leads: number[]; // Array of User IDs
  };
  
  export type StrategicGoal = {
    id: number;
    strategy: number; // Reference to Strategy
    category: 'business' | 'organizational';
    goal_text: string;
  };
  
  export type Program = {
    id: number;
    strategy: number; // Reference to Strategy
    name: string;
    vision?: string;
    time_horizon: string; // Date string
    executive_sponsors: number[]; // Array of User IDs
    program_leads: number[]; // Array of User IDs
    workforce_sponsors: number[]; // Array of User IDs
    key_improvement_targets: number[]; // Array of StrategicGoal IDs
    key_organizational_goals: number[]; // Array of StrategicGoal IDs
  };
  
  export type Workstream = {
    id: number;
    program: number; // Reference to Program
    name: string;
    vision?: string;
    time_horizon: string; // Date string
    workstream_leads: number[]; // Array of User IDs
    team_members: number[]; // Array of User IDs
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
    workstream: number; // Reference to Workstream
    milestone?: number; // Optional reference to Milestone
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
  };
  
  // Additional helper types for form handling
//   type RoadmapFormData = Omit<Roadmap, 'id' | 'created_at' | 'updated_at'>;
//   type StrategyFormData = Omit<Strategy, 'id'>;
//   type StrategicGoalFormData = Omit<StrategicGoal, 'id'>;
//   type ProgramFormData = Omit<Program, 'id'>;
//   type WorkstreamFormData = Omit<Workstream, 'id'>;
//   type MilestoneFormData = Omit<Milestone, 'id'>;
//   type ActivityFormData = Omit<Activity, 'id'>;
  
//   // Response types for API calls
//   type ApiResponse<T> = {
//     data: T;
//     message?: string;
//     error?: string;
//   };
  
//   // Generic type for paginated responses
//   type PaginatedResponse<T> = {
//     count: number;
//     next: string | null;
//     previous: string | null;
//     results: T[];
//   };