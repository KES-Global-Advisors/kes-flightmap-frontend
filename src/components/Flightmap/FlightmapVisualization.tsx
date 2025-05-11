/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams roadmaps Flightmap
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

interface FlightmapVisualizationProps {
  data: FlightmapData;
  onMilestoneDeadlineChange: (milestoneId: string, newDeadline: Date) => Promise<boolean>;
}

const FlightmapVisualization: React.FC<FlightmapVisualizationProps> = ({ data, onMilestoneDeadlineChange }) => {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>(null);
  const [tooltip, setTooltip] = useState({
    content: "",
    left: 0,
    top: 0,
    visible: false,
  });
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

  // Separate trackers for original and duplicate node positions
  const originalNodeCoordinates = useRef<{ [id: string]: { x: number; y: number } }>({});
  const duplicateNodeCoordinates = useRef<{ [id: string]: { x: number; y: number } }>({});
  const processedDuplicates = useRef(new Set<string>());

  // Reference to track all placement coordinates for rendering
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

  // Debounced API call reference
// Debounced API call reference with support for duplicate node parameters
const debouncedUpsertPosition = useRef(
  debounce((
    flightmapId: number, 
    nodeType: 'milestone'|'workstream', 
    nodeId: number, 
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
  const margin = { top: 40, right: 150, bottom: 30, left: 150 };
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

  // Add this function after the other utility functions (around line 270)
  const ensureDuplicateNodeBackendRecord = useCallback((placement: MilestonePlacement) => {
    // Only process duplicate nodes with a duplicateKey
    if (!placement.isDuplicate || !placement.duplicateKey || !placement.originalMilestoneId) {
      return;
    }
  
    // Skip if we've already processed this duplicate
    const duplicateKey = String(placement.duplicateKey);
    if (processedDuplicates.current.has(duplicateKey)) {
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
      const relY = (workstreamY - margin.top) / contentHeight;
  
      console.log(`Creating backend record for duplicate milestone: ${duplicateKey}`);
  
      // Store the duplicate node in the backend
      upsertPos.mutate({
        flightmap: data.id,
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
    processedDuplicates.current.add(duplicateKey);
  }, [data.id, remoteMilestonePos, workstreamPositions, margin.top, contentHeight, upsertPos]);

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

  // Function to store coordinates in the appropriate tracker
  const trackNodePosition = useCallback((
    placement: MilestonePlacement, 
    x: number, 
    y: number
  ) => {
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
  }, [placementCoordinates]);

  // 1. Canvas setup - runs once on mount and when dimensions change
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();
  
    svgEl
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("class", "bg-white");
  
    // Create container group
    container.current = svgEl.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
      
    // Create layer groups
    timelineGroup.current = container.current.append("g").attr("class", "timeline");
    activitiesGroup.current = container.current.append("g").attr("class", "activities");
    workstreamGroup.current = container.current.append("g").attr("class", "workstreams");
    milestonesGroup.current = container.current.append("g").attr("class", "milestones");
    dependencyGroup.current = container.current.append("g").attr("class", "dependencies");
    
    // Define arrow markers
    svgEl
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 73)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");
  
    svgEl
      .append("defs")
      .append("marker")
      .attr("id", "dependency-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 73)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#6b7280");
      
    // Add legend
    const legend = svgEl
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right + -50}, ${margin.top})`);
    const legendItemHeight = 30;
    legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(0, ${i * legendItemHeight})`)
      .each(function (d) {
        const g = d3.select(this);
        const shapeSize = 15;
        if (d.type === "milestone") {
          g.append("circle")
            .attr("cx", shapeSize / 2)
            .attr("cy", shapeSize / 2)
            .attr("r", shapeSize / 2)
            .attr("fill", d.status === "completed" ? "#ccc" : "#6366f1")
            .attr("stroke", d.status === "completed" ? "#ccc" : "#4f46e5")
            .attr("stroke-width", 1);
        } else if (d.type === "status") {
          g.append("circle")
            .attr("cx", shapeSize / 2)
            .attr("cy", shapeSize / 2)
            .attr("r", 5)
            .attr("fill", "white")
            .attr("stroke", getStatusColor(d.status || ""))
            .attr("stroke-width", 1);
          if (d.status === "completed") {
            g.append("path")
              .attr("d", "M-2,0 L-1,1 L2,-2")
              .attr("transform", `translate(${shapeSize / 2},${shapeSize / 2})`)
              .attr("stroke", getStatusColor(d.status))
              .attr("stroke-width", 1.5)
              .attr("fill", "none");
          } else if (d.status === "in_progress") {
            g.append("circle")
              .attr("cx", shapeSize / 2)
              .attr("cy", shapeSize / 2)
              .attr("r", 2)
              .attr("fill", getStatusColor(d.status));
          } else {
            g.append("line")
              .attr("x1", shapeSize / 2 - 2)
              .attr("y1", shapeSize / 2)
              .attr("x2", shapeSize / 2 + 2)
              .attr("y2", shapeSize / 2)
              .attr("stroke", getStatusColor(d.status || ""))
              .attr("stroke-width", 1.5);
          }
        } else if (d.type === "instruction") {
          g.append("path")
            .attr("d", "M3,0 L7,0 M5,-2 L5,2 M3,5 L7,5 M5,3 L5,7")
            .attr("transform", `translate(${shapeSize / 2 - 5},${shapeSize / 2 - 5})`)
            .attr("stroke", "#4b5563")
            .attr("stroke-width", 1.5)
            .attr("stroke-linecap", "round");
        } else if (d.type === "dependency") {
          g.append("line")
            .attr("x1", 0)
            .attr("y1", shapeSize / 2)
            .attr("x2", shapeSize)
            .attr("y2", shapeSize / 2)
            .attr("stroke", "#6b7280")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 3");
          g.append("path")
            .attr("d", "M0,-2L4,0L0,2")
            .attr("transform", `translate(${shapeSize - 4},${shapeSize / 2})`)
            .attr("fill", "#6b7280");
        } else if (d.type === "duplicate") {
          g.append("line")
            .attr("x1", 0)
            .attr("y1", shapeSize / 2)
            .attr("x2", shapeSize)
            .attr("y2", shapeSize / 2)
            .attr("stroke", "#6366f1")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "5 5");
        } else if (d.type === "cross-workstream-activity") {
          g.append("line")
            .attr("x1", 0)
            .attr("y1", shapeSize / 2)
            .attr("x2", shapeSize)
            .attr("y2", shapeSize / 2)
            .attr("stroke", "#6366f1")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 3");
          g.append("path")
            .attr("d", "M0,-2L4,0L0,2")
            .attr("transform", `translate(${shapeSize - 4},${shapeSize / 2})`)
            .attr("fill", "#6366f1");
        }
        g.append("text")
          .attr("x", shapeSize + 5)
          .attr("y", shapeSize / 2 + 4)
          .attr("fill", "black")
          .style("font-size", "12px")
          .text(d.label);
      });

    // Add a button to reset node positions
    const resetButton = svgEl
      .append("g")
      .attr("class", "reset-positions-button")
      .attr("transform", `translate(${width - margin.right + -50}, ${margin.top + (legendData.length + 1) * legendItemHeight})`)
      .attr("cursor", "pointer")
      .on("click", () => {
        // Show a loading state
        resetButton.select("text").text("Resetting positions...");
        
        // Clear local storage
        localStorage.removeItem(getMilestonePositionsKey(dataId.current));
        localStorage.removeItem(getWorkstreamPositionsKey(dataId.current));
        
        // Reset local state
        setMilestonePositions({});
        setWorkstreamPositions({});
        
        // Call the new reset endpoint
        const resetPositions = async () => {
          const token = sessionStorage.getItem('accessToken');
          try {
            // Use the new reset endpoint to create default positions
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
            resetButton.select("text").text("Reset Node Positions");
          } catch (error) {
            console.error('Error resetting positions:', error);
            resetButton.select("text").text("Reset Node Positions");
          }
        };
        
        resetPositions();
      });

    resetButton
      .append("rect")
      .attr("width", 150)
      .attr("height", 30)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", "#e5e7eb")
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 1);

    resetButton
      .append("text")
      .attr("x", 75)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#4b5563")
      .text("Reset Node Positions");

  }, [width, height, margin.left, margin.top, margin.right, data.id, queryClient]);

  // 2. Initialize zoom behavior - executed once after container is created
  useEffect(() => {
    if (!svgRef.current || !container.current) return;
    
    const svgEl = d3.select(svgRef.current);
    
    // Create zoom behavior with proper constraints
    const zoom = d3.zoom<Element, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        // Create a constrained transform
        const { x, y, k } = event.transform;
        
        // Important: Constrain only the minimum Y to prevent going above margin.top
        // But preserve the X position and scale factors exactly as user intended
        const constrainedY = Math.min(y, margin.top);
        
        container.current?.attr(
          "transform", 
          `translate(${x}, ${constrainedY}) scale(${k})`
        );
      });
      
    // Apply zoom and disable double-click zoom
    svgEl
      .call(zoom as any)
      .on("dblclick.zoom", null);
      
    // Prevent default wheel behavior
    svgEl.on("wheel", function(event) {
      event.preventDefault();
    });
    
    // Store reference for reset button
    zoomRef.current = zoom;
    
  }, [margin.top]);

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

  // Function to update workstream line positions
  const updateWorkstreamLines = useCallback(() => {
    if (!workstreamGroup.current) return;
    
    workstreamGroup.current.selectAll(".workstream").each(function(d: any) {
      const workstreamId = d.id;
      const wsGroup = d3.select(this);
      
      // Get the current position from state - this is the source of truth
      const y = workstreamPositions[workstreamId]?.y || d.initialY;
      
      // Update the actual line y-coordinates 
      wsGroup.select("line")
        .attr("y1", y)
        .attr("y2", y);
        
      // Update workstream label y-coordinate
      wsGroup.select("text")
        .attr("y", y);
        
      // IMPORTANT: Reset the transform to prevent double transformations
      wsGroup.attr("transform", "translate(0, 0)");
    });
  }, [workstreamPositions]);

  // Add an effect to update workstream lines when workstream positions change
  useEffect(() => {
    // Make sure the workstream lines are updated after any position changes
    if (Object.keys(workstreamPositions).length > 0) {
      // Call the existing debounced save
      debouncedSaveWorkstreamPositions(dataId.current, workstreamPositions);

      // Immediate update of line positions
      updateWorkstreamLines();
    }
  }, [workstreamPositions, debouncedSaveWorkstreamPositions, updateWorkstreamLines]);

  // Also add an effect to ensure workstream lines are updated after the component fully mounts
  useEffect(() => {
    // This ensures lines are correctly positioned after initial render
    if (workstreamGroup.current && Object.keys(workstreamPositions).length > 0) {
      updateWorkstreamLines();
    }
  }, [updateWorkstreamLines, workstreamPositions]);

  // Lightweight function to update only visual appearance without full redraw
  const updateActivities = useCallback(() => {
    if (!activitiesGroup.current) return;
    activities.forEach(activity => {
      updateVisualConnectionsForNode(activity.sourceMilestoneId);
    });
  }, [activities, updateVisualConnectionsForNode]);

  // Lightweight function to update only visual appearance without full redraw
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
      .on("start", function() {
        d3.select(this).classed("dragging", true);
        // Clear any pending updates
        if (dragEndTimeout) clearTimeout(dragEndTimeout);
        pendingPositionUpdates = {};
      })
      .on("drag", function(event, d) {
        const deltaX = event.x - d.initialX;
        const deltaY = event.y - d.initialY;
        d3.select(this).attr("transform", `translate(${deltaX}, ${deltaY})`);
        
        // Update placement coordinates temporarily for visual updates
        if (placementCoordinates[d.id]) {
          // const origX = placementCoordinates[d.id].x;
          placementCoordinates[d.id].y = d.initialY + deltaY;
        }
        
        // Update only the visual connections without state changes
        updateVisualConnectionsForNode(d.id);
      })
      .on("end", function(event, d) {
        d3.select(this).classed("dragging", false);
        const minAllowedY = 20;
        const constrainedY = Math.max(minAllowedY, event.y);
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
                // instead of using the original milestone ID
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
      });
  }, [data.id, contentHeight, margin.top, timelineMarkers, xScale, debouncedUpsertPosition, onMilestoneDeadlineChange, updateVisualConnectionsForNode, placementCoordinates]);

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
        const offset = newY - d.initialY;
        const actualDeltaY = newY - (d.lastY || d.initialY);
        d.lastY = newY;

        // Apply transform to the workstream group during drag
        d3.select(this).attr("transform", `translate(0, ${offset})`);

        // ADDED: Update workstream line coordinates directly during drag for visual consistency
        d3.select(this).select("line")
          .attr("y1", newY)
          .attr("y2", newY);

        d3.select(this).select("text")
          .attr("y", newY);

        // Move all milestone nodes for this workstream
        if (milestonesGroup.current) {
          milestonesGroup.current
            .selectAll(".milestone")
            .filter((p: any) => p.placementWorkstreamId === d.id)
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
              const currentTransform = d3.select(this).attr("transform") || "";
              const match = currentTransform.match(/translate\(0,\s*([-\d.]+)\)/);
              const currentY = match ? parseFloat(match[1]) : 0;
              d3.select(this).attr("transform", `translate(0, ${currentY + actualDeltaY})`);
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

        // CRITICAL: Update the line coordinates immediately after drag
        // This ensures the line doesn't snap back before the state update
        d3.select(this).select("line")
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
              .filter((p: any) => p.placementWorkstreamId === d.id)
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
      });
  }, [activities, data.id, debouncedUpsertPosition, margin.top, contentHeight, updateActivities, updateDependencies, updateVisualConnectionsForNode, placementCoordinates]);

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
    
    // Draw workstreams
    workstreams.forEach((workstream) => {
      let y = yScale(workstream.id.toString()) || 0;
      if (workstreamPositions[workstream.id]) {
        y = workstreamPositions[workstream.id].y;
      }
    
      const wsGroup = workstreamGroup.current!
        .append("g")
        .datum({ ...workstream, initialY: y })
        .attr("class", "workstream")
        .attr("cursor", "ns-resize")
        .call(workstreamDragBehavior as any);
    
      // IMPORTANT: Remove any default transform on the workstream group
      // and only rely on explicit coordinates for the line and text
      wsGroup.attr("transform", "translate(0, 0)");
    
      wsGroup
        .append("text")
        .attr("x", -10)
        .attr("y", y) // Explicit y-coordinate
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-weight", "bold")
        .attr("fill", workstream.color)
        .text(workstream.name);
    
      wsGroup
        .append("line")
        .attr("x1", 0)
        .attr("y1", y) // Explicit y-coordinate
        .attr("x2", contentWidth)
        .attr("y2", y) // Explicit y-coordinate
        .attr("stroke", workstream.color)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.3)
        .attr("stroke-dasharray", "4 2");
    });
    
    // Process milestone placements into groups
    const placementGroups = groupPlacementsByDeadlineAndWorkstream(milestonePlacements);
    
    // Draw milestones
    Object.values(placementGroups).forEach((group) => {
      const maxOffset = 200;
      const offsetStep = group.length > 1 ? maxOffset / (group.length - 1) : 0;

      group.forEach((placement, index) => {
        const milestone = placement.milestone;
        const workstreamId = placement.placementWorkstreamId;
        const workstream = workstreams.find((ws) => ws.id === workstreamId);
        if (!workstream) return;

        const x = milestone.deadline ? xScale(new Date(milestone.deadline)) : 20;
        let y = yScale(workstream.id.toString()) || 0;
        if (workstreamPositions[workstream.id]) {
          y = workstreamPositions[workstream.id].y;
        }
        if (group.length > 1) {
          const totalOffset = (group.length - 1) * offsetStep;
          const startOffset = -totalOffset / 2;
          y += startOffset + index * offsetStep;
        }
        if (milestonePositions[placement.id]) {
          y = milestonePositions[placement.id].y;
        }

        // Use trackNodePosition instead of direct assignment
        trackNodePosition(placement, x, y);

        const milestoneGroup = milestonesGroup.current!
          .append("g")
          .datum({ ...placement, initialX: x, initialY: y })
          .attr("class", "milestone")
          .attr("cursor", "move")
          .call(milestoneDragBehavior as any);

        const originalWorkstream = workstreams.find((ws) => ws.id === milestone.workstreamId);
        const fillColor =
          milestone.status === "completed" ? "#ccc" : originalWorkstream?.color || "#6366f1";

        milestoneGroup
          .append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 55)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", placement.activityId ? 2 : 1) // Make border thicker for activity duplicates
          .attr("opacity", placement.isDuplicate ? 0.7 : 1)
          .attr("stroke-dasharray", placement.activityId ? "0" : (placement.isDuplicate ? "4 3" : "0")) // Different dash pattern based on duplicate type
          .on("mouseover", (event) => {
            const tooltipText = getTooltipContent({ data: milestone }) + 
                              (placement.isDuplicate ? (placement.activityId ? " (Activity Duplicate)" : " (Dependency Duplicate)") : "");
            setTooltip({
              content: tooltipText,
              left: event.pageX + 10,
              top: event.pageY - 28,
              visible: true,
            });
          })
          .on("mousemove", (event) => {
            setTooltip((prev) => ({
              ...prev,
              left: event.pageX + 10,
              top: event.pageY - 28,
            }));
          })
          .on("mouseout", () => {
            setTooltip((prev) => ({ ...prev, visible: false }));
          });

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

        const workstreamY = yScale(workstream.id.toString()) || 0;
        milestoneGroup
          .append("line")
          .attr("class", "connection-line")
          .attr("x1", x)
          .attr("y1", y)
          .attr("x2", x)
          .attr("y2", Math.max(20, workstreamY))
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
          ensureDuplicateNodeBackendRecord(placement);
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
                  setTooltip({
                    content: `Dependency: ${milestone.name} → ${allMilestones.find(m => m.id === targetMilestoneId)?.name}`,
                    left: event.pageX + 10,
                    top: event.pageY - 28,
                    visible: true,
                  });
                })
                .on("mousemove", (event) => {
                  setTooltip((prev) => ({
                    ...prev,
                    left: event.pageX + 10,
                    top: event.pageY - 28,
                  }));
                })
                .on("mouseout", () => {
                  setTooltip((prev) => ({ ...prev, visible: false }));
                });
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
            setTooltip({
              content: `${getTooltipContent({ data: activity })} → ${targetMilestone?.name || "Unknown"} (Cross-workstream)`,
              left: event.pageX + 10,
              top: event.pageY - 28,
              visible: true,
            });
          })
          .on("mousemove", (event) => {
            setTooltip(prev => ({
              ...prev,
              left: event.pageX + 10,
              top: event.pageY - 28,
            }));
          })
          .on("mouseout", () => {
            setTooltip(prev => ({ ...prev, visible: false }));
          });
        
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
            setTooltip({
              content: getTooltipContent({ data: activity }),
              left: event.pageX + 10,
              top: event.pageY - 28,
              visible: true,
            });
          })
          .on("mousemove", (event) => {
            setTooltip((prev) => ({
              ...prev,
              left: event.pageX + 10,
              top: event.pageY - 28,
            }));
          })
          .on("mouseout", () => {
            setTooltip((prev) => ({ ...prev, visible: false }));
          });
        
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
              setTooltip({
                content: getTooltipContent({ data: activity }),
                left: event.pageX + 10,
                top: event.pageY - 28,
                visible: true,
              });
            })
            .on("mousemove", (event) => {
              setTooltip((prev) => ({
                ...prev,
                left: event.pageX + 10,
                top: event.pageY - 28,
              }));
            })
            .on("mouseout", () => {
              setTooltip((prev) => ({ ...prev, visible: false }));
            });

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
              setTooltip({
                content: "Dependency relationship",
                left: event.pageX + 10,
                top: event.pageY - 28,
                visible: true,
              });
            })
            .on("mousemove", (event) => {
              setTooltip((prev) => ({
                ...prev,
                left: event.pageX + 10,
                top: event.pageY - 28,
              }));
            })
            .on("mouseout", () => {
              setTooltip((prev) => ({ ...prev, visible: false }));
            });
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
    
  }, [data, timelineMarkers, workstreams, activities, dependencies, xScale, yScale, milestonePositions, workstreamPositions, allMilestones, contentWidth, milestonePlacements, createMilestoneDragBehavior, createWorkstreamDragBehavior, placementCoordinates, trackNodePosition, ensureDuplicateNodeBackendRecord]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef}></svg>
      <Tooltip
        content={tooltip.content}
        left={tooltip.left}
        top={tooltip.top}
        visible={tooltip.visible}
      />
      <button
        onClick={() => {
          if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current)
              .transition()
              .duration(500)
              .call(zoomRef.current.transform as any, d3.zoomIdentity);
          }
        }}
        className="absolute bottom-4 right-4 p-2 bg-white rounded shadow hover:bg-gray-50 transition-colors"
      >
        Reset View
      </button>
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <ScreenshotButton svgRef={svgRef} />
      </div>
    </div>
  );
};

export default FlightmapVisualization;