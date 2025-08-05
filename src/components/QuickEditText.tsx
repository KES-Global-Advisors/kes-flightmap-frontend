/* eslint-disable @typescript-eslint/no-explicit-any */
// components/QuickEditText.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X, Loader2 } from 'lucide-react';
import { useQuickEdit } from './QuickEditProvider';
import { useQuickEditAPI } from '../hooks/useQuickEditAPI';

interface QuickEditTextProps {
  value: string;
  entityType: 'strategies' | 'programs' | 'workstreams' | 'strategic-goals' | 'milestones' | 'activities';
  entityId: number;
  field: string;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  onUpdate?: (newValue: string) => void;
}

export const QuickEditText: React.FC<QuickEditTextProps> = ({
  value,
  entityType,
  entityId,
  field,
  className = '',
  multiline = false,
  placeholder = 'Click to edit...',
  maxLength = 500,
  onUpdate
}) => {
  const { isQuickEditEnabled, editingField, setEditingField, pendingUpdates, addPendingUpdate, removePendingUpdate } = useQuickEdit();
  const { updateField, error } = useQuickEditAPI();
  
  const [editValue, setEditValue] = useState(value);
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  
  const fieldKey = `${entityType}-${entityId}-${field}`;
  const isEditing = editingField === fieldKey;
  const isPending = pendingUpdates.has(fieldKey);

  // Reset edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      } else {
        // For textarea, select all
        inputRef.current.setSelectionRange(0, inputRef.current.value.length);
      }
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!isQuickEditEnabled || isPending) return;
    setEditingField(fieldKey);
    setShowError(false);
  };

  const handleSave = async () => {
    if (editValue.trim() === value || isPending) {
      handleCancel();
      return;
    }

    addPendingUpdate(fieldKey);
    
    const success = await updateField(entityType, entityId, field, editValue.trim());
    
    if (success) {
      setEditingField(null);
      onUpdate?.(editValue.trim());
    } else {
      setShowError(true);
      // Keep editing mode open on error
    }
    
    removePendingUpdate(fieldKey);
  };

  const handleCancel = () => {
    setEditValue(value);
    setEditingField(null);
    setShowError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && multiline && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = value || placeholder;
  const isEmpty = !value;

  if (!isQuickEditEnabled) {
    return (
      <span className={`${className} ${isEmpty ? 'text-gray-400' : ''}`}>
        {displayValue}
      </span>
    );
  }

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    
    return (
      <div className="relative inline-block w-full">
        <InputComponent
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          maxLength={maxLength}
          className={`
            ${className}
            border border-blue-300 rounded px-2 py-1 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${multiline ? 'resize-none min-h-[2.5rem]' : ''}
            ${showError ? 'border-red-300 bg-red-50' : ''}
          `}
          rows={multiline ? 3 : undefined}
          disabled={isPending}
        />
        
        {/* Action buttons */}
        <div className="absolute -right-16 top-0 flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            disabled={isPending}
            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
            title="Save (Enter)"
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            disabled={isPending}
            className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Error message */}
        {showError && error && (
          <div className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
            {error}
          </div>
        )}

        {/* Instructions for multiline */}
        {multiline && (
          <div className="absolute top-full left-0 mt-1 text-xs text-gray-500">
            Ctrl+Enter to save, Esc to cancel
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`
        ${className}
        ${isEmpty ? 'text-gray-400' : ''}
        group cursor-pointer hover:bg-cyan-400 rounded px-1 py-0.5 -mx-1 -my-0.5
        transition-colors duration-150
        ${isPending ? 'opacity-50 cursor-wait' : ''}
      `}
      title={isQuickEditEnabled ? 'Click to edit' : undefined}
    >
      <span className="inline-flex items-center">
        {displayValue}
        {isQuickEditEnabled && !isPending && (
          <Edit2 className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
        {isPending && (
          <Loader2 className="w-3 h-3 ml-1 animate-spin opacity-50" />
        )}
      </span>
    </div>
  );
};