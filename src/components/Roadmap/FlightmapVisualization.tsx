/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams roadmaps Flightmap
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { DefaultLinkObject } from "d3-shape";
import { FlightmapData } from "@/types/roadmap";

// Utility components
import JSONExportButton from "./FlightmapUtils/JSONExportButton";
import CSVExportButton from "./FlightmapUtils/CSVExportButton";
import ScreenshotButton from "./FlightmapUtils/ScreenshotButton";

// Helpers
import { wrapText } from "./FlightmapUtils/wrapText";
import { buildHierarchy } from "./FlightmapUtils/buildHierarchy";
import Tooltip from "./FlightmapUtils/Tooltip";
import { getTooltipContent } from "./FlightmapUtils/getTooltip";

/**
 * Checks if a node has an ancestor milestone that is completed.
 */
function hasAncestorCompletedMilestone(d: d3.HierarchyNode<any> | null): boolean {
  if (!d) return false;
  let current = d.parent;
  while (current) {
    if (current.data.type === "milestone" && current.data.status === "completed") {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * getNodeColor:
 * Returns the fill color for a node based on its type and nearest workstream color.
 */
function getNodeColor(d: d3.HierarchyNode<any>): string {
  const nodeType = d.data.type;
  const nodeStatus = d.data.status;

  // Gray out an activity if any ancestor milestone is completed.
  if (nodeType === "activity" && hasAncestorCompletedMilestone(d)) {
    return "#ccc";
  }

  // For workstream nodes, return the stored color.
  if (nodeType === "workstream") {
    return d.data.color || "#0000FF";
  }

  // For milestones/activities, inherit parent's workstream color.
  let workstreamColor: string | null = null;
  let current = d.parent;
  while (current) {
    if (current.data.type === "workstream" && current.data.color) {
      workstreamColor = current.data.color;
      break;
    }
    current = current.parent;
  }

  if (nodeType === "milestone") {
    return nodeStatus === "completed" ? "#ccc" : (workstreamColor ? workstreamColor : "#facc15");
  }
  if (nodeType === "activity") {
    return workstreamColor ? workstreamColor : "#f87171";
  }

  // Fallback colors for other node types.
  switch (nodeType) {
    case "roadmap":
      return "#a78bfa";
    case "strategy":
      return "#2dd4bf";
    case "program":
      return "#fb923c";
    default:
      return "#d1d5db";
  }
}

/**
 * getStatusColor:
 * Determines stroke color for status icons (circles, lines, check marks).
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
 * getLegendColor:
 * Returns the fill color for legend shapes.
 */
function getLegendColor(
  type: string,
  status: string | undefined,
  workstreamColor: string
): string {
  if (type === "workstream") {
    return workstreamColor;
  }
  if (type === "milestone" && status === "completed") {
    return "#ccc";
  }
  switch (type) {
    case "roadmap":
      return "#a78bfa";
    case "strategy":
      return "#2dd4bf";
    case "program":
      return "#fb923c";
    case "milestone":
      return "#facc15";
    case "activity":
      return "#f87171";
    default:
      return "#d1d5db";
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

  // Default fallback workstream color from the backend.
  const [defaultWorkstreamColor] = useState("#22d3ee");

  useEffect(() => {
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    // Dimensions and margins.
    const width = window.innerWidth;
    const height = window.innerHeight * 0.8;
    const margin = { top: 20, right: 150, bottom: 30, left: 150 };

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

    // Build hierarchy from the Roadmap data.
    const hierarchyData = buildHierarchy(data);
    const root = d3.hierarchy(hierarchyData);

    // Use a tree layout with nodeSize + separation.
    const treeLayout = d3
      .tree()
      .nodeSize([60, 300])
      .separation(() => 2.5);
    treeLayout(root);

    // Compute bounding box for all nodes.
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    root.each((d) => {
      if (d.x !== undefined && d.x < xMin) xMin = d.x;
      if (d.x !== undefined && d.x > xMax) xMax = d.x;
      if (d.y !== undefined && d.y < yMin) yMin = d.y;
      if (d.y !== undefined && d.y > yMax) yMax = d.y;
    });
    xMin -= 50; xMax += 50;
    yMin -= 50; yMax += 200;
    container.attr("transform", `translate(${margin.left - yMin}, ${margin.top - xMin})`);

    // Link generator (horizontal).
    const linkGenerator = d3.linkHorizontal();

    // 1) Draw hierarchical links (behind everything).
    const linksGroup = container.append("g").attr("class", "links");
    linksGroup
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", (d) =>
        linkGenerator({
          source: [d.source.y, d.source.x],
          target: [d.target.y, d.target.x],
        } as DefaultLinkObject) ?? ""
      )
      .attr("fill", "none")
      .attr("stroke", "#ccc");

    // --- Extra Links for Multiple Milestone–Activity Connections ---
    // Build a map of milestone nodes by ID -> { x, y }.
    const milestoneNodeMap: { [key: number]: { x: number; y: number } } = {};
    root.descendants().forEach((d) => {
      if (d.data.type === "milestone" && d.data.id) {
        if (d.x !== undefined && d.y !== undefined) {
          milestoneNodeMap[d.data.id] = { x: d.x, y: d.y };
        }
      }
    });

    // Collect all cross-workstream links from supported_milestones / additional_milestones.
    const extraLinks: Array<{
      source: { x: number; y: number };
      target: { x: number; y: number };
      activityId: number;
      milestoneId: number;
    }> = [];

    root.descendants().forEach((d) => {
      if (d.data.type === "activity" && d.data.id) {
        const activityX = d.x;
        const activityY = d.y;
        const targetIds: number[] = [];
        if (d.data.supported_milestones && Array.isArray(d.data.supported_milestones)) {
          targetIds.push(...d.data.supported_milestones);
        }
        if (d.data.additional_milestones && Array.isArray(d.data.additional_milestones)) {
          targetIds.push(...d.data.additional_milestones);
        }

        targetIds.forEach((targetId: number) => {
          const target = milestoneNodeMap[targetId];
          if (target) {
            extraLinks.push({
              source: { x: activityX ?? 0, y: activityY ?? 0 },
              target: target,
              activityId: d.data.id,
              milestoneId: targetId,
            });
          }
        });
      }
    });

    // 2) Draw extra dashed links (still behind nodes).
    const extraLinksGroup = container.append("g").attr("class", "extra-links");
    extraLinksGroup
      .selectAll("path")
      .data(extraLinks)
      .enter()
      .append("path")
      .attr("class", "extra-link")
      .attr("d", (d) =>
        linkGenerator({
          source: [d.source.y, d.source.x],
          target: [d.target.y, d.target.x],
        } as DefaultLinkObject) ?? ""
      )
      .attr("fill", "none")
      .attr("stroke", "#888")
      .attr("stroke-dasharray", "4 2")
      .attr("stroke-width", 1);

    // 3) Draw nodes on top.
    const nodesGroup = container.append("g").attr("class", "nodes");
    const nodes = nodesGroup
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d) => "node " + (d.children ? "node--internal" : "node--leaf"))
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .on("mouseover", (event, d) => {
        setTooltip({
          content: getTooltipContent(d),
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

    // Define separate state variable for filtering workstream nodes.
    let activeWorkstreamFilter: { id: number } | null = null;

    // For each node, draw the shape and text label.
    nodes.each(function(d) {
      let paddingX = 20,
        paddingY = 15;
      switch (d.data.type) {
        case "roadmap":
        case "strategy":
        case "program":
        case "workstream":
          paddingY += 5;
          break;
        case "activity":
          paddingX += 10;
          paddingY += 10;
          break;
        default:
          break;
      }
      const textSel = d3.select(this).append("text")
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(d.data.name);
      wrapText(textSel, 120);
      const bbox = (textSel.node() as SVGTextElement).getBBox();
      const shapeWidth = bbox.width + paddingX * 2;
      const shapeHeight = bbox.height + paddingY * 2;
      const fillColor = getNodeColor(d);

      // Render shape by node type:
      if (d.data.type === "milestone") {
        const radius = Math.max(shapeWidth, shapeHeight) / 2;
        d3.select(this)
          .insert("circle", ":first-child")
          .attr("r", radius)
          .attr("cx", 0)
          .attr("cy", 0)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", 1);
      } else if (d.data.type === "roadmap") {
        d3.select(this)
          .insert("rect", ":first-child")
          .attr("width", shapeWidth)
          .attr("height", shapeHeight)
          .attr("x", -shapeWidth / 2)
          .attr("y", -shapeHeight / 2)
          .attr("rx", 10)
          .attr("ry", 10)
          .attr("fill", "none")
          .attr("stroke", fillColor)
          .attr("stroke-width", 3);
        d3.select(this)
          .insert("rect", ":first-child")
          .attr("width", shapeWidth - 6)
          .attr("height", shapeHeight - 6)
          .attr("x", -(shapeWidth - 6) / 2)
          .attr("y", -(shapeHeight - 6) / 2)
          .attr("rx", 8)
          .attr("ry", 8)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", 1);
      } else if (d.data.type === "strategy") {
        const w = shapeWidth,
          h = shapeHeight;
        const points = [
          [-w / 4, -h / 2],
          [w / 4, -h / 2],
          [w / 2, 0],
          [w / 4, h / 2],
          [-w / 4, h / 2],
          [-w / 2, 0],
        ]
          .map((p) => p.join(","))
          .join(" ");
        d3.select(this)
          .insert("polygon", ":first-child")
          .attr("points", points)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", 1);
      } else if (d.data.type === "program") {
        d3.select(this)
          .insert("rect", ":first-child")
          .attr("width", shapeWidth)
          .attr("height", shapeHeight)
          .attr("x", -shapeWidth / 2)
          .attr("y", -shapeHeight / 2)
          .attr("rx", 5)
          .attr("ry", 5)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", 1);
      } else if (d.data.type === "workstream") {
        d3.select(this)
          .insert("rect", ":first-child")
          .attr("width", shapeWidth)
          .attr("height", shapeHeight)
          .attr("x", -shapeWidth / 2)
          .attr("y", -shapeHeight / 2)
          .attr("rx", shapeHeight / 2)
          .attr("ry", shapeHeight / 2)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", 1);
      } else if (d.data.type === "activity") {
        const halfWidth = shapeWidth / 2;
        const halfHeight = shapeHeight / 2;
        const points = `0,${-halfHeight} ${halfWidth},0 0,${halfHeight} ${-halfWidth},0`;
        d3.select(this)
          .insert("polygon", ":first-child")
          .attr("points", points)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
          .attr("stroke-width", 1);

        // Optional status indicator
        // const half = Math.min(halfWidth, halfHeight);
        if (d.data.status) {
          const statusStroke = getStatusColor(d.data.status);
          d3.select(this)
            .append("circle")
            .attr("cx", 0)
            .attr("cy", -halfHeight - 10)
            .attr("r", 8)
            .attr("fill", "white")
            .attr("stroke", statusStroke)
            .attr("stroke-width", 1);
          if (d.data.status === "completed") {
            d3.select(this)
              .append("path")
              .attr("d", "M-3,0 L-1,2 L3,-2")
              .attr("transform", `translate(0,${-halfHeight - 10})`)
              .attr("stroke", statusStroke)
              .attr("stroke-width", 2)
              .attr("fill", "none");
          } else if (d.data.status === "in_progress") {
            d3.select(this)
              .append("circle")
              .attr("cx", 0)
              .attr("cy", -halfHeight - 10)
              .attr("r", 3)
              .attr("fill", statusStroke);
          } else {
            d3.select(this)
              .append("line")
              .attr("x1", -3)
              .attr("y1", -halfHeight - 10)
              .attr("x2", 3)
              .attr("y2", -halfHeight - 10)
              .attr("stroke", statusStroke)
              .attr("stroke-width", 2);
          }
        }
      }
      // Node label (bottom-right)
      d3.select(this)
        .append("text")
        .attr("x", shapeWidth + 5)
        .attr("y", shapeHeight / 2 + 5)
        .attr("fill", "black")
        .style("font-size", "12px")
        .text(d.data.label || "");

      // Attach click handler ONLY to workstream nodes.
      if (d.data.type === "workstream") {
        d3.select(this)
          .style("cursor", "pointer")
          .on("click", function(_event: MouseEvent, d: any) {
            if (activeWorkstreamFilter && activeWorkstreamFilter.id === d.data.id) {
              activeWorkstreamFilter = null;
              d3.selectAll(".node")
                .transition()
                .duration(500)
                .style("opacity", 1);
            } else {
              activeWorkstreamFilter = { id: d.data.id };
              const selectedNodes = d.descendants();
              d3.selectAll(".node")
                .transition()
                .duration(500)
                .style("opacity", function(nd: any) {
                  return selectedNodes.includes(nd) ? 1 : 0.2;
                });
            }
          });
      }
    });

    // --- Legend with Toggling Logic ---
    const legendData = [
      { type: "roadmap", label: "Flightmap" },
      { type: "strategy", label: "Strategy" },
      { type: "program", label: "Program" },
      { type: "workstream", label: "Workstream" },
      { type: "milestone", label: "Milestone" },
      { type: "activity", label: "Activity" },
      { type: "status_completed", label: "Completed", status: "completed" },
      { type: "status_in_progress", label: "In Progress", status: "in_progress" },
      { type: "status_not_started", label: "Not Started", status: "not_started" },
    ];

    const legend = svgEl
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    const legendItemHeight = 30;
    const interactiveTypes = new Set([
      "roadmap",
      "strategy",
      "program",
      "workstream",
      "milestone",
      "activity",
    ]);

    legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(0, ${i * legendItemHeight})`)
      .each((d, i, nodes) => {
        const g = d3.select(nodes[i]);
        const shapeSize = 20;

        const fill = getLegendColor(d.type, d.status, defaultWorkstreamColor);

        if (d.type.startsWith("status_")) {
          g.append("circle")
            .attr("cx", shapeSize / 2)
            .attr("cy", shapeSize / 2)
            .attr("r", 8)
            .attr("fill", "white")
            .attr("stroke", getStatusColor(d.status || ""))
            .attr("stroke-width", 1);

          if (d.status === "completed") {
            g.append("path")
              .attr("d", "M-3,0 L-1,2 L3,-2")
              .attr("transform", `translate(${shapeSize / 2},${shapeSize / 2})`)
              .attr("stroke", getStatusColor(d.status))
              .attr("stroke-width", 2)
              .attr("fill", "none");
          } else if (d.status === "in_progress") {
            g.append("circle")
              .attr("cx", shapeSize / 2)
              .attr("cy", shapeSize / 2)
              .attr("r", 3)
              .attr("fill", getStatusColor(d.status));
          } else {
            g.append("line")
              .attr("x1", shapeSize / 2 - 3)
              .attr("y1", shapeSize / 2)
              .attr("x2", shapeSize / 2 + 3)
              .attr("y2", shapeSize / 2)
              .attr("stroke", getStatusColor(d.status || ""))
              .attr("stroke-width", 2);
          }
        } else if (d.type === "roadmap") {
          g.append("rect")
            .attr("width", shapeSize)
            .attr("height", shapeSize)
            .attr("rx", 6)
            .attr("ry", 6)
            .attr("fill", "none")
            .attr("stroke", fill)
            .attr("stroke-width", 2);
          g.append("rect")
            .attr("width", shapeSize - 4)
            .attr("height", shapeSize - 4)
            .attr("x", 2)
            .attr("y", 2)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", fill)
            .attr("stroke", d3.color(fill)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "strategy") {
          const w = shapeSize,
            h = shapeSize;
          const points = [
            [-w / 4, -h / 2],
            [w / 4, -h / 2],
            [w / 2, 0],
            [w / 4, h / 2],
            [-w / 4, h / 2],
            [-w / 2, 0],
          ]
            .map((p) => p.map((v) => v + shapeSize / 2).join(","))
            .join(" ");
          g.append("polygon")
            .attr("points", points)
            .attr("fill", fill)
            .attr("stroke", d3.color(fill)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "program") {
          g.append("rect")
            .attr("width", shapeSize)
            .attr("height", shapeSize)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", fill)
            .attr("stroke", d3.color(fill)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "workstream") {
          g.append("rect")
            .attr("width", shapeSize)
            .attr("height", shapeSize)
            .attr("rx", shapeSize / 2)
            .attr("ry", shapeSize / 2)
            .attr("fill", fill)
            .attr("stroke", d3.color(fill)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "milestone") {
          g.append("circle")
            .attr("cx", shapeSize / 2)
            .attr("cy", shapeSize / 2)
            .attr("r", shapeSize / 2)
            .attr("fill", fill)
            .attr("stroke", d3.color(fill)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "activity") {
          const half = shapeSize / 2;
          const points = `0,${-half} ${half},0 0,${half} ${-half},0`;
          g.append("polygon")
            .attr(
              "points",
              points
                .split(" ")
                .map((pt) => {
                  const [x, y] = pt.split(",").map(Number);
                  return [x + half, y + half].join(",");
                })
                .join(" ")
            )
            .attr("fill", fill)
            .attr("stroke", d3.color(fill)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        }

        g.append("text")
          .attr("x", shapeSize + 5)
          .attr("y", shapeSize / 2 + 5)
          .attr("fill", "black")
          .style("font-size", "12px")
          .text(d.label);

        // Legend toggling logic (filters by type or status).
        let activeFilter: string | null = null;
        if (interactiveTypes.has(d.type) || d.type.startsWith("status_")) {
          g.style("cursor", "pointer").on("click", function () {
            const filterKey = d.type.startsWith("status_") ? d.status : d.type;
            if (activeFilter === filterKey) {
              activeFilter = null;
              d3.selectAll(".node")
                .transition()
                .duration(500)
                .style("opacity", 1);
            } else {
              activeFilter = filterKey ?? null;
              d3.selectAll(".node")
                .transition()
                .duration(500)
                .style("opacity", function (nd: any) {
                  if (
                    filterKey === "completed" ||
                    filterKey === "in_progress" ||
                    filterKey === "not_started"
                  ) {
                    return nd.data.type === "activity" && nd.data.status === filterKey ? 1 : 0.2;
                  } else {
                    return nd.data.type === filterKey ? 1 : 0.2;
                  }
                });
            }
            d3.selectAll(".legend-item").style("opacity", function (legData: any) {
              const legKey = legData.type.startsWith("status_") ? legData.status : legData.type;
              if (activeFilter) {
                return legKey === activeFilter ? 1 : 0.5;
              }
              return 1;
            });
          });
        }
      });
  }, [data, defaultWorkstreamColor]);

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
        <JSONExportButton hierarchyData={buildHierarchy(data)} />
        <CSVExportButton hierarchyData={buildHierarchy(data)} />
        <ScreenshotButton svgRef={svgRef} />
      </div>
    </div>
  );
};

export default FlightmapVisualization;