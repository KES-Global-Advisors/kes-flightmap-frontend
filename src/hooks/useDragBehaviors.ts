// src/hooks/useDragBehaviors.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import * as d3 from 'd3';
import { DefaultLinkObject } from 'd3-shape';
import { MilestonePlacement } from '@/components/Flightmap/Utils/dataProcessing';
import { 
  WORKSTREAM_AREA_HEIGHT, 
} from '@/components/Flightmap/Utils/types';
import { DEBOUNCE_TIMEOUT, updateNodePosition, calculateConstrainedY, updateWorkstreamPosition } from '@/components/Flightmap/Utils/positionManager';
import { updateWorkstreamLines } from '@/components/Flightmap/Utils/visualUpdateUtils';

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
  onMilestoneDeadlineChange
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
  
  // Refs
  placementCoordinates: Record<string, { 
    x: number; 
    y: number; 
    isDuplicate?: boolean; 
    originalId?: number; 
    duplicateKey?: string | number;
    workstreamId: number;
  }>;
  milestonesGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  workstreamGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  
  // Layout and scaling
  margin: { top: number; right: number; bottom: number; left: number };
  contentHeight: number;
  contentWidth: number;
  xScale: d3.ScaleTime<number, number>;
  
  // Callbacks
  debouncedUpsertPosition: (
    flightmapId: number, 
    nodeType: 'milestone'|'workstream', 
    nodeId: number | string, 
    relY: number, 
    isDuplicate?: boolean, 
    duplicateKey?: string, 
    originalNodeId?: number
  ) => void;
  onMilestoneDeadlineChange: (milestoneId: string, newDeadline: Date) => Promise<boolean>;
}) {
  /**
   * Updates visual connections for a specific node
   */
  const updateVisualConnectionsForNode = useCallback((nodeId: string | number) => {
    // Skip if SVG groups don't exist yet
    if (!milestonesGroup.current) return;

    // Get the node data
    const nodeIdStr = nodeId.toString();
    const nodeData = placementCoordinates[nodeIdStr];
    if (!nodeData) return;

    const isDuplicate = Boolean(nodeData.isDuplicate);

    // Find activities that involve this specific node
    const activitiesToUpdate = activities.filter(activity => {
      const isSource = activity.sourceMilestoneId.toString() === nodeIdStr;
      const isTarget = activity.targetMilestoneIds && activity.targetMilestoneIds.some(
        (id: number) => id.toString() === nodeIdStr
      );

      return isSource || isTarget;
    });

    // Update each affected activity path
    activitiesToUpdate.forEach(activity => {
      const sourceCoord = placementCoordinates[activity.sourceMilestoneId.toString()];
      if (!sourceCoord) return;

      // For each target milestone, update the connection
      (activity.targetMilestoneIds || []).forEach((targetId: number) => {
        const targetCoord = placementCoordinates[targetId.toString()];
        if (!targetCoord) return;

        // Find the path element for this activity connection
        const activityPath = d3.select(document.documentElement)
          .selectAll(".same-workstream-activity, .cross-workstream-activity")
          .filter((d: any) => 
            d && d.id === activity.id && 
            d.sourceMilestoneId === activity.sourceMilestoneId && 
            d.targetMilestoneIds && 
            d.targetMilestoneIds.includes(targetId)
          );
        
        // Update the path if found
        if (!activityPath.empty()) {
          activityPath.attr(
            "d",
            d3.linkHorizontal()({
              source: [sourceCoord.x, sourceCoord.y],
              target: [targetCoord.x, targetCoord.y],
            } as DefaultLinkObject) ?? ""
          );

          // Update activity label position
          const pathNode = activityPath.node();
          if (pathNode) {
            const pathLength = (pathNode as SVGPathElement).getTotalLength();
            const midpoint = (pathNode as SVGPathElement).getPointAtLength(pathLength / 2);

            // Find and update the label rectangle and text
            const labelRect = d3.select(document.documentElement)
              .selectAll("rect")
              .filter((d: any) => d && d.id === activity.id);

            const labelText = d3.select(document.documentElement)
              .selectAll("text")
              .filter((d: any) => d && d.id === activity.id);

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
          }
        }
      });
    });

    // Find dependencies that involve this specific node
    const dependenciesToUpdate = dependencies.filter(dep => 
      dep.source.toString() === nodeIdStr || 
      dep.target.toString() === nodeIdStr
    );

    // Update each affected dependency line
    dependenciesToUpdate.forEach(dep => {
      const sourceCoord = placementCoordinates[dep.source.toString()];
      const targetCoord = placementCoordinates[dep.target.toString()];

      if (!sourceCoord || !targetCoord) return;

      // Find the dependency line for this connection
      const dependencyLine = d3.select(document.documentElement)
        .selectAll(".dependency-line, .duplicate-dependency-line")
        .filter((d: any) => 
          d && d.source === dep.source && d.target === dep.target
        );
      
      // Update the line if found
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

    // For duplicate nodes, also update the special visual connection with the target milestone
    if (isDuplicate && nodeData.originalId) {
      const workstreamId = nodeData.workstreamId;

      // Find dependencies where this duplicate's original is the source
      const relevantDeps = dependencies.filter(dep => 
        dep.source === nodeData.originalId &&
        allMilestones.find(m => m.id === dep.target)?.workstreamId === workstreamId
      );

      // Update the special duplicate connection
      relevantDeps.forEach(dep => {
        const targetCoord = placementCoordinates[dep.target.toString()];
        if (targetCoord) {
          // Find the duplicate connection
          const duplicateConn = d3.select(document.documentElement)
            .selectAll(".duplicate-dependency-line")
            .filter((d: any) => 
              (d && d.source === nodeIdStr && d.target === dep.target) ||
              (d && d.originalId === nodeData.originalId && d.duplicateId === nodeIdStr)
            );

          // Update the connection if found
          if (!duplicateConn.empty()) {
            duplicateConn.attr(
              "d",
              d3.linkHorizontal()({
                source: [nodeData.x, nodeData.y],
                target: [targetCoord.x, targetCoord.y],
              } as DefaultLinkObject) ?? ""
            );
          }
        }
      });

      // Also update cross-workstream activity connections
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
        const sourceCoord = placementCoordinates[activity.sourceMilestoneId.toString()];
        if (sourceCoord) {
          // Find the cross-workstream activity line
          const activityLine = d3.select(document.documentElement)
            .selectAll(".cross-workstream-activity")
            .filter((d: any) => 
              d && d.id === activity.id && 
              d.targetMilestoneIds && 
              d.targetMilestoneIds.includes(nodeData.originalId)
            );

          // Update the line if found
          if (!activityLine.empty()) {
            activityLine.attr(
              "d",
              d3.linkHorizontal()({
                source: [sourceCoord.x, sourceCoord.y],
                target: [nodeData.x, nodeData.y],
              } as DefaultLinkObject) ?? ""
            );
          }
        }
      });
    }
  }, [activities, dependencies, placementCoordinates, allMilestones, milestonesGroup]);

  /**
   * Updates all activity connections
   */
  const updateActivities = useCallback(() => {
    activities.forEach(activity => {
      updateVisualConnectionsForNode(activity.sourceMilestoneId);
    });
  }, [activities, updateVisualConnectionsForNode]);

  /**
   * Updates all dependency connections
   */
  const updateDependencies = useCallback(() => {
    dependencies.forEach(dep => {
      updateVisualConnectionsForNode(dep.source);
    });
  }, [dependencies, updateVisualConnectionsForNode]);

  // Add this helper function within the useDragBehaviors hook
  const updateWorkstreamVisuals = useCallback((
    wsGroup: d3.Selection<SVGGElement, any, null, undefined>,
    y: number
  ) => {
    // Update the rectangle position
    wsGroup.select("rect.workstream-area")
      .attr("y", y - WORKSTREAM_AREA_HEIGHT / 2);
  
    // Update the guideline position
    wsGroup.select("line.workstream-guideline")
      .attr("y1", y)
      .attr("y2", y);
  
    // Update the text label position
    wsGroup.select("text")
      .attr("y", y);
  }, []);
      
  // Add this helper function within the useDragBehaviors hook
  const moveNodesWithWorkstream = useCallback((
    milestonesGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    workstreamId: number,
    deltaY: number,
    placementCoordinates: Record<string, any>,
  ) => {
    milestonesGroup
      .selectAll(".milestone")
      .filter(function(p: any) {
        if (!p) return false;
        
        // For original nodes, ensure they belong to this workstream
        if (!p.isDuplicate) {
          return p.milestone && p.milestone.workstreamId === workstreamId;
        }
        
        // For duplicates, use placementWorkstreamId
        return p.placementWorkstreamId === workstreamId;
      })
      .each(function (placementData: any) {
        // PRINCIPLE: Update data first
        if (placementCoordinates[placementData.id]) {
          placementCoordinates[placementData.id].y += deltaY;
        }
        
        // Get current transform 
        const currentTransform = d3.select(this).attr("transform") || "";
        let deltaX = 0;
        let currentY = 0;
        
        const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
          deltaX = parseFloat(translateMatch[1]);
          currentY = parseFloat(translateMatch[2]);
        }
        
        // PRINCIPLE: Reset transform first
        d3.select(this).attr("transform", "translate(0, 0)");
        
        // PRINCIPLE: Apply complete transform based on current state
        d3.select(this).attr("transform", `translate(${deltaX}, ${currentY + deltaY})`);
      });
  }, []);

  /**
   * Creates drag behavior for milestone nodes
   */
