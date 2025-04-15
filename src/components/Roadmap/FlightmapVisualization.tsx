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
      // Add each dependency relation
      node.dependencies.forEach((dependencyId: number) => {
        dependencies.push({
          source: dependencyId,      // The milestone this one depends on
          target: node.id            // The dependent milestone
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
 * Groups milestones by workstream and deadline to handle overlapping milestones
 * @param milestones - Array of milestones
 * @returns Object with grouped milestones
 */
function groupMilestonesByDeadlineAndWorkstream(milestones: any[]) {
  const groups: { [key: string]: any[] } = {};
  milestones.forEach((milestone) => {
    if (!milestone.deadline) return;
    const dateKey = new Date(milestone.deadline).toISOString().split("T")[0];
    const wsKey = milestone.workstreamId;
    const groupKey = `${dateKey}-${wsKey}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(milestone);
  });
  return groups;
}

/**
 * Local storage helpers for milestone positions
 */
function getMilestonePositionsKey(dataId: string): string {
  return `flightmap-milestone-positions-${dataId}`;
}

function loadMilestonePositions(dataId: string): { [id: number]: { y: number } } {
  try {
    const storedData = localStorage.getItem(getMilestonePositionsKey(dataId));
    return storedData ? JSON.parse(storedData) : {};
  } catch (e) {
    console.error("Error loading milestone positions:", e);
    return {};
  }
}

function saveMilestonePositions(dataId: string, positions: { [id: number]: { y: number } }): void {
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

const FlightmapVisualization: React.FC<{ data: FlightmapData }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();
  const [tooltip, setTooltip] = useState({
    content: "",
    left: 0,
    top: 0,
    visible: false,
  });
  const [milestonePositions, setMilestonePositions] = useState<{ [id: number]: { y: number } }>({});
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
        // Apply zoom transform but with constraints
        const transform = event.transform;

        // Ensure the timeline headers stay visible (don't go above the top of the view)
        // This prevents the visualization from being dragged too far up
        if (transform.y > margin.top) {
          transform.y = margin.top;
        }

        // Allow horizontal scrolling and proper vertical scrolling below the headers
        container.attr("transform", `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
      });

    // Apply the zoom behavior while disabling double-click zoom
    svgEl
      .call(zoomRef.current as any)
      .on("dblclick.zoom", null);
    
    // Prevent default browser scrolling
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

    const milestoneCoordinates: { [id: number]: { x: number; y: number } } = {};

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
    // Calculate new position with constraint
    const minAllowedY = 20; // Minimum allowed Y position
    const newY = Math.max(minAllowedY, event.y);
    
    // Calculate the actual offset based on constrained position
    const offset = newY - d.initialY;
    
    // Calculate the actual movement delta (may be different from event.dy if constrained)
    const actualDeltaY = newY - (d.lastY || d.initialY);
    d.lastY = newY; // Store last position for next calculation
    
    // Update workstream position
    d3.select(this).attr("transform", `translate(0, ${offset})`);

    // Move associated milestones WITH SAME CONSTRAINT
    milestonesGroup
      .selectAll(".milestone")
      .filter((m: any) => m.workstreamId === d.id)
      .each(function (milestoneData: any) {
        // Update milestone coordinates with the same delta as the workstream
        milestoneCoordinates[milestoneData.id].y += actualDeltaY;
        
        // Update milestone visual position
        const currentTransform = d3.select(this).attr("transform") || "";
        const match = currentTransform.match(/translate\(0,\s*([-\d.]+)\)/);
        const currentY = match ? parseFloat(match[1]) : 0;
        
        // Apply the same delta movement to milestone
        d3.select(this).attr("transform", `translate(0, ${currentY + actualDeltaY})`);
      });

    // Update activity paths and dependencies
    updateActivities();
    updateDependencies();
  })
  .on("end", function (event, d) {
    d3.select(this).classed("dragging", false);
    
    // Calculate final constrained position
    const minAllowedY = 20;
    const constrainedY = Math.max(minAllowedY, event.y);
    
    // Clean up temporary tracking property
    delete d.lastY;
    
    // Save workstream position
    setWorkstreamPositions((prev) => ({
      ...prev,
      [d.id]: { y: constrainedY },
    }));

    // Save updated milestone positions
    const updatedMilestonePositions = { ...milestonePositions };
    milestonesGroup
      .selectAll(".milestone")
      .filter((m: any) => m.workstreamId === d.id)
      .each(function (milestoneData: any) {
        updatedMilestonePositions[milestoneData.id] = {
          y: milestoneCoordinates[milestoneData.id].y,
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

    // Function to update activities
    const updateActivities = () => {
      activitiesGroup.selectAll("path").remove();
      activitiesGroup.selectAll("rect").remove();
      activitiesGroup.selectAll("text").remove();
      drawActivities();
    };

    const updateDependencies = () => {
      container.selectAll(".dependency-line").remove();
      drawDependencies();
    };    

    // Function to draw activities
    const drawActivities = () => {
      const connectionGroups: { [key: string]: any[] } = {};
      activities.forEach((activity) => {
        const sourceId = activity.sourceMilestoneId;
        (activity.targetMilestoneIds || []).forEach((targetId: number) => {
          const key = `${sourceId}-${targetId}`;
          if (!connectionGroups[key]) {
            connectionGroups[key] = [];
          }
          connectionGroups[key].push(activity);
        });
      });

      Object.entries(connectionGroups).forEach(([key, groupActivities]) => {
        const [sourceId, targetId] = key.split("-").map(Number);
        const source = milestoneCoordinates[sourceId];
        const target = milestoneCoordinates[targetId];
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
      // Remove any existing dependency lines first
      container.selectAll(".dependency-line").remove();
      
      dependencies.forEach((dependency) => {
        const source = milestoneCoordinates[dependency.source];
        const target = milestoneCoordinates[dependency.target];
        
        if (!source || !target) return; // Skip if either milestone doesn't exist
        
        // Create a dashed line for dependencies
        dependencyGroup
          .append("path")
          .attr("class", "dependency-line")
          .attr(
            "d",
            d3.linkHorizontal()({
              source: [source.x, source.y],
              target: [target.x, target.y],
            } as DefaultLinkObject) ?? ""
          )
          .attr("fill", "none")
          .attr("stroke", "#6b7280") // Gray color to distinguish from activity lines
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4 3") // Dashed line for dependencies
          .attr("marker-end", "url(#dependency-arrow)")
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
      });
    };

    // Update milestone drag behavior with additional synchronization
    const dragBehavior = d3
      .drag<SVGGElement, any>()
      .on("start", function () {
        d3.select(this).classed("dragging", true);
      })
      .on("drag", function (event, data) {
        // Apply minimum Y constraint
        const minAllowedY = 20;
        const constrainedY = Math.max(minAllowedY, event.y);
        
        // Update milestone position with constraint
        d3.select(this).attr("transform", `translate(0, ${constrainedY - data.initialY})`);
        
        // Update milestone coordinates
        milestoneCoordinates[data.id].y = constrainedY;
        
        // Update connections
        updateActivities();
        updateDependencies();
      })
      .on("end", function (event, data) {
        d3.select(this).classed("dragging", false);
        
        // Save constrained position
        const minAllowedY = 20;
        const constrainedY = Math.max(minAllowedY, event.y);
        
        setMilestonePositions((prev) => ({
          ...prev,
          [data.id]: { y: constrainedY },
        }));
      });

    // Draw milestones
    const milestoneGroups = groupMilestonesByDeadlineAndWorkstream(allMilestones);
    Object.values(milestoneGroups).forEach((group) => {
      const maxOffset = 200;
      const offsetStep = group.length > 1 ? maxOffset / (group.length - 1) : 0;

      group.forEach((milestone, index) => {
        const workstream = workstreams.find((ws) => ws.id === milestone.workstreamId);
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
        if (milestonePositions[milestone.id]) {
          y = milestonePositions[milestone.id].y;
        }

        milestoneCoordinates[milestone.id] = { x, y };

        const milestoneGroup = milestonesGroup
          .append("g")
          .datum({ ...milestone, initialY: y })
          .attr("class", "milestone")
          .attr("cursor", "ns-resize")
          .call(dragBehavior as any);

        milestoneGroup
          .append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 55)
          .attr("fill", milestone.status === "completed" ? "#ccc" : workstream.color)
          .attr("stroke", milestone.status === "completed" ? "#ccc" : d3.color(workstream.color)?.darker(0.5) + "")
          .attr("stroke-width", 1)
          .on("mouseover", (event) => {
            setTooltip({
              content: getTooltipContent({ data: milestone }),
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
          .attr("font-size", "12px")
          .attr("fill", "white")
          .text(milestone.name);
        wrapText(textEl, 60);

        const workstreamY = yScale(workstream.id.toString()) || 0;
        milestoneGroup
          .append("line")
          .attr("class", "connection-line")
          .attr("x1", x)
          .attr("y1", y)
          .attr("x2", x)
          .attr("y2", Math.max(20, workstreamY)) // Apply constraint to workstream connection point
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
      });
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
          .attr("x", midpoint.x - 60)
          .attr("y", midpoint.y - 10)
          .attr("width", 170)
          .attr("height", 20)
          .attr("fill", "white")
          .attr("fill-opacity", 0.5)
          .attr("rx", 3)
          .attr("ry", 3);

        const textEl = activitiesGroup
          .append("text")
          .attr("x", midpoint.x)
          .attr("y", midpoint.y)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", "6px")
          .attr("fill", "#4b5563")
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

    // Add legend
    const legendData = [
      { type: "milestone", label: "Milestone", status: "not_started" },
      { type: "milestone", label: "Completed Milestone", status: "completed" },
      { type: "status", label: "In Progress", status: "in_progress" },
      { type: "status", label: "Completed", status: "completed" },
      { type: "status", label: "Not Started", status: "not_started" },
      { type: "dependency", label: "Milestone Dependency", status: "dependency" },
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
        }  else if (d.type === "dependency") {
          g.append("line")
            .attr("x1", 0)
            .attr("y1", shapeSize / 2)
            .attr("x2", shapeSize)
            .attr("y2", shapeSize / 2)
            .attr("stroke", "#6b7280")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 3");
            
          // Add an arrowhead
          g.append("path")
            .attr("d", "M0,-2L4,0L0,2")
            .attr("transform", `translate(${shapeSize - 4},${shapeSize / 2})`)
            .attr("fill", "#6b7280");
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