import React, { useState } from 'react';
import { RoadmapData, Activity, Contributor } from '@/types/roadmap';

interface ActivityTableProps {
  data: RoadmapData;
}

const ActivityTable: React.FC<ActivityTableProps> = ({ data }) => {
  // Flatten activities for easier display
  const [activities, setActivities] = useState<Activity[]>(
    data.strategies.flatMap(strategy => 
      strategy.programs.flatMap(program => 
        program.workstreams.flatMap(workstream => [
          ...workstream.activities,
          ...((workstream.milestones || []).flatMap(milestone => milestone.activities))
        ])
      )
    )
  );
  

  // Status change handler
  const handleStatusChange = async (activityId: number, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    try {
      // Here you would normally make an API call
      // For example:
      // await fetch(`/api/activities/${activityId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus })
      // });
      
      console.log(`Updating activity ${activityId} to status: ${newStatus}`);
      
      // Update local state
      setActivities(prevActivities => 
        prevActivities.map(activity => 
          activity.id === activityId ? { ...activity, status: newStatus } : activity
        )
      );
    } catch (error) {
      console.error("Failed to update activity status:", error);
      // You could add error handling/notification here
    }
  };

  // Helper to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to get status color classes
  const getStatusClasses = (status: string) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // Function to get priority indicator
  const getPriorityIndicator = (priority: number) => {
    switch(priority) {
      case 1:
        return <span className="inline-block w-4 h-4 bg-red-500 rounded-full" title="High Priority"></span>;
      case 2:
        return <span className="inline-block w-4 h-4 bg-yellow-500 rounded-full" title="Medium Priority"></span>;
      case 3:
        return <span className="inline-block w-4 h-4 bg-blue-500 rounded-full" title="Low Priority"></span>;
      default:
        return <span className="inline-block w-4 h-4 bg-gray-300 rounded-full" title="No Priority Set"></span>;
    }
  };

  // Get workstream name from activity
  const getWorkstreamName = (workstreamId: number) => {
    for (const strategy of data.strategies) {
      for (const program of strategy.programs) {
        for (const workstream of program.workstreams) {
          if (workstream.id === workstreamId) {
            return workstream.name;
          }
        }
      }
    }
    return "Unknown";
  };

  // Get milestone name from activity
  const getMilestoneName = (milestoneId: number) => {
    for (const strategy of data.strategies) {
      for (const program of strategy.programs) {
        for (const workstream of program.workstreams) {
          for (const milestone of workstream.milestones) {
            if (milestone.id === milestoneId) {
              return milestone.name;
            }
          }
        }
      }
    }
    return "Unknown";
  };

  // Get contributors string
  const getContributorsString = (contributors: Contributor[]) => {
    if (contributors.length === 0) return "—";
    
    return contributors.map(contributor => {
      // Find the contributor with username
      for (const strategy of data.strategies) {
        for (const program of strategy.programs) {
          for (const workstream of program.workstreams) {
            for (const wsContributor of workstream.contributors) {
              if (contributor.user === wsContributor.id) {
                return wsContributor.username;
              }
            }
          }
        }
      }
      return `User ${contributor.user}`;
    }).join(", ");
  };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
      <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <h2 className="text-2xl font-bold">{data.name}</h2>
        <p className="text-blue-100">{data.description}</p>
      </div>
      
      <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
        <div className="text-sm text-blue-600">
          <span className="font-semibold">Total Activities:</span> {activities.length} | 
          <span className="font-semibold"> Completed:</span> {activities.filter(a => a.status === 'completed').length} | 
          <span className="font-semibold"> In Progress:</span> {activities.filter(a => a.status === 'in_progress').length} | 
          <span className="font-semibold"> Not Started:</span> {activities.filter(a => a.status === 'not_started').length}
        </div>
        
        <div className="flex space-x-2">
          <span className="flex items-center text-xs text-gray-600">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span> High Priority
          </span>
          <span className="flex items-center text-xs text-gray-600">
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span> Medium Priority
          </span>
          <span className="flex items-center text-xs text-gray-600">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span> Low Priority
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workstream</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Milestone</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contributors</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <tr key={activity.id} className={activity.is_overdue ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getPriorityIndicator(activity.priority)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                  {activity.is_overdue && (
                    <div className="text-xs text-red-600 font-medium">
                      {activity.delay_days > 0 ? `Overdue by ${activity.delay_days} days` : 'Overdue'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">{getWorkstreamName(activity.workstream)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">{getMilestoneName(activity.milestone)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">{getContributorsString(activity.contributors)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-500">
                    <div>Start: {formatDate(activity.target_start_date)}</div>
                    <div>End: {formatDate(activity.target_end_date)}</div>
                    {activity.completed_date && (
                      <div className="text-green-600">Completed: {formatDate(activity.completed_date)}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusClasses(activity.status)}`}>
                    {activity.status === 'not_started' ? 'Not Started' : 
                     activity.status === 'in_progress' ? 'In Progress' : 'Completed'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleStatusChange(activity.id, 'in_progress')}
                      disabled={activity.status === 'in_progress'}
                      className={`px-2 py-1 text-xs rounded ${
                        activity.status === 'in_progress' 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange(activity.id, 'completed')}
                      disabled={activity.status === 'completed'}
                      className={`px-2 py-1 text-xs rounded ${
                        activity.status === 'completed' 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      Complete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityTable;