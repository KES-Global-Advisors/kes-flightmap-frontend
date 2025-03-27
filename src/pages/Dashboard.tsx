import { useContext } from 'react';
import {
  EmployeeContribution,
  StrategicAlignment,
  FullDashboardResponse,
  TrendData,
  RiskMetric,
  WorkloadDistribution,
  PerformanceMetrics,
} from '@/types/dashboard';
import SummaryCard from '@/components/Dashboard/SummaryCard';
import TrendChart from '@/components/Dashboard/TrendChart';
import RiskAssessment from '@/components/Dashboard/RiskAssessment';
import ResourceAllocation from '@/components/Dashboard/ResourceAllocation';
import PerformanceDashboard from '@/components/Dashboard/PerformanceDashboard';
import { ThemeContext } from '@/contexts/ThemeContext';
import useFetch from '@/hooks/UseFetch';

const Dashboard = () => {
  const { themeColor } = useContext(ThemeContext);
  const API = process.env.REACT_APP_API_BASE_URL;

  // Fetch core dashboard data with optional refetch methods (if provided by your hook)
  const { 
    data: dashboardData, 
    loading: summaryLoading, 
    error: summaryError,
  } = useFetch<FullDashboardResponse>(`${API}/dashboard/`);

  const { 
    data: contributions, 
    loading: contributionsLoading, 
    error: contributionsError,
  } = useFetch<EmployeeContribution[]>(`${API}/contributions/`);

  const { 
    data: alignment, 
    loading: alignmentLoading, 
    error: alignmentError,
  } = useFetch<StrategicAlignment>(`${API}/strategic-alignment/`);

  const { 
    data: trendData, 
    loading: trendLoading, 
    error: trendError,
  } = useFetch<TrendData[]>(`${API}/dashboard/trends/`);

  const { 
    data: risks, 
    loading: risksLoading, 
    error: risksError,
  } = useFetch<RiskMetric[]>(`${API}/dashboard/risks/`);

  const { 
    data: workloads, 
    loading: workloadsLoading, 
    error: workloadsError,
  } = useFetch<WorkloadDistribution[]>(`${API}/dashboard/workloads/`);

  const { 
    data: performanceMetrics, 
    loading: performanceLoading, 
    error: performanceError,
  } = useFetch<PerformanceMetrics>(`${API}/dashboard/performance/`);

  // Aggregate loading states
  const isLoading = summaryLoading || contributionsLoading || alignmentLoading
                   || trendLoading || risksLoading || workloadsLoading || performanceLoading;

  // Aggregate error states (treat timeline 404 as non-critical)
  const errorOccurred = summaryError || contributionsError || alignmentError ||
                        trendError || risksError || workloadsError || performanceError;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div 
          className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4"
          style={{ borderColor: themeColor }}
        ></div>
      </div>
    );
  }

  if (errorOccurred) {
    return (
      <div className="text-red-600 p-4">
        Error loading dashboard data. Please try again later.
      </div>
    );
  }

  if (!dashboardData || !contributions || !alignment || !trendData || !risks || !workloads) {
    return <div>No data available</div>;
  }

  const summary = dashboardData.summary;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
        {/* Left Column */}
        <div className="space-y-8">
          {/* Progress Trends */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Progress Trends</h2>
            <TrendChart data={trendData} />
          </div>
          
          {/* Performance Dashboard */}
          <PerformanceDashboard 
            data={performanceMetrics} 
            loading={performanceLoading} 
            error={performanceError} 
          />
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Risk Assessment */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Risk Assessment</h2>
            <RiskAssessment risks={risks} />
          </div>

          {/* Resource Allocation */}
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