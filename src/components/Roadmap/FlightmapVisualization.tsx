import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { RoadmapData } from "@/types/roadmap";

// Utility components
import JSONExportButton from "./FlightmapUtils/JSONExportButton";
import CSVExportButton from "./FlightmapUtils/CSVExportButton";
import ScreenshotButton from "./FlightmapUtils/ScreenshotButton";
import WorkstreamColorPickerModal from "./FlightmapUtils/WorkstreamColorPickerModal";

// Helpers
import { wrapText } from "./FlightmapUtils/wrapText";
import { buildHierarchy } from "./FlightmapUtils/buildHierarchy";
import Tooltip from "./FlightmapUtils/Tooltip";
import { getTooltipContent } from "./FlightmapUtils/getTooltip";

/**
 * Helper function: checks if a node has an ancestor that is a completed milestone.
 * Used to gray out any activities that belong to a completed milestone.
 */
function hasAncestorCompletedMilestone(d: d3.HierarchyNode<any>): boolean {
  let current = d.parent;
  while (current) {
    if (current.data.type === "milestone" && current.data.status === "completed") {
      return true;
    }
    current = current.parent;
  }
  return false;
}

interface RoadmapProps {
  data: RoadmapData;
}

/**
 * getNodeColor:
 * Returns the fill color for a node in the main D3 tree (not the legend).
 */
function getNodeColor(
  d: d3.HierarchyNode<any>,
  workstreamColor: string
): string {
  const nodeType = d.data.type;
  const nodeStatus = d.data.status;

  // If it's an activity with a completed milestone ancestor, grey it out
  if (nodeType === "activity" && hasAncestorCompletedMilestone(d)) {
    return "#ccc";
  }

  // Use user-chosen color for all workstreams
  if (nodeType === "workstream") {
    return workstreamColor;
  }

  // Otherwise, default colors
  switch (nodeType) {
    case "roadmap":
      return "#a78bfa";
    case "strategy":
      return "#2dd4bf";
    case "program":
      return "#fb923c";
    case "milestone":
      // grey out if completed
      return nodeStatus === "completed" ? "#ccc" : "#facc15";
    case "activity":
      return "#f87171";
    default:
      return "#d1d5db";
  }
}

/**
 * getStatusColor:
 * Used to determine stroke color for status icons (circles, lines, check marks).
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
 * Returns the fill color for the shapes in the legend (not the main D3 nodes).
 */