const createMilestoneDragBehavior = useCallback(() => {
    // Batch state to reduce renders
    let pendingPositionUpdates: Record<string, { y: number }> = {};
    let dragEndTimeout: ReturnType<typeof setTimeout> | null = null;
    
    return d3.drag<SVGGElement, any>()
      .on("start", function(event, d) {
        d3.select(this).classed("dragging", true);
        // Store the initial position at drag start
        d.dragStartX = event.x;
        d.dragStartY = event.y;
        // Clear any pending updates
        if (dragEndTimeout) clearTimeout(dragEndTimeout);
        pendingPositionUpdates = {};
      })
      .on("drag", function(event, d) {
        // Get current workstream position (may have updated)
        const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
        
        // Calculate deltas from original position
        const deltaX = event.x - d.dragStartX;
        const rawNewY = d.initialY + (event.y - d.dragStartY);
        
        // Apply strict containment with current boundaries
        const constrainedY = calculateConstrainedY(
          rawNewY,
          workstreamId,
          workstreamPositions
        );
        
        // Apply transform from original position
        d3.select(this)
          .attr("transform", `translate(${deltaX}, ${constrainedY - d.initialY})`);
        
        // Update placement coordinates temporarily for visual updates
        if (placementCoordinates[d.id]) {
          // Update only the Y position since X is controlled by timeline constraints
          placementCoordinates[d.id].y = constrainedY;
        }
        
        // Update only the visual connections without state changes
        updateVisualConnectionsForNode(d.id);
      })
      .on("end", function(event, d) {
        d3.select(this).classed("dragging", false);
        
        // Determine which workstream this node belongs to
        const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
        
        // Constrain final Y position to stay within workstream area
        const rawNewY = d.initialY + (event.y - d.dragStartY);
        const constrainedY = calculateConstrainedY(
          rawNewY,
          workstreamId,
          workstreamPositions
        );
        
        // Horizontal (X) position is controlled by timeline
        const droppedX = d.initialX + (event.x - d.initialX);
        
        // Find closest timeline marker
        const closestMarker = timelineMarkers.reduce((prev, curr) => {
          const prevDist = Math.abs(xScale(prev) - droppedX);
          const currDist = Math.abs(xScale(curr) - droppedX);
          return currDist < prevDist ? curr : prev;
        });
        
        const newDeadline = closestMarker;
        const snappedX = xScale(newDeadline);
        
        // Update placement coordinates with final position
        if (placementCoordinates[d.id]) {
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
              updateDOM: true,
              updateConnections: true,
              updateConnectionsFunction: updateVisualConnectionsForNode
            }
          );
        }
        
        // Store position in pending updates for batched state update
        pendingPositionUpdates[d.id] = { y: constrainedY };
        
        // Batch position updates with debouncing
        if (dragEndTimeout) clearTimeout(dragEndTimeout);
        dragEndTimeout = setTimeout(() => {
          // Apply all pending position updates at once
          setMilestonePositions(prev => ({
            ...prev,
            ...pendingPositionUpdates
          }));
          
          // Handle deadline changes only for original nodes
          if (!d.isDuplicate) {
            const originalDateMs = new Date(d.milestone.deadline).getTime();
            const newDateMs = newDeadline.getTime();
            if (newDateMs !== originalDateMs) {
              onMilestoneDeadlineChange(d.milestone.id.toString(), newDeadline)
                .then((ok) => {
                  if (!ok) {
                    // Rollback X-axis position
                    const origX = xScale(new Date(d.milestone.deadline));
                    updateNodePosition(
                      d.id,
                      { x: origX },
                      {
                        milestonesGroup,
                        placementCoordinates,
                        margin,
                        contentHeight,
                        dataId: data.id,
                        isDuplicate: d.isDuplicate,
                        originalMilestoneId: d.originalMilestoneId,
                        debouncedUpsertPosition,
                        updateDOM: true,
                        updateConnections: true,
                        updateConnectionsFunction: updateVisualConnectionsForNode
                      }
                    );
                  }
                });
            }
          }
  
          pendingPositionUpdates = {};
        }, DEBOUNCE_TIMEOUT);
      });
  }, [workstreamPositions, placementCoordinates, updateVisualConnectionsForNode, timelineMarkers, xScale, milestonesGroup, margin, contentHeight, data.id, debouncedUpsertPosition, setMilestonePositions, onMilestoneDeadlineChange]);

  /**
   * Creates drag behavior for workstream lanes
   */
