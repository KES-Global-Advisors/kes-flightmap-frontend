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
  enforceWorkstreamContainment,
} from './Utils/layoutUtils';
import { trackNodePosition } from './Utils/nodeTracking';
import { ensureDuplicateNodeBackendRecord } from './Utils/apiUtils';
import { useTooltip } from '../../hooks/useTooltip';
import { createLegend } from './Utils/legendUtils';
import { setupZoomBehavior, resetZoom } from './Utils/zoomUtils';
import { initializeVisualizationSVG, addResetViewButton, SvgContainers } from './Utils/svgSetup';
import { 
  WORKSTREAM_AREA_HEIGHT, 
  NODE_RADIUS,
  DEBOUNCE_TIMEOUT,
} from './Utils/types';

// Import our new custom hook for drag behaviors
import useDragBehaviors from '../../hooks/useDragBehaviors';

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
      duplicateKey?: string | number;
      workstreamId: number;
    } 
  } = useRef({}).current;
  
  // Add after the existing debouncedUpsertPosition ref (around line 190)
  const debouncedBatchMilestoneUpdate = useRef(
    debounce((updates: Record<string, { y: number }>) => {
      setMilestonePositions(prev => ({ ...prev, ...updates }));
    }, 50) // Faster debounce for better UX
  ).current;

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
    }, DEBOUNCE_TIMEOUT)
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
    }, DEBOUNCE_TIMEOUT)
  ).current;

  const debouncedSaveWorkstreamPositions = useRef(
    debounce((dataId: string, positions: Record<number, { y: number }>) => {
      saveWorkstreamPositions(dataId, positions);
    }, DEBOUNCE_TIMEOUT)
  ).current;

  // Add after existing debounced functions
  const debouncedUpdateConnections = useRef(
    debounce((nodeId: string | number) => {
      if (updateVisualConnectionsForNode) {
        updateVisualConnectionsForNode(nodeId);
      }
    }, 16) // ~60fps
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

    // Scales setup - recalculated when timeline markers or dimensions change
  const xScale = useMemo(() => {
    return d3
      .scaleTime()
      .domain([d3.min(timelineMarkers) || new Date(), d3.max(timelineMarkers) || new Date()])
      .range([0, contentWidth])
      .nice();
  }, [timelineMarkers, contentWidth]);

  // ✅ NEW: Cache timeline positions to avoid recalculation
  const timelinePositionCache = useMemo(() => {
    const cache = new Map<string, number>();
    timelineMarkers.forEach(marker => {
      cache.set(marker.toISOString(), xScale(marker));
    });
    return cache;
  }, [timelineMarkers, xScale]);

  const yScale = useMemo(() => {
    return d3
      .scalePoint()
      .domain(workstreams.map((ws) => ws.id.toString()))
      .range([100, contentHeight - 100])
      .padding(1.0);
  }, [workstreams, contentHeight]);

  // OPTIMIZATION 1: Memoize placement groups
  const placementGroups = useMemo(() => {
    return groupPlacementsByDeadlineAndWorkstream(milestonePlacements);
  }, [milestonePlacements]);

  // OPTIMIZATION 2: Memoize node positions by group
  const allNodePositions = useMemo(() => {
    // ✅ EARLY EXIT: If no placement groups, return empty
    if (Object.keys(placementGroups).length === 0) return {};
  
    const positionsByGroup: Record<string, Array<{id: string, y: number, userPlaced: boolean}>> = {};
    
    // ✅ PERFORMANCE: Use Object.entries() once instead of multiple iterations
    Object.entries(placementGroups).forEach(([groupKey, group]) => {
      if (group.length === 0) return; // ✅ Skip empty groups
      
      // ✅ OPTIMIZATION: Extract common values once per group
      const workstreamId = group[0].placementWorkstreamId;
      const deadline = group[0].milestone.deadline ? 
        new Date(group[0].milestone.deadline) : new Date();
      
      // ✅ PERFORMANCE: Use cached timeline position
      const timelineX = timelinePositionCache.get(deadline.toISOString()) || xScale(deadline);
      
      // ✅ OPTIMIZED: Calculate spacing for this group
      positionsByGroup[groupKey] = calculateNodeSpacing(
        group, 
        workstreamId, 
        timelineX, 
        xScale, 
        workstreamPositions, 
        milestonePositions
      );
    });
    
    return positionsByGroup;
  }, [
    placementGroups,
    timelinePositionCache, // ✅ Use cached timeline positions
    xScale, 
    workstreamPositions, 
    milestonePositions
  ]);

  // OPTIMIZATION 3: Format timeline data once
  const formattedTimelineData = useMemo(() => {
    // ✅ PERFORMANCE: Use map() once with cached positions
    return timelineMarkers.map(date => {
      const dateKey = date.toISOString();
      return {
        date,
        xPosition: timelinePositionCache.get(dateKey)!, // ✅ Guaranteed to exist
        formattedDate: date.toLocaleDateString(undefined, { 
          month: "short", 
          year: "numeric" 
        })
      };
    });
  }, [timelineMarkers, timelinePositionCache]); // ✅ Stable dependencies

  // OPTIMIZATION 4: Optimized workstream initial positions
  const workstreamInitialPositions = useMemo(() => {
    // ✅ EARLY EXIT: If no workstreams, return empty object
    if (workstreams.length === 0) return {};

    const positions: Record<number, { y: number, hasCustomPosition: boolean }> = {};

    // ✅ PERFORMANCE: Single loop with efficient lookups
    workstreams.forEach(workstream => {
      const customPosition = workstreamPositions[workstream.id];
      const defaultY = yScale(workstream.id.toString()) || 0;

      positions[workstream.id] = customPosition 
        ? { y: customPosition.y, hasCustomPosition: true }
        : { y: defaultY, hasCustomPosition: false };
    });

    return positions;
  }, [workstreams, yScale, workstreamPositions]); // ✅ Precise dependencies

  // ✅ OPTIMIZATION 5: Enhanced connection cache with stability checks
  const connectionCache = useMemo(() => {
    // ✅ PERFORMANCE CHECK: Skip if no data
    if (activities.length === 0 && dependencies.length === 0) {
      return { activityMap: new Map(), dependencyMap: new Map() };
    }
  
    const activityMap = new Map<string, any[]>();
    const dependencyMap = new Map<string, any[]>();
  
    // ✅ OPTIMIZATION: Batch process activities with single loop
    activities.forEach(activity => {
      // ✅ NEW STRUCTURE: Use source_milestone instead of source_milestone
      const sourceId = activity.source_milestone?.toString();
      const targetId = activity.target_milestone?.toString();
    
      if (sourceId) {
        // ✅ PERFORMANCE: Use || operator for faster map initialization
        (activityMap.get(sourceId) || 
         (activityMap.set(sourceId, []), activityMap.get(sourceId))!)
         .push(activity);
      }
    
      if (targetId) {
        // ✅ NEW: Also map target milestone to activity
        (activityMap.get(targetId) || 
         (activityMap.set(targetId, []), activityMap.get(targetId))!)
         .push(activity);
      }
    
      // ✅ MAINTAINED: Process cross-workstream supported milestones
      (activity.supported_milestones || []).forEach((supportedId: any) => {
        const supportedIdStr = supportedId.toString();
        (activityMap.get(supportedIdStr) || 
         (activityMap.set(supportedIdStr, []), activityMap.get(supportedIdStr))!)
         .push(activity);
      });
    
      // ✅ MAINTAINED: Process additional milestones
      (activity.additional_milestones || []).forEach((additionalId: any) => {
        const additionalIdStr = additionalId.toString();
        (activityMap.get(additionalIdStr) || 
         (activityMap.set(additionalIdStr, []), activityMap.get(additionalIdStr))!)
         .push(activity);
      });
    });
  
    // ✅ OPTIMIZATION: Batch process dependencies with single loop
    dependencies.forEach(dep => {
      const sourceId = dep.source.toString();
      const targetId = dep.target.toString();
    
      // ✅ PERFORMANCE: Use || operator for faster map initialization
      (dependencyMap.get(sourceId) || 
       (dependencyMap.set(sourceId, []), dependencyMap.get(sourceId))!)
       .push(dep);
    
      (dependencyMap.get(targetId) || 
       (dependencyMap.set(targetId, []), dependencyMap.get(targetId))!)
       .push(dep);
    });
  
    return { activityMap, dependencyMap };
  }, [activities, dependencies]);

  // OPTIMIZATION 6: Updated connection groups with new source/target milestone logic
  const connectionGroups = useMemo(() => {
    // ✅ EARLY EXIT: If no activities, return empty object
    if (activities.length === 0) return {};

    const groups: { [key: string]: any[] } = {};

    // ✅ NEW LOGIC: Use explicit source_milestone and target_milestone fields
    // Remove all auto-connect logic and workstream milestone mapping
    activities
      .filter(activity => activity.source_milestone && activity.target_milestone)
      .forEach(activity => {
        const sourceId = activity.source_milestone;
        const targetId = activity.target_milestone;

        // ✅ VALIDATION: Ensure both source and target exist in placement coordinates
        const sourceCoord = placementCoordinates[sourceId.toString()];
        const targetCoord = placementCoordinates[targetId.toString()];

        // Only log during initial processing if coordinates are expected to exist
        if (Object.keys(placementCoordinates).length > 0) {
          console.log('Processing activities for connectionGroups:', {
            totalActivities: activities.length,
            activitiesWithBothMilestones: activities.filter(a => a.source_milestone && a.target_milestone).length,
            placementCoordinatesCount: Object.keys(placementCoordinates).length,
            sampleActivity: activities[0]
          });
        }
        
        if (!sourceCoord || !targetCoord) {
          // Only warn if we expect coordinates to exist (after initial render)
          if (Object.keys(placementCoordinates).length > 0) {
            console.warn(`Missing coordinates for activity ${activity.id}:`, {
              sourceId,
              targetId,
              sourceCoordExists: !!sourceCoord,
              targetCoordExists: !!targetCoord,
              availableCoords: Object.keys(placementCoordinates),
              activity
            });
          }
          return;
        }

        // ✅ SAME WORKSTREAM CHECK: Only include if source and target are in same workstream
        // This replaces the old workstream validation logic
        const sourceMilestone = allMilestones.find(m => m.id === sourceId);
        const targetMilestone = allMilestones.find(m => m.id === targetId);

        if (!sourceMilestone || !targetMilestone) {
          console.warn(`Missing milestone data for activity ${activity.id}`);
          return;
        }

        // Update lines 622-629 in FlightmapVisualization.tsx
        if (sourceMilestone.workstreamId !== targetMilestone.workstreamId) {
          // Don't return early - this might be a valid cross-workstream activity
          console.log(`Activity ${activity.id} connects milestones in different workstreams - checking if supported`);

          // Check if this is intended as a cross-workstream activity
          const isCrossWorkstream = activity.supported_milestones?.includes(targetId) || 
                                   activity.additional_milestones?.includes(targetId);

          if (!isCrossWorkstream) {
            console.warn(`Activity ${activity.id} has source and target in different workstreams without proper cross-workstream configuration`);
            return;
          }
        }

        // ✅ GROUP BY SOURCE-TARGET PAIR: Multiple activities can connect same milestones
        const key = `${sourceId}-${targetId}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(activity);
      });

    return groups;
  }, [activities, allMilestones, Object.keys(placementCoordinates).length]); // ✅ Updated dependencies

  // Add after line 635 in FlightmapVisualization.tsx
useEffect(() => {
  console.log('Connection Groups Debug:', {
    connectionGroups,
    groupCount: Object.keys(connectionGroups).length,
    activities: activities.map(a => ({
      id: a.id,
      name: a.name,
      source: a.source_milestone,
      target: a.target_milestone,
      workstream: a.workstreamId
    })),
    milestoneIds: allMilestones.map(m => m.id),
    placementCoordKeys: Object.keys(placementCoordinates)
  });
}, [connectionGroups, activities, allMilestones, placementCoordinates]);

  // ✅ OPTIMIZATION 7: Optimized cross-workstream activity data
  const crossWorkstreamActivityData = useMemo(() => {
    // ✅ EARLY EXIT: If no activities, return empty array
    if (activities.length === 0 || allMilestones.length === 0) return [];

    // ✅ PERFORMANCE: Pre-build milestone lookup map for O(1) access
    const milestoneMap = new Map(allMilestones.map(m => [m.id, m]));

    const result: Array<{
      activity: any, 
      sourceId: number, 
      targetId: number,
      duplicateId: string
    }> = [];

    // ✅ OPTIMIZED: Single loop with early continues
    activities.forEach((activity) => {
      const activityWorkstreamId = activity.workstreamId;
      const sourceId = activity.source_milestone;

      // ✅ PERFORMANCE: Combine supported and additional milestones once
      const allTargets = [
        ...(activity.supported_milestones || []),
        ...(activity.additional_milestones || [])
      ];

      // ✅ EARLY EXIT: Skip if no targets
      if (allTargets.length === 0) return;

      // ✅ OPTIMIZED: Filter targets efficiently with Map lookup
      allTargets.forEach(targetId => {
        const targetMilestone = milestoneMap.get(targetId);

        // ✅ EARLY CONTINUE: Skip if not cross-workstream
        if (!targetMilestone || targetMilestone.workstreamId === activityWorkstreamId) {
          return;
        }

        // ✅ PERFORMANCE: Create duplicate ID once
        const duplicateId = `activity-duplicate-${targetId}-${activity.id}`;
        result.push({
          activity,
          sourceId,
          targetId,
          duplicateId
        });
      });
    });

    return result;
  }, [activities, allMilestones]); // ✅ Stable dependencies

  // ✅ OPTIMIZATION 8: Optimized same-workstream dependencies
  const sameWorkstreamDependencies = useMemo(() => {
    // ✅ EARLY EXIT: If no dependencies, return empty array
    if (dependencies.length === 0 || allMilestones.length === 0) return [];

    // ✅ PERFORMANCE: Pre-build milestone workstream lookup
    const milestoneWorkstreamMap = new Map(
      allMilestones.map(m => [m.id, m.workstreamId])
    );

    // ✅ OPTIMIZED: Single filter pass with Map lookups
    return dependencies.filter(dep => {
      const sourceWorkstream = milestoneWorkstreamMap.get(dep.source);
      const targetWorkstream = milestoneWorkstreamMap.get(dep.target);

      // ✅ FAST LOOKUP: O(1) instead of O(n) find operations
      return sourceWorkstream !== undefined && 
             targetWorkstream !== undefined && 
             sourceWorkstream === targetWorkstream;
    });
  }, [dependencies, allMilestones]); // ✅ Stable dependencies

  // Initialize drag behaviors from our custom hook
  const {
    createMilestoneDragBehavior,
    createWorkstreamDragBehavior,
    updateVisualConnectionsForNode,
  } = useDragBehaviors({
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
    workstreamGroup, 
    activitiesGroup,    // ✅ ADD: Required for scoped selections
    dependencyGroup,    // ✅ ADD: Required for scoped selections
    margin,
    contentHeight,
    contentWidth,
    xScale,
    debouncedUpsertPosition,
    onMilestoneDeadlineChange,
    connectionCache,
    debouncedBatchMilestoneUpdate,
    debouncedUpdateConnections,
  });

  /**
   * Selectively updates only connections relevant to the specified node
   * @param nodeId The ID of the node that was moved
   */
  const updateOnlyAffectedConnections = useCallback((nodeId: string | number) => {
    if (!milestonesGroup.current) return;

    const nodeIdStr = nodeId.toString();

    // Find only activities that involve this specific node
    const affectedActivities = activities.filter(activity => {
      const isSource = activity.source_milestone && 
                       activity.source_milestone.toString() === nodeIdStr;
      const isTarget = activity.target_milestone && 
                       activity.target_milestone.toString() === nodeIdStr;

      // Also check cross-workstream connections
      const isSupported = (activity.supported_milestones || []).includes(Number(nodeId));
      const isAdditional = (activity.additional_milestones || []).includes(Number(nodeId));

      return isSource || isTarget || isSupported || isAdditional;
    });

    // Update only affected activities
    affectedActivities.forEach(activity => {
      updateVisualConnectionsForNode(activity.source_milestone);
    });

    // Only update dependencies involving this node
    const affectedDependencies = dependencies.filter(dep => 
      dep.source.toString() === nodeIdStr || 
      dep.target.toString() === nodeIdStr
    );

    affectedDependencies.forEach(dep => {
      updateVisualConnectionsForNode(dep.source);
    });
  }, [activities, dependencies, milestonesGroup, updateVisualConnectionsForNode]);

    // ✅ NEW: Helper function for DOM position updates
  const updateMilestonePositionsInDOM = useCallback((
    positions: Array<[string, { y: number }]>
  ) => {
    if (!milestonesGroup.current) return;

    // ✅ BATCH: Group DOM updates by operation type
    const transforms: Array<{ element: any, transform: string }> = [];
    const lineUpdates: Array<{ element: any, y1: number, y2: number }> = [];

    positions.forEach(([nodeId, position]) => {
      milestonesGroup.current!.selectAll(".milestone")
        .filter((d: any) => d && d.id === nodeId)
        .each(function(d: any) {
          // ✅ PREPARE: Calculate transform
          const currentTransform = d3.select(this).attr("transform") || "";
          let currentX = 0;

          const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (translateMatch) {
            currentX = parseFloat(translateMatch[1]);
          }

          // ✅ QUEUE: Transform update
          transforms.push({
            element: this,
            transform: `translate(${currentX}, ${position.y - d.initialY})`
          });

          // ✅ QUEUE: Connection line update
          const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
          const workstreamY = workstreamPositions[workstreamId]?.y || d.initialY;

          lineUpdates.push({
            element: d3.select(this).select("line.connection-line").node(),
            y1: position.y,
            y2: workstreamY
          });
        });
    });

    // ✅ BATCH EXECUTE: Apply all DOM updates in sequence
    transforms.forEach(({ element, transform }) => {
      d3.select(element).attr("transform", transform);
    });

    lineUpdates.forEach(({ element, y1, y2 }) => {
      if (element) {
        d3.select(element)
          .attr("y1", y1)
          .attr("y2", y2);
      }
    });
  }, [milestonesGroup, workstreamPositions]);

  // ✅ NEW: Helper function for connection updates
  const updateConnectionsForChangedPositions = useCallback((
    positions: Array<[string, { y: number }]>
  ) => {
    // ✅ SMART: Only update connections for changed nodes
    if (positions.length <= 5) {
      // ✅ SELECTIVE: Update only affected connections
      positions.forEach(([nodeId]) => {
        updateOnlyAffectedConnections(nodeId);
      });
    } else {
      // ✅ BATCH: Schedule comprehensive update for large changes
      requestAnimationFrame(() => {
        const updatedNodes = new Set(positions.map(([nodeId]) => nodeId));

        activities.forEach(activity => {
          if (updatedNodes.has(activity.source_milestone.toString())) {
            updateVisualConnectionsForNode(activity.source_milestone);
          }
        });

        dependencies.forEach(dep => {
          if (updatedNodes.has(dep.source.toString())) {
            updateVisualConnectionsForNode(dep.source);
          }
        });
      });
    }
  }, [updateOnlyAffectedConnections, updateVisualConnectionsForNode, activities, dependencies]);

  // ✅ OPTIMIZED: Milestone positions effect with intelligent batching
  useEffect(() => {
    // ✅ EARLY EXIT: Skip if no positions or in middle of batch update
    if (Object.keys(milestonePositions).length === 0 || !milestonesGroup.current) return;
  
    // ✅ PERFORMANCE: Determine update strategy based on change volume
    const changedPositions = Object.entries(milestonePositions);
    const isLargeUpdate = changedPositions.length > 10;
  
    if (isLargeUpdate) {
      // ✅ LARGE UPDATES: Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => {
        updateMilestonePositionsInDOM(changedPositions);
        updateConnectionsForChangedPositions(changedPositions);
      });
    } else {
      // ✅ SMALL UPDATES: Update immediately for responsiveness
      updateMilestonePositionsInDOM(changedPositions);
      updateConnectionsForChangedPositions(changedPositions);
    }
  }, [milestonePositions, milestonesGroup, workstreamPositions]);

  // This single effect handles all workstream position-related updates
  useEffect(() => {
    if (Object.keys(workstreamPositions).length > 0 && workstreamGroup.current) {
      // 1. Persist to storage (debounced)
      debouncedSaveWorkstreamPositions(dataId.current, workstreamPositions);
      
    // Check if we're in the middle of dragging a milestone
    // This prevents circular updates during milestone drags
    const isCurrentlyDragging = milestonesGroup.current && milestonesGroup.current.select(".milestone.dragging").size() > 0;
    
    if (!isCurrentlyDragging) {
      // 3. Ensure milestones stay within their workstreams
      workstreams.forEach(workstream => {
        enforceWorkstreamContainment(
          workstream.id,
          workstreamPositions,
          milestonePositions,
          milestonePlacements,
          milestonesGroup,
          setMilestonePositions,
          placementCoordinates
        );
      });
      
      // 4. Only update connections that are affected by workstream moves
      // (Instead of ALL connections)
      const updateRelevantConnections = () => {
        // Find milestones belonging to moved workstreams and update their connections
        milestonesGroup.current?.selectAll(".milestone").each(function(d: any) {
          if (!d) return;
          
          const wsId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
          if (workstreamPositions[wsId]) {
            updateVisualConnectionsForNode(d.id);
          }
        });
      };
      
      // Use requestAnimationFrame for smoother visual updates
      requestAnimationFrame(updateRelevantConnections);
    }
  }
  }, [
    workstreamPositions,
    workstreamGroup,
    debouncedSaveWorkstreamPositions,
    workstreams,
    milestonePositions,
    milestonePlacements,
    milestonesGroup,
    setMilestonePositions,
    placementCoordinates,
    updateVisualConnectionsForNode,
    dataId
  ]);

  // OPTIMIZATION: Split large useEffect into smaller focused effects

  // 5a. Timeline rendering - execute when timeline data changes
  useEffect(() => {
    if (!timelineGroup.current) return;
    
    // Clear existing timeline visualization
    timelineGroup.current.selectAll("*").remove();
    
    // Draw timeline markers using precomputed data
    formattedTimelineData.forEach(({xPosition, formattedDate}) => {
      timelineGroup.current!
        .append("line")
        .attr("x1", xPosition)
        .attr("y1", 0)
        .attr("x2", xPosition)
        .attr("y2", 10000)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1);
        
      timelineGroup.current!
        .append("text")
        .attr("x", xPosition)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#6b7280")
        .text(formattedDate);
    });
  }, [formattedTimelineData, timelineGroup]);

  // 5b. Workstream rendering - execute when workstreams change
  useEffect(() => {
    if (!workstreamGroup.current) return;
    
    // Clear existing workstreams
    workstreamGroup.current.selectAll("*").remove();
    
    // Create drag behavior for workstreams
    const workstreamDragBehavior = createWorkstreamDragBehavior();
    
    // Draw workstreams as areas instead of lines
    workstreams.forEach((workstream) => {
      // Use precalculated position
      const workstreamPosition = workstreamInitialPositions[workstream.id];
      const y = workstreamPosition ? workstreamPosition.y : 0;
      
      const wsGroup = workstreamGroup.current!
        .append("g")
        .datum({ ...workstream, initialY: y })
        .attr("class", "workstream")
        .attr("data-id", workstream.id)
        .attr("cursor", "ns-resize")
        .call(workstreamDragBehavior as any);
      
      // IMPORTANT: Remove any default transform on the workstream group
      wsGroup.attr("transform", "translate(0, 0)");
      
      // Add workstream label
      wsGroup
        .append("text")
        .attr("x", -10)
        .attr("y", y)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-weight", "bold")
        .attr("fill", workstream.color)
        .text(workstream.name);
      
      // Create workstream area
      wsGroup
        .append("rect")
        .attr("class", "workstream-area")
        .attr("x", 0)
        .attr("y", y - WORKSTREAM_AREA_HEIGHT / 2)
        .attr("width", contentWidth)
        .attr("height", WORKSTREAM_AREA_HEIGHT)
        .attr("fill", workstream.color)
        .attr("fill-opacity", 0.05)
        .attr("stroke", workstream.color)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-dasharray", "4 2")
        .attr("rx", 5)
        .attr("ry", 5);
      
      // Add a center guideline
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
  }, [
    workstreams, 
    workstreamInitialPositions, 
    createWorkstreamDragBehavior, 
    contentWidth, 
    workstreamGroup
  ]);

  // 5c. Milestone rendering - execute when milestones change
  useEffect(() => {
    if (!milestonesGroup.current) return;
    
    // Clear existing milestones
    milestonesGroup.current.selectAll("*").remove();
    
    // Create drag behavior for milestones
    const milestoneDragBehavior = createMilestoneDragBehavior();
    
    // Draw milestones using placement groups
    Object.entries(placementGroups).forEach(([groupKey, group]) => {
      // Get node positions for this group
      const nodePositions = allNodePositions[groupKey] || [];
      
      group.forEach((placement) => {
        const milestone = placement.milestone;
        const workstreamId = placement.placementWorkstreamId;
        const workstream = workstreams.find((ws) => ws.id === workstreamId);
        if (!workstream) return;

        // Set X position based on timeline
        const x = milestone.deadline ? xScale(new Date(milestone.deadline)) : 20;

        // Set Y position based on precalculated values
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

        // Set initial position
        const initialPosition = { x, y };
        
        // Track the node position
        trackNodePosition(
          placement, 
          initialPosition.x, 
          initialPosition.y, 
          duplicateNodeCoordinates, 
          originalNodeCoordinates, 
          placementCoordinates
        );

        // Create milestone group
        const milestoneGroup = milestonesGroup.current!
          .append("g")
          .datum({ 
            ...placement, 
            initialX: initialPosition.x, 
            initialY: initialPosition.y,
            workstreamRef: workstreamId
          })
          .attr("class", "milestone")
          .attr("cursor", "move")
          .call(milestoneDragBehavior as any);

        // Determine fill color
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

        // Add milestone text
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

        // Add status indicators
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

        // Handle duplicate nodes
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
      });
    });
  }, [placementGroups, allNodePositions, workstreams, xScale, yScale, workstreamPositions, milestonePositions, createMilestoneDragBehavior, handleD3MouseOver, handleD3MouseMove, handleD3MouseOut, data.id, remoteMilestonePos, margin.top, contentHeight, upsertPos, milestonesGroup, placementCoordinates]);

  // 5d. Activity and dependency connections rendering
  useEffect(() => {
    if (!activitiesGroup.current || !dependencyGroup.current) return;

    // Clear existing connections - critical to prevent stale elements
    activitiesGroup.current.selectAll("*").remove();
    dependencyGroup.current.selectAll("*").remove();
    
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
          .attr("data-activity-id", activity.id)
          .datum(activity)
          .text(activity.name);
        wrapText(textEl, 220);
      }
    }
    
    // 1. Draw cross-workstream connections
    crossWorkstreamActivityData.forEach(({activity, sourceId, targetId, duplicateId}) => {
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
        .attr("stroke-dasharray", "4 3") 
        .attr("marker-end", "url(#arrow)")
        .attr("class", "cross-workstream-activity")
        // Add data attributes for efficient selection
        .attr("data-activity-id", activity.id)
        .attr("data-source-id", sourceId)
        .attr("data-target-id", targetId)
        .attr("data-duplicate-id", duplicateId)
        .attr("shape-rendering", "geometricPrecision")
        .attr("vector-effect", "non-scaling-stroke")
        .style("will-change", "d")
        .datum({
          ...activity,
          id: activity.id, // Keep original ID, not composite
          source_milestone: sourceId,
          target_milestone: targetId,
          duplicateId: duplicateId // Store duplicate info separately
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
    
    // 2. Draw regular activity connections
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
          // Add unique identifier attributes for efficient updates
          .attr("data-activity-id", activity.id)
          .attr("data-source-id", sourceId)
          .attr("data-target-id", targetId)
          .datum({
            ...activity,
            id: activity.id, // Keep original ID
            source_milestone: sourceId,
            target_milestone: targetId
          })
          .on("mouseover", (event) => {
            handleD3MouseOver(event, getTooltipContent({ data: activity }));
          })
          .on("mousemove", handleD3MouseMove)
          .on("mouseout", handleD3MouseOut);
        
        addActivityLabel(path, activity);
      } else {
        // Handle multiple activities between same milestone pair
        const centerX = (source.x + target.x) / 2;
        const centerY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;
      
        const perpVectorX = -dy / length;
        const perpVectorY = dx / length;
         const curveOffset = 50; // Curve intensity for multiple activities
      
        groupActivities.forEach((activity, index) => {
          const workstream = workstreams.find((ws) => ws.id === activity.workstreamId);
          if (!workstream) return;
        
          const offset = index - (groupActivities.length - 1) / 2;
          const controlX = centerX + offset * perpVectorX * curveOffset;
          const controlY = centerY + offset * perpVectorY * curveOffset;
        
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
              source_milestone: sourceId,
              target_milestone: targetId
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
    
    // 3. Draw dependencies between milestones in the same workstream
    sameWorkstreamDependencies.forEach((dep) => {
      const sourceCoord = placementCoordinates[dep.source.toString()];
      const targetCoord = placementCoordinates[dep.target.toString()];
      
      if (!sourceCoord || !targetCoord) return;
      
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
        // Add optimization attributes here
        .attr("shape-rendering", "geometricPrecision")
        .attr("vector-effect", "non-scaling-stroke")
        .style("will-change", "d")
        .datum(dep)
        .on("mouseover", (event) => {
          handleD3MouseOver(event, "Dependency relationship");
        })
        .on("mousemove", handleD3MouseMove)
        .on("mouseout", handleD3MouseOut);
    });
    
    // 4. Draw dotted lines for duplicate milestone connections
    Object.values(placementGroups)
      .flat()
      .filter(placement => placement.isDuplicate && placement.originalMilestoneId)
      .forEach(placement => {
        const { id, originalMilestoneId, placementWorkstreamId } = placement;
        const x = placementCoordinates[id]?.x;
        const y = placementCoordinates[id]?.y;
        
        if (!x || !y || !originalMilestoneId) return;
        
        const originalCoord = placementCoordinates[originalMilestoneId.toString()];
        if (!originalCoord) return;
        
        // Find target milestone in this workstream
        const relatedDependency = dependencies.find(
          dep => dep.source === originalMilestoneId && 
          allMilestones.find(m => m.id === dep.target)?.workstreamId === placementWorkstreamId
        );

        const targetMilestoneId = relatedDependency?.target;
        const targetCoord = targetMilestoneId ? 
          placementCoordinates[targetMilestoneId.toString()] : 
          null;

        if (targetCoord) {
          const originalWorkstream = workstreams.find(
            ws => ws.id === allMilestones.find(m => m.id === originalMilestoneId)?.workstreamId
          );
          
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
            // Add optimization attributes here
            .attr("shape-rendering", "geometricPrecision")
            .attr("vector-effect", "non-scaling-stroke")
            .style("will-change", "d")
            .on("mouseover", (event) => {
              handleD3MouseOver(
                event, 
                `Dependency: ${placement.milestone.name} → ${allMilestones.find(m => m.id === targetMilestoneId)?.name}`
              );
            })
            .on("mousemove", handleD3MouseMove)
            .on("mouseout", handleD3MouseOut);
        }
      });
    
    // 5. Layer ordering
    activitiesGroup.current.lower();
    dependencyGroup.current.lower();
  }, [ placementCoordinates, connectionGroups, crossWorkstreamActivityData, sameWorkstreamDependencies, placementGroups, workstreams, allMilestones, dependencies, activities, activitiesGroup, dependencyGroup, handleD3MouseOver, handleD3MouseMove, handleD3MouseOut]);

  // Add after other useEffects
  useEffect(() => {
    return () => {
      // Cancel any pending debounced updates on unmount
      debouncedUpdateConnections.cancel?.();
    };
  }, [debouncedUpdateConnections]);

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