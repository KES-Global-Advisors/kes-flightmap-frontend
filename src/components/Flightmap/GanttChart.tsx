// cSpell:ignore workstream workstreams flightmaps Gantt hoverable strat flightmap
import React, { useState, useEffect, MouseEvent, useRef } from 'react';
import { Strategy } from '@/types/flightmap';
import { useAuth } from '@/contexts/UserContext';
import { updateTaskStatus } from './GanttUtils/updateTaskStatus';
import { sendContribution } from './GanttUtils/sendContribution';
import Tooltip from './GanttUtils/Tooltip';  // Import your tooltip component

export interface GanttItem {
  id: string;
  name: string;
  level: 'strategy' | 'program' | 'workstream' | 'milestone' | 'activity';
  parent: string | null;
  startDate: Date | null;
  endDate: Date;
  status: string;
  progress: number;
  checked: boolean;
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
  data: Strategy;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDurationInDays(start: Date | null, end: Date): number | '-' {
  if (!start) return '-';
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / oneDay));
}

const CustomCheckbox = ({
  status,
  onSingleClick,
  onDoubleClick,
}: {
  status: string;
  onSingleClick: () => void;
  onDoubleClick: () => void;
}) => {
  const getCheckboxStyle = () => {
    switch (status) {
      case 'completed':
        return 'bg-blue-500 border-blue-500';
      case 'in_progress':
        return 'bg-gray-300 border-gray-300';
      default:
        return 'bg-white border-gray-300';
    }
  };

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        onSingleClick();
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onDoubleClick();
      }}
      className={`
        w-4 h-4 border-2 rounded cursor-pointer 
        flex items-center justify-center
        ${getCheckboxStyle()}
      `}
    >
      {(status === 'completed' || status === 'in_progress') && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              status === 'completed'
                ? "M5 13l4 4L19 7"
                : "M12 8v4m0 4h.01"
            }
          />
        </svg>
      )}
    </div>
  );
};


