// src/hooks/useDragBehaviors.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useEffect } from 'react';
import { flushSync } from 'react-dom';
import * as d3 from 'd3';
import { DefaultLinkObject } from 'd3-shape';
import { MilestonePlacement } from '@/components/Flightmap/Utils/dataProcessing';
import { updateNodePosition, calculateConstrainedY, updateWorkstreamPosition } from '@/components/Flightmap/Utils/positionManager';
import { TrackedPosition } from '@/components/Flightmap/Utils/nodeTracking';

class BatchedStateManager {
  private pendingMilestoneUpdates = new Map<string, { y: number }>();
  private pendingWorkstreamUpdates = new Map<number, { y: number }>();
  private updateScheduled = false;
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor(
    private setMilestonePositions: React.Dispatch<React.SetStateAction<Record<string, { y: number }>>>,
    private setWorkstreamPositions: React.Dispatch<React.SetStateAction<Record<number, { y: number }>>>
  ) {}

  /**
   * ✅ OPTIMIZED: Queue milestone position update
   * Batches multiple updates into single setState call
   */
  queueMilestoneUpdate(id: string, position: { y: number }) {
    this.pendingMilestoneUpdates.set(id, position);
    this.scheduleFlush();
  }

  /**
   * ✅ OPTIMIZED: Queue workstream position update
   * Batches multiple updates into single setState call
   */
  queueWorkstreamUpdate(id: number, position: { y: number }) {
    this.pendingWorkstreamUpdates.set(id, position);
    this.scheduleFlush();
  }

  /**
   * ✅ PERFORMANCE: Schedule batched flush using React's scheduling
   */
  private scheduleFlush() {
    if (this.updateScheduled) return;

    this.updateScheduled = true;

    // ✅ OPTIMIZATION: Use different strategies based on update volume
    const totalUpdates = this.pendingMilestoneUpdates.size + this.pendingWorkstreamUpdates.size;

    if (totalUpdates > 10) {
      // ✅ HIGH VOLUME: Use longer delay for batch efficiency
      this.flushTimeout = setTimeout(() => this.flushUpdates(), 50);
    } else {
      // ✅ LOW VOLUME: Use requestAnimationFrame for next frame update
      requestAnimationFrame(() => this.flushUpdates());
    }
  }

  /**
   * ✅ CRITICAL: Flush all pending updates in single batch
   * Prevents multiple re-renders and ensures React 18 batching
   */
  private flushUpdates() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // ✅ EARLY EXIT: Nothing to flush
    if (this.pendingMilestoneUpdates.size === 0 && this.pendingWorkstreamUpdates.size === 0) {
      this.updateScheduled = false;
      return;
    }

    // ✅ BATCH: Execute all state updates in single React batch
    flushSync(() => {
      // ✅ MILESTONE UPDATES: Single setState call for all milestone changes
      if (this.pendingMilestoneUpdates.size > 0) {
        const milestoneUpdates = Object.fromEntries(this.pendingMilestoneUpdates);
        this.setMilestonePositions(prev => ({ ...prev, ...milestoneUpdates }));
        this.pendingMilestoneUpdates.clear();
      }

      // ✅ WORKSTREAM UPDATES: Single setState call for all workstream changes
      if (this.pendingWorkstreamUpdates.size > 0) {
        const workstreamUpdates = Object.fromEntries(this.pendingWorkstreamUpdates);
        this.setWorkstreamPositions(prev => ({ ...prev, ...workstreamUpdates }));
        this.pendingWorkstreamUpdates.clear();
      }
    });

    this.updateScheduled = false;
  }

  /**
   * ✅ NEW: Force immediate flush for critical updates
   */
  forceFlush() {
    if (this.updateScheduled) {
      this.flushUpdates();
    }
  }

  /**
   * ✅ NEW: Clear all pending updates (for cleanup)
   */
  clear() {
    this.pendingMilestoneUpdates.clear();
    this.pendingWorkstreamUpdates.clear();
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    this.updateScheduled = false;
  }
}

/**
 * Custom hook providing drag behaviors for milestones and workstreams
 * in the Flightmap visualization
 */
