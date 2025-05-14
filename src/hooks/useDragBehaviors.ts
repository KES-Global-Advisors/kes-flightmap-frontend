// src/hooks/useDragBehaviors.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import * as d3 from 'd3';
import { DefaultLinkObject } from 'd3-shape';
import { MilestonePlacement } from '@/components/Flightmap/Utils/dataProcessing';
import { enforceWorkstreamContainment } from '@/components/Flightmap/Utils/layoutUtils';
import { 
  WORKSTREAM_AREA_HEIGHT, 
  WORKSTREAM_AREA_PADDING,
} from '@/components/Flightmap/Utils/types';

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
  milestonePlacements,
  workstreamPositions,
  setWorkstreamPositions,
  milestonePositions,
  setMilestonePositions,
  placementCoordinates,
  milestonesGroup,
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
        const currentWsPosition = workstreamPositions[workstreamId] || { y: 0 };
        
        // Recalculate boundaries based on *current* workstream position
        const wsTopBoundary = currentWsPosition.y - WORKSTREAM_AREA_HEIGHT / 2 + WORKSTREAM_AREA_PADDING;
        const wsBottomBoundary = currentWsPosition.y + WORKSTREAM_AREA_HEIGHT / 2 - WORKSTREAM_AREA_PADDING;
        
        // Calculate deltas from original position
        const deltaX = event.x - d.dragStartX;
        const rawNewY = d.initialY + (event.y - d.dragStartY);
        
        // Apply strict containment with current boundaries
        const constrainedY = Math.max(wsTopBoundary, Math.min(wsBottomBoundary, rawNewY));
        
        // Apply transform from original position
        d3.select(this)
          .attr("transform", `translate(${deltaX}, ${constrainedY - d.initialY})`);
        
        // Update all visual elements for consistency
        d3.select(this).select("circle")
          .attr("cy", d.initialY); // Keep base position consistent
          
        d3.select(this).select("line.connection-line")
          .attr("y1", d.initialY)
          .attr("y2", currentWsPosition.y);
        
        // Update placement coordinates temporarily for visual updates
        if (placementCoordinates[d.id]) {
          // Update only the Y position since X is controlled by timeline constraints
          placementCoordinates[d.id].y = rawNewY;
        }
        
        // Update only the visual connections without state changes
        updateVisualConnectionsForNode(d.id);
      })
      .on("end", function(event, d) {
        d3.select(this).classed("dragging", false);
        
        // Determine which workstream this node belongs to
        const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
        
        // Find workstream area boundaries - first get the position
        const wsPosition = workstreamPositions[workstreamId] || { y: 0 };
        
        // Calculate workstream area boundaries
        const wsTopBoundary = wsPosition.y - WORKSTREAM_AREA_HEIGHT / 2 + WORKSTREAM_AREA_PADDING;
        const wsBottomBoundary = wsPosition.y + WORKSTREAM_AREA_HEIGHT / 2 - WORKSTREAM_AREA_PADDING;
        
        // Constrain final Y position to stay within workstream area
        const constrainedY = Math.max(wsTopBoundary, Math.min(wsBottomBoundary, d.initialY + (event.y - d.initialY)));
        
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
        
        // Apply visual changes immediately
        d3.select(this).attr("transform", 
          `translate(${snappedX - d.initialX}, ${constrainedY - d.initialY})`);
        
        // Update connection line with final position
        d3.select(this).select("line.connection-line")
          .attr("y1", constrainedY)
          .attr("y2", wsPosition.y);
        
        // Update placement coordinates with final position
        if (placementCoordinates[d.id]) {
          placementCoordinates[d.id].x = snappedX;
          placementCoordinates[d.id].y = constrainedY;
        }
        
        // Store position in pending updates instead of immediate state change
        pendingPositionUpdates[d.id] = { y: constrainedY };
        
        // Batch position updates with debouncing
        if (dragEndTimeout) clearTimeout(dragEndTimeout);
        dragEndTimeout = setTimeout(() => {
          // Apply all pending position updates at once
          setMilestonePositions(prev => ({
            ...prev,
            ...pendingPositionUpdates
          }));
          
          // Only call API with the final position after interaction is complete
          if (constrainedY !== d.initialY) {
            const relY = (constrainedY - margin.top) / contentHeight;
  
            // Handle position updates differently for duplicates
            if (d.isDuplicate) {
              debouncedUpsertPosition(
                data.id, 
                'milestone', 
                // Use the duplicateKey as the node_id for duplicates
                d.id, // Use the duplicate key directly
                relY,
                true, // isDuplicate
                d.id, // duplicateKey
                d.originalMilestoneId // originalNodeId
              );
            } else {
              // For original nodes, no duplicate params needed
              debouncedUpsertPosition(data.id, 'milestone', Number(d.milestone.id), relY);
            }
          }
          
          // Handle deadline changes only for original nodes
          if (!d.isDuplicate) {
            const originalDateMs = new Date(d.milestone.deadline).getTime();
            const newDateMs = newDeadline.getTime();
            if (newDateMs !== originalDateMs) {
              onMilestoneDeadlineChange(d.milestone.id.toString(), newDeadline)
                .then((ok) => {
                  if (!ok) {
                    // Rollback X-axis
                    const origX = xScale(new Date(d.milestone.deadline));
                    d3.select(this)
                      .transition().duration(300)
                      .attr("transform", `translate(${origX - d.initialX}, ${constrainedY - d.initialY})`);
  
                    // Also update the placement coordinates
                    if (placementCoordinates[d.id]) {
                      placementCoordinates[d.id].x = origX;
                    }
  
                    // Update connections after rollback
                    updateVisualConnectionsForNode(d.id);
                  }
                });
            }
          }
  
          pendingPositionUpdates = {};
        }, 200); // Debounce for 200ms
        
        // Update visual connections immediately without full redraw
        updateVisualConnectionsForNode(d.id);

        // Add verification step after position update
        setTimeout(() => {
          // Verify node is still within boundaries after all updates
          const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
          const currentWsPosition = workstreamPositions[workstreamId] || { y: 0 };
          const wsTopBoundary = currentWsPosition.y - WORKSTREAM_AREA_HEIGHT / 2 + WORKSTREAM_AREA_PADDING;
          const wsBottomBoundary = currentWsPosition.y + WORKSTREAM_AREA_HEIGHT / 2 - WORKSTREAM_AREA_PADDING;
          
          // Get current position from state
          const nodeCurrentPos = milestonePositions[d.id] || { y: d.initialY };
          
          // If somehow outside boundaries, force back
          if (nodeCurrentPos.y < wsTopBoundary || nodeCurrentPos.y > wsBottomBoundary) {
            const correctedY = Math.max(wsTopBoundary, Math.min(wsBottomBoundary, nodeCurrentPos.y));
            
            // Update state and visuals with corrected position
            setMilestonePositions(prev => ({
              ...prev,
              [d.id]: { y: correctedY }
            }));
            
            // Force visual update
            d3.select(this)
              .transition().duration(300)
              .attr("transform", `translate(${snappedX - d.initialX}, ${correctedY - d.initialY})`);
          }
        }, 250);
      });
  }, [
    workstreamPositions, 
    placementCoordinates, 
    updateVisualConnectionsForNode, 
    timelineMarkers, 
    xScale, 
    margin.top, 
    contentHeight, 
    debouncedUpsertPosition, 
    data.id, 
    onMilestoneDeadlineChange, 
    milestonePositions, 
    setMilestonePositions
  ]);

  /**
   * Creates drag behavior for workstream lanes
   */
  const createWorkstreamDragBehavior = useCallback(() => {
    let pendingPositionUpdates: Record<number, { y: number }> = {};
    let dragEndTimeout: ReturnType<typeof setTimeout> | null = null;
  
    return d3.drag<SVGGElement, any>()
      .on("start", function () {
        d3.select(this).classed("dragging", true);
        if (dragEndTimeout) clearTimeout(dragEndTimeout);
        pendingPositionUpdates = {};
      })
      .on("drag", function (event, d) {
        const minAllowedY = 20;
        const newY = Math.max(minAllowedY, event.y);
        const actualDeltaY = newY - (d.lastY || d.initialY);
        d.lastY = newY;
  
        // Apply visual changes to the workstream components
        // Update the rectangle position
        d3.select(this).select("rect.workstream-area")
          .attr("y", newY - WORKSTREAM_AREA_HEIGHT / 2);
  
        // Update the guideline position
        d3.select(this).select("line.workstream-guideline")
          .attr("y1", newY)
          .attr("y2", newY);
  
        // Update the text label position
        d3.select(this).select("text")
          .attr("y", newY);
  
        // Move all milestone nodes for this workstream with improved filtering
        if (milestonesGroup.current) {
          milestonesGroup.current
            .selectAll(".milestone")
            .filter(function(p: any) {
              if (!p) return false;
              
              // For original nodes, ensure they genuinely belong to this workstream
              if (!p.isDuplicate) {
                return p.milestone && p.milestone.workstreamId === d.id;
              }
              
              // For duplicates, use placementWorkstreamId
              return p.placementWorkstreamId === d.id;
            })
            .each(function (placementData: any) {
              // Update placement coordinates
              if (placementCoordinates[placementData.id]) {
                placementCoordinates[placementData.id].y += actualDeltaY;
              }
  
              // Update the visual position
              // Get current transform
              const currentTransform = d3.select(this).attr("transform") || "";
              let deltaX = 0;
              let currentY = 0;
              
              // Parse the existing transform to maintain x position
              const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
              if (translateMatch) {
                deltaX = parseFloat(translateMatch[1]);
                currentY = parseFloat(translateMatch[2]);
              }
              
              // Apply new transform with updated y position
              d3.select(this).attr("transform", `translate(${deltaX}, ${currentY + actualDeltaY})`);
              
              // Also update any connection lines
              d3.select(this).select("line.connection-line")
                .attr("y1", placementData.initialY + currentY + actualDeltaY)
                .attr("y2", newY);
            });
        }
  
        // Update visual connections during drag
        activities.forEach(activity => {
          if (activity.workstreamId === d.id) {
            updateVisualConnectionsForNode(activity.sourceMilestoneId);
          }
        });
      })
      .on("end", function (event, d) {
        d3.select(this).classed("dragging", false);
        const minAllowedY = 20;
        const constrainedY = Math.max(minAllowedY, event.y);
        delete d.lastY;
  
        // Update the workstream area components with final position
        d3.select(this).select("rect.workstream-area")
          .attr("y", constrainedY - WORKSTREAM_AREA_HEIGHT / 2);
  
        d3.select(this).select("line.workstream-guideline")
          .attr("y1", constrainedY)
          .attr("y2", constrainedY);
  
        d3.select(this).select("text")
          .attr("y", constrainedY);
  
        // Reset the transform to prevent double transformation
        d3.select(this).attr("transform", "translate(0, 0)");
  
        // Store position in pending updates
        pendingPositionUpdates[d.id] = { y: constrainedY };
  
        // Batch position updates with debouncing
        if (dragEndTimeout) clearTimeout(dragEndTimeout);
        dragEndTimeout = setTimeout(() => {
          // Apply all pending workstream position updates at once
          setWorkstreamPositions(prev => ({
            ...prev,
            ...pendingPositionUpdates
          }));
  
          // Debounce API call
          const relY = (constrainedY - margin.top) / contentHeight;
          debouncedUpsertPosition(
            data.id, 
            'workstream', 
            d.id, 
            relY,
            false,
            ""
          );
  
          // Collect milestone positions that need updating
          const updatedMilestonePositions: Record<string, { y: number }> = {};
          if (milestonesGroup.current) {
            milestonesGroup.current
              .selectAll(".milestone")
              .filter(function(p: any) {
                if (!p) return false;
                
                // Same enhanced filtering logic as in the drag handler
                if (!p.isDuplicate) {
                  return p.milestone && p.milestone.workstreamId === d.id;
                }
                return p.placementWorkstreamId === d.id;
              })
              .each(function (placementData: any) {
                if (placementCoordinates[placementData.id]) {
                  updatedMilestonePositions[placementData.id] = {
                    y: placementCoordinates[placementData.id].y,
                  };
                }
              });
          }
  
          // Update milestone positions if any changed
          if (Object.keys(updatedMilestonePositions).length > 0) {
            setMilestonePositions(prev => ({
              ...prev,
              ...updatedMilestonePositions
            }));
          }
  
          pendingPositionUpdates = {};
        }, 200); // Debounce for 200ms
  
        // Update visual connections
        updateActivities();
        updateDependencies();

        // Enforce containment for all nodes after workstream position changes
        enforceWorkstreamContainment(
          d.id, 
          workstreamPositions, 
          milestonePositions, 
          milestonePlacements, 
          milestonesGroup, 
          setMilestonePositions
        );
      });
  }, [
    activities, 
    placementCoordinates, 
    updateVisualConnectionsForNode, 
    updateActivities, 
    updateDependencies, 
    margin.top, 
    contentHeight, 
    debouncedUpsertPosition, 
    data.id, 
    workstreamPositions,
    setWorkstreamPositions, 
    milestonePositions, 
    milestonePlacements, 
    milestonesGroup, 
    setMilestonePositions
  ]);

  return {
    createMilestoneDragBehavior,
    createWorkstreamDragBehavior,
    updateVisualConnectionsForNode,
    updateActivities,
    updateDependencies
  };
}

export default useDragBehaviors;