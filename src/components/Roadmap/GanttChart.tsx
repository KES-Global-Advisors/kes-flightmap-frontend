import React, { useState, useEffect, MouseEvent } from 'react';
import { RoadmapData } from '@/types/roadmap';
import { useAuth } from '@/contexts/UserContext';
import { updateTaskStatus } from './GanttUtils/updateTaskStatus';
import { sendContribution } from './GanttUtils/sendContribution';
import Tooltip from './GanttUtils/Tooltip';  // Import your tooltip component

interface GanttItem {
  id: string;
  name: string;
  level: 'strategy' | 'program' | 'workstream' | 'milestone' | 'activity';
  parent: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  progress: number;
  checked: boolean;

  // Additional optional fields:
  tagline?: string;
  vision?: string;
  description?: string;
  isOverdue?: boolean;
  completedDate?: string | null;
  target_start_date?: string;
  target_end_date?: string;
  priority?: number;
  delayDays?: number;
  actualDuration?: number | null;
}

interface GanttChartProps {
  data: RoadmapData;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDurationInDays(start: Date, end: Date) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / oneDay));
}

const GanttChart: React.FC<GanttChartProps> = ({ data }) => {
  const [tasks, setTasks] = useState<GanttItem[]>([]);
  const [view, setView] = useState<'year' | 'quarter' | 'month'>('year');
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
  
  // Tooltip states
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<GanttItem | null>(null);

  const { user } = useAuth();

  // --- STEP 1: Flatten the roadmap data into a single tasks array ---
  const processData = () => {
    const items: GanttItem[] = [];
    let taskId = 1;

    data.strategies.forEach(strategy => {
      // Strategy
      items.push({
        id: `s-${strategy.id}`,
        taskId: taskId++,
        name: strategy.name,
        level: 'strategy',
        parent: null,
        startDate: new Date('2024-01-01'),
        endDate: new Date(strategy.time_horizon),
        status: 'not_started',
        progress: 0,
        checked: false,
        tagline: strategy.tagline || '',
        vision: strategy.vision || ''
      });

      // Programs
      strategy.programs.forEach(program => {
        items.push({
          id: `p-${program.id}`,
          taskId: taskId++,
          name: program.name,
          level: 'program',
          parent: `s-${strategy.id}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date(program.time_horizon),
          status: 'not_started',
          progress: program.progress?.percentage || 0,
          checked: false,
          vision: program.vision || ''
        });

        // Workstreams
        if (program.workstreams) {
          program.workstreams.forEach(workstream => {
            items.push({
              id: `w-${workstream.id}`,
              taskId: taskId++,
              name: workstream.name,
              level: 'workstream',
              parent: `p-${program.id}`,
              startDate: new Date('2024-01-01'),
              endDate: workstream.time_horizon
                ? new Date(workstream.time_horizon)
                : new Date('2024-12-31'),
              status: 'not_started',
              progress: workstream.progress_summary
                ? (workstream.progress_summary.completed_milestones /
                  (workstream.progress_summary.total_milestones || 1)) * 100
                : 0,
              checked: false,
              vision: workstream.vision || ''
            });

            // Milestones
            if (workstream.milestones) {
              workstream.milestones.forEach(milestone => {
                if (
                  items.some(
                    t => t.id === `m-${milestone.id}` && t.parent === `w-${workstream.id}`
                  )
                ) {
                  return;
                }
                const endDate = milestone.deadline
                  ? new Date(milestone.deadline)
                  : new Date('2024-12-31');
                const startDate = new Date(endDate);
                startDate.setMonth(endDate.getMonth() - 2);

                items.push({
                  id: `m-${milestone.id}`,
                  taskId: taskId++,
                  name: milestone.name,
                  level: 'milestone',
                  parent: `w-${workstream.id}`,
                  startDate,
                  endDate,
                  status: milestone.status || 'not_started',
                  progress: milestone.current_progress || 0,
                  checked: milestone.status === 'completed',
                  description: milestone.description || ''
                });
              });
            }

            // Activities
            if (workstream.activities) {
              workstream.activities.forEach(activity => {
                if (!activity.target_start_date || !activity.target_end_date) return;
                if (items.some(t => t.id === `a-${activity.id}`)) return;

                const startDate = new Date(activity.target_start_date);
                const endDate = new Date(activity.target_end_date);

                items.push({
                  id: `a-${activity.id}`,
                  taskId: taskId++,
                  name: activity.name,
                  level: 'activity',
                  parent: activity.milestone
                    ? `m-${activity.milestone}`
                    : `w-${workstream.id}`,
                  startDate,
                  endDate,
                  status: activity.status || 'not_started',
                  progress:
                    activity.status === 'completed'
                      ? 100
                      : activity.status === 'in_progress'
                      ? 50
                      : 0,
                  checked: activity.status === 'completed',
                  isOverdue: activity.is_overdue,
                  completedDate: activity.completed_date,
                  target_start_date: activity.target_start_date,
                  target_end_date: activity.target_end_date,
                  priority: activity.priority,
                  delayDays: activity.delay_days,
                  actualDuration: activity.actual_duration
                });
              });
            }
          });
        }
      });
    });

    return items;
  };

  // --- STEP 2: On mount, flatten data + set expansions ---
  useEffect(() => {
    const flattened = processData();
    setTasks(flattened);

    // Expand strategies and programs by default
    const expanded: { [key: string]: boolean } = {};
    flattened.forEach(item => {
      if (item.level === 'strategy' || item.level === 'program') {
        expanded[item.id] = true;
      }
    });
    setExpandedItems(expanded);
  }, [data]);

  // Expand/collapse toggling
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Check if an item has children
  const hasChildren = (itemId: string) => tasks.some(t => t.parent === itemId);

  // Convert status -> color
  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'completed') return '#FF6B6B'; // Red for overdue
    switch (status) {
      case 'completed':
        return '#4CAF50'; // Green
      case 'in_progress':
        return '#2196F3'; // Blue
      case 'not_started':
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E';
    }
  };

  // Time range
  const getTimeRange = () => {
    const startDates = tasks.map(t => t.startDate);
    const endDates = tasks.map(t => t.endDate);
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    return { minDate, maxDate };
  };

  // Indentation
  const getLevelPadding = (level: string) => {
    switch (level) {
      case 'strategy':
        return 0;
      case 'program':
        return 20;
      case 'workstream':
        return 40;
      case 'milestone':
        return 60;
      case 'activity':
        return 80;
      default:
        return 0;
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
          end: new Date(year, 11, 31),
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
            end: new Date(year, (quarter + 1) * 3, 0),
          });
        }
      }
    } else {
      let currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        divisions.push({
          label: `${monthNames[month]} ${year}`,
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0),
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    return divisions;
  };

  // Date -> horizontal position
  const calculatePosition = (date: Date, minDate: Date, maxDate: Date) => {
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const position = ((date.getTime() - minDate.getTime()) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Date range -> width
  const calculateWidth = (startDate: Date, endDate: Date, minDate: Date, maxDate: Date) => {
    const start = Math.max(startDate.getTime(), minDate.getTime());
    const end = Math.min(endDate.getTime(), maxDate.getTime());
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const width = ((end - start) / totalDuration) * 100;
    return Math.max(0, width);
  };

  // Is an item visible? (parent expanded)
  const isVisible = (item: GanttItem): boolean => {
    if (!item.parent) return true;
    if (!expandedItems[item.parent]) return false;
    const parentItem = tasks.find(t => t.id === item.parent);
    return parentItem ? isVisible(parentItem) : true;
  };

  // Toggle completion (only for activities)
  const toggleTaskComplete = async (itemId: string) => {
    const updated = await Promise.all(
      tasks.map(async t => {
        if (t.id === itemId) {
          // Only toggle if it's an activity
          if (t.level !== 'activity') return t;
          
          if (t.status === 'not_started') {
            const newItem = { ...t, status: 'in_progress', progress: 50, checked: true };
            await updateTaskStatus(newItem);
            await sendContribution(t.level, newItem, user);
            return newItem;
          } else if (t.status === 'in_progress') {
            const newItem = { ...t, status: 'completed', progress: 100, checked: true };
            await updateTaskStatus(newItem);
            await sendContribution(t.level, newItem, user);
            return newItem;
          }
        }
        return t;
      })
    );
    setTasks(updated);
  };

  // -- TOOLTIP handlers for *every* item (not just activities) --
  const handleMouseEnter = (evt: MouseEvent, item: GanttItem) => {
    // Mark item as hovered
    setHoveredItem(item);
    setTooltipPos({ x: evt.clientX + 10, y: evt.clientY + 10 });
    setTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisible(false);
    setHoveredItem(null);
  };

  const handleMouseMove = (evt: MouseEvent) => {
    if (!tooltipVisible) return;
    setTooltipPos({ x: evt.clientX + 10, y: evt.clientY + 10 });
  };

  // Filter only visible
  const visibleItems = tasks.filter(isVisible);
  const timeRange = getTimeRange();
  const timeDivisions = createTimeDivisions();
  const today = new Date();

  return (
    <div className="relative flex flex-col w-full h-full p-4 bg-white text-gray-800">
      {/* Top bar: chart title & view selection */}
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
        <div className="w-1/2 flex">
          <div className="w-4/12 p-2">Task Name</div>
          <div className="w-2/12 p-2 text-center">Duration</div>
          <div className="w-2/12 p-2 text-center">Start</div>
          <div className="w-2/12 p-2 text-center">End</div>
          <div className="w-2/12 p-2 text-center">Progress</div>
        </div>
        {/* Timeline headers */}
        <div className="w-1/2 flex">
          {timeDivisions.map((division, idx) => (
            <div
              key={idx}
              className="text-center p-2 border-l border-gray-200"
              style={{
                width: `${calculateWidth(
                  division.start,
                  division.end,
                  timeRange.minDate,
                  timeRange.maxDate
                )}%`,
              }}
            >
              {division.label}
            </div>
          ))}
        </div>
      </div>

      {/* Table body */}
      <div
        className="flex-grow overflow-auto"
        style={{ maxHeight: 'calc(100vh - 150px)' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {visibleItems.map(item => {
          const durationDays = getDurationInDays(item.startDate, item.endDate);
          const isOverdue = item.endDate < today && item.status !== 'completed';

          return (
            <div
              key={item.id}
              className="flex border-b border-gray-100 hover:bg-gray-50"
            >
              {/* Left columns */}
              <div className="w-1/2 flex">
                {/* Task Name */}
                <div
                  className="w-4/12 flex items-center"
                  style={{ paddingLeft: `${getLevelPadding(item.level)}px` }}
                >
                  {/* Expand/collapse button */}
                  {hasChildren(item.id) && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="mr-2 w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded"
                    >
                      {expandedItems[item.id] ? '−' : '+'}
                    </button>
                  )}
                  {/* Only show checkbox if it's an activity */}
                  {item.level === 'activity' && (
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleTaskComplete(item.id)}
                      className="mr-2"
                    />
                  )}
                  <div className="text-sm truncate" style={{ maxWidth: '120px' }}>
                    {item.name}
                  </div>
                </div>

                {/* Duration */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {durationDays} days
                </div>

                {/* Start */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {formatDate(item.startDate)}
                </div>

                {/* End */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {formatDate(item.endDate)}
                </div>

                {/* Progress */}
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {Math.round(item.progress)}%
                </div>
              </div>

              {/* Right timeline cell (hoverable for tooltip) */}
              <div
                className="w-1/2 relative"
                style={{ minHeight: '40px' }}
                onMouseEnter={(e) => {
                  // Now we show the tooltip for *every* item, not just activities
                  setHoveredItem(item);
                  setTooltipPos({ x: e.clientX + 10, y: e.clientY + 10 });
                  setTooltipVisible(true);
                }}
              >
                {/* Today indicator */}
                {today >= timeRange.minDate && today <= timeRange.maxDate && (
                  <div
                    className="absolute h-full w-px bg-red-500 z-10"
                    style={{
                      left: `${calculatePosition(today, timeRange.minDate, timeRange.maxDate)}%`,
                    }}
                  />
                )}
                {/* Task bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 rounded"
                  style={{
                    left: `${calculatePosition(item.startDate, timeRange.minDate, timeRange.maxDate)}%`,
                    width: `${calculateWidth(
                      item.startDate,
                      item.endDate,
                      timeRange.minDate,
                      timeRange.maxDate
                    )}%`,
                    backgroundColor: getStatusColor(item.status, isOverdue),
                    opacity: 0.8,
                  }}
                >
                  {/* Progress bar inside the main bar */}
                  {item.progress > 0 && (
                    <div
                      className="h-full rounded-l"
                      style={{
                        width: `${item.progress}%`,
                        backgroundColor: '#388E3C',
                        maxWidth: '100%',
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

      {/* Tooltip: placed absolutely within this container */}
      <Tooltip
        item={hoveredItem}
        visible={tooltipVisible && hoveredItem != null}
        x={tooltipPos.x}
        y={tooltipPos.y}
      />
    </div>
  );
};

export default GanttChart;
