// Dashboard page
import { useContext } from 'react';
import {
  EmployeeContribution,
  StrategicAlignment,
  TimelineEvent,
  FullDashboardResponse,
  TrendData,
  RiskMetric,
  WorkloadDistribution,
} from '@/types/dashboard';
import SummaryCard from '@/components/Dashboard/SummaryCard';
import Timeline from '@/components/Dashboard/Timeline';
import PerformanceChart from '@/components/Dashboard/PerformanceChart';
import DashboardFilters from '@/components/Dashboard/DashboardFilters';
import TrendChart from '@/components/Dashboard/TrendChart';
import RiskAssessment from '@/components/Dashboard/RiskAssessment';
import ResourceAllocation from '@/components/Dashboard/ResourceAllocation';
import { ThemeContext } from '@/contexts/ThemeContext'; // Adjust the path as needed
import useFetch from '@/hooks/UseFetch'; 

const Dashboard = () => {
    // Use the theme from the ThemeContext
    const { themeColor } = useContext(ThemeContext);
  // Fetch core dashboard data
  const { 
    data: dashboardData, 
    loading: summaryLoading, 
    error: summaryError 
  } = useFetch<FullDashboardResponse>('http://127.0.0.1:8000/dashboard/');

  const { 
    data: contributions, 
    loading: contributionsLoading, 
    error: contributionsError 
  } = useFetch<EmployeeContribution[]>('http://127.0.0.1:8000/contributions/');

  const { 
    data: alignment, 
    loading: alignmentLoading, 
    error: alignmentError 
  } = useFetch<StrategicAlignment>('http://127.0.0.1:8000/strategic-alignment/');

  const { 
    data: timelineEvents, 
    loading: timelineLoading, 
    error: timelineError 
  } = useFetch<TimelineEvent[]>('http://127.0.0.1:8000/roadmaps/1/timeline/');

  // Fetch additional dashboard data
  const { 
    data: trendData, 
    loading: trendLoading, 
    error: trendError 
  } = useFetch<TrendData[]>('http://127.0.0.1:8000/dashboard/trends/');

  const { 
    data: risks, 
    loading: risksLoading, 
    error: risksError 
  } = useFetch<RiskMetric[]>('http://127.0.0.1:8000/dashboard/risks/');

  const { 
    data: workloads, 
    loading: workloadsLoading, 
    error: workloadsError 
  } = useFetch<WorkloadDistribution[]>('http://127.0.0.1:8000/dashboard/workloads/');

  // Handle loading state: if any endpoint is still loading
  if (
    summaryLoading || 
    contributionsLoading || 
    alignmentLoading || 
    timelineLoading || 
    trendLoading || 
    risksLoading || 
    workloadsLoading
  ) {
    return(
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: themeColor }}></div>
      </div>
    );
  }

  // Handle errors from any endpoint
  if (
    summaryError || 
    contributionsError || 
    alignmentError || 
    timelineError || 
    trendError || 
    risksError || 
    workloadsError
  ) {
    return (
      <div className="text-red-600 p-4">
        Error loading dashboard data. Please try again later.
      </div>
    );
  }

  // Handle case where data hasn't been loaded yet
  if (
    !dashboardData || 
    !contributions || 
    !alignment || 
    !timelineEvents || 
    !trendData || 
    !risks || 
    !workloads
  ) {
    return <div>No data available</div>;
  }

  // Unwrap dashboard summary:
  const summary = dashboardData.summary;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Advanced Filtering Section */}
      <div className="mb-8">
        <DashboardFilters onFilterChange={(filters) => console.log('Filters applied:', filters)} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard 
          title="Total Milestones" 
          value={summary.total} 
          color="text-blue-600" 
        />
        <SummaryCard 
          title="Completed" 
          value={summary.completed} 
          total={summary.total} 
          color="text-green-600" 
        />
        <SummaryCard 
          title="Next 30 Days" 
          value={summary.upcoming.next_30_days} 
          color="text-yellow-600" 
        />
        <SummaryCard 
          title="Next 90 Days" 
          value={summary.upcoming.next_90_days} 
          color="text-orange-600" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column: Project Timeline and Trend Analysis */}
        <div className="space-y-8">
          {/* Timeline Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Project Timeline</h2>
            <Timeline events={timelineEvents} />
          </div>

          {/* Trend Analysis Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Progress Trends</h2>
            <TrendChart data={trendData} />
          </div>

          {/* Team Performance Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Team Performance</h2>
            <PerformanceChart data={contributions} />
          </div>
        </div>


        {/* Right Column: Team Performance, Strategic Alignment, Risk, and Resource Allocation */}
        <div className="space-y-8">
          {/* Risk Assessment Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Risk Assessment</h2>
            <RiskAssessment risks={risks} />
          </div>

          {/* Strategic Alignment Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Strategic Alignment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alignment.goals.map(goal => (
                <div key={goal.id} className="border p-4 rounded">
                  <h3 className="font-semibold">{goal.text}</h3>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 rounded-full h-2"
                        style={{ width: `${(goal.completed_milestones / goal.total_milestones) * 100}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {goal.completed_milestones} / {goal.total_milestones} milestones
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

            {/* Resource Allocation Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Resource Allocation</h2>
              <ResourceAllocation workloads={workloads} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