function getLegendColor(
  type: string,
  status: string | undefined,
  workstreamColor: string
): string {
  // If it's a workstream, use user-chosen color
  if (type === "workstream") {
    return workstreamColor;
  }
  // If it's a completed milestone, gray
  if (type === "milestone" && status === "completed") {
    return "#ccc";
  }
  // Otherwise, default
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

const RoadmapVisualization: React.FC<RoadmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();

  const [tooltip, setTooltip] = useState({
    content: "",
    left: 0,
    top: 0,
    visible: false,
  });

  // Single color for all workstreams
  const [workstreamColor, setWorkstreamColor] = useState("#22d3ee");

  // Control modal visibility
  const [colorModalVisible, setColorModalVisible] = useState(false);

  useEffect(() => {
    // Clear previous SVG content
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    // Dimensions
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

    // Zoom behavior
    zoomRef.current = d3
      .zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svgEl.call(zoomRef.current);

    // Build the hierarchy
    const hierarchyData = buildHierarchy(data);
    const root = d3.hierarchy(hierarchyData);

    // Layout
    // We use nodeSize instead of size to give more space between nodes (esp. milestones).
    const treeLayout = d3
      .tree()
      .nodeSize([60, 220]) // (vertical spacing, horizontal spacing)
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 2.0));
    treeLayout(root);

    // Manually compute a bounding box for the entire layout
    // If you prefer, you can let it flow. But this ensures we can see everything.
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    root.each((d) => {
      if (d.x < xMin) xMin = d.x;
      if (d.x > xMax) xMax = d.x;
      if (d.y < yMin) yMin = d.y;
      if (d.y > yMax) yMax = d.y;
    });
    // add some padding
    xMin -= 50; xMax += 50;
    yMin -= 50; yMax += 200;

    // We'll shift the container so that the top-left corner is visible
    // You could also adjust the SVG's viewBox if you prefer
    container.attr("transform", `translate(${margin.left - yMin}, ${margin.top - xMin})`);

    // Link generator
    const linkGenerator = d3
      .linkHorizontal<{ x: number; y: number }>()
      .x((d) => d.y)
      .y((d) => d.x);

    // Draw standard links
    container
      .append("g")
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", (d) =>
        linkGenerator({
          source: { x: d.source.x, y: d.source.y },
          target: { x: d.target.x, y: d.target.y },
        }) as string
      )
      .attr("fill", "none")
      .attr("stroke", "#ccc");

    // Node groups
    const nodes = container
      .append("g")
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

    // Append text (and shape behind it)
    nodes
      .append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((d) => d.data.name)
      .each(function (d) {
        // Let’s add some extra space for activity shapes so text doesn't overflow
        let paddingX = 20;
        let paddingY = 15;

        switch (d.data.type) {
          case "roadmap":
            paddingY += 5; // just to ensure it's big enough
            break;
          case "strategy":
            paddingY += 5;
            break;
          case "program":
            paddingY += 5;
            break;
          case "workstream":
            paddingY += 5;
            break;
          case "activity":
            // Increase padding for activities so the diamond shape is larger
            paddingX += 10;
            paddingY += 10;
            break;
          default:
            // milestone or other
            break;
        }

        const textSel = d3.select(this);
        wrapText(textSel, 120);

        const bbox = (this as SVGTextElement).getBBox();
        const shapeWidth = bbox.width + paddingX * 2;
        const shapeHeight = bbox.height + paddingY * 2;
        const nodeType = d.data.type;
        const nodeStatus = d.data.status;
        const fillColor = getNodeColor(d, workstreamColor);

        if (nodeType === "milestone") {
          // Circle
          const radius = Math.max(shapeWidth, shapeHeight) / 2;
          d3.select(this.parentNode).insert("circle", ":first-child")
            .attr("r", radius)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("fill", fillColor)
            .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "roadmap") {
          // Double rectangle
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth)
            .attr("height", shapeHeight)
            .attr("x", -shapeWidth / 2)
            .attr("y", -shapeHeight / 2)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "none")
            .attr("stroke", fillColor)
            .attr("stroke-width", 3);
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth - 6)
            .attr("height", shapeHeight - 6)
            .attr("x", -(shapeWidth - 6) / 2)
            .attr("y", -(shapeHeight - 6) / 2)
            .attr("rx", 8)
            .attr("ry", 8)
            .attr("fill", fillColor)
            .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "strategy") {
          // Hexagon shape
          const w = shapeWidth;
          const h = shapeHeight;
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
          d3.select(this.parentNode).insert("polygon", ":first-child")
            .attr("points", points)
            .attr("fill", fillColor)
            .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "program") {
          // Rounded rect
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth)
            .attr("height", shapeHeight)
            .attr("x", -shapeWidth / 2)
            .attr("y", -shapeHeight / 2)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", fillColor)
            .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "workstream") {
          // Pill shaped
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth)
            .attr("height", shapeHeight)
            .attr("x", -shapeWidth / 2)
            .attr("y", -shapeHeight / 2)
            .attr("rx", shapeHeight / 2)
            .attr("ry", shapeHeight / 2)
            .attr("fill", fillColor)
            .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "activity") {
          // Diamond shape
          const halfWidth = shapeWidth / 2;
          const halfHeight = shapeHeight / 2;
          const points = `0,${-halfHeight} ${halfWidth},0 0,${halfHeight} ${-halfWidth},0`;
          d3.select(this.parentNode).insert("polygon", ":first-child")
            .attr("points", points)
            .attr("fill", fillColor)
            .attr("stroke", d3.color(fillColor)?.darker(0.5) + "")
            .attr("stroke-width", 1);

          // Activity status indicator
          const half = Math.min(halfWidth, halfHeight);
          if (d.data.status) {
            const statusStroke = getStatusColor(d.data.status);
            d3.select(this.parentNode)
              .append("circle")
              .attr("cx", 0)
              .attr("cy", -halfHeight - 10)
              .attr("r", 8)
              .attr("fill", "white")
              .attr("stroke", statusStroke)
              .attr("stroke-width", 1);

            if (d.data.status === "completed") {
              d3.select(this.parentNode)
                .append("path")
                .attr("d", "M-3,0 L-1,2 L3,-2")
                .attr("transform", `translate(0,${-halfHeight - 10})`)
                .attr("stroke", statusStroke)
                .attr("stroke-width", 2)
                .attr("fill", "none");
            } else if (d.data.status === "in_progress") {
              d3.select(this.parentNode)
                .append("circle")
                .attr("cx", 0)
                .attr("cy", -halfHeight - 10)
                .attr("r", 3)
                .attr("fill", statusStroke);
            } else {
              // not_started
              d3.select(this.parentNode)
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
      });

    // --- Legend data (restoring the old approach for status icons) ---
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
      { type: "pick_workstream_color", label: "Workstream color" },
    ];

    const legend = svgEl
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    const legendItemHeight = 30;
    // let activeFilter: string | null = null;

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

        // If it's the color pick legend item:
        if (d.type === "pick_workstream_color") {
          g.append("text")
            .attr("x", 0)
            .attr("y", shapeSize / 2 + 5)
            .attr("fill", "blue")
            .style("font-size", "12px")
            .style("cursor", "pointer")
            .text(d.label)
            .on("click", () => {
              setColorModalVisible(true);
            });
          return;
        }

        // For normal legend items:
        const fill = getLegendColor(d.type, d.status, workstreamColor);

        if (d.type.startsWith("status_")) {
          // We revert to the old style icons:
          g.append("circle")
            .attr("cx", shapeSize / 2)
            .attr("cy", shapeSize / 2)
            .attr("r", 8)
            .attr("fill", "white")
            .attr("stroke", getStatusColor(d.status || ""))
            .attr("stroke-width", 1);

          // Now the inside icon
          if (d.status === "completed") {
            // Checkmark
            g.append("path")
              .attr("d", "M-3,0 L-1,2 L3,-2")
              .attr("transform", `translate(${shapeSize / 2},${shapeSize / 2})`)
              .attr("stroke", getStatusColor(d.status))
              .attr("stroke-width", 2)
              .attr("fill", "none");
          } else if (d.status === "in_progress") {
            // Small circle
            g.append("circle")
              .attr("cx", shapeSize / 2)
              .attr("cy", shapeSize / 2)
              .attr("r", 3)
              .attr("fill", getStatusColor(d.status));
          } else {
            // not_started => line
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
          const w = shapeSize, h = shapeSize;
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
          // pill
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

        // text label
        g.append("text")
          .attr("x", shapeSize + 5)
          .attr("y", shapeSize / 2 + 5)
          .attr("fill", "black")
          .style("font-size", "12px")
          .text(d.label);

        // Toggling logic
        let activeFilter: string | null = null;
        if (interactiveTypes.has(d.type) || d.type.startsWith("status_")) {
          g.style("cursor", "pointer")
            .on("click", function () {
              const filterKey = d.type.startsWith("status_") ? d.status : d.type;
              if (activeFilter === filterKey) {
                activeFilter = null;
                d3.selectAll(".node").transition().duration(500).style("opacity", 1);
              } else {
                activeFilter = filterKey;
                d3.selectAll(".node").transition().duration(500).style("opacity", function (nd: any) {
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
  }, [data, workstreamColor]);

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
              .call(zoomRef.current.transform, d3.zoomIdentity);
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

      {/* The color picker modal */}
      <WorkstreamColorPickerModal
        visible={colorModalVisible}
        onClose={() => setColorModalVisible(false)}
        onColorChange={(color) => setWorkstreamColor(color)}
        initialColor={workstreamColor}
      />
    </div>
  );
};

export default RoadmapVisualization;