const GanttChart: React.FC<GanttChartProps> = ({ data }) => {
  const [tasks, setTasks] = useState<GanttItem[]>([]);
  const [view, setView] = useState<'year' | 'quarter' | 'month'>('year');
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
  
  // Tooltip states
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<GanttItem | null>(null);

  const { user } = useAuth();

  // Ref for click timeout to differentiate single and double clicks
  const clickTimeoutRef = useRef<number | null>(null);

  // --- STEP 1: Flatten the flightmap data into a single tasks array ---
  const processData = (): GanttItem[] => {
    const itemMap = new Map<string, GanttItem>();
  
    const strategy: Strategy = data;
    const strat: GanttItem = {
        id: `s-${strategy.id}`,
        name: strategy.name,
        level: 'strategy',
        parent: null,
        startDate: null,
        endDate: new Date(strategy.time_horizon),
        status: 'not_started',
        progress: 0,
        checked: false,
        tagline: strategy.tagline || '',
        vision: strategy.vision || ''
      };
      itemMap.set(strat.id, strat);
  
      data.programs.forEach(program => {
        const prog: GanttItem = {
          id: `p-${program.id}`,
          name: program.name,
          level: 'program',
          parent: strat.id,
          startDate: null,
          endDate: new Date(program.time_horizon),
          status: 'not_started',
          progress: program.progress?.percentage || 0,
          checked: false,
          vision: program.vision || ''
        };
        itemMap.set(prog.id, prog);
  
        program.workstreams?.forEach(workstream => {
          const ws: GanttItem = {
            id: `w-${workstream.id}`,
            name: workstream.name,
            level: 'workstream',
            parent: prog.id,
            startDate: null,
            endDate: workstream.time_horizon ? new Date(workstream.time_horizon) : new Date('2024-12-31'),
            status: 'not_started',
            progress: workstream.progress_summary?.completed_milestones / (workstream.progress_summary?.total_milestones || 1) * 100,
            checked: false,
            vision: workstream.vision || ''
          };
          itemMap.set(ws.id, ws);
  
          workstream.milestones?.forEach(milestone => {
            const end = milestone.deadline ? new Date(milestone.deadline) : new Date('2024-12-31');
            const start = new Date(end);
            start.setMonth(end.getMonth() - 2);
  
            const ms: GanttItem = {
              id: `m-${milestone.id}`,
              name: milestone.name,
              level: 'milestone',
              parent: ws.id,
              startDate: start,
              endDate: end,
              status: milestone.status || 'not_started',
              progress: milestone.current_progress || 0,
              checked: milestone.status === 'completed',
              description: milestone.description || ''
            };
            itemMap.set(ms.id, ms);
  
            milestone.activities?.forEach(activity => {
              if (!activity.target_start_date || !activity.target_end_date) return;
              const act: GanttItem = {
                id: `a-${activity.id}`,
                name: activity.name,
                level: 'activity',
                parent: ms.id,
                startDate: new Date(activity.target_start_date),
                endDate: new Date(activity.target_end_date),
                status: activity.status || 'not_started',
                progress: activity.status === 'completed' ? 100 : activity.status === 'in_progress' ? 50 : 0,
                checked: activity.status === 'completed',
                isOverdue: activity.is_overdue,
                completedDate: activity.completed_date
              };
              itemMap.set(act.id, act);
            });
          });
  
          workstream.activities?.forEach(activity => {
            if (!activity.target_start_date || !activity.target_end_date) return;
            const id = `a-${activity.id}`;
            if (!itemMap.has(id)) {
              const act: GanttItem = {
                id,
                name: activity.name,
                level: 'activity',
                parent: activity.source_milestone ? `m-${activity.source_milestone}` : ws.id,
                startDate: new Date(activity.target_start_date),
                endDate: new Date(activity.target_end_date),
                status: activity.status || 'not_started',
                progress: activity.status === 'completed' ? 100 : activity.status === 'in_progress' ? 50 : 0,
                checked: activity.status === 'completed',
                isOverdue: activity.is_overdue,
                completedDate: activity.completed_date
              };
              itemMap.set(id, act);
            }
          });
        });
      });
  
    return Array.from(itemMap.values());
  };
  
  useEffect(() => {
    const uniqueTasks = processData();
    setTasks(uniqueTasks);
  
    const expanded: Record<string, boolean> = {};
    uniqueTasks.forEach(item => {
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

  // Time range for timeline rendering
  const getTimeRange = () => {
    // Filter out null startDates
    const validStartDates = tasks
      .filter(t => t.startDate !== null)
      .map(t => t.startDate as Date);
    const startDates = validStartDates.length > 0 ? validStartDates : tasks.map(t => t.endDate);
    const endDates = tasks.map(t => t.endDate);
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    return { minDate, maxDate };
  };

  // Indentation based on level
  const getLevelPadding = (level: string) => {
    switch (level) {
      case 'strategy': return 0;
      case 'program': return 20;
      case 'workstream': return 40;
      case 'milestone': return 60;
      case 'activity': return 80;
      default: return 0;
    }
  };

  // Create timeline header divisions based on selected view
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
      const currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

  // Convert a date to horizontal percentage position for the timeline
  const calculatePosition = (date: Date, minDate: Date, maxDate: Date) => {
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const position = ((date.getTime() - minDate.getTime()) / totalDuration) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Calculate width percentage of a task bar
  const calculateWidth = (startDate: Date, endDate: Date, minDate: Date, maxDate: Date) => {
    const start = Math.max(startDate.getTime(), minDate.getTime());
    const end = Math.min(endDate.getTime(), maxDate.getTime());
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const width = ((end - start) / totalDuration) * 100;
    return Math.max(0, width);
  };

  // Determine if an item should be visible based on parent expansion
  const isVisible = (item: GanttItem): boolean => {
    if (!item.parent) return true;
    if (!expandedItems[item.parent]) return false;
    const parentItem = tasks.find(t => t.id === item.parent);
    return parentItem ? isVisible(parentItem) : true;
  };

  // --- NEW: Click handler that differentiates between single and double clicks ---
  const handleCheckboxClick = (itemId: string) => {
    if (clickTimeoutRef.current) {
      // Double click detected: clear timeout and mark as complete
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      toggleTaskComplete(itemId, true);
    } else {
      // Set timeout to differentiate single click
      clickTimeoutRef.current = window.setTimeout(() => {
        toggleTaskComplete(itemId, false);
        clickTimeoutRef.current = null;
      }, 250); // 250ms threshold for double click
    }
  };

  // Modified toggleTaskComplete: works for both activities and milestones
  const toggleTaskComplete = async (itemId: string, isDoubleClick: boolean) => {
    // If there's no user, bail early or handle differently
    if (!user) {
      console.warn("No user logged in, skipping updates");
      return;
    }

    const updated = await Promise.all(
      tasks.map(async t => {
        if (t.id === itemId && (t.level === 'activity' || t.level === 'milestone')) {
          if (isDoubleClick) {
            // Double click: mark as complete regardless of current status
            const newItem = { ...t, status: 'completed', progress: 100, checked: true };
            await updateTaskStatus(newItem);
            await sendContribution(newItem, user);
            return newItem;
          } else {
            // Single click: if not started, mark as in progress
            if (t.status === 'not_started') {
              const newItem = { ...t, status: 'in_progress', progress: 50, checked: true };
              await updateTaskStatus(newItem);
              await sendContribution(newItem, user);
              return newItem;
            }
          }
        }
        return t;
      })
    );
    setTasks(updated);
  };

  // Tooltip handlers for every item
  const handleMouseEnter = (evt: MouseEvent, item: GanttItem) => {
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
          const durationDays = item.startDate ? getDurationInDays(item.startDate, item.endDate) : '-';
          const isOverdue = item.endDate < today && item.status !== 'completed';
          // For timeline bar, use startDate if available, otherwise fall back to endDate
          const barStartDate = item.startDate ?? item.endDate;

          return (
            <div key={item.id} className="flex border-b border-gray-100 hover:bg-gray-50">
              {/* Left columns */}
              <div className="w-1/2 flex">
                <div className="w-4/12 flex items-center" style={{ paddingLeft: `${getLevelPadding(item.level)}px` }}>
                  {hasChildren(item.id) && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="mr-2 w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded"
                    >
                      {expandedItems[item.id] ? '−' : '+'}
                    </button>
                  )}
                  {(item.level === 'activity' || item.level === 'milestone') && (
                    <div className="mr-2">
                      <CustomCheckbox 
                        status={item.status}
                        onSingleClick={() => handleCheckboxClick(item.id)}
                        onDoubleClick={() => handleCheckboxClick(item.id)}
                      />
                    </div>
                  )}
                  <div className="text-sm truncate" style={{ maxWidth: '120px' }}>{item.name}</div>
                </div>

                <div className="w-2/12 flex items-center justify-center text-sm">{durationDays === '-' ? '-' : `${durationDays} days`}</div>
                <div className="w-2/12 flex items-center justify-center text-sm">
                  {item.startDate ? formatDate(item.startDate) : '-'}
                </div>
                <div className="w-2/12 flex items-center justify-center text-sm">{formatDate(item.endDate)}</div>
                <div className="w-2/12 flex items-center justify-center text-sm">{Math.round(item.progress)}%</div>
              </div>

              {/* Right timeline cell (hoverable for tooltip) */}
              <div className="w-1/2 relative" style={{ minHeight: '40px' }} onMouseEnter={(e) => handleMouseEnter(e, item)}>
                {today >= timeRange.minDate && today <= timeRange.maxDate && (
                  <div
                    className="absolute h-full w-px bg-red-500 z-10"
                    style={{
                      left: `${calculatePosition(today, timeRange.minDate, timeRange.maxDate)}%`,
                    }}
                  />
                )}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 rounded"
                  style={{
                    left: `${calculatePosition(barStartDate, timeRange.minDate, timeRange.maxDate)}%`,
                    width: `${calculateWidth(barStartDate, item.endDate, timeRange.minDate, timeRange.maxDate)}%`,
                    backgroundColor: getStatusColor(item.status, isOverdue),
                    opacity: 0.8,
                  }}
                >
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

      {/* Tooltip */}
      <Tooltip item={hoveredItem} visible={tooltipVisible && hoveredItem != null} x={tooltipPos.x} y={tooltipPos.y} />
    </div>
  );
};

export default GanttChart;
