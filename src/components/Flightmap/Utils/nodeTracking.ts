// src/utils/flightmap/nodeTracking.ts
import { MilestonePlacement } from './dataProcessing';
import { PlacementCoordinate } from './types';

/**
 * Tracks node positions in the appropriate coordinate storage
 */
export function trackNodePosition(
  placement: MilestonePlacement,
  x: number,
  y: number,
  duplicateNodeCoordinates: React.MutableRefObject<Record<string, { x: number; y: number }>>,
  originalNodeCoordinates: React.MutableRefObject<Record<string, { x: number; y: number }>>,
  placementCoordinates: Record<string, PlacementCoordinate>
) {
  if (placement.isDuplicate) {
    duplicateNodeCoordinates.current[placement.id] = { x, y };
    // Store original reference for cross-referencing
    placementCoordinates[placement.id] = {
      x,
      y,
      isDuplicate: true,
      originalId: placement.originalMilestoneId,
      duplicateKey: placement.duplicateKey, // Track the duplicate key
      workstreamId: placement.placementWorkstreamId // Add workstream ID
    };
  } else {
    originalNodeCoordinates.current[placement.id] = { x, y };
    placementCoordinates[placement.id] = {
      x,
      y,
      isDuplicate: false,
      workstreamId: placement.placementWorkstreamId // Add workstream ID
    };
  }
}