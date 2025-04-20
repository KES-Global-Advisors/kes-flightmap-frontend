/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams roadmaps Flightmap
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { DefaultLinkObject } from "d3-shape";
import { FlightmapData } from "@/types/roadmap";

// Utility components
import ScreenshotButton from "./FlightmapUtils/ScreenshotButton";

// Helpers
import { wrapText } from "./FlightmapUtils/wrapText";
import { buildHierarchy } from "./FlightmapUtils/buildHierarchy";
import Tooltip from "./FlightmapUtils/Tooltip";
import { getTooltipContent } from "./FlightmapUtils/getTooltip";

/**
 * Determines color for status indicators.
 * @param status - The status of the milestone or activity
 * @returns A hex color code
 */
function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#22c55e"; // green
    case "in_progress":
      return "#f97316"; // orange
    default:
      return "#9ca3af"; // gray
  }
}

/**
 * Extracts workstreams, milestones, and activities from the hierarchical data.
 * @param data - The raw flightmap data
 * @returns An object containing workstreams and activities
 */
function extractMilestonesAndActivities(data: FlightmapData) {
  const rootNode = buildHierarchy(data);
  const workstreams: {
    [id: number]: { id: number; name: string; color: string; milestones: any[] };
  } = {};
  const activities: any[] = [];
  const dependencies: { source: number; target: number }[] = [];

  function visit(node: any, currentWorkstreamId?: number) {
    if (node.type === "workstream") {
      currentWorkstreamId = node.id;
      workstreams[node.id] = {
        id: node.id,
        name: node.name,
        color: node.color || "#0000FF",
        milestones: [],
      };
    }
    if (node.type === "milestone" && currentWorkstreamId && workstreams[currentWorkstreamId]) {
      workstreams[currentWorkstreamId].milestones.push({
        ...node,
        workstreamId: currentWorkstreamId,
      });
    }
    if (node.type === "milestone" && node.dependencies && node.dependencies.length > 0) {
      node.dependencies.forEach((dependencyId: number) => {
        dependencies.push({
          source: dependencyId,
          target: node.id
        });
      });
    }
    if (node.type === "activity" && currentWorkstreamId != null) {
      let parentMilestoneNode: any = node.parent;
      while (parentMilestoneNode && parentMilestoneNode.type !== "milestone") {
        parentMilestoneNode = parentMilestoneNode.parent;
      }
      if (parentMilestoneNode && parentMilestoneNode.id) {
        activities.push({
          ...node,
          workstreamId: currentWorkstreamId,
          sourceMilestoneId: parentMilestoneNode.id,
          targetMilestoneIds: [
            ...(node.supported_milestones || []),
            ...(node.additional_milestones || []),
          ],
          autoConnect: !(
            (node.supported_milestones && node.supported_milestones.length) ||
            (node.additional_milestones && node.additional_milestones.length)
          ),
        });
      }
    }
    if (node.children) {
      node.children.forEach((child: any) => {
        child.parent = node;
        visit(child, currentWorkstreamId);
      });
    }
  }
  visit(rootNode);

  function linkParentActivities(node: any) {
    if (node.type === "milestone" && node.children) {
      const childMilestones = node.children.filter((c: any) => c.type === "milestone");
      const milestoneActivities = node.children.filter((c: any) => c.type === "activity");
      childMilestones.forEach((childMilestone: any) => {
        milestoneActivities.forEach((activityNode: any) => {
          activities.push({
            ...activityNode,
            sourceMilestoneId: node.id,
            targetMilestoneIds: [childMilestone.id],
            autoConnect: false,
          });
        });
      });
    }
    if (node.children) {
      node.children.forEach(linkParentActivities);
    }
  }
  linkParentActivities(rootNode);

  return { workstreams: Object.values(workstreams), activities, dependencies };
}

/**
 * Processes milestone deadlines to create timeline markers.
 * @param milestones - Array of milestones
 * @returns Array of unique dates
 */
function processDeadlines(milestones: any[]) {
  const allDeadlines = milestones
    .filter((m) => m.deadline)
    .map((m) => new Date(m.deadline));
  if (allDeadlines.length === 0) {
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(now.getMonth() + 1);
    const twoMonthsLater = new Date(now);
    twoMonthsLater.setMonth(now.getMonth() + 2);
    return [now, oneMonthLater, twoMonthsLater].sort((a, b) => a.getTime() - b.getTime());
  }
  const uniqueDates = Array.from(
    new Set(allDeadlines.map((d) => d.toISOString().split("T")[0]))
  )
    .map((dateStr) => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime());
  return uniqueDates;
}

/**
 * Local storage helpers for milestone positions
 */
function getMilestonePositionsKey(dataId: string): string {
  return `flightmap-milestone-positions-${dataId}`;
}