const createWorkstreamDragBehavior = useCallback(() => {
  return d3.drag<SVGGElement, any>()
    .on("start", function () {
      d3.select(this).classed("dragging", true);
    })
    .on("drag", function (event, d) {
      const minAllowedY = 20;
      const newY = Math.max(minAllowedY, event.y);
      const actualDeltaY = newY - (d.lastY || d.initialY);
      d.lastY = newY;

      // Update ONLY this workstream's visual elements during drag
      updateWorkstreamVisuals(d3.select(this), newY);

      // Move ONLY this workstream's milestone nodes during drag
      if (milestonesGroup.current) {
        moveNodesWithWorkstream(
          milestonesGroup.current,
          d.id,
          actualDeltaY,
          placementCoordinates
        );
      }

      // Update only the connections related to this workstream
      // (Instead of updating ALL activities and dependencies)
      if (milestonesGroup.current) {
        milestonesGroup.current
          .selectAll(".milestone")
          .filter(function(p: any) {
            if (!p) return false;
            
            // For original nodes, ensure they belong to this workstream
            if (!p.isDuplicate) {
              return p.milestone && p.milestone.workstreamId === d.id;
            }
            
            // For duplicates, use placementWorkstreamId
            return p.placementWorkstreamId === d.id;
          })
          .each(function(p: any) {
            updateVisualConnectionsForNode(p.id);
          });
      }
    })
    .on("end", function (event, d) {
      d3.select(this).classed("dragging", false);
      const minAllowedY = 20;
      const constrainedY = Math.max(minAllowedY, event.y);
      delete d.lastY;

      // Reset workstream transform to avoid double transformation
      d3.select(this).attr("transform", "translate(0, 0)");

      // Use the centralized position management function with direct workstream update
      updateWorkstreamPosition(
        d.id, 
        constrainedY, 
        {
          placementCoordinates,
          margin,
          contentHeight,
          dataId: data.id,
          setWorkstreamPositions,
          debouncedUpsertPosition,
          updateWorkstreamLines, // Pass the function directly
          workstreamGroup,  // Pass the workstream group ref
        }
      );
    });
}, [updateWorkstreamVisuals, milestonesGroup, updateVisualConnectionsForNode, moveNodesWithWorkstream, placementCoordinates, margin, contentHeight, data.id, setWorkstreamPositions, debouncedUpsertPosition, workstreamGroup]);
  

  return {
    createMilestoneDragBehavior,
    createWorkstreamDragBehavior,
    updateVisualConnectionsForNode,
    updateActivities,
    updateDependencies
  };
}

export default useDragBehaviors;