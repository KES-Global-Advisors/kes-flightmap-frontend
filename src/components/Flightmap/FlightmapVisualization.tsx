/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams roadmaps Flightmap
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import '../../style.css'
import * as d3 from "d3";
import type { DefaultLinkObject } from "d3-shape";
import { FlightmapData } from "@/types/flightmap";
import { useQueryClient } from '@tanstack/react-query';
import { useNodePositions, useUpsertPosition } from '@/api/flightmap';

// Utility components
import ScreenshotButton from "./FlightmapComponents/ScreenshotButton";
import { legendData } from "./Utils/LegendData";

// Helpers
import { wrapText } from "./Utils/wrapText";
import Tooltip from "./FlightmapComponents/Tooltip";
import { getTooltipContent } from "./Utils/getTooltip";
import { getStatusColor } from "./Utils/getStatusColor";

import {
  extractMilestonesAndActivities,
  processDeadlines,
  groupPlacementsByDeadlineAndWorkstream,
  MilestonePlacement,
} from './Utils/dataProcessing';
import {
  getMilestonePositionsKey,
  saveMilestonePositions,
  getWorkstreamPositionsKey,
  saveWorkstreamPositions,
} from './Utils/storageHelpers';
import { debounce } from './Utils/debounce';
import { 
  calculateNodeSpacing, 
  enforceWorkstreamContainment 
} from './Utils/layoutUtils';
import { updateWorkstreamLines } from './Utils/visualUpdateUtils';
import { trackNodePosition } from './Utils/nodeTracking';
import { ensureDuplicateNodeBackendRecord } from './Utils/apiUtils';
import { useTooltip } from '../../hooks/useTooltip';
import { createLegend } from './Utils/legendUtils';
import { setupZoomBehavior, resetZoom } from './Utils/zoomUtils';
import { initializeVisualizationSVG, addResetViewButton, SvgContainers } from './Utils/svgSetup';
import { 
  WORKSTREAM_AREA_HEIGHT, 
  WORKSTREAM_AREA_PADDING, 
  NODE_RADIUS,
} from './Utils/types';

interface FlightmapVisualizationProps {
  data: FlightmapData;
  onMilestoneDeadlineChange: (milestoneId: string, newDeadline: Date) => Promise<boolean>;
}

