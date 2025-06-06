// Create a new file: components/DraftListModal.tsx
import React, { useState } from 'react';
import { X, FileText, Clock, Trash2, Search, Calendar } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface Draft {
  id: number;
  name: string;
  current_step: string;
  updated_at: string;
  created_at: string;
  progress_percentage: number;
}

interface DraftListModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: Draft[];
  onLoadDraft: (draft: Draft) => void;
  onDeleteDraft: (draftId: number) => void;
  isLoading?: boolean;
}

export const DraftListModal: React.FC<DraftListModalProps> = ({
  isOpen,
  onClose,
  drafts,
  onLoadDraft,
  onDeleteDraft,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  if (!isOpen) return null;

  const filteredDrafts = drafts.filter(draft =>
    draft.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'Less than an hour ago';
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getStepLabel = (stepId: string) => {
    const stepLabels: Record<string, string> = {
      'flightmaps': 'Flightmap',
      'strategies': 'Strategy',
      'strategic-goals': 'Strategic Goal',
      'programs': 'Program',
      'workstreams': 'Workstream',
      'milestones': 'Milestone',
      'activities': 'Activity'
    };
    return stepLabels[stepId] || stepId;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Your Draft Flightmaps
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search drafts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredDrafts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'No drafts found matching your search.' : 'No saved drafts found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedDraftId === draft.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedDraftId(draft.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {draft.name}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            Step: {getStepLabel(draft.current_step)}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(draft.updated_at)}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Created: {new Date(draft.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{draft.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${draft.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const foundDraft = drafts.find(d => d.id === draft.id);
                          if (foundDraft) {
                            setDraftToDelete(foundDraft);
                          }
                        }}
                        className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {filteredDrafts.length} draft{filteredDrafts.length !== 1 ? 's' : ''} found
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const selectedDraft = drafts.find(d => d.id === selectedDraftId);
                    if (selectedDraft) {
                      onLoadDraft(selectedDraft);
                    }
                  }}
                  disabled={!selectedDraftId}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                    selectedDraftId
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Load Selected Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

            {/* Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!draftToDelete}
        onClose={() => setDraftToDelete(null)}
        onConfirm={async () => {
          if (draftToDelete) {
            setIsDeleting(true);
            await onDeleteDraft(draftToDelete.id);
            setIsDeleting(false);
            setDraftToDelete(null);
            
            // Clear selection if deleted draft was selected
            if (selectedDraftId === draftToDelete.id) {
              setSelectedDraftId(null);
            }
          }
        }}
        title="Delete Draft"
        message={`Are you sure you want to delete "${draftToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Draft"
        cancelText="Keep Draft"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};