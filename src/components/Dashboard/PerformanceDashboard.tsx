// PerformanceDashboard.tsx
import React from 'react';
import { PerformanceMetrics } from '@/types/dashboard';

interface PerformanceDashboardProps {
  data: PerformanceMetrics | null;
  loading: boolean;
  error: any;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4"></div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-600 p-4">Error loading performance metrics.</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Avg Completion Time (Activities)</h3>
          <p>{data.average_completion_time_activities}</p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Avg Completion Time (Milestones)</h3>
          <p>{data.average_completion_time_milestones}</p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Overdue Tasks</h3>
          <p>{data.overdue_tasks}</p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Completed Tasks</h3>
          <p>{data.completed_tasks}</p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Failing Tasks (%)</h3>
          <p>{data.failing_tasks_percentage.toFixed(2)}%</p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">On-Time Completion (%)</h3>
          <p>{data.on_time_percentage.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;