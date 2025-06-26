/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useQuickEditModes.ts
import { useState, useCallback, useRef } from 'react';

export type EditMode = 
  | 'none' 
  | 'milestone-editor' 
  | 'dependency-creator' 
  | 'activity-builder' 
  | 'timeline-adjuster' 
  | 'milestone-creator';

export interface EditModeState {
  mode: EditMode;
  selectedNodes: string[];
  tempData: any;
  isActive: boolean;
  step: number; // For multi-step operations (e.g., dependency creation)
}

export interface EditModeCallbacks {
  onMilestoneUpdate?: (milestoneId: string, updates: any) => Promise<void>;
  onDependencyCreate?: (source: number, target: number) => Promise<void>;
  onActivityCreate?: (sourceId: number, targetId: number, activityData: any) => Promise<void>;
  onMilestoneCreate?: (workstreamId: number, position: { x: number, y: number }, milestoneData: any) => Promise<void>;
  onTimelineUpdate?: (milestoneIds: string[], newDeadline: Date) => Promise<void>;
}

export function useQuickEditModes(callbacks?: EditModeCallbacks) {
  const [editState, setEditState] = useState<EditModeState>({
    mode: 'none',
    selectedNodes: [],
    tempData: null,
    isActive: false,
    step: 0
  });

  // Store callbacks in ref to avoid dependency issues
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /**
   * Activate a specific edit mode
   */
  const activateMode = useCallback((mode: EditMode) => {
    console.log(`Activating edit mode: ${mode}`);
    
    setEditState({
      mode,
      selectedNodes: [],
      tempData: null,
      isActive: true,
      step: 0
    });
  }, []);

  /**
   * Deactivate edit mode and reset state
   */
  const deactivateMode = useCallback(() => {
    console.log(`Deactivating edit mode: ${editState.mode}`);
    
    setEditState({
      mode: 'none',
      selectedNodes: [],
      tempData: null,
      isActive: false,
      step: 0
    });
  }, [editState.mode]);

  /**
   * Select a node (milestone, activity, etc.) in the current edit mode
   */
  const selectNode = useCallback((nodeId: string, nodeData?: any) => {
    setEditState(prev => {
      const newSelectedNodes = [...prev.selectedNodes];
      
      // Handle different selection behaviors based on mode
      switch (prev.mode) {
        case 'dependency-creator':
          // For dependency creation, we need exactly 2 nodes
          if (newSelectedNodes.length >= 2) {
            // Reset and start fresh
            return {
              ...prev,
              selectedNodes: [nodeId],
              step: 1,
              tempData: nodeData
            };
          } else {
            return {
              ...prev,
              selectedNodes: [...newSelectedNodes, nodeId],
              step: newSelectedNodes.length + 1,
              tempData: newSelectedNodes.length === 0 ? nodeData : prev.tempData
            };
          }
          
        case 'activity-builder':
          // Similar to dependency creation
          if (newSelectedNodes.length >= 2) {
            return {
              ...prev,
              selectedNodes: [nodeId],
              step: 1,
              tempData: nodeData
            };
          } else {
            return {
              ...prev,
              selectedNodes: [...newSelectedNodes, nodeId],
              step: newSelectedNodes.length + 1,
              tempData: newSelectedNodes.length === 0 ? nodeData : prev.tempData
            };
          }
          
        case 'milestone-editor':
          // For milestone editing, only one selection at a time
          return {
            ...prev,
            selectedNodes: [nodeId],
            step: 1,
            tempData: nodeData
          };
          
        case 'timeline-adjuster': {
          // For timeline adjustment, multiple selections allowed
          const nodeIndex = newSelectedNodes.indexOf(nodeId);
          if (nodeIndex > -1) {
            // Deselect if already selected
            newSelectedNodes.splice(nodeIndex, 1);
          } else {
            // Add to selection
            newSelectedNodes.push(nodeId);
          }
          
          return {
            ...prev,
            selectedNodes: newSelectedNodes,
            step: newSelectedNodes.length > 0 ? 1 : 0
          };
        }
          
        default:
          return {
            ...prev,
            selectedNodes: [nodeId],
            step: 1,
            tempData: nodeData
          };
      }
    });
  }, []);

  /**
   * Clear all selected nodes
   */
  const clearSelection = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      selectedNodes: [],
      tempData: null,
      step: 0
    }));
  }, []);

  /**
   * Update temporary data for the current edit operation
   */
  const updateTempData = useCallback((data: any) => {
    setEditState(prev => ({
      ...prev,
      tempData: data
    }));
  }, []);

  /**
   * Execute the current edit operation based on mode and selected nodes
   */
  const executeEdit = useCallback(async (additionalData?: any) => {
    const { mode, selectedNodes, tempData } = editState;
    
    try {
      switch (mode) {
        case 'dependency-creator':
          if (selectedNodes.length === 2 && callbacksRef.current?.onDependencyCreate) {
            const sourceId = parseInt(selectedNodes[0]);
            const targetId = parseInt(selectedNodes[1]);
            await callbacksRef.current.onDependencyCreate(sourceId, targetId);
            clearSelection();
          }
          break;
          
        case 'activity-builder':
          if (selectedNodes.length === 2 && callbacksRef.current?.onActivityCreate) {
            const sourceId = parseInt(selectedNodes[0]);
            const targetId = parseInt(selectedNodes[1]);
            await callbacksRef.current.onActivityCreate(sourceId, targetId, additionalData);
            clearSelection();
          }
          break;
          
        case 'milestone-editor':
          if (selectedNodes.length === 1 && callbacksRef.current?.onMilestoneUpdate) {
            await callbacksRef.current.onMilestoneUpdate(selectedNodes[0], additionalData);
            clearSelection();
          }
          break;
          
        case 'milestone-creator':
          if (callbacksRef.current?.onMilestoneCreate && tempData && additionalData) {
            await callbacksRef.current.onMilestoneCreate(
              tempData.workstreamId, 
              tempData.position, 
              additionalData
            );
            clearSelection();
          }
          break;
          
        case 'timeline-adjuster':
          if (selectedNodes.length > 0 && callbacksRef.current?.onTimelineUpdate && additionalData) {
            await callbacksRef.current.onTimelineUpdate(selectedNodes, additionalData.newDeadline);
            clearSelection();
          }
          break;
      }
    } catch (error) {
      console.error(`Error executing edit operation for mode ${mode}:`, error);
      // Don't clear selection on error, allow retry
    }
  }, [editState, clearSelection]);

  /**
   * Check if a node is currently selected
   */
  const isNodeSelected = useCallback((nodeId: string) => {
    return editState.selectedNodes.includes(nodeId);
  }, [editState.selectedNodes]);

  /**
   * Get the current step description for UI feedback
   */
  const getStepDescription = useCallback(() => {
    const { mode, step, selectedNodes } = editState;
    
    switch (mode) {
      case 'dependency-creator':
        if (step === 0) return 'Click source milestone';
        if (step === 1) return 'Click target milestone';
        if (step === 2) return 'Confirm dependency creation';
        break;
        
      case 'activity-builder':
        if (step === 0) return 'Click source milestone';
        if (step === 1) return 'Click target milestone';
        if (step === 2) return 'Configure activity details';
        break;
        
      case 'milestone-editor':
        if (step === 0) return 'Click milestone to edit';
        if (step === 1) return 'Edit milestone details';
        break;
        
      case 'milestone-creator':
        if (step === 0) return 'Click in workstream area';
        if (step === 1) return 'Configure new milestone';
        break;
        
      case 'timeline-adjuster':
        if (step === 0) return 'Select milestones to reschedule';
        if (step === 1) return `${selectedNodes.length} milestone(s) selected`;
        break;
    }
    
    return 'Select items to edit';
  }, [editState]);

  return {
    editState,
    activateMode,
    deactivateMode,
    selectNode,
    clearSelection,
    updateTempData,
    executeEdit,
    isNodeSelected,
    getStepDescription,
    
    // Computed properties for convenience
    isEditMode: editState.isActive,
    currentMode: editState.mode,
    selectedCount: editState.selectedNodes.length,
    canExecute: editState.step > 0 && editState.selectedNodes.length > 0
  };
}