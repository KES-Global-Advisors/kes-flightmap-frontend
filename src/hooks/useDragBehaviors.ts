// src/hooks/useDragBehaviors.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { DefaultLinkObject } from 'd3-shape';
import { MilestonePlacement } from '@/components/Flightmap/Utils/dataProcessing';
import { updateNodePosition, calculateConstrainedY, updateWorkstreamPosition } from '@/components/Flightmap/Utils/positionManager';

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
  onMilestoneDeadlineChange,
  connectionCache,
    // ✅ ADDED: Lines 30-31 - Batched update functions
  debouncedBatchMilestoneUpdate,
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
  // Optional connection cache for performance
  connectionCache?: {
    activityMap: Map<string, any[]>;
    dependencyMap: Map<string, any[]>;
  };

    // ✅ ADDED: Lines 62-63 - Batched update function types
  debouncedBatchMilestoneUpdate: (updates: Record<string, { y: number }>) => void;
}) {
  // Create connection cache if not provided
  const internalConnectionCache = useMemo(() => {
    // If cache already provided, use it
    if (connectionCache) return connectionCache;
    
    // Otherwise create our own cache
    const activityMap = new Map<string, any[]>();
    const dependencyMap = new Map<string, any[]>();
    
    // Build activity lookup by node id
    activities.forEach(activity => {
      const sourceId = activity.sourceMilestoneId.toString();
      
      // Map source → activities
      if (!activityMap.has(sourceId)) {
        activityMap.set(sourceId, []);
      }
      activityMap.get(sourceId)?.push(activity);
      
      // Map targets → activities 
      (activity.targetMilestoneIds || []).forEach((targetId: any) => {
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

    // Use connection cache to find relevant activities and dependencies instead of filtering
    const relevantActivities = internalConnectionCache.activityMap.get(nodeIdStr) || [];
    const relevantDependencies = internalConnectionCache.dependencyMap.get(nodeIdStr) || [];

    // Update each affected activity path
    relevantActivities.forEach(activity => {
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

    // Update each affected dependency line
    relevantDependencies.forEach(dep => {
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
  }, [activities, dependencies, placementCoordinates, allMilestones, milestonesGroup, internalConnectionCache]);

  /**
   * Updates all activity connections efficiently by using the node cache
   */
  const updateActivities = useCallback(() => {
    // Get unique source nodes to update
    const sourceNodes = new Set<string>();
    activities.forEach(activity => {
      sourceNodes.add(activity.sourceMilestoneId.toString());
    });
    
    // Update each source node's connections
    Array.from(sourceNodes).forEach(nodeId => {
      updateVisualConnectionsForNode(nodeId);
    });
  }, [activities, updateVisualConnectionsForNode]);

  /**
   * Updates all dependency connections efficiently by using the node cache
   */
  const updateDependencies = useCallback(() => {
    // Get unique source nodes to update
    const sourceNodes = new Set<string>();
    dependencies.forEach(dep => {
      sourceNodes.add(dep.source.toString());
    });
    
    // Update each source node's connections
    Array.from(sourceNodes).forEach(nodeId => {
      updateVisualConnectionsForNode(nodeId);
    });
  }, [dependencies, updateVisualConnectionsForNode]);

  /**
   * Creates drag behavior for milestone nodes
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
        updateVisualConnectionsForNode(d.id);
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
        
        // Update node position with consistent transform approach
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
        
        // Only update state if position actually changed (prevents unnecessary re-renders)
        if (positionChanged) {
          const batchUpdate = { [d.id]: { y: constrainedY } };
          debouncedBatchMilestoneUpdate(batchUpdate);
        }
        
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
      });
  }, [workstreamPositions, timelineMarkers, xScale, updateVisualConnectionsForNode, milestonesGroup, placementCoordinates, margin, contentHeight, data.id, debouncedUpsertPosition, setMilestonePositions, onMilestoneDeadlineChange]);

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
          Array.from(affectedMilestoneIds).forEach(nodeId => {
            updateVisualConnectionsForNode(nodeId);
          });
        }
      })
      .on("end", function (event, d) {
        d3.select(this).classed("dragging", false);
        const minAllowedY = 20;
        const newY = Math.max(minAllowedY, event.y);
        const deltaY = newY - d.dragStartMouseY;
        
        // Calculate final position
        const finalY = d.dragStartY + deltaY;
        
        // Only update milestone positions that actually changed
        const workstreamMilestoneUpdates: Record<string, { y: number }> = {};
        const previousWorkstreamY = workstreamPositions[d.id]?.y;
        
        // Skip position updates if workstream position hasn't changed
        if (Math.abs(finalY - (previousWorkstreamY || d.initialY)) <= 1) {
          // Reset transforms if not changing positions
          d3.select(this).attr("transform", "translate(0, 0)");
          
          if (milestonesGroup.current) {
            milestonesGroup.current
              .selectAll(".milestone")
              .filter((p: any) => p && 
                ((p.isDuplicate && p.placementWorkstreamId === d.id) || 
                (!p.isDuplicate && p.milestone?.workstreamId === d.id)))
              .attr("transform", "translate(0, 0)");
          }
          return;
        }
        
        // Gather milestone updates for affected nodes
        if (milestonesGroup.current) {
          milestonesGroup.current
            .selectAll(".milestone")
            .filter(function(p: any) {
              if (!p) return false;
              if (!p.isDuplicate) {
                return p.milestone && p.milestone.workstreamId === d.id;
              }
              return p.placementWorkstreamId === d.id;
            })
            .each(function(p: any) {
              if (!placementCoordinates[p.id]) return;
              
              // Calculate new Y position
              const newY = p.initialY + deltaY;
              workstreamMilestoneUpdates[p.id] = { y: newY };
              
              // Reset transform to avoid double application
              d3.select(this).attr("transform", `translate(0, 0)`);
            });
        }
        
        // Reset workstream group transform
        d3.select(this).attr("transform", "translate(0, 0)");
        
        // Update ONLY this workstream's position
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
        
        // Update milestone positions only if there are changes
        // ✅ MODIFIED: Lines 618-622 - Use batched update for milestone positions
        if (Object.keys(workstreamMilestoneUpdates).length > 0) {
          // Use batched updater for better performance
          debouncedBatchMilestoneUpdate(workstreamMilestoneUpdates);
        }
      });
  }, [milestonesGroup, placementCoordinates, updateVisualConnectionsForNode, margin, contentHeight, data.id, setWorkstreamPositions, debouncedUpsertPosition, workstreamGroup, debouncedBatchMilestoneUpdate, workstreamPositions]);
  

  return {
    createMilestoneDragBehavior,
    createWorkstreamDragBehavior,
    updateVisualConnectionsForNode,
    updateActivities,
    updateDependencies
  };
}

export default useDragBehaviors;