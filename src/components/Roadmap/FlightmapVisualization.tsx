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
 * getStatusColor:
 * Determines color for status indicators.
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
 * Collect workstreams, milestones, and activities from the new parent-child milestone hierarchy.
 */
function extractMilestonesAndActivities(data: FlightmapData) {
  // 1. Convert raw data into a hierarchical node structure
  const rootNode = buildHierarchy(data);

  // Maps of objects we discover
  const workstreams: {
    [id: number]: {
      id: number;
      name: string;
      color: string;
      milestones: any[];
    };
  } = {};
  const activities: any[] = [];

  /**
   * Recursively walk the tree, collecting:
   * - Workstreams (for the vertical dimension)
   * - Milestones (grouped by their workstream)
   * - Activities (attached to each milestone or workstream)
   */
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
      // Store the milestone in the correct workstream group
      workstreams[currentWorkstreamId].milestones.push({
        ...node,
        workstreamId: currentWorkstreamId,
      });
    }

    if (node.type === "activity" && currentWorkstreamId != null) {
      // Find the parent milestone in the chain
      let parentMilestoneNode: any = node.parent;
      while (parentMilestoneNode && parentMilestoneNode.type !== "milestone") {
        parentMilestoneNode = parentMilestoneNode.parent;
      }
      if (parentMilestoneNode && parentMilestoneNode.id) {
        activities.push({
          ...node,
          workstreamId: currentWorkstreamId,
          sourceMilestoneId: parentMilestoneNode.id,
          // If your code still supports supported_milestones, etc.
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

    // Recurse on children
    if (node.children) {
      node.children.forEach((child: any) => {
        // Set parent pointer (helps in the loop above)
        child.parent = node;
        visit(child, currentWorkstreamId);
      });
    }
  }

  visit(rootNode);

  // 2. Add “virtual” activity edges so that the parent milestone’s activities connect
  //    to its direct child milestones.
  function linkParentActivities(node: any) {
    if (node.type === "milestone" && node.children) {
      // Separate out child milestone nodes from child activity nodes
      const childMilestones = node.children.filter((c: any) => c.type === "milestone");
      const milestoneActivities = node.children.filter((c: any) => c.type === "activity");

      // For each child milestone, create an activity connection from each parent's activity
      childMilestones.forEach((childMilestone: any) => {
        milestoneActivities.forEach((activityNode: any) => {
          // Only create a line if we haven’t done so already
          activities.push({
            ...activityNode, // copy the fields from the existing activity
            sourceMilestoneId: node.id,
            targetMilestoneIds: [childMilestone.id],
            // Because these are parent→child lines, we don’t rely on supported_milestones
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

  // Return our data arrays
  return {
    workstreams: Object.values(workstreams),
    activities,
  };
}


/**
 * Process milestone deadlines to create timeline markers.
 */
function processDeadlines(milestones: any[]) {
  // Extract all deadline dates.
  const allDeadlines = milestones
    .filter((m) => m.deadline)
    .map((m) => new Date(m.deadline));

  // If no deadlines, generate a default timeline.
  if (allDeadlines.length === 0) {
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(now.getMonth() + 1);
    const twoMonthsLater = new Date(now);
    twoMonthsLater.setMonth(now.getMonth() + 2);
    return [now, oneMonthLater, twoMonthsLater].sort((a, b) => a.getTime() - b.getTime());
  }

  // Sort and de-duplicate dates.
  const uniqueDates = Array.from(new Set(allDeadlines.map((d) => d.toISOString().split("T")[0])))
    .map((dateStr) => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime());

  return uniqueDates;
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

  useEffect(() => {
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    // Dimensions and margins.
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

    const container = svgEl
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Zoom behavior.
    zoomRef.current = d3
      .zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svgEl.call(zoomRef.current as unknown as (
      selection: d3.Selection<SVGSVGElement | null, unknown, null, undefined>
    ) => void);

    // Extract flightmap data.
    const { workstreams, activities } = extractMilestonesAndActivities(data);

    // Get all milestones.
    const allMilestones = workstreams.flatMap(ws => ws.milestones);

    // Get timeline markers from deadlines.
    const timelineMarkers = processDeadlines(allMilestones);

    // Create horizontal scale for timeline.
    const xScale = d3.scaleTime()
      .domain([
        d3.min(timelineMarkers) || new Date(), 
        d3.max(timelineMarkers) || new Date()
      ])
      .range([0, contentWidth])
      .nice();

    // Create vertical scale for workstreams.
    const yScale = d3.scalePoint()
      .domain(workstreams.map(ws => ws.id.toString()))
      .range([100, contentHeight - 100])
      .padding(1.0);

    // Map to store milestone coordinates (for connecting activities).
    const milestoneCoordinates: { [id: number]: { x: number, y: number } } = {};

    // Draw vertical timeline markers.
    const timelineGroup = container.append("g").attr("class", "timeline");
    timelineMarkers.forEach(date => {
      const x = xScale(date);

      // Draw vertical line.
      timelineGroup
        .append("line")
        .attr("x1", x)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", contentHeight)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1);

      // Add date label.
      timelineGroup
        .append("text")
        .attr("x", x)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#6b7280")
        .text(date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
    });

    // Draw workstream baselines.
    const workstreamGroup = container.append("g").attr("class", "workstreams");
    workstreams.forEach(workstream => {
      const y = yScale(workstream.id.toString()) || 0;

      // Draw workstream label.
      workstreamGroup
        .append("text")
        .attr("x", -10)
        .attr("y", y)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-weight", "bold")
        .attr("fill", workstream.color)
        .text(workstream.name);

      // Draw workstream baseline.
      workstreamGroup
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

    // Draw milestones.
    const milestonesGroup = container.append("g").attr("class", "milestones");
    // Sort milestones in chronological order.
    const sortedMilestones = allMilestones.slice().sort((a, b) => {
      const dateA = a.deadline ? new Date(a.deadline) : new Date(0);
      const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

    sortedMilestones.forEach(milestone => {
      const workstreamId = milestone.workstreamId;
      const workstream = workstreams.find(ws => ws.id === workstreamId);
      if (!workstream) return;

      // Calculate milestone position.
      const x = milestone.deadline ? xScale(new Date(milestone.deadline)) : 20;
      const y = yScale(workstreamId.toString()) || 0;

      // Save coordinates for connecting activities.
      milestoneCoordinates[milestone.id] = { x, y };

      // Draw milestone as a circle.
      milestonesGroup
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 35)
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

      // Add milestone label inside the circle.
      const textEl = milestonesGroup
        .append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "12px")
        .attr("fill", "white")
        .text(milestone.name);
      wrapText(textEl, 60);

      // Draw status marker above the milestone.
      if (milestone.status) {
        const statusStroke = getStatusColor(milestone.status);
        milestonesGroup
          .append("circle")
          .attr("cx", x)
          .attr("cy", y - 30)
          .attr("r", 5)
          .attr("fill", "white")
          .attr("stroke", statusStroke)
          .attr("stroke-width", 1);
        if (milestone.status === "completed") {
          milestonesGroup
            .append("path")
            .attr("d", "M-2,0 L-1,1 L2,-2")
            .attr("transform", `translate(${x},${y - 30})`)
            .attr("stroke", statusStroke)
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        } else if (milestone.status === "in_progress") {
          milestonesGroup
            .append("circle")
            .attr("cx", x)
            .attr("cy", y - 30)
            .attr("r", 2)
            .attr("fill", statusStroke);
        } else {
          milestonesGroup
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

    // Process activities to auto-connect consecutive milestones within each workstream.
    workstreams.forEach(workstream => {
      const wsMilestones = workstream.milestones.slice().sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline) : new Date(0);
        const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
      activities
        .filter(a => a.workstreamId === workstream.id && a.autoConnect)
        .forEach(activity => {
          const sourceMilestoneIndex = wsMilestones.findIndex(m => m.id === activity.sourceMilestoneId);
          if (sourceMilestoneIndex >= 0 && sourceMilestoneIndex < wsMilestones.length - 1) {
            activity.targetMilestoneIds = [wsMilestones[sourceMilestoneIndex + 1].id];
          }
        });
    });

    // Draw activity connections with text labels.
    const activitiesGroup = container.append("g").attr("class", "activities");
    const linkGenerator = d3.linkHorizontal();

    activities.forEach(activity => {
      const source = milestoneCoordinates[activity.sourceMilestoneId];
      if (!source) return;

      (activity.targetMilestoneIds || []).forEach((targetId: number) => {
        const target = milestoneCoordinates[targetId];
        if (!target) return;

        const workstream = workstreams.find(ws => ws.id === activity.workstreamId);
        if (!workstream) return;

        // Draw curved line for the activity.
        const path = activitiesGroup
          .append("path")
          .attr("d", linkGenerator({
            source: [source.x, source.y],
            target: [target.x, target.y],
          } as DefaultLinkObject) ?? "")
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

        // Add text along the activity path.
        const pathNode = path.node();
        if (pathNode && activity.name) {
          const pathLength = pathNode.getTotalLength();
          const midpoint = pathNode.getPointAtLength(pathLength / 2);

          // Add background rectangle for readability.
          activitiesGroup
            .append("rect")
            .attr("x", midpoint.x - 60)
            .attr("y", midpoint.y - 10)
            .attr("width", 120)
            .attr("height", 20)
            .attr("fill", "white")
            .attr("fill-opacity", 0.8)
            .attr("rx", 3)
            .attr("ry", 3);

          // Add activity description text.
          const textEl = activitiesGroup
            .append("text")
            .attr("x", midpoint.x)
            .attr("y", midpoint.y)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "10px")
            .attr("fill", "#4b5563")
            .text(activity.name);
          wrapText(textEl, 110);
        }
      });
    });

    // Define arrow marker for activity lines.
    svgEl.append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    // Add legend.
    const legendData = [
      { type: "milestone", label: "Milestone", status: "not_started" },
      { type: "milestone", label: "Completed Milestone", status: "completed" },
      { type: "status", label: "In Progress", status: "in_progress" },
      { type: "status", label: "Completed", status: "completed" },
      { type: "status", label: "Not Started", status: "not_started" },
    ];
    const legend = svgEl
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);
    const legendItemHeight = 30;
    legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(0, ${i * legendItemHeight})`)
      .each(function(d) {
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
        }
        g.append("text")
          .attr("x", shapeSize + 5)
          .attr("y", shapeSize / 2 + 4)
          .attr("fill", "black")
          .style("font-size", "12px")
          .text(d.label);
      });
  }, [data]);

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
              .call(zoomRef.current?.transform as any, d3.zoomIdentity);
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