function loadMilestonePositions(dataId: string): { [id: string]: { y: number } } {
  try {
    const storedData = localStorage.getItem(getMilestonePositionsKey(dataId));
    return storedData ? JSON.parse(storedData) : {};
  } catch (e) {
    console.error("Error loading milestone positions:", e);
    return {};
  }
}

function saveMilestonePositions(dataId: string, positions: { [id: string]: { y: number } }): void {
  try {
    localStorage.setItem(getMilestonePositionsKey(dataId), JSON.stringify(positions));
  } catch (e) {
    console.error("Error saving milestone positions:", e);
  }
}

/**
 * Local storage helpers for workstream positions
 */
function getWorkstreamPositionsKey(dataId: string): string {
  return `flightmap-workstream-positions-${dataId}`;
}

function loadWorkstreamPositions(dataId: string): { [id: number]: { y: number } } {
  try {
    const storedData = localStorage.getItem(getWorkstreamPositionsKey(dataId));
    return storedData ? JSON.parse(storedData) : {};
  } catch (e) {
    console.error("Error loading workstream positions:", e);
    return {};
  }
}

function saveWorkstreamPositions(dataId: string, positions: { [id: number]: { y: number } }): void {
  try {
    localStorage.setItem(getWorkstreamPositionsKey(dataId), JSON.stringify(positions));
  } catch (e) {
    console.error("Error saving workstream positions:", e);
  }
}

// Define type for milestone placements
type MilestonePlacement = {
  id: string;
  milestone: any;
  placementWorkstreamId: number;
  isDuplicate: boolean;
  originalMilestoneId?: number;
  activityId?: number | string;
};

/**
 * Groups milestone placements by workstream and deadline to handle overlapping milestones
 * @param placements - Array of milestone placements
 * @returns Object with grouped placements
 */