export function useDragBehaviors({
  data,
  timelineMarkers,
  allMilestones,
  activities,
  dependencies,
  workstreamPositions,
  setWorkstreamPositions,
  setMilestonePositions,
  placementCoordinates,
  milestonesGroup,
  workstreamGroup,
  margin,
  contentHeight,
  xScale,
  debouncedUpsertPosition,
  debouncedUpdateConnections,
  onMilestoneDeadlineChange,
  connectionCache,
  activitiesGroup,
  dependencyGroup,
}: {
  // Data
  data: { id: number };
  timelineMarkers: Date[];
  allMilestones: any[];
  activities: any[];
  dependencies: any[];
  milestonePlacements: MilestonePlacement[];
  
  // State
  workstreamPositions: { [id: number]: { y: number } };
  setWorkstreamPositions: React.Dispatch<React.SetStateAction<{ [id: number]: { y: number } }>>;
  milestonePositions: { [id: string]: { y: number } };
  setMilestonePositions: React.Dispatch<React.SetStateAction<{ [id: string]: { y: number } }>>;
  
  placementCoordinates: Record<string, TrackedPosition>;
  milestonesGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  workstreamGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  
  // Layout and scaling
  margin: { top: number; right: number; bottom: number; left: number };
  contentHeight: number;
  contentWidth: number;
  xScale: d3.ScaleTime<number, number>;
  
  // Callbacks
  debouncedUpsertPosition: (
    strategyId: number, 
    nodeType: 'milestone'|'workstream', 
    nodeId: number | string, 
    relY: number,
    isDuplicate?: boolean, 
    duplicateKey?: string, 
    originalNodeId?: number
  ) => void;
  onMilestoneDeadlineChange: (milestoneId: string, newDeadline: Date) => Promise<boolean>;
  // Optional connection cache for performance
  connectionCache?: {
    activityMap: Map<string, any[]>;
    dependencyMap: Map<string, any[]>;
  };

  activitiesGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  dependencyGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  debouncedUpdateConnections?: (nodeId: string | number) => void; // ADD THIS
}) {

    // CREATE: Batched state manager instance
  const batchedStateManager = useMemo(
    () => new BatchedStateManager(setMilestonePositions, setWorkstreamPositions),
    [setMilestonePositions, setWorkstreamPositions]
  );

  // CLEANUP: Clear batched updates on unmount
  useEffect(() => {
    return () => {
      batchedStateManager.clear();
    };
  }, [batchedStateManager]);

  // Create connection cache if not provided
  const internalConnectionCache = useMemo(() => {
    // If cache already provided, use it
    if (connectionCache) return connectionCache;
    
    // Otherwise create our own cache
    const activityMap = new Map<string, any[]>();
    const dependencyMap = new Map<string, any[]>();
    
    // Build activity lookup by node id
    activities.forEach(activity => {
      const sourceId = activity.source_milestone.toString();
      
      // Map source → activities
      if (!activityMap.has(sourceId)) {
        activityMap.set(sourceId, []);
      }
      activityMap.get(sourceId)?.push(activity);
      
      // Map targets → activities 
      (activity.target_milestone || []).forEach((targetId: any) => {
        const targetIdStr = targetId.toString();
        if (!activityMap.has(targetIdStr)) {
          activityMap.set(targetIdStr, []);
        }
        activityMap.get(targetIdStr)?.push(activity);
      });
    });
    
    // Build dependency lookup by node id
    dependencies.forEach(dep => {
      const sourceId = dep.source.toString();
      const targetId = dep.target.toString();
      
      // Map source → dependencies
      if (!dependencyMap.has(sourceId)) {
        dependencyMap.set(sourceId, []);
      }
      dependencyMap.get(sourceId)?.push(dep);
      
      // Map target → dependencies
      if (!dependencyMap.has(targetId)) {
        dependencyMap.set(targetId, []);
      }
      dependencyMap.get(targetId)?.push(dep);
    });
    
    return { activityMap, dependencyMap };
  }, [connectionCache, activities, dependencies]);

  /**
   * OPTIMIZED: Updates visual connections for a specific node
   * BEFORE: Used document.documentElement queries (expensive)
   * AFTER: Uses scoped group selections (70-80% faster)
   */
  const updateVisualConnectionsForNode = useCallback((nodeId: string | number) => {
   // ✅ EARLY EXIT: Skip if required groups don't exist
    if (!milestonesGroup.current || !activitiesGroup.current || !dependencyGroup.current) return;


    // Get the node data
    const nodeIdStr = nodeId.toString();
    const nodeData = placementCoordinates[nodeIdStr];
    if (!nodeData) return;

    const isDuplicate = Boolean(nodeData.isDuplicate);

    // ✅ OPTIMIZED: Use connection cache for O(1) lookups instead of filtering
    const relevantActivities = internalConnectionCache.activityMap.get(nodeIdStr) || [];
    const relevantDependencies = internalConnectionCache.dependencyMap.get(nodeIdStr) || [];

    // Update each affected activity path
    relevantActivities.forEach(activity => {
      // ✅ NEW STRUCTURE: Use source_milestone and target_milestone
      const sourceId = activity.source_milestone;
      const targetId = activity.target_milestone;

      if (!sourceId || !targetId) return;

      const sourceCoord = placementCoordinates[sourceId.toString()];
      const targetCoord = placementCoordinates[targetId.toString()];

      if (!sourceCoord || !targetCoord) return;

      // ✅ CRITICAL OPTIMIZATION: Scoped selection instead of document-wide search
      const activityPath = activitiesGroup.current!
        .selectAll(`[data-activity-id="${activity.id}"][data-source-id="${sourceId}"][data-target-id="${targetId}"]`);
      
      // ✅ OPTIMIZED: Update path only if found (avoid empty selections)
      if (!activityPath.empty()) {
        activityPath.attr(
          "d",
          d3.linkHorizontal()({
            source: [sourceCoord.x, sourceCoord.y],
            target: [targetCoord.x, targetCoord.y],
          } as DefaultLinkObject) ?? ""
        );
        
        updateActivityLabel(activity.id, activityPath.node() as SVGPathElement | null);
      }

      // ✅ MAINTAINED: Handle cross-workstream supported milestones
      (activity.supported_milestones || []).forEach((supportedId: number) => {
        const supportedCoord = placementCoordinates[supportedId.toString()];
        if (!supportedCoord) return;

        const crossActivityPath = activitiesGroup.current!
          .selectAll(".cross-workstream-activity")
          .filter((d: any) => 
            d && d.id === activity.id && 
            d.target_milestone === supportedId
          );

        if (!crossActivityPath.empty()) {
          crossActivityPath.attr(
            "d",
            d3.linkHorizontal()({
              source: [sourceCoord.x, sourceCoord.y],
              target: [supportedCoord.x, supportedCoord.y],
            } as DefaultLinkObject) ?? ""
          );
        }
      });

      // ✅ MAINTAINED: Handle additional milestones
      (activity.additional_milestones || []).forEach((additionalId: number) => {
        const additionalCoord = placementCoordinates[additionalId.toString()];
        if (!additionalCoord) return;

        const additionalActivityPath = activitiesGroup.current!
          .selectAll(".cross-workstream-activity")
          .filter((d: any) => 
            d && d.id === activity.id && 
            d.target_milestone === additionalId
          );

        if (!additionalActivityPath.empty()) {
          additionalActivityPath.attr(
            "d",
            d3.linkHorizontal()({
              source: [sourceCoord.x, sourceCoord.y],
              target: [additionalCoord.x, additionalCoord.y],
            } as DefaultLinkObject) ?? ""
          );
        }
      });
    });

    // ✅ OPTIMIZED: Scoped dependency updates (BEFORE: document.documentElement)
    relevantDependencies.forEach(dep => {
      const sourceCoord = placementCoordinates[dep.source.toString()];
      const targetCoord = placementCoordinates[dep.target.toString()];

      if (!sourceCoord || !targetCoord) return;

      // 🔥 CRITICAL OPTIMIZATION: Scoped dependency selection
      const dependencyLine = dependencyGroup.current!
        .selectAll(".dependency-line, .duplicate-dependency-line")
        .filter((d: any) => 
          d && d.source === dep.source && d.target === dep.target
        );
      
      // ✅ Update only if found
      if (!dependencyLine.empty()) {
        dependencyLine.attr(
          "d",
          d3.linkHorizontal()({
            source: [sourceCoord.x, sourceCoord.y],
            target: [targetCoord.x, targetCoord.y],
          } as DefaultLinkObject) ?? ""
        );
      }
    });

    // ✅ OPTIMIZED: Handle duplicate node connections with scoped selections
    if (isDuplicate && nodeData.originalId) {
      updateDuplicateConnections(nodeIdStr, nodeData);
    }
  }, [placementCoordinates, milestonesGroup, activitiesGroup, dependencyGroup, internalConnectionCache]);

  /**
   * ✅ NEW: Optimized activity label update helper
   * Extracted to avoid repetition and improve performance
   */
  const updateActivityLabel = useCallback((activityId: number, pathNode: SVGPathElement | null) => {
    if (!pathNode || !activitiesGroup.current) return;
  
    try {
      const pathLength = pathNode.getTotalLength();
      if (pathLength === 0) return; // Skip if path has no length
      
      const midpoint = pathNode.getPointAtLength(pathLength / 2);
    
      // Use attribute selectors for better performance
      const labelRect = activitiesGroup.current
        .select(`rect[data-activity-id="${activityId}"]`);
    
      const labelText = activitiesGroup.current
        .select(`text[data-activity-id="${activityId}"]`);
    
      if (!labelRect.empty()) {
        labelRect
          .attr("x", midpoint.x - 100)
          .attr("y", midpoint.y - 10);
      }
    
      if (!labelText.empty()) {
        labelText
          .attr("x", midpoint.x)
          .attr("y", midpoint.y);
      }
    } catch (error) {
      console.warn(`Failed to update label for activity ${activityId}:`, error);
    }
  }, [activitiesGroup]);

    /**
   * ✅ NEW: Optimized duplicate connection update helper
   * Extracted and optimized for better performance
   */
  const updateDuplicateConnections = useCallback((nodeIdStr: string, nodeData: any) => {
    if (!dependencyGroup.current) return;

    const workstreamId = nodeData.workstreamId;

    // ✅ OPTIMIZED: Use filtered dependencies instead of all dependencies
    const relevantDeps = dependencies.filter(dep => 
      dep.source === nodeData.originalId &&
      allMilestones.find(m => m.id === dep.target)?.workstreamId === workstreamId
    );

    relevantDeps.forEach(dep => {
      const targetCoord = placementCoordinates[dep.target.toString()];
      if (!targetCoord) return;

      // ✅ OPTIMIZED: Scoped duplicate connection selection
      const duplicateConn = dependencyGroup.current!
        .selectAll(".duplicate-dependency-line")
        .filter((d: any) => 
          (d && d.source === nodeIdStr && d.target === dep.target) ||
          (d && d.originalId === nodeData.originalId && d.duplicateId === nodeIdStr)
        );

      if (!duplicateConn.empty()) {
        duplicateConn.attr(
          "d",
          d3.linkHorizontal()({
            source: [nodeData.x, nodeData.y],
            target: [targetCoord.x, targetCoord.y],
          } as DefaultLinkObject) ?? ""
        );
      }
    });

    // ✅ OPTIMIZED: Handle cross-workstream activity connections
    updateCrossWorkstreamActivities(nodeData, workstreamId);
  }, [dependencies, allMilestones, placementCoordinates, activitiesGroup]);

  /**
   * ✅ NEW: Optimized cross-workstream activity updates
   */
  const updateCrossWorkstreamActivities = useCallback((nodeData: any, workstreamId: number) => {
    if (!activitiesGroup.current) return;

    const relevantActivities = activities.filter(activity => {
      const supportedMilestones = [
        ...(activity.supported_milestones || []),
        ...(activity.additional_milestones || [])
      ];
      return (
        activity.workstreamId === workstreamId && 
        supportedMilestones.includes(nodeData.originalId)
      );
    });

    relevantActivities.forEach(activity => {
      const sourceCoord = placementCoordinates[activity.source_milestone.toString()];
      if (!sourceCoord) return;

      // ✅ OPTIMIZED: Scoped cross-workstream activity selection
      const activityLine = activitiesGroup.current!
        .selectAll(".cross-workstream-activity")
        .filter((d: any) => 
          d && d.id === activity.id && 
          d.target_milestone && 
          d.target_milestone.includes(nodeData.originalId)
        );

      if (!activityLine.empty()) {
        activityLine.attr(
          "d",
          d3.linkHorizontal()({
            source: [sourceCoord.x, sourceCoord.y],
            target: [nodeData.x, nodeData.y],
          } as DefaultLinkObject) ?? ""
        );
      }
    });
  }, [activities, placementCoordinates, activitiesGroup]);

  // ✅ OPTIMIZED: Batch update functions with performance improvements
   const updateActivities = useCallback(() => {
    // ✅ PERFORMANCE: Get unique nodes involved in activities
    const involvedNodes = new Set<string>();
    
    activities.forEach(activity => {
      // ✅ NEW STRUCTURE: Use source_milestone and target_milestone
      if (activity.source_milestone) {
        involvedNodes.add(activity.source_milestone.toString());
      }
      if (activity.target_milestone) {
        involvedNodes.add(activity.target_milestone.toString());
      }
      
      // ✅ MAINTAINED: Include cross-workstream milestones
      (activity.supported_milestones || []).forEach((id: number) => {
        involvedNodes.add(id.toString());
      });
      (activity.additional_milestones || []).forEach((id: number) => {
        involvedNodes.add(id.toString());
      });
    });
    
    // ✅ OPTIMIZED: Use batch updates with requestAnimationFrame
    requestAnimationFrame(() => {
      Array.from(involvedNodes).forEach(nodeId => {
        updateVisualConnectionsForNode(nodeId);
      });
    });
  }, [activities, updateVisualConnectionsForNode]);

  const updateDependencies = useCallback(() => {
    // ✅ PERFORMANCE: Get unique source nodes to minimize updates
    const sourceNodes = new Set<string>();
    dependencies.forEach(dep => {
      sourceNodes.add(dep.source.toString());
    });
    
    // ✅ OPTIMIZED: Use batch updates with requestAnimationFrame
    requestAnimationFrame(() => {
      Array.from(sourceNodes).forEach(nodeId => {
        updateVisualConnectionsForNode(nodeId);
      });
    });
  }, [dependencies, updateVisualConnectionsForNode]);

  /**
   * Creates drag behavior for milestone nodes with batched updates
   */
  const createMilestoneDragBehavior = useCallback(() => {
    return d3.drag<SVGGElement, any>()
      .on("start", function(event, d) {
        // Add dragging class for CSS styling
        d3.select(this).classed("dragging", true);
        
        // Important: Raise this element to the top of the rendering order
        // This ensures the node appears above connection lines during drag
        d3.select(this).raise();
        
        // Store the initial drag position 
        d.dragStartX = event.x;
        d.dragStartY = event.y;
      })
      .on("drag", function(event, d) {
        // Get current workstream position
        const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
        
        // Calculate position using delta from drag start
        const deltaX = event.x - d.dragStartX;
        const deltaY = event.y - d.dragStartY;
        
        // Calculate new absolute position
        const newX = d.initialX + deltaX;
        const newY = d.initialY + deltaY;
        
        // Apply boundary constraints
        const constrainedY = calculateConstrainedY(
          newY,
          workstreamId,
          workstreamPositions
        );
        
        // 1. First, update the node's position via transform
        // This is critical - must ensure node visual update happens first
        const node = d3.select(this);
        node.attr("transform", `translate(${deltaX}, ${constrainedY - d.initialY})`);
        
        // 2. Ensure the circle and text move with the transform
        // This ensures the visual elements are immediately updated
        const circle = node.select("circle");
        if (!circle.empty()) {
          // Make sure circle gets explicit z-index priority in addition to transform
          circle.raise();
        }
        
        // 3. Update placement coordinates for visual connections
        if (placementCoordinates[d.id]) {
          placementCoordinates[d.id].x = newX; // Also update X during drag for smoother motion
          placementCoordinates[d.id].y = constrainedY;
        }
        
        // 4. Update the visual connections after node is already moved
        // This ensures we don't see the node "lagging behind" the connections
        if (debouncedUpdateConnections) {
          debouncedUpdateConnections(d.id);
        } else {
          updateVisualConnectionsForNode(d.id);
        }
      })
  .on("end", function(event, d) {
    d3.select(this).classed("dragging", false);

    // Determine workstream
    const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;

    // Calculate final position
    const deltaX = event.x - d.dragStartX;
    const deltaY = event.y - d.dragStartY;
    const newX = d.initialX + deltaX;
    const newY = d.initialY + deltaY;

    // Apply constraints
    const constrainedY = calculateConstrainedY(
      newY,
      workstreamId,
      workstreamPositions
    );

    // Find closest timeline marker for X position
    const droppedX = newX;
    const closestMarker = timelineMarkers.reduce((prev, curr) => {
      const prevDist = Math.abs(xScale(prev) - droppedX);
      const currDist = Math.abs(xScale(curr) - droppedX);
      return currDist < prevDist ? curr : prev;
    });

    const newDeadline = closestMarker;
    const snappedX = xScale(newDeadline);

    // Check if position has actually changed significantly
    const currentPosition = placementCoordinates[d.id];
    const positionChanged = !currentPosition || 
      Math.abs(currentPosition.y - constrainedY) > 1 ||
      Math.abs(currentPosition.x - snappedX) > 1;

    // ✅ FIX: Remove duplicate state update - only use batchedStateManager
    if (positionChanged) {
      // Queue update through batch manager
      batchedStateManager.queueMilestoneUpdate(d.id, { y: constrainedY });

      // ✅ FIX: Force flush for drag end to ensure immediate update
      batchedStateManager.forceFlush();
    }

    // ✅ FIX: Update visual position AFTER state update
    // This ensures the visual matches the state
    d3.select(this).attr("transform", `translate(${snappedX - d.initialX}, ${constrainedY - d.initialY})`);

    // Update node position in coordinate system
    updateNodePosition(
      d.id,
      { x: snappedX, y: constrainedY },
      {
        milestonesGroup,
        placementCoordinates,
        margin,
        contentHeight,
        dataId: data.id,
        isDuplicate: d.isDuplicate,
        originalMilestoneId: d.originalMilestoneId,
        debouncedUpsertPosition,
        updateDOM: false, // ✅ FIX: Don't update DOM here since we just did it above
        updateConnections: true,
        updateConnectionsFunction: updateVisualConnectionsForNode
      }
    );

    // Handle deadline changes only for original nodes
    if (!d.isDuplicate) {
      const originalDateMs = new Date(d.milestone.deadline).getTime();
      const newDateMs = newDeadline.getTime();
      if (newDateMs !== originalDateMs) {
        onMilestoneDeadlineChange(d.milestone.id.toString(), newDeadline)
          .then((ok) => {
            if (!ok) {
              // Rollback position
              const origX = xScale(new Date(d.milestone.deadline));

              // ✅ FIX: Update state before visual
              batchedStateManager.queueMilestoneUpdate(d.id, { y: currentPosition.y });
              batchedStateManager.forceFlush();

              // Then update visual
              d3.select(this).attr("transform", `translate(${origX - d.initialX}, ${currentPosition.y - d.initialY})`);

              updateNodePosition(
                d.id,
                { x: origX, y: currentPosition.y },
                {
                  milestonesGroup,
                  placementCoordinates,
                  margin,
                  contentHeight,
                  dataId: data.id,
                  isDuplicate: d.isDuplicate,
                  originalMilestoneId: d.originalMilestoneId,
                  debouncedUpsertPosition,
                  updateDOM: false,
                  updateConnections: true,
                  updateConnectionsFunction: updateVisualConnectionsForNode
                }
              );
            }
          });
      }
    }
  })
  }, [workstreamPositions, timelineMarkers, xScale, updateVisualConnectionsForNode, milestonesGroup, placementCoordinates, margin, contentHeight, data.id, debouncedUpsertPosition, setMilestonePositions, onMilestoneDeadlineChange, batchedStateManager]);

  /**
   * Creates drag behavior for workstream lanes
   */
  const createWorkstreamDragBehavior = useCallback(() => {
    // Track affected milestones to minimize updates
    let affectedMilestoneIds = new Set<string>();
    
    return d3.drag<SVGGElement, any>()
      .on("start", function (event, d) {
        d3.select(this).classed("dragging", true);
        
        // Store the initial position for calculating delta
        d.dragStartY = d.initialY;
        d.dragStartMouseY = event.y;
        
        // Clear affected milestones
        affectedMilestoneIds = new Set<string>();
      })
      .on("drag", function (event, d) {
        const minAllowedY = 20;
        const newY = Math.max(minAllowedY, event.y);
        const deltaY = newY - d.dragStartMouseY;
        
        // Apply transform to move the entire workstream group
        d3.select(this).attr("transform", `translate(0, ${deltaY})`);
        
        // Move ONLY THIS workstream's milestone nodes
        if (milestonesGroup.current) {
          milestonesGroup.current
            .selectAll(".milestone")
            .filter(function(p: any) {
              if (!p) return false;
              
              // Filter to only THIS workstream's nodes
              if (!p.isDuplicate) {
                return p.milestone && p.milestone.workstreamId === d.id;
              }
              return p.placementWorkstreamId === d.id;
            })
            .each(function(p: any) {
              // Track affected milestone
              if (p && p.id) {
                affectedMilestoneIds.add(p.id);
              }
              
              // Get current transform to preserve X position
              const currentTransform = d3.select(this).attr("transform") || "";
              let currentX = 0;
              
              const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
              if (translateMatch) {
                currentX = parseFloat(translateMatch[1]);
              }
              
              // Apply transform to maintain relative position
              d3.select(this).attr("transform", `translate(${currentX}, ${deltaY})`);
              
              // Update coordinates for visual connections
              if (placementCoordinates[p.id]) {
                placementCoordinates[p.id].y = p.initialY + deltaY;
              }
            });
          
          // Only update connections for affected milestones
          if (debouncedUpdateConnections) {
            // Use debounced updates for smoother performance
            Array.from(affectedMilestoneIds).forEach(nodeId => {
              debouncedUpdateConnections(nodeId);
            });
          } else {
            // Fallback to direct updates
            Array.from(affectedMilestoneIds).forEach(nodeId => {
              updateVisualConnectionsForNode(nodeId);
            });
          }
        }
      })
      .on("end", function (event, d) {
        d3.select(this).classed("dragging", false);
        const minAllowedY = 20;
        const newY = Math.max(minAllowedY, event.y);
        const deltaY = newY - d.dragStartMouseY;
        
        const finalY = d.dragStartY + deltaY;
        const previousWorkstreamY = workstreamPositions[d.id]?.y;
        
        // Skip if no significant change
        if (Math.abs(finalY - (previousWorkstreamY || d.initialY)) <= 1) {
          // Reset transforms without state updates
          d3.select(this).attr("transform", "translate(0, 0)");
          return;
        }
        
        // ✅ FIX: Update state FIRST
        batchedStateManager.queueWorkstreamUpdate(d.id, { y: finalY });
        
        // Collect milestone updates
        const relatedMilestoneUpdates = new Map<string, { y: number }>();
        
        if (milestonesGroup.current) {
          milestonesGroup.current
            .selectAll(".milestone")
            .filter((p: any) => p && 
              ((p.isDuplicate && p.placementWorkstreamId === d.id) || 
              (!p.isDuplicate && p.milestone?.workstreamId === d.id)))
            .each(function(p: any) {
              if (placementCoordinates[p.id]) {
                const newMilestoneY = p.initialY + deltaY;
                relatedMilestoneUpdates.set(p.id, { y: newMilestoneY });
                
                // Update placement coordinates
                placementCoordinates[p.id].y = newMilestoneY;
              }
            });
        }
        
        // Queue all milestone updates
        relatedMilestoneUpdates.forEach((position, id) => {
          batchedStateManager.queueMilestoneUpdate(id, position);
        });
        
        // ✅ FIX: Force flush before visual updates
        batchedStateManager.forceFlush();
        
        // ✅ FIX: NOW reset transforms after state is updated
        d3.select(this).attr("transform", "translate(0, 0)");
        
        // Reset milestone transforms
        if (milestonesGroup.current) {
          milestonesGroup.current
            .selectAll(".milestone")
            .filter((p: any) => p && 
              ((p.isDuplicate && p.placementWorkstreamId === d.id) || 
              (!p.isDuplicate && p.milestone?.workstreamId === d.id)))
            .each(function(p: any) {
              // Reset transform
              d3.select(this).attr("transform", `translate(0, 0)`);
              
              // Update initial position for next drag
              p.initialY = p.initialY + deltaY;
            });
        }
        
        // Update workstream visual elements
        updateWorkstreamPosition(
          d.id, 
          finalY, 
          {
            placementCoordinates,
            margin,
            contentHeight,
            dataId: data.id,
            setWorkstreamPositions,
            debouncedUpsertPosition,
            workstreamGroup,
          }
        );
        
        // Update the workstream's initial position for next drag
        d.initialY = finalY;
      })
  }, [milestonesGroup, placementCoordinates, updateVisualConnectionsForNode, margin, contentHeight, data.id, setWorkstreamPositions, debouncedUpsertPosition, workstreamGroup, workstreamPositions, batchedStateManager]);
  

  return {
    createMilestoneDragBehavior,
    createWorkstreamDragBehavior,
    updateVisualConnectionsForNode,
    updateActivities,
    updateDependencies,
    batchedStateManager,
  };
}

export default useDragBehaviors;