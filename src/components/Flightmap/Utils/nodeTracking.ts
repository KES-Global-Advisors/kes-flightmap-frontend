// nodeTracking.ts - NEW VERSION
import { MilestonePlacement } from './dataProcessing';

export interface TrackedPosition {
  x: number;
  y: number;
  isDuplicate: boolean;
  originalId?: number;
  duplicateKey?: string | number;
  workstreamId: number;
  nodeType: 'original' | 'duplicate';
  lastUpdated?: number; // For debugging/optimization
}

/**
 * Tracks node position in the unified coordinate system
 */
export function trackNodePosition(
  placement: MilestonePlacement,
  x: number,
  y: number,
  placementCoordinates: Record<string, TrackedPosition>
): TrackedPosition {
  const position: TrackedPosition = {
    x,
    y,
    isDuplicate: !!placement.isDuplicate,
    originalId: placement.originalMilestoneId,
    duplicateKey: placement.duplicateKey,
    workstreamId: placement.isDuplicate 
      ? placement.placementWorkstreamId 
      : placement.milestone.workstreamId,
    nodeType: placement.isDuplicate ? 'duplicate' : 'original',
    lastUpdated: Date.now()
  };
  
  placementCoordinates[placement.id] = position;
  return position;
}

// Helper functions for common queries
export function getNodePosition(
  nodeId: string, 
  placementCoordinates: Record<string, TrackedPosition>
): TrackedPosition | undefined {
  return placementCoordinates[nodeId];
}

export function getNodesByType(
  type: 'original' | 'duplicate',
  placementCoordinates: Record<string, TrackedPosition>
): Array<[string, TrackedPosition]> {
  return Object.entries(placementCoordinates)
    .filter(([, pos]) => pos.nodeType === type);
}

export function getNodesInWorkstream(
  workstreamId: number,
  placementCoordinates: Record<string, TrackedPosition>
): Array<[string, TrackedPosition]> {
  return Object.entries(placementCoordinates)
    .filter(([, pos]) => pos.workstreamId === workstreamId);
}