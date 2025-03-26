// // Resource Allocation Component
import { WorkloadDistribution } from '@/types/dashboard';

const ResourceAllocation = ({ workloads }: { workloads: WorkloadDistribution[] }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Team Member
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Current Tasks
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Upcoming
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Overdue
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Tasks
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Workload Status
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {workloads.map((workload, idx) => {
          const totalTasks =
            workload.current_tasks +
            workload.upcoming_tasks +
            workload.overdue_tasks;
          const status =
            workload.current_tasks > 5
              ? 'Overloaded'
              : workload.current_tasks > 3
              ? 'Heavy'
              : 'Optimal';
          return (
            <tr key={idx}>
              <td className="px-6 py-4 whitespace-nowrap">{workload.user}</td>
              <td className="px-6 py-4 whitespace-nowrap">{workload.current_tasks}</td>
              <td className="px-6 py-4 whitespace-nowrap">{workload.upcoming_tasks}</td>
              <td className="px-6 py-4 whitespace-nowrap">{workload.overdue_tasks}</td>
              <td className="px-6 py-4 whitespace-nowrap">{totalTasks}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    workload.current_tasks > 5
                      ? 'bg-red-100 text-red-800'
                      : workload.current_tasks > 3
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                  title={`Current: ${workload.current_tasks}, Upcoming: ${workload.upcoming_tasks}, Overdue: ${workload.overdue_tasks}`}
                >
                  {status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default ResourceAllocation;
