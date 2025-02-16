export interface DashboardSummary {
  total: number;
  completed: number;
  in_progress: number;
  upcoming: {
    next_30_days: number;
    next_90_days: number;
  };
}

export interface EmployeeContribution {
  id: number;
  username: string;
  milestones: {
    completed: number;
    in_progress: number;
  };
  activities: {
    completed: number;
    in_progress: number;
  };
}

export interface StrategicAlignment {
  goals: {
    id: number;
    text: string;
    category: string;
    total_milestones: number;
    completed_milestones: number;
  }[];
}

export interface TimelineEvent {
  type: 'milestone' | 'activity';
  id: number;
  name: string;
  date: string;
  status: string;
  progress?: number;
  milestone?: number;
}

export interface FullDashboardResponse {
    summary: DashboardSummary;
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
  