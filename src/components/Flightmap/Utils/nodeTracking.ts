// src/utils/flightmap/nodeTracking.ts
import { MilestonePlacement } from './dataProcessing';

/**
 * Tracks node positions in the appropriate coordinate storage
 * to maintain a single source of truth for positions
 */
export function trackNodePosition(
  placement: MilestonePlacement,
  x: number,
  y: number,
  duplicateNodeCoordinates: React.MutableRefObject<Record<string, { x: number; y: number }>>,
  originalNodeCoordinates: React.MutableRefObject<Record<string, { x: number; y: number }>>,
  placementCoordinates: Record<string, { 
    x: number; 
    y: number; 
    isDuplicate?: boolean; 
    originalId?: number; 
    duplicateKey?: string | number;
    workstreamId: number;
  }>
) {
  // Store position in dedicated tracking object based on node type
  if (placement.isDuplicate) {
    duplicateNodeCoordinates.current[placement.id] = { x, y };
  } else {
    originalNodeCoordinates.current[placement.id] = { x, y };
  }
  
  // Store position in unified placement coordinates object
  // which serves as the single source of truth for all element positions
  placementCoordinates[placement.id] = {
    x,
    y,
    isDuplicate: !!placement.isDuplicate,
    originalId: placement.originalMilestoneId,
    duplicateKey: placement.duplicateKey,
    workstreamId: placement.isDuplicate 
      ? placement.placementWorkstreamId 
      : placement.milestone.workstreamId
  };
}