function groupPlacementsByDeadlineAndWorkstream(placements: MilestonePlacement[]) {
  const groups: { [key: string]: MilestonePlacement[] } = {};
  placements.forEach((placement) => {
    const milestone = placement.milestone;
    if (!milestone.deadline) return;
    const dateKey = new Date(milestone.deadline).toISOString().split("T")[0];
    const wsKey = placement.placementWorkstreamId;
    const groupKey = `${dateKey}-${wsKey}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(placement);
  });
  return groups;
}

const FlightmapVisualization: React.FC<{ data: FlightmapData }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();
  const [tooltip, setTooltip] = useState({
    content: "",
    left: 0,
    top: 0,
    visible: false,
  });
  const [milestonePositions, setMilestonePositions] = useState<{ [id: string]: { y: number } }>({});
  const [workstreamPositions, setWorkstreamPositions] = useState<{ [id: number]: { y: number } }>({});
  const dataId = useRef<string>(`${data.id || new Date().getTime()}`);

  // Load saved positions on mount
  useEffect(() => {
    setMilestonePositions(loadMilestonePositions(dataId.current));
    setWorkstreamPositions(loadWorkstreamPositions(dataId.current));
  }, []);

  // Save positions when they change
  useEffect(() => {
    if (Object.keys(milestonePositions).length > 0) {
      saveMilestonePositions(dataId.current, milestonePositions);
    }
    if (Object.keys(workstreamPositions).length > 0) {
      saveWorkstreamPositions(dataId.current, workstreamPositions);
    }
  }, [milestonePositions, workstreamPositions]);

  useEffect(() => {
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight * 0.8;
    const margin = { top: 40, right: 150, bottom: 30, left: 150 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    svgEl
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("class", "bg-white");

    const container = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Modified zoom behavior with proper constraints
    zoomRef.current = d3.zoom<Element, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        const transform = event.transform;
        if (transform.y > margin.top) {
          transform.y = margin.top;
        }
        container.attr("transform", `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
      });

    svgEl
      .call(zoomRef.current as any)
      .on("dblclick.zoom", null);

    svgEl.on("wheel", function(event) {
      event.preventDefault();
    });

    const { workstreams, activities, dependencies } = extractMilestonesAndActivities(data);
    const allMilestones = workstreams.flatMap((ws) => ws.milestones);
    const timelineMarkers = processDeadlines(allMilestones);

    const xScale = d3
      .scaleTime()
      .domain([d3.min(timelineMarkers) || new Date(), d3.max(timelineMarkers) || new Date()])
      .range([0, contentWidth])
      .nice();

    const yScale = d3
      .scalePoint()
      .domain(workstreams.map((ws) => ws.id.toString()))
      .range([100, contentHeight - 100])
      .padding(1.0);

    const placementCoordinates: { [id: string]: { x: number; y: number } } = {};

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
        const duplicateId = `duplicate-${dep.source}-${dep.target}`;
        milestonePlacements.push({
          id: duplicateId,
          milestone: sourceMilestone, // Duplicate the milestone listed in dependencies (source)
          placementWorkstreamId: targetMilestone.workstreamId, // Place in the dependent workstream
          isDuplicate: true,
          originalMilestoneId: sourceMilestone.id,
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
        const duplicateId = `activity-duplicate-${targetMilestoneId}-${activity.id}`;

        // Check if this duplicate already exists
        if (!milestonePlacements.some(p => p.id === duplicateId)) {
          milestonePlacements.push({
            id: duplicateId,
            milestone: targetMilestone,
            placementWorkstreamId: activityWorkstreamId, // Place in the activity's workstream
            isDuplicate: true,
            originalMilestoneId: targetMilestoneId,
            activityId: activity.id // Track which activity created this duplicate
          });
        }
      });
    });

    const placementGroups = groupPlacementsByDeadlineAndWorkstream(milestonePlacements);

    // Draw timeline markers
    const timelineGroup = container.append("g").attr("class", "timeline");
    timelineMarkers.forEach((date) => {
      const x = xScale(date);
      timelineGroup
        .append("line")
        .attr("x1", x)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", 10000)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1);
      timelineGroup
        .append("text")
        .attr("x", x)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#6b7280")
        .text(date.toLocaleDateString(undefined, { month: "short", year: "numeric" }));
    });

    const activitiesGroup = container.append("g").attr("class", "activities");
    const workstreamGroup = container.append("g").attr("class", "workstreams");
    const milestonesGroup = container.append("g").attr("class", "milestones");
    const dependencyGroup = container.append("g").attr("class", "dependencies");

    // Update the workstream drag behavior to keep milestones properly connected
    const workstreamDragBehavior = d3
      .drag<SVGGElement, any>()
      .on("start", function () {
        d3.select(this).classed("dragging", true);
      })
      .on("drag", function (event, d) {
        const minAllowedY = 20;
        const newY = Math.max(minAllowedY, event.y);
        const offset = newY - d.initialY;
        const actualDeltaY = newY - (d.lastY || d.initialY);
        d.lastY = newY;

        d3.select(this).attr("transform", `translate(0, ${offset})`);

        milestonesGroup
          .selectAll(".milestone")
          .filter((p: any) => p.placementWorkstreamId === d.id)
          .each(function (placementData: any) {
            placementCoordinates[placementData.id].y += actualDeltaY;
            const currentTransform = d3.select(this).attr("transform") || "";
            const match = currentTransform.match(/translate\(0,\s*([-\d.]+)\)/);
            const currentY = match ? parseFloat(match[1]) : 0;
            d3.select(this).attr("transform", `translate(0, ${currentY + actualDeltaY})`);
          });

        updateActivities();
        updateDependencies();
      })
      .on("end", function (event, d) {
        d3.select(this).classed("dragging", false);
        const minAllowedY = 20;
        const constrainedY = Math.max(minAllowedY, event.y);
        delete d.lastY;

        setWorkstreamPositions((prev) => ({
          ...prev,
          [d.id]: { y: constrainedY },
        }));

        const updatedMilestonePositions = { ...milestonePositions };
        milestonesGroup
          .selectAll(".milestone")
          .filter((p: any) => p.placementWorkstreamId === d.id)
          .each(function (placementData: any) {
            updatedMilestonePositions[placementData.id] = {
              y: placementCoordinates[placementData.id].y,
            };
          });
        setMilestonePositions(updatedMilestonePositions);
      });

    // Draw workstreams
    workstreams.forEach((workstream) => {
      let y = yScale(workstream.id.toString()) || 0;
      if (workstreamPositions[workstream.id]) {
        y = workstreamPositions[workstream.id].y;
      }

      const wsGroup = workstreamGroup
        .append("g")
        .datum({ ...workstream, initialY: y })
        .attr("class", "workstream")
        .attr("cursor", "ns-resize")
        .call(workstreamDragBehavior as any);

      wsGroup
        .append("text")
        .attr("x", -10)
        .attr("y", y)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-weight", "bold")
        .attr("fill", workstream.color)
        .text(workstream.name);

      wsGroup
        .append("line")
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", contentWidth)
        .attr("y2", y)
        .attr("stroke", workstream.color)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.3)
        .attr("stroke-dasharray", "4 2");
    });

    // Update milestone drag behavior with additional synchronization
    const dragBehavior = d3
      .drag<SVGGElement, any>()
      .on("start", function () {
        d3.select(this).classed("dragging", true);
      })
      .on("drag", function (event, data) {
        const minAllowedY = 20;
        const constrainedY = Math.max(minAllowedY, event.y);

        d3.select(this).attr("transform", `translate(0, ${constrainedY - data.initialY})`);
        placementCoordinates[data.id].y = constrainedY;

        updateActivities();
        updateDependencies();
      })
      .on("end", function (event, data) {
        d3.select(this).classed("dragging", false);
        const minAllowedY = 20;
        const constrainedY = Math.max(minAllowedY, event.y);

        setMilestonePositions((prev) => ({
          ...prev,
          [data.id]: { y: constrainedY },
        }));
      });

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

        placementCoordinates[placement.id] = { x, y };

        const milestoneGroup = milestonesGroup
          .append("g")
          .datum({ ...placement, initialY: y })
          .attr("class", "milestone")
          .attr("cursor", "ns-resize")
          .call(dragBehavior as any);

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
            dependencyGroup
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
          } else {
            // Draw original-to-duplicate connection only if no target milestone was found
            dependencyGroup
              .append("path")
              .attr("class", "duplicate-dependency-line")
              .attr(
                "d",
                d3.linkHorizontal()({
                  source: [originalCoord.x, originalCoord.y],
                  target: [x, y],
                } as DefaultLinkObject) ?? ""
              )
              .attr("fill", "none")
              .attr("stroke", originalWorkstream?.color || "#6b7280")
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "5 5")
              .attr("opacity", 0.7)
              .on("mouseover", (event) => {
                setTooltip({
                  content: `Dependency from ${milestone.name}`,
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

    // Function to update activities
    const updateActivities = () => {
      activitiesGroup.selectAll("path").remove();
      activitiesGroup.selectAll("rect").remove();
      activitiesGroup.selectAll("text").remove();
      drawActivities();
    };

    const updateDependencies = () => {
      dependencyGroup.selectAll(".dependency-line").remove();
      dependencyGroup.selectAll(".duplicate-dependency-line").remove();
      drawDependencies();
    };

    // Replace or modify the existing drawActivities function
    const drawActivities = () => {
      activitiesGroup.selectAll("path").remove();
      activitiesGroup.selectAll("rect").remove();
      activitiesGroup.selectAll("text").remove();

      // Draw regular connections within same workstream
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

          const path = activitiesGroup
            .append("path")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", workstream.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 3") // Make it dotted for cross-workstream
            .attr("marker-end", "url(#arrow)")
            .attr("class", "cross-workstream-activity")
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
        
          const path = activitiesGroup
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

            const path = activitiesGroup
              .append("path")
              .attr("d", pathData)
              .attr("fill", "none")
              .attr("stroke", workstream.color)
              .attr("stroke-width", 1.5)
              .attr("marker-end", "url(#arrow)")
              .attr("class", "same-workstream-activity")
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
    };

    // Function to draw dependency connections
    const drawDependencies = () => {
      container.selectAll(".dependency-line").remove();
    
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
            dependencyGroup
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
    };

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

    // Draw activities
    drawActivities();
    activitiesGroup.lower();

    drawDependencies();
    dependencyGroup.lower();

    /**
     * Adds a label along an activity path.
     * @param path - The SVG path element
     * @param activity - The activity data
     */
    function addActivityLabel(
      path: d3.Selection<SVGPathElement, unknown, null, undefined>,
      activity: any
    ) {
      const pathNode = path.node();
      if (pathNode && activity.name) {
        const pathLength = pathNode.getTotalLength();
        const midpoint = pathNode.getPointAtLength(pathLength / 2);

        activitiesGroup
          .append("rect")
          .attr("x", midpoint.x - 100)
          .attr("y", midpoint.y - 10)
          .attr("width", 210)
          .attr("height", 20)
          .attr("fill", "white")
          .attr("fill-opacity", 0.8)
          .attr("rx", 3)
          .attr("ry", 3);

        const textEl = activitiesGroup
          .append("text")
          .attr("x", midpoint.x)
          .attr("y", midpoint.y)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", "6px")
          .attr("fill", "#3a3c40")
          .text(activity.name);
        wrapText(textEl, 220);
      }
    }

    // Define arrow marker
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

    // Define dependency arrow marker
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
    const legendData = [
      { type: "milestone", label: "Milestone", status: "not_started" },
      { type: "milestone", label: "Completed Milestone", status: "completed" },
      { type: "status", label: "In Progress", status: "in_progress" },
      { type: "status", label: "Completed", status: "completed" },
      { type: "status", label: "Not Started", status: "not_started" },
      { type: "dependency", label: "Milestone Dependency", status: "dependency" },
      { type: "duplicate", label: "Cross-Workstream Dependency", status: "duplicate" },
      { type: "cross-workstream-activity", label: "Cross-Workstream Activity", status: "cross-activity" },
      { type: "instruction", label: "Drag milestones/workstreams" },
    ];
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
        localStorage.removeItem(getMilestonePositionsKey(dataId.current));
        localStorage.removeItem(getWorkstreamPositionsKey(dataId.current));
        setMilestonePositions({});
        setWorkstreamPositions({});
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
  }, [data, milestonePositions, workstreamPositions]);

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