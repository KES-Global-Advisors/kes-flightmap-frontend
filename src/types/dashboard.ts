export interface PerformanceMetrics { 
  average_completion_time_activities: string; 
  average_completion_time_milestones: string; 
  overdue_tasks: number; 
  completed_tasks: number; 
  failing_tasks_percentage: number; 
  on_time_percentage: number; 
}
  
export interface DashboardSummary {
  total: number;
  completed: number;
  in_progress: number;
  // Added an overdue count to quickly identify late milestones
  overdue: number;
  upcoming: {
    next_30_days: number;
    next_90_days: number;
  };
}

export interface EmployeeContribution {
  id: number;
  username: string;
  // Optional total contributions field for overall ranking/metrics
  total_contributions?: number;
  milestones: {
    completed: number;
    in_progress: number;
  };
  activities: {
    completed: number;
    in_progress: number;
  };
}

export interface StrategicGoalAlignment {
  id: number;
  text: string;
  category: string;
  total_milestones: number;
  completed_milestones: number;
  // Computed percentage based on completed/total milestones
  completion_percentage: number;
}

export interface StrategicAlignment {
  goals: StrategicGoalAlignment[];
}

export interface TimelineEvent {
  type: 'milestone' | 'activity';
  id: number;
  name: string;
  date: string;
  status: string;
  // For milestones, the current progress (as a percentage)
  progress?: number;
  // For activities, reference the related milestone if applicable
  milestone?: number;
  // Additional optional details for enhanced timeline context
  description?: string;
  // Example: color for milestones (if returned from backend)
  color?: string;
  // Example: priority for activities
  priority?: number;
}

export interface FullDashboardResponse {
  summary: DashboardSummary;
  employee_contributions: EmployeeContribution[];
  strategic_alignment: StrategicAlignment;
  // Optionally include timeline events if aggregated on a single call
  timeline?: TimelineEvent[];
  // Optional trend data for activity trends over time
  trend_data?: TrendData[];
  // Optional risk metrics for milestones
  risk_metrics?: RiskMetric[];
  // Optional workload distributions per team member
  workload_distribution?: WorkloadDistribution[];
  // Timestamp indicating when the dashboard was last updated
  last_updated?: string;
}

export interface TrendData {
  date: string;
  completed: number;
  in_progress: number;
}

export interface RiskMetric {
  milestone_id: number;
  name: string;
  risk_level: 'high' | 'medium' | 'low';
  factors: string[];
  delay_probability: number;
}

export interface WorkloadDistribution {
  user: string;
  current_tasks: number;
  upcoming_tasks: number;
  overdue_tasks: number;
}