const FlightmapVisualization: React.FC<FlightmapVisualizationProps> = ({ data, onMilestoneDeadlineChange }) => {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>(null);
  const {
    tooltip,
    handleD3MouseOver,
    handleD3MouseMove,
    handleD3MouseOut
  } = useTooltip();
  const [milestonePositions, setMilestonePositions] = useState<{ [id: string]: { y: number } }>({});
  const [workstreamPositions, setWorkstreamPositions] = useState<{ [id: number]: { y: number } }>({});
  const dataId = useRef<string>(`${data.id || new Date().getTime()}`);

  // Container references to avoid recreating on every render
  const container = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>(null);
  const timelineGroup = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>(null);
  const activitiesGroup = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>(null);
  const workstreamGroup = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>(null);
  const milestonesGroup = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>(null);
  const dependencyGroup = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>(null);

  // Create a ref for SVG containers
  const svgContainers = useRef<SvgContainers | null>(null);

  // Separate trackers for original and duplicate node positions
  const originalNodeCoordinates = useRef<{ [id: string]: { x: number; y: number } }>({});
  const duplicateNodeCoordinates = useRef<{ [id: string]: { x: number; y: number } }>({});
  const processedDuplicates = useRef(new Set<string>());

  const placementCoordinates: { 
    [id: string]: { 
      x: number; 
      y: number; 
      isDuplicate?: boolean; 
      originalId?: number; 
      duplicateKey?: string | number; // Track the duplicate key
      workstreamId: number; // Track the workstream ID
    } 
  } = useRef({}).current;
  
  // Debounced API call reference with support for duplicate node parameters
  const debouncedUpsertPosition = useRef(
    debounce((
      flightmapId: number, 
      nodeType: 'milestone'|'workstream', 
      nodeId: number | string, 
      relY: number, 
      isDuplicate: boolean = false, 
      duplicateKey: string = "", 
      originalNodeId?: number
    ) => {
      upsertPos.mutate({
        flightmap: flightmapId,
        nodeType,
        nodeId,
        relY,
        isDuplicate,
        duplicateKey,
        originalNodeId
      });
    }, 500)
  ).current;

  const width = window.innerWidth;
  const height = window.innerHeight * 0.8;
  const margin = useMemo(() => ({ 
    top: 40, 
    right: 150, 
    bottom: 30, 
    left: 150 
  }), []);
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // ─── 1️⃣ Load remote positions via hooks ───────────────────────────────────
  const { data: remoteMilestonePos = [] } = useNodePositions(data.id, 'milestone');
  const { data: remoteWorkstreamPos = [] } = useNodePositions(data.id, 'workstream');
  const upsertPos = useUpsertPosition();

  // Create debounced save functions
  const debouncedSaveMilestonePositions = useRef(
    debounce((dataId: string, positions: Record<string, { y: number }>) => {
      saveMilestonePositions(dataId, positions);
    }, 500)
  ).current;

  const debouncedSaveWorkstreamPositions = useRef(
    debounce((dataId: string, positions: Record<number, { y: number }>) => {
      saveWorkstreamPositions(dataId, positions);
    }, 500)
  ).current;


  useEffect(() => {
    if (remoteMilestonePos.length) {
      const newM: typeof milestonePositions = {};
      remoteMilestonePos.forEach(p => {
        // For duplicate nodes, use the duplicate key as the id in our state
        const stateId = p.is_duplicate && p.duplicate_key ? p.duplicate_key : p.node_id.toString();
        newM[stateId] = {
          y: margin.top + p.rel_y * contentHeight
        };
      });
      setMilestonePositions(newM);
    }
  }, [contentHeight, margin.top, remoteMilestonePos]);
  
  useEffect(() => {
    if (remoteWorkstreamPos.length) {
      const newW: typeof workstreamPositions = {};
      remoteWorkstreamPos.forEach(p => {
        newW[typeof p.node_id === "string" ? Number(p.node_id) : p.node_id] = {
          y: margin.top + p.rel_y * contentHeight
        };
      });
      setWorkstreamPositions(newW);
    }
  }, [contentHeight, margin.top, remoteWorkstreamPos]);
  
  // Debounced save effect
  useEffect(() => {
    if (Object.keys(milestonePositions).length > 0) {
      debouncedSaveMilestonePositions(dataId.current, milestonePositions);
    }
    if (Object.keys(workstreamPositions).length > 0) {
      debouncedSaveWorkstreamPositions(dataId.current, workstreamPositions);
    }
  }, [milestonePositions, workstreamPositions, debouncedSaveMilestonePositions, debouncedSaveWorkstreamPositions]);

  // 1. Canvas setup - runs once on mount and when dimensions change
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Initialize SVG with all containers
    svgContainers.current = initializeVisualizationSVG(svgRef, {
      width,
      height,
      margin,
      className: "bg-white"
    });
    
    if (!svgContainers.current) return;
      
    // Assign container references
    container.current = svgContainers.current.container;
    timelineGroup.current = svgContainers.current.timelineGroup;
    activitiesGroup.current = svgContainers.current.activitiesGroup;
    workstreamGroup.current = svgContainers.current.workstreamGroup;
    milestonesGroup.current = svgContainers.current.milestonesGroup;
    dependencyGroup.current = svgContainers.current.dependencyGroup;    
      
    // Create legend
    createLegend(
      svgContainers.current.svg, 
      legendData,
      { x: width - margin.right + -50, y: margin.top },
      // Reset button callback
      () => {
        // Show a loading state
        const resetButton = svgContainers.current?.svg.select(".reset-positions-button");
        resetButton?.select("text").text("Resetting positions...");
        
        // Clear local storage
        localStorage.removeItem(getMilestonePositionsKey(dataId.current));
        localStorage.removeItem(getWorkstreamPositionsKey(dataId.current));
        
        // Reset local state
        setMilestonePositions({});
        setWorkstreamPositions({});
        
        // Call the reset endpoint
        const resetPositions = async () => {
          const token = sessionStorage.getItem('accessToken');
          try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/positions/reset/?flightmap=${data.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            });
            
            if (!res.ok) {
              console.error('Failed to reset positions on server');
            }
            
            // Invalidate queries to refresh data from server
            queryClient.invalidateQueries({ queryKey: ['positions', data.id, 'milestone'] });
            queryClient.invalidateQueries({ queryKey: ['positions', data.id, 'workstream'] });
            
            // Reset button text
            resetButton?.select("text").text("Reset Node Positions");
          } catch (error) {
            console.error('Error resetting positions:', error);
            resetButton?.select("text").text("Reset Node Positions");
          }
        };
        
        resetPositions();
      }
    );

    // Add reset view button
    addResetViewButton(
      svgContainers.current.svg,
      () => {
        if (svgRef.current && zoomRef.current) {
          resetZoom(svgRef, zoomRef.current);
        }
      },
      { right: width - margin.right + 10, bottom: height - 40 }
    );

  }, [width, height, margin, data.id, queryClient]);

  // 2. Initialize zoom behavior - executed once after container is created
  useEffect(() => {
    if (!svgRef.current || !container.current) return;
    
    // Setup zoom behavior
    zoomRef.current = setupZoomBehavior(svgRef, container, {
      minScale: 0.5,
      maxScale: 5,
      constrained: true,
      margin
    });
  }, [margin]);

  // 3. Data processing - runs when data changes
  const { 
    workstreams, 
    activities, 
    dependencies,
    timelineMarkers,
    milestonePlacements,
    allMilestones
  } = useMemo(() => {
    // Extract and process data
    const { workstreams, activities, dependencies } = extractMilestonesAndActivities(data);
    const allMilestones = workstreams.flatMap((ws) => ws.milestones);
    const timelineMarkers = processDeadlines(allMilestones);
    
    // Create milestone placements
    const milestonePlacements: MilestonePlacement[] = allMilestones.map((m) => ({
      id: m.id.toString(),
      milestone: m,
      placementWorkstreamId: m.workstreamId,
      isDuplicate: false,
    }));
    
    // Duplicate source milestones from dependencies into target workstreams
    dependencies.forEach((dep) => {
      const sourceMilestone = allMilestones.find((m) => m.id === dep.source);
      const targetMilestone = allMilestones.find((m) => m.id === dep.target);
      if (
        sourceMilestone &&
        targetMilestone &&
        sourceMilestone.workstreamId !== targetMilestone.workstreamId
      ) {
        // Create a unique, consistent key for this duplicate
        const duplicateKey = `duplicate-${dep.source}-${dep.target}`;
        milestonePlacements.push({
          id: duplicateKey,
          milestone: sourceMilestone,
          placementWorkstreamId: targetMilestone.workstreamId,
          isDuplicate: true,
          originalMilestoneId: sourceMilestone.id,
          duplicateKey: duplicateKey, // Store the duplicate key
        });
      }
    });
    
    // Duplicate milestones referenced by cross-workstream activities
    activities.forEach((activity) => {
      const activityWorkstreamId = activity.workstreamId;

      // Process supported and additional milestones
      const supportedMilestoneIds = [
        ...(activity.supported_milestones || []),
        ...(activity.additional_milestones || []),
      ];

      supportedMilestoneIds.forEach((targetMilestoneId) => {
        const targetMilestone = allMilestones.find((m) => m.id === targetMilestoneId);

        // Skip if milestone not found or is in the same workstream
        if (!targetMilestone || targetMilestone.workstreamId === activityWorkstreamId) {
          return;
        }

        // Create a duplicate of the target milestone in the activity's workstream
        const duplicateKey = `activity-duplicate-${targetMilestoneId}-${activity.id}`;

        // Check if this duplicate already exists
        if (!milestonePlacements.some(p => p.id === duplicateKey)) {
          milestonePlacements.push({
            id: duplicateKey,
            milestone: targetMilestone,
            placementWorkstreamId: activityWorkstreamId,
            isDuplicate: true,
            originalMilestoneId: targetMilestoneId,
            activityId: activity.id,
            duplicateKey: duplicateKey, // Store the duplicate key
          })
        }
      });
    });
    
    return { 
      workstreams, 
      activities, 
      dependencies,
      timelineMarkers,
      milestonePlacements,
      allMilestones
    };
  }, [data]);

  // 4. Scales setup - recalculated when timeline markers or dimensions change
  const xScale = useMemo(() => {
    return d3
      .scaleTime()
      .domain([d3.min(timelineMarkers) || new Date(), d3.max(timelineMarkers) || new Date()])
      .range([0, contentWidth])
      .nice();
  }, [timelineMarkers, contentWidth]);

  const yScale = useMemo(() => {
    return d3
      .scalePoint()
      .domain(workstreams.map((ws) => ws.id.toString()))
      .range([100, contentHeight - 100])
      .padding(1.0);
  }, [workstreams, contentHeight]);

  // Function to update only connections related to a specific node
  const updateVisualConnectionsForNode = useCallback((nodeId: string | number) => {
    // Skip if SVG groups don't exist yet
    if (!activitiesGroup.current || !dependencyGroup.current) return;

    // Get the node data
    const nodeIdStr = nodeId.toString();
    const nodeData = placementCoordinates[nodeIdStr];
    if (!nodeData) return;

    const isDuplicate = Boolean(nodeData.isDuplicate);

    // Find activities that involve this specific node only (no cross-referencing with original/duplicate counterparts)
    const activitiesToUpdate = activities.filter(activity => {
      // Check if this node is the source or target of the activity
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
        const activityPath = activitiesGroup.current!
          .selectAll(".same-workstream-activity, .cross-workstream-activity")
          .filter((d: any) => 
            d.id === activity.id && 
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
            const labelRect = activitiesGroup.current!
              .selectAll("rect")
              .filter((d: any) => d && d.id === activity.id);

            const labelText = activitiesGroup.current!
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

    // Find dependencies that involve this specific node only (no cross-referencing)
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
      const dependencyLine = dependencyGroup.current!
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
      const workstreamId = nodeData.workstreamId; // Use the workstreamId directly

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
          const duplicateConn = dependencyGroup.current!
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
          const activityLine = activitiesGroup.current!
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
  }, [activities, dependencies, placementCoordinates, allMilestones]);

  // Add an effect to update workstream lines when workstream positions change
  useEffect(() => {
    // Make sure the workstream lines are updated after any position changes
    if (Object.keys(workstreamPositions).length > 0) {
      // Call the existing debounced save
      debouncedSaveWorkstreamPositions(dataId.current, workstreamPositions);

      // Immediate update of line positions
      updateWorkstreamLines(workstreamGroup, workstreamPositions);
    }
  }, [workstreamPositions, debouncedSaveWorkstreamPositions]);

  // Also add an effect to ensure workstream lines are updated after the component fully mounts
  useEffect(() => {
    // This ensures lines are correctly positioned after initial render
    if (workstreamGroup.current && Object.keys(workstreamPositions).length > 0) {
      updateWorkstreamLines(workstreamGroup, workstreamPositions);
    }
  }, [workstreamPositions]);

  // Lightweight functions to update only visual appearance without full redraw
  const updateActivities = useCallback(() => {
    if (!activitiesGroup.current) return;
    activities.forEach(activity => {
      updateVisualConnectionsForNode(activity.sourceMilestoneId);
    });
  }, [activities, updateVisualConnectionsForNode]);

  const updateDependencies = useCallback(() => {
    if (!dependencyGroup.current) return;
    dependencies.forEach(dep => {
      updateVisualConnectionsForNode(dep.source);
    });
  }, [dependencies, updateVisualConnectionsForNode]);

  // Create the milestone drag behavior with optimizations
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
  }, [workstreamPositions, placementCoordinates, updateVisualConnectionsForNode, timelineMarkers, xScale, margin.top, contentHeight, debouncedUpsertPosition, data.id, onMilestoneDeadlineChange, milestonePositions]);

  // Fix createWorkstreamDragBehavior function
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
  
        // ENHANCED MILESTONE SELECTION LOGIC:
        // Move all milestone nodes for this workstream with improved filtering
        if (milestonesGroup.current) {
          milestonesGroup.current
            .selectAll(".milestone")
            .filter(function(p: any) {
              if (!p) return false;
              
              // For original nodes, ensure they genuinely belong to this workstream
              // by checking their milestone's workstreamId
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
  
                // Also update the appropriate reference storage
                if (placementData.isDuplicate) {
                  if (duplicateNodeCoordinates.current[placementData.id]) {
                    duplicateNodeCoordinates.current[placementData.id].y += actualDeltaY;
                  }
                } else {
                  if (originalNodeCoordinates.current[placementData.id]) {
                    originalNodeCoordinates.current[placementData.id].y += actualDeltaY;
                  }
                }
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
  
        // CRITICAL: Update the workstream area components with final position
        // This ensures the area and guideline don't snap back before the state update
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
        setTimeout(() => {
          enforceWorkstreamContainment(
            d.id, 
            workstreamPositions, 
            milestonePositions, 
            milestonePlacements, 
            milestonesGroup, 
            setMilestonePositions
          );
        }, 10);
      });
  }, [activities, placementCoordinates, updateVisualConnectionsForNode, updateActivities, updateDependencies, margin.top, contentHeight, debouncedUpsertPosition, data.id, workstreamPositions, milestonePositions, milestonePlacements]);

  // 5. Main visualization rendering - execute when data, scales, or container changes
  useEffect(() => {
    if (!container.current || !timelineGroup.current || !workstreamGroup.current || 
        !milestonesGroup.current || !activitiesGroup.current || !dependencyGroup.current) {
      return;
    }
    
    // Clear existing visualization
    timelineGroup.current.selectAll("*").remove();
    workstreamGroup.current.selectAll("*").remove();
    milestonesGroup.current.selectAll("*").remove();
    activitiesGroup.current.selectAll("*").remove();
    dependencyGroup.current.selectAll("*").remove();
    
    // Draw timeline markers
    timelineMarkers.forEach((date) => {
      const x = xScale(date);
      timelineGroup.current!
        .append("line")
        .attr("x1", x)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", 10000)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1);
      timelineGroup.current!
        .append("text")
        .attr("x", x)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#6b7280")
        .text(date.toLocaleDateString(undefined, { month: "short", year: "numeric" }));
    });
    
    // Create drag behaviors
    const workstreamDragBehavior = createWorkstreamDragBehavior();
    const milestoneDragBehavior = createMilestoneDragBehavior();
    
    // Draw workstreams as areas instead of lines
    workstreams.forEach((workstream) => {
      let y = yScale(workstream.id.toString()) || 0;
      if (workstreamPositions[workstream.id]) {
        y = workstreamPositions[workstream.id].y;
      }
    
      const wsGroup = workstreamGroup.current!
        .append("g")
        .datum({ ...workstream, initialY: y })
        .attr("class", "workstream")
        .attr("data-id", workstream.id) // Add data attribute for easier selection
        .attr("cursor", "ns-resize")
        .call(workstreamDragBehavior as any);
    
      // IMPORTANT: Remove any default transform on the workstream group
      // and only rely on explicit coordinates for the elements
      wsGroup.attr("transform", "translate(0, 0)");
    
      // Add workstream label (keep existing code)
      wsGroup
        .append("text")
        .attr("x", -10)
        .attr("y", y)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-weight", "bold")
        .attr("fill", workstream.color)
        .text(workstream.name);
    
      // Create workstream area instead of just a line
      wsGroup
        .append("rect")
        .attr("class", "workstream-area")
        .attr("x", 0)
        .attr("y", y - WORKSTREAM_AREA_HEIGHT / 2) // Center around the y position
        .attr("width", contentWidth)
        .attr("height", WORKSTREAM_AREA_HEIGHT)
        .attr("fill", workstream.color)
        .attr("fill-opacity", 0.05) // Very subtle fill
        .attr("stroke", workstream.color)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-dasharray", "4 2")
        .attr("rx", 5) // Rounded corners
        .attr("ry", 5);
    
      // Add a center guideline to help with alignment
      wsGroup
        .append("line")
        .attr("class", "workstream-guideline")
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", contentWidth)
        .attr("y2", y)
        .attr("stroke", workstream.color)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.3)
        .attr("stroke-dasharray", "4 2");
    });
    
    // Process milestone placements into groups
    const placementGroups = groupPlacementsByDeadlineAndWorkstream(milestonePlacements);
    
    // Draw milestones
    Object.values(placementGroups).forEach((group) => {
      // Extract the workstream ID and deadline from the first placement in the group
      const workstreamId = group[0].placementWorkstreamId;
      const deadline = group[0].milestone.deadline ? 
        new Date(group[0].milestone.deadline) : new Date();
      const timelineX = xScale(deadline);

      // Calculate spacing for nodes on this timeline in this workstream
      const nodePositions = calculateNodeSpacing(
        group, 
        workstreamId, 
        timelineX, 
        xScale, 
        workstreamPositions, 
        milestonePositions
      );
      

      group.forEach((placement) => {
        const milestone = placement.milestone;
        const workstreamId = placement.placementWorkstreamId;
        const workstream = workstreams.find((ws) => ws.id === workstreamId);
        if (!workstream) return;

        // Set X position based on timeline
        const x = milestone.deadline ? xScale(new Date(milestone.deadline)) : 20;

        // Set Y position based on workstream and spacing
        let y = workstreamPositions[workstream.id]?.y || 
          yScale(workstream.id.toString()) || 0;

        // If we have calculated positions for grouped nodes, use that
        if (nodePositions.length > 0) {
          const nodePos = nodePositions.find(np => np.id === placement.id);
          if (nodePos) {
            y = nodePos.y;
          }
        } else if (milestonePositions[placement.id]) {
          // Otherwise use existing stored position
          y = milestonePositions[placement.id].y;
        }

          // Important: Set the initialY property to match the calculated position
        // This ensures drag behavior has the correct reference point
        const initialPosition = { 
          x: x, 
          y: y 
        };
        
        // Track the node position with consistent reference points
        trackNodePosition(
          placement, 
          initialPosition.x, 
          initialPosition.y, 
          duplicateNodeCoordinates, 
          originalNodeCoordinates, 
          placementCoordinates
        );

        const milestoneGroup = milestonesGroup.current!
          .append("g")
          .datum({ 
            ...placement, 
            initialX: initialPosition.x, 
            initialY: initialPosition.y,
            workstreamRef: workstreamId // Add direct workstream reference
          })
          .attr("class", "milestone")
          .attr("cursor", "move")
          .call(milestoneDragBehavior as any);

        const originalWorkstream = workstreams.find((ws) => ws.id === milestone.workstreamId);
        const fillColor =
          milestone.status === "completed" ? "#ccc" : originalWorkstream?.color || "#6366f1";

        // Draw the node circle
        milestoneGroup
          .attr("transform", `translate(0, 0)`) 
          .append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", NODE_RADIUS)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", placement.activityId ? 2 : 1)
          .attr("opacity", placement.isDuplicate ? 0.7 : 1)
          .attr("stroke-dasharray", placement.activityId ? "0" : (placement.isDuplicate ? "4 3" : "0"))
          .on("mouseover", (event) => {
            handleD3MouseOver(
              event, 
              getTooltipContent({ data: milestone }) + 
              (placement.isDuplicate ? (placement.activityId ? " (Activity Duplicate)" : " (Dependency Duplicate)") : "")
            );
          })
          .on("mousemove", handleD3MouseMove)
          .on("mouseout", handleD3MouseOut);

        const textEl = milestoneGroup
          .append("text")
          .attr("x", x)
          .attr("y", y)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", "8px")
          .attr("fill", "white")
          .text(milestone.name);
        wrapText(textEl as d3.Selection<SVGTextElement, unknown, null, undefined>, 100);

         // Add connection line to workstream
        const workstreamY = workstreamPositions[workstream.id]?.y || 
         yScale(workstream.id.toString()) || 0;
        milestoneGroup
          .append("line")
          .attr("class", "connection-line")
          .attr("x1", x)
          .attr("y1", y)
          .attr("x2", x)
          .attr("y2", workstreamY)
          .attr("stroke", workstream.color)
          .attr("stroke-width", 0.5)
          .attr("stroke-opacity", 0.5)
          .attr("stroke-dasharray", "3 2");

        if (milestone.status) {
          const statusStroke = getStatusColor(milestone.status);
          milestoneGroup
            .append("circle")
            .attr("cx", x)
            .attr("cy", y - 30)
            .attr("r", 5)
            .attr("fill", "white")
            .attr("stroke", statusStroke)
            .attr("stroke-width", 1);
          if (milestone.status === "completed") {
            milestoneGroup
              .append("path")
              .attr("d", "M-2,0 L-1,1 L2,-2")
              .attr("transform", `translate(${x},${y - 30})`)
              .attr("stroke", statusStroke)
              .attr("stroke-width", 1.5)
              .attr("fill", "none");
          } else if (milestone.status === "in_progress") {
            milestoneGroup
              .append("circle")
              .attr("cx", x)
              .attr("cy", y - 30)
              .attr("r", 2)
              .attr("fill", statusStroke);
          } else {
            milestoneGroup
              .append("line")
              .attr("x1", x - 2)
              .attr("y1", y - 30)
              .attr("x2", x + 2)
              .attr("y2", y - 30)
              .attr("stroke", statusStroke)
              .attr("stroke-width", 1.5);
          }
        }

        if (placement.isDuplicate) {
          ensureDuplicateNodeBackendRecord(
            placement, 
            data.id, 
            remoteMilestonePos, 
            workstreamPositions, 
            margin.top, 
            contentHeight, 
            processedDuplicates, 
            upsertPos
          );
        }

        // Draw dotted line for duplicates
        if (placement.isDuplicate && placement.originalMilestoneId) {
          const originalCoord = placementCoordinates[placement.originalMilestoneId.toString()];
          if (originalCoord) {
            // Find the target milestone ID in the current workstream that depends on this duplicate
            const relatedDependency = dependencies.find(
              dep => dep.source === placement.originalMilestoneId && 
              allMilestones.find(m => m.id === dep.target)?.workstreamId === placement.placementWorkstreamId
            );

            const targetMilestoneId = relatedDependency?.target;
            const targetCoord = targetMilestoneId ? 
              placementCoordinates[targetMilestoneId.toString()] : 
              null;

            // Draw connection to the dependent milestone in this workstream
            if (targetCoord) {
              dependencyGroup.current!
                .append("path")
                .attr("class", "duplicate-dependency-line")
                .attr(
                  "d",
                  d3.linkHorizontal()({
                    source: [x, y],
                    target: [targetCoord.x, targetCoord.y],
                  } as DefaultLinkObject) ?? ""
                )
                .attr("fill", "none")
                .attr("stroke", originalWorkstream?.color || "#6b7280")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5 5")
                .attr("opacity", 2)
                .attr("marker-end", "url(#dependency-arrow)")
                .on("mouseover", (event) => {
                  handleD3MouseOver(
                    event, 
                    `Dependency: ${milestone.name} → ${allMilestones.find(m => m.id === targetMilestoneId)?.name}`
                  );
                })
                .on("mousemove", handleD3MouseMove)
                .on("mouseout", handleD3MouseOut);
            }
          }
        }
      });
    });
    
    // Function to add label to activity path
    function addActivityLabel(
      path: d3.Selection<SVGPathElement, unknown, null, undefined>,
      activity: any
    ) {
      const pathNode = path.node();
      if (pathNode && activity.name) {
        const pathLength = pathNode.getTotalLength();
        const midpoint = pathNode.getPointAtLength(pathLength / 2);

        activitiesGroup.current!
          .append("rect")
          .attr("x", midpoint.x - 100)
          .attr("y", midpoint.y - 10)
          .attr("width", 210)
          .attr("height", 20)
          .attr("fill", "white")
          .attr("fill-opacity", 0.8)
          .attr("rx", 3)
          .attr("ry", 3)
          .datum(activity);

        const textEl = activitiesGroup.current!
          .append("text")
          .attr("x", midpoint.x)
          .attr("y", midpoint.y)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", "6px")
          .attr("fill", "#3a3c40")
          .datum(activity)
          .text(activity.name);
        wrapText(textEl, 220);
      }
    }
    
    // Draw activities
    const connectionGroups: { [key: string]: any[] } = {};
    activities.forEach((activity) => {
      const sourceId = activity.sourceMilestoneId;
      const activityWorkstreamId = activity.workstreamId;

      // Process connections within the same workstream (solid lines)
      (activity.targetMilestoneIds || []).forEach((targetId: number) => {
        const targetMilestone = allMilestones.find(m => m.id === targetId);

        // Skip if milestone not found or belongs to different workstream
        if (!targetMilestone || targetMilestone.workstreamId !== activityWorkstreamId) {
          return;
        }

        const key = `${sourceId}-${targetId}`;
        if (!connectionGroups[key]) {
          connectionGroups[key] = [];
        }
        connectionGroups[key].push(activity);
      });

      // Process cross-workstream connections (dotted lines to duplicate nodes)
      const crossWorkstreamTargets = [
        ...(activity.supported_milestones || []),
        ...(activity.additional_milestones || [])
      ].filter(targetId => {
        const targetMilestone = allMilestones.find(m => m.id === targetId);
        return targetMilestone && targetMilestone.workstreamId !== activityWorkstreamId;
      });

      crossWorkstreamTargets.forEach(targetId => {
        const duplicateId = `activity-duplicate-${targetId}-${activity.id}`;
        const source = placementCoordinates[sourceId.toString()];
        const duplicateTarget = placementCoordinates[duplicateId];

        if (!source || !duplicateTarget) return;

        const workstream = workstreams.find(ws => ws.id === activity.workstreamId);
        if (!workstream) return;

        // Draw dotted connection from activity source to duplicate milestone
        const pathData = d3.linkHorizontal()({
          source: [source.x, source.y],
          target: [duplicateTarget.x, duplicateTarget.y]
        } as DefaultLinkObject) ?? "";

        const path = activitiesGroup.current!
          .append("path")
          .attr("d", pathData)
          .attr("fill", "none")
          .attr("stroke", workstream.color)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4 3") // Make it dotted for cross-workstream
          .attr("marker-end", "url(#arrow)")
          .attr("class", "cross-workstream-activity")
          .datum({
            ...activity,
            targetMilestoneIds: [targetId]
          })
          .on("mouseover", (event) => {
            const targetMilestone = allMilestones.find(m => m.id === targetId);
            handleD3MouseOver(
              event, 
              `${getTooltipContent({ data: activity })} → ${targetMilestone?.name || "Unknown"} (Cross-workstream)`
            );
          })
          .on("mousemove", handleD3MouseMove)
          .on("mouseout", handleD3MouseOut);
        
        addActivityLabel(path, {
          ...activity,
          id: `${activity.id}-${targetId}`,
          name: activity.name + " (cross-workstream)"
        });
      });
    });
  
    // Draw regular connections (solid lines)
    Object.entries(connectionGroups).forEach(([key, groupActivities]) => {
      const [sourceId, targetId] = key.split("-").map(Number);
      const source = placementCoordinates[sourceId.toString()];
      const target = placementCoordinates[targetId.toString()];
      if (!source || !target) return;
    
      if (groupActivities.length === 1) {
        const activity = groupActivities[0];
        const workstream = workstreams.find((ws) => ws.id === activity.workstreamId);
        if (!workstream) return;
      
        const path = activitiesGroup.current!
          .append("path")
          .attr(
            "d",
            d3.linkHorizontal()({
              source: [source.x, source.y],
              target: [target.x, target.y],
            } as DefaultLinkObject) ?? ""
          )
          .attr("fill", "none")
          .attr("stroke", workstream.color)
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(#arrow)")
          .attr("class", "same-workstream-activity")
          .datum({
            ...activity,
            targetMilestoneIds: [targetId]
          })
          .on("mouseover", (event) => {
            handleD3MouseOver(event, getTooltipContent({ data: activity }));
          })
          .on("mousemove", handleD3MouseMove)
          .on("mouseout", handleD3MouseOut);
        
        addActivityLabel(path, activity);
      } else {
        const centerX = (source.x + target.x) / 2;
        const centerY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;
      
        const perpVectorX = -dy / length;
        const perpVectorY = dx / length;
        const someScale = 50;
      
        groupActivities.forEach((activity, index) => {
          const workstream = workstreams.find((ws) => ws.id === activity.workstreamId);
          if (!workstream) return;
        
          const offset = index - (groupActivities.length - 1) / 2;
          const controlX = centerX + offset * perpVectorX * someScale;
          const controlY = centerY + offset * perpVectorY * someScale;
        
          const pathData = `
            M ${source.x},${source.y}
            Q ${controlX},${controlY} ${target.x},${target.y}
          `;

          const path = activitiesGroup.current!
            .append("path")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", workstream.color)
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)")
            .attr("class", "same-workstream-activity")
            .datum({
              ...activity,
              targetMilestoneIds: [targetId]
            })
            .on("mouseover", (event) => {
              handleD3MouseOver(event, getTooltipContent({ data: activity }));
            })
            .on("mousemove", handleD3MouseMove)
            .on("mouseout", handleD3MouseOut);

          addActivityLabel(path, activity);
        });
      }
    });
    
    // Draw dependencies
    dependencies.forEach((dep) => {
      const sourceMilestone = allMilestones.find((m) => m.id === dep.source);
      const targetMilestone = allMilestones.find((m) => m.id === dep.target);
    
      if (!sourceMilestone || !targetMilestone) return;
    
      // Only draw direct dependencies for same-workstream milestones
      // Cross-workstream dependencies are handled via duplicate nodes
      if (sourceMilestone.workstreamId === targetMilestone.workstreamId) {
        const sourceCoord = placementCoordinates[dep.source.toString()];
        const targetCoord = placementCoordinates[dep.target.toString()];
        if (sourceCoord && targetCoord) {
          dependencyGroup.current!
            .append("path")
            .attr("class", "dependency-line")
            .attr(
              "d",
              d3.linkHorizontal()({
                source: [sourceCoord.x, sourceCoord.y],
                target: [targetCoord.x, targetCoord.y],
              } as DefaultLinkObject) ?? ""
            )
            .attr("fill", "none")
            .attr("stroke", "#6b7280")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4 3")
            .datum(dep)
            .on("mouseover", (event) => {
              handleD3MouseOver(event, "Dependency relationship");
            })
            .on("mousemove", handleD3MouseMove)
            .on("mouseout", handleD3MouseOut);            
        }
      }
    });
    
    // Auto-connect activities
    workstreams.forEach((workstream) => {
      const wsMilestones = workstream.milestones
        .slice()
        .sort((a, b) => {
          const dateA = a.deadline ? new Date(a.deadline) : new Date(0);
          const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
          return dateA.getTime() - dateB.getTime();
        });
      activities
        .filter((a) => a.workstreamId === workstream.id && a.autoConnect)
        .forEach((activity) => {
          const sourceMilestoneIndex = wsMilestones.findIndex(
            (m) => m.id === activity.sourceMilestoneId
          );
          if (sourceMilestoneIndex >= 0 && sourceMilestoneIndex < wsMilestones.length - 1) {
            activity.targetMilestoneIds = [wsMilestones[sourceMilestoneIndex + 1].id];
          }
        });
    });
    
    // Layer ordering
    activitiesGroup.current.lower();
    dependencyGroup.current.lower();
    
  }, [data, timelineMarkers, workstreams, activities, dependencies, xScale, yScale, milestonePositions, workstreamPositions, allMilestones, contentWidth, milestonePlacements, createMilestoneDragBehavior, createWorkstreamDragBehavior, remoteMilestonePos, margin.top, contentHeight, upsertPos, placementCoordinates, handleD3MouseMove, handleD3MouseOut, handleD3MouseOver]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef}></svg>
      <Tooltip
        content={tooltip.content}
        left={tooltip.left}
        top={tooltip.top}
        visible={tooltip.visible}
      />
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <ScreenshotButton svgRef={svgRef} />
      </div>
    </div>
  );
};

export default FlightmapVisualization;