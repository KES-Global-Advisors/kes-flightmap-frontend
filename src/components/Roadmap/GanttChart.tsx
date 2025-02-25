import { useState } from 'react';
import { useEffect } from 'react';
import { RoadmapData } from '@/types/roadmap';
import { useAuth } from '@/contexts/UserContext';
import { updateTaskStatus } from './GanttUtils/updateTaskStatus';
import { sendContribution } from './GanttUtils/sendContribution';

interface GanttChartProps {
  data: RoadmapData;
}

// Helper function to format a date as "M/D/YYYY"
function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Compute duration in days
function getDurationInDays(start: Date, end: Date) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / oneDay));
}

const GanttChart: React.FC<GanttChartProps> = ({ data }) => {
  // Process data to create a flat structure for the Gantt chart
  const processData = () => {
    const tasks: any[] = [];
    let taskId = 1;
    
    // Process strategies
    data.strategies.forEach(strategy => {
      tasks.push({
        id: `s-${strategy.id}`,
        taskId: taskId++,
        name: strategy.name,
        level: 'strategy',
        startDate: new Date('2024-01-01'),
        endDate: new Date(strategy.time_horizon),
        status: 'not_started',
        progress: 0,
        checked: false
      });
      
      // Process programs
      strategy.programs.forEach(program => {
        tasks.push({
          id: `p-${program.id}`,
          taskId: taskId++,
          name: program.name,
          level: 'program',
          parent: `s-${strategy.id}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date(program.time_horizon),
          status: 'not_started',
          progress: program.progress?.percentage || 0,
          checked: false
        });
        
        // Process workstreams
        if (program.workstreams) {
          program.workstreams.forEach(workstream => {
            tasks.push({
              id: `w-${workstream.id}`,
              taskId: taskId++,
              name: workstream.name,
              level: 'workstream',
              parent: `p-${program.id}`,
              startDate: new Date('2024-01-01'),
              endDate: workstream.time_horizon ? new Date(workstream.time_horizon) : new Date('2024-12-31'),
              status: 'not_started',
              progress: workstream.progress_summary 
                        ? (workstream.progress_summary.completed_milestones / (workstream.progress_summary.total_milestones || 1)) * 100 
                        : 0,
              checked: false
            });
            
            // Process milestones
            if (workstream.milestones) {
              workstream.milestones.forEach(milestone => {
                if (tasks.some(t => t.id === `m-${milestone.id}` && t.parent === `w-${workstream.id}`)) return;
                
                const endDate = milestone.deadline ? new Date(milestone.deadline) : new Date('2024-12-31');
                const startDate = new Date(endDate);
                startDate.setMonth(endDate.getMonth() - 2);
                
                tasks.push({
                  id: `m-${milestone.id}`,
                  taskId: taskId++,
                  name: milestone.name,
                  level: 'milestone',
                  parent: `w-${workstream.id}`,
                  startDate,
                  endDate,
                  status: milestone.status || 'not_started',
                  progress: milestone.current_progress || 0,
                  checked: milestone.status === 'completed'
                });
              });
            }
            
            // Process activities
            if (workstream.activities) {
              workstream.activities.forEach(activity => {
                if (!activity.target_start_date || !activity.target_end_date) return;
                if (tasks.some(t => t.id === `a-${activity.id}`)) return;
                
                tasks.push({
                  id: `a-${activity.id}`,
                  taskId: taskId++,
                  name: activity.name,
                  level: 'activity',
                  parent: activity.milestone ? `m-${activity.milestone}` : `w-${workstream.id}`,
                  startDate: new Date(activity.target_start_date),
                  endDate: new Date(activity.target_end_date),
                  status: activity.status || 'not_started',
                  progress: activity.status === 'completed' ? 100 : activity.status === 'in_progress' ? 50 : 0,
                  checked: activity.status === 'completed'
                });
              });
            }
          });
        }
      });
    });
    
    return tasks;
  };

  const [tasks, setTasks] = useState<any[]>([]);
  const [view, setView] = useState<'year' | 'quarter' | 'month'>('year');
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
  const { user } = useAuth();

  // Expand logic: strategies and programs expanded by default
  useEffect(() => {
    const processed = processData();
    setTasks(processed);
    
    const expanded: { [key: string]: boolean } = {};
    processed.forEach(task => {
      if (task.level === 'strategy' || task.level === 'program') {
        expanded[task.id] = true;
      }
    });
    setExpandedItems(expanded);
  }, [data]);

  // Expand/collapse toggling
  const toggleExpand = (taskId: string) => {
    setExpandedItems(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Check if a task has children
  const hasChildren = (taskId: string) => tasks.some(task => task.parent === taskId);

  // Status color
  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'completed') return '#FF6B6B'; // Red for overdue
    switch(status) {
      case 'completed': return '#4CAF50'; // Green
      case 'in_progress': return '#2196F3'; // Blue
      case 'not_started': return '#9E9E9E'; // Gray
      default: return '#9E9E9E';
    }
  };

  // Time range for Gantt
  const getTimeRange = () => {
    const startDates = tasks.map(task => task.startDate);
    const endDates = tasks.map(task => task.endDate);
    const minDate = new Date(Math.min(...startDates.map(date => date.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(date => date.getTime())));
    // Add padding
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    return { minDate, maxDate };
  };

  // Indentation
  const getLevelPadding = (level: string) => {
    switch(level) {
      case 'strategy': return 0;
      case 'program': return 20;
      case 'workstream': return 40;
      case 'milestone': return 60;
      case 'activity': return 80;
      default: return 0;
    }
  };

  // Time divisions
  const createTimeDivisions = () => {
    const { minDate, maxDate } = getTimeRange();
    const divisions = [];
    if (view === 'year') {
      const startYear = minDate.getFullYear();
      const endYear = maxDate.getFullYear();
      for (let year = startYear; year <= endYear; year++) {
        divisions.push({
          label: year.toString(),
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31)
        });
      }
    } else if (view === 'quarter') {
      const startYear = minDate.getFullYear();
      const startQuarter = Math.floor(minDate.getMonth() / 3);
      const endYear = maxDate.getFullYear();
      const endQuarter = Math.floor(maxDate.getMonth() / 3);
      for (let year = startYear; year <= endYear; year++) {
        const firstQ = year === startYear ? startQuarter : 0;
        const lastQ = year === endYear ? endQuarter : 3;
        for (let quarter = firstQ; quarter <= lastQ; quarter++) {
          divisions.push({
            label: `Q${quarter + 1} ${year}`,
            start: new Date(year, quarter * 3, 1),
            end: new Date(year, (quarter + 1) * 3, 0)
          });
        }
      }
    } else {
      let currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        divisions.push({
          label: `${monthNames[month]} ${year}`,
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0)
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    return divisions;
  };

  // Convert date to horizontal position
  const calculatePosition = (date: Date, minDate: Date, maxDate: Date) => {
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const position = ((date.getTime() - minDate.getTime()) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Convert date range to width
  const calculateWidth = (startDate: Date, endDate: Date, minDate: Date, maxDate: Date) => {
    const start = Math.max(startDate.getTime(), minDate.getTime());
    const end = Math.min(endDate.getTime(), maxDate.getTime());
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const width = ((end - start) / totalDuration) * 100;
    return Math.max(0, width);
  };

  // Expand/collapse visibility
  const isVisible = (task: any): boolean => {
    if (!task.parent) return true;
    if (!expandedItems[task.parent]) return false;
    const parentTask = tasks.find(t => t.id === task.parent);
    return parentTask ? isVisible(parentTask) : true;
  };

  // Toggle completion: first -> in_progress, second -> completed
  const toggleTaskComplete = async (taskId: string) => {
    const updatedTasks = await Promise.all(tasks.map(async task => {
      if (task.id === taskId) {
        if (task.status === 'not_started') {
          const updated = { ...task, status: 'in_progress', progress: 50, checked: true };
          await updateTaskStatus(updated);
          if (task.level === 'milestone' || task.level === 'activity') {
            await sendContribution(task.level, updated, user);
          }
          return updated;
        } else if (task.status === 'in_progress') {
          const updated = { ...task, status: 'completed', progress: 100, checked: true };
          await updateTaskStatus(updated);
          if (task.level === 'milestone' || task.level === 'activity') {
            await sendContribution(task.level, updated, user);
          }
          return updated;
        }
      }
      return task;
    }));
    setTasks(updatedTasks);
  };

  // Filter tasks to only visible ones
  const visibleTasks = tasks.filter(isVisible);
  const timeRange = getTimeRange();
  const timeDivisions = createTimeDivisions();
  const today = new Date();

  return (
    <div className="flex flex-col w-full h-full p-4 bg-white text-gray-800">
      {/* Top bar with chart title & view selection */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{data.name} Gantt Chart</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setView('month')} 
            className={`px-3 py-1 rounded ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Month
          </button>
          <button 
            onClick={() => setView('quarter')} 
            className={`px-3 py-1 rounded ${view === 'quarter' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Quarter
          </button>
          <button 
            onClick={() => setView('year')} 
            className={`px-3 py-1 rounded ${view === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Year
          </button>
        </div>
      </div>
      
      {/* Table header row */}
      <div className="flex mb-2 font-semibold bg-gray-100">
        {/* Left columns: Name, Duration, Start, End, Progress */}
        <div className="w-1/2 flex">
          <div className="w-4/12 p-2">Task Name</div>
          <div className="w-2/12 p-2 text-center">Duration</div>
          <div className="w-2/12 p-2 text-center">Start</div>
          <div className="w-2/12 p-2 text-center">End</div>
          <div className="w-2/12 p-2 text-center">Progress</div>
        </div>
        {/* Right side: timeline headers */}
        <div className="w-1/2 flex">
          {timeDivisions.map((division, index) => (
            <div 
              key={index} 
              className="text-center p-2 border-l border-gray-200"
              style={{
                width: `${calculateWidth(division.start, division.end, timeRange.minDate, timeRange.maxDate)}%`
              }}
            >
              {division.label}
            </div>
          ))}
        </div>
      </div>
      
      {/* Table body */}
      <div className="flex-grow overflow-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        {visibleTasks.map(task => {
          const durationDays = getDurationInDays(task.startDate, task.endDate);
          return (
            <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50">
              {/* Left columns */}
              <div className="w-1/2 flex">
                {/* Task Name column */}
                <div 
                  className="w-4/12 flex items-center"
                  style={{ paddingLeft: `${getLevelPadding(task.level)}px` }}
                >
                  {hasChildren(task.id) && (
                    <button 
                      onClick={() => toggleExpand(task.id)} 
                      className="mr-2 w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded"
                    >
                      {expandedItems[task.id] ? '−' : '+'}
                    </button>
                  )}
                  <input 
                    type="checkbox" 
                    checked={task.checked} 
                    onChange={() => toggleTaskComplete(task.id)} 
                    className="mr-2"
                  />
                  <div className="text-sm truncate" style={{ maxWidth: '120px' }}>
                    {task.name}
                  </div>
                </div>
                
                {/* Duration column */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {durationDays} days
                </div>
                
                {/* Start column */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {formatDate(task.startDate)}
                </div>
                
                {/* End column */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {formatDate(task.endDate)}
                </div>
                
                {/* Progress column */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {Math.round(task.progress)}%
                </div>
              </div>
              
              {/* Right timeline cell */}
              <div className="w-1/2 relative" style={{ minHeight: '40px' }}>
                {/* Today indicator */}
                {today >= timeRange.minDate && today <= timeRange.maxDate && (
                  <div
                    className="absolute h-full w-px bg-red-500 z-10"
                    style={{
                      left: `${calculatePosition(today, timeRange.minDate, timeRange.maxDate)}%`
                    }}
                  />
                )}
                
                {/* Task bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 rounded"
                  style={{
                    left: `${calculatePosition(task.startDate, timeRange.minDate, timeRange.maxDate)}%`,
                    width: `${calculateWidth(task.startDate, task.endDate, timeRange.minDate, timeRange.maxDate)}%`,
                    backgroundColor: getStatusColor(
                      task.status, 
                      task.endDate < today && task.status !== 'completed'
                    ),
                    opacity: 0.8
                  }}
                >
                  {/* Progress bar inside the main bar */}
                  {task.progress > 0 && (
                    <div
                      className="h-full rounded-l"
                      style={{
                        width: `${task.progress}%`,
                        backgroundColor: '#388E3C',
                        maxWidth: '100%'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center text-sm">
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
          <span>Not Started</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
          <span>Overdue</span>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;