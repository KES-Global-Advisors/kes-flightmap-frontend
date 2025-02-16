// Filters Component
import { useState } from 'react';

const DashboardFilters = ({ 
    onFilterChange 
  }: { 
    onFilterChange: (filters: unknown) => void 
  }) => {
    const [timeRange, setTimeRange] = useState('30');
    const [statusFilter, setStatusFilter] = useState('all');
  
    const handleFilterChange = (type: string, value: string) => {
      if (type === 'timeRange') setTimeRange(value);
      if (type === 'status') setStatusFilter(value);
      
      onFilterChange({
        timeRange,
        statusFilter,
      });
    };
  
    return (
      <div className="flex space-x-4 mb-6">
        <select 
          className="form-select rounded-md border-gray-300"
          value={timeRange}
          onChange={(e) => handleFilterChange('timeRange', e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
  
        <select 
          className="form-select rounded-md border-gray-300"
          value={statusFilter}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
        </select>
      </div>
    );
  };

export default DashboardFilters;