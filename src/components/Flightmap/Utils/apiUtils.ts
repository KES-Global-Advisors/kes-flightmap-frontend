// src/utils/flightmap/apiUtils.ts
import { MilestonePlacement } from './dataProcessing';
import { RemoteNodePosition, WorkstreamPositions } from './types';
import { absoluteToRelative } from './positionManager';

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
  // CHANGED: Use the enhanced upsert function with error handling
  debouncedUpsertPosition: (
    strategyId: number, 
    nodeType: 'milestone'|'workstream', 
    nodeId: number | string, 
    relY: number, 
    isDuplicate?: boolean, 
    duplicateKey?: string, 
    originalNodeId?: number
  ) => void
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

    // UNIFIED: Use the same precision control as regular nodes
    const relY = absoluteToRelative(workstreamY, marginTop, contentHeight);

    console.log(`Creating backend record for duplicate milestone: ${duplicateKey}`);

    // UNIFIED: Use the enhanced debounced upsert with error handling
    debouncedUpsertPosition(
      dataId,
      'milestone',
      duplicateKey, // Use duplicateKey as the node_id
      relY, // Now using precision-controlled value
      true, // isDuplicate
      duplicateKey,
      placement.originalMilestoneId
    );
  }

  // Mark as processed
  processedDuplicatesSet.current.add(duplicateKey);
}
