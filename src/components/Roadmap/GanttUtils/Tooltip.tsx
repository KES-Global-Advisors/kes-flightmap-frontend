/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

interface TooltipProps {
  item: any;             // or GanttItem if you prefer
  visible: boolean;
  x: number;
  y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ item, visible, x, y }) => {
  if (!visible || !item) return null;

  // A small helper to format date if the field exists:
  const maybeFormatDate = (dateVal?: Date) => {
    if (!dateVal) return '';
    return dateVal.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    // Use 'fixed' so it doesn’t get clipped by scroll containers
    <div
      className="z-50 bg-white p-3 rounded shadow-lg border text-sm"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        maxWidth: '300px',
      }}
    >
      <h3 className="font-bold text-base mb-1">{item.name}</h3>
      <div className="mb-1 text-gray-600">Level: {item.level}</div>

      {/* Show start/end date if present */}
      {item.startDate && (
        <div className="text-gray-600">
          Start: <span className="font-medium">{maybeFormatDate(item.startDate)}</span>
        </div>
      )}
      {item.endDate && (
        <div className="text-gray-600">
          End: <span className="font-medium">{maybeFormatDate(item.endDate)}</span>
        </div>
      )}

      {/* Status & progress */}
      <div className="text-gray-600">
        Status: <span className="font-medium capitalize">{item.status}</span>
      </div>
      <div className="text-gray-600">
        Progress: <span className="font-medium">{Math.round(item.progress)}%</span>
      </div>

      {/* Extra fields (tagline, vision, description, etc.) */}
      {item.tagline && (
        <div className="mt-1 text-gray-600">
          <span className="font-semibold">Tagline:</span> {item.tagline}
        </div>
      )}
      {item.vision && (
        <div className="mt-1 text-gray-600">
          <span className="font-semibold">Vision:</span> {item.vision}
        </div>
      )}
      {item.description && (
        <div className="mt-1 text-gray-600">
          <span className="font-semibold">Description:</span> {item.description}
        </div>
      )}

      {/* Show priority, if it's an activity */}
      {item.priority !== undefined && (
        <div className="mt-1 text-gray-600">
          <span className="font-semibold">Priority:</span> {item.priority}
        </div>
      )}

      {/* Show overdue, completedDate, etc. */}
      {item.isOverdue && item.status !== 'completed' && (
        <div className="text-red-500 mt-1">This item is overdue!</div>
      )}
      {item.completedDate && (
        <div className="text-gray-600">
          Completed on: {new Date(item.completedDate).toLocaleDateString('en-US')}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
