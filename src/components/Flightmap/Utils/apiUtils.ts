// src/utils/flightmap/apiUtils.ts
import { MilestonePlacement } from './dataProcessing';
import { RemoteNodePosition, WorkstreamPositions } from './types';
import { UseMutationResult } from '@tanstack/react-query';

interface UpsertPositionParams {
  flightmap: number;
  nodeType: 'milestone' | 'workstream';
  nodeId: number | string;
  relY: number;
  isDuplicate?: boolean;
  duplicateKey?: string;
  originalNodeId?: number;
}

/**
 * Ensures duplicate nodes are properly recorded in the backend
 */
export function ensureDuplicateNodeBackendRecord(
  placement: MilestonePlacement,
  dataId: number,
  remoteMilestonePos: RemoteNodePosition[],
  workstreamPositions: WorkstreamPositions,
  marginTop: number,
  contentHeight: number,
  processedDuplicatesSet: React.MutableRefObject<Set<string>>,
  upsertPosition: UseMutationResult<void, Error, UpsertPositionParams>
) {
  // Only process duplicate nodes with a duplicateKey
  if (!placement.isDuplicate || !placement.duplicateKey || !placement.originalMilestoneId) {
    return;
  }

  // Skip if we've already processed this duplicate
  const duplicateKey = String(placement.duplicateKey);
  if (processedDuplicatesSet.current.has(duplicateKey)) {
    return;
  }  

  // Check if this duplicate already exists in remoteMilestonePos
  const existingPos = remoteMilestonePos.find(p => 
    p.is_duplicate && 
    p.duplicate_key === duplicateKey
  );

  // Only create if it doesn't already exist in the backend
  if (!existingPos) {
    // Get the workstream's y position
    const workstreamId = placement.placementWorkstreamId;
    const workstreamY = workstreamPositions[workstreamId]?.y || 0;

    // Calculate relative Y position (0-1 scale for backend)
    const relY = (workstreamY - marginTop) / contentHeight;

    console.log(`Creating backend record for duplicate milestone: ${duplicateKey}`);

    // Store the duplicate node in the backend
    upsertPosition.mutate({
      flightmap: dataId,
      nodeType: 'milestone',
      // Use duplicateKey as the node_id for backend storage
      nodeId: duplicateKey, // Use duplicateKey instead of original milestone ID
      relY: relY > 0 && relY <= 1 ? relY : 0.5,
      isDuplicate: true,
      duplicateKey: duplicateKey,
      originalNodeId: placement.originalMilestoneId
    });
  }

  // Mark as processed
  processedDuplicatesSet.current.add(duplicateKey);
}