// Update your FlightmapCard component (components/FlightmapCard.tsx)
import React from 'react';
import { Trash2, Calendar, Target, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Strategy } from '@/types/flightmap';
import { DraftBadge } from '@/components/Forms/Utils/DraftBadge';

interface FlightmapCardProps {
  flightmap: Strategy;
  openModal: () => void;
  onDelete: () => void;
}

const FlightmapCard: React.FC<FlightmapCardProps> = ({ flightmap, openModal, onDelete }) => {
  const { milestone_summary } = flightmap;
  const progressPercentage = (milestone_summary?.total ?? 0) > 0
    ? Math.round(((milestone_summary?.completed ?? 0) / (milestone_summary?.total ?? 1)) * 100)
    : 0;

  return (
    <div onClick={openModal} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 relative cursor-pointer">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 
              className="text-lg font-semibold text-gray-900  hover:text-blue-600"
            >
              {flightmap.name}
            </h3>
            {flightmap.is_draft && <DraftBadge />}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem]">
            {flightmap.description || 'No description provided'}
          </p>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete flightmap"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {milestone_summary?.total || 0}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Total</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-900">
              {milestone_summary?.completed || 0}
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">Completed</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs font-medium text-gray-900">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          <span>{new Date(flightmap.updated_at).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center">
          {flightmap.is_draft ? (
            <span className="flex items-center text-yellow-600">
              <Eye className="w-4 h-4 mr-1" />
              <span className="text-xs">In Progress</span>
            </span>
          ) : (
            <span className="flex items-center text-green-600">
              <EyeOff className="w-4 h-4 mr-1" />
              <span className="text-xs">Completed</span>
            </span>
          )}
        </div>
      </div>

      {/* Additional info for drafts */}
      {flightmap.is_draft && milestone_summary && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{milestone_summary.in_progress || 0} in progress</span>
            <span>{milestone_summary.overdue || 0} overdue</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightmapCard;