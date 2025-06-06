// Create a new file: components/DraftRecoveryModal.tsx
import React, { useContext } from 'react';
import { X, FileText, Clock, AlertCircle } from 'lucide-react';
import { ThemeContext } from '@/contexts/ThemeContext';


interface DraftRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
  onDiscard: () => void;
  draftData: {
    name: string;
    lastSaved: string;
    currentStep: string;
  } | null;
}

export const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({
  isOpen,
  onClose,
  onRestore,
  onDiscard,
  draftData
}) => {
  const { themeColor } = useContext(ThemeContext);
  if (!isOpen || !draftData) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
          {/* Header */}
          <div 
            style={{ backgroundColor: themeColor }}
            className="px-6 py-4 rounded-t-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-white" />
                <h3 className="text-lg font-semibold text-white">
                  Unsaved Progress Detected
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 mb-3">
                  We found an incomplete flightmap creation session:
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Draft Name:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {draftData.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Saved:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {draftData.lastSaved}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Step:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {draftData.currentStep}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-600">
                  Would you like to continue where you left off?
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onDiscard}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={onRestore}
                style={{ backgroundColor: themeColor }}
                className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Continue Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};