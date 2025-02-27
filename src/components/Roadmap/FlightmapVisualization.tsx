import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { RoadmapData } from "@/types/roadmap";
import JSONExportButton from "./FlightmapUtils/JSONExportButton";
import CSVExportButton from "./FlightmapUtils/CSVExportButton";
import ScreenshotButton from "./FlightmapUtils/ScreenshotButton";
import { wrapText } from "./FlightmapUtils/wrapText";
import { buildHierarchy } from "./FlightmapUtils/buildHierarchy";

interface RoadmapProps {
  data: RoadmapData;
}

const RoadmapVisualization: React.FC<RoadmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();

  useEffect(() => {
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

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

    zoomRef.current = d3
      .zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svgEl.call(zoomRef.current);

    const hierarchyData = buildHierarchy(data);
    const root = d3.hierarchy(hierarchyData);

    const treeLayout = d3
      .tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    treeLayout(root);

    const linkGenerator = d3
      .linkHorizontal<{ x: number; y: number }>()
      .x((d) => d.y)
      .y((d) => d.x);

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
          target: { x: d.target.x, y: d.target.y }
        }) as string
      )
      .attr("fill", "none")
      .attr("stroke", "#ccc");

    // Helper for node colors
    const getColor = (type: string): string => {
      switch (type) {
        case "roadmap":
          return "#a78bfa";
        case "strategy":
          return "#2dd4bf";
        case "program":
          return "#fb923c";
        case "workstream":
          return "#22d3ee";
        case "milestone":
          return "#facc15";
        case "activity":
          return "#f87171";
        default:
          return "#d1d5db";
      }
    };

    // Helper for status colors (used in activity status indicators)
    const getStatusColor = (status: string): string => {
      switch (status) {
        case "completed":
          return "#22c55e";
        case "in_progress":
          return "#f97316";
        default:
          return "#9ca3af";
      }
    };

    const getFontSize = (d: any): string =>
      `${Math.max(10, 16 - d.depth * 2)}px`;

    // Tooltip content based on node type & metadata
    const getTooltipContent = (d: any): string => {
      const type = d.data.type;
      if (type === "roadmap") {
        return `<strong>${d.data.name}</strong><br/>
                <em>${d.data.description}</em><br/>
                Created: ${d.data.created_at ? new Date(d.data.created_at).toLocaleDateString() : "N/A"}`;
      } else if (type === "strategy") {
        return `<strong>${d.data.name}</strong><br/>
                <em>${d.data.tagline}</em><br/>
                Vision: ${d.data.vision}`;
      } else if (type === "program") {
        return `<strong>${d.data.name}</strong><br/>
                Progress: ${d.data.progress?.percentage || 0}%<br/>
                Deadline: ${d.data.time_horizon}`;
      } else if (type === "workstream") {
        return `<strong>${d.data.name}</strong><br/>
                Milestones: ${d.data.progress_summary?.total_milestones || 0}<br/>
                Team: ${
                  d.data.contributors && d.data.contributors.length > 0
                    ? d.data.contributors.map((c: any) => c.username).join(", ")
                    : "N/A"
                }`;
      } else if (type === "milestone") {
        return `<strong>${d.data.name}</strong><br/>
                Status: ${d.data.status || "N/A"}<br/>
                Deadline: ${d.data.deadline || "N/A"}<br/>
                Progress: ${d.data.current_progress || 0}%<br/>
                ${d.data.description ? `<em>${d.data.description}</em>` : ""}`;
      } else if (type === "activity") {
        return `<strong>${d.data.name}</strong><br/>
                Status: ${d.data.status || "N/A"}<br/>
                Dates: ${d.data.target_start_date || "N/A"} - ${d.data.target_end_date || "N/A"}`;
      } else {
        return `<strong>${d.data.name}</strong><br/><em>${d.data.type}</em>`;
      }
    };

    const paddingX = 20;
    const paddingY = 15;
    const nodes = container
      .append("g")
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d) => "node " + (d.children ? "node--internal" : "node--leaf"))
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .on("mouseover", (event, d) => {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style("opacity", 1)
            .html(getTooltipContent(d))
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        }
      })
      .on("mousemove", (event) => {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        }
      })
      .on("mouseout", () => {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style("opacity", 0);
        }
      });

    // Append text, wrap it, then insert a shape behind it based on node type.
    nodes
      .append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", (d) => getFontSize(d))
      .attr("fill", "black")
      .text((d) => d.data.name)
      .each(function (d) {
        wrapText(d3.select(this), 120);
        const bbox = this.getBBox();

        // Allow extra vertical padding based on node type for better fit
        let extraVerticalPadding = 0;
        switch (d.data.type) {
          case "roadmap":
            extraVerticalPadding = 20;
            break;
          case "strategy":
            extraVerticalPadding = 15;
            break;
          case "program":
            extraVerticalPadding = 12;
            break;
          case "workstream":
            extraVerticalPadding = 12;
            break;
          case "activity":
            extraVerticalPadding = 10;
            break;
          default:
            extraVerticalPadding = 8;
            break;
        }

        const shapeWidth = bbox.width + paddingX * 2;
        const shapeHeight = bbox.height + paddingY * 2 + extraVerticalPadding;
        const nodeType = d.data.type;

        if (nodeType === "roadmap") {
          // Rounded rectangle with double border
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth)
            .attr("height", shapeHeight)
            .attr("x", -shapeWidth / 2)
            .attr("y", -shapeHeight / 2)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "none")
            .attr("stroke", getColor(nodeType))
            .attr("stroke-width", 3);
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth - 6)
            .attr("height", shapeHeight - 6)
            .attr("x", -(shapeWidth - 6) / 2)
            .attr("y", -(shapeHeight - 6) / 2)
            .attr("rx", 8)
            .attr("ry", 8)
            .attr("fill", getColor(nodeType))
            .attr("stroke", d3.color(getColor(nodeType))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "strategy") {
          // Hexagon shape
          const w = shapeWidth, h = shapeHeight;
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
            .attr("fill", getColor(nodeType))
            .attr("stroke", d3.color(getColor(nodeType))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "program") {
          // Regular rounded rectangle
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth)
            .attr("height", shapeHeight)
            .attr("x", -shapeWidth / 2)
            .attr("y", -shapeHeight / 2)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", getColor(nodeType))
            .attr("stroke", d3.color(getColor(nodeType))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "workstream") {
          // Pill shape: heavily rounded rectangle
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth)
            .attr("height", shapeHeight)
            .attr("x", -shapeWidth / 2)
            .attr("y", -shapeHeight / 2)
            .attr("rx", shapeHeight / 2)
            .attr("ry", shapeHeight / 2)
            .attr("fill", getColor(nodeType))
            .attr("stroke", d3.color(getColor(nodeType))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "milestone") {
          // Circle shape
          const radius = Math.max(shapeWidth, shapeHeight) / 2;
          d3.select(this.parentNode).insert("circle", ":first-child")
            .attr("r", radius)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("fill", getColor(nodeType))
            .attr("stroke", d3.color(getColor(nodeType))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (nodeType === "activity") {
          // Diamond shape (rotated square)
          const halfWidth = shapeWidth / 2;
          const halfHeight = shapeHeight / 2;
          const points = `0,${-halfHeight} ${halfWidth},0 0,${halfHeight} ${-halfWidth},0`;
          d3.select(this.parentNode).insert("polygon", ":first-child")
            .attr("points", points)
            .attr("fill", getColor(nodeType))
            .attr("stroke", d3.color(getColor(nodeType))?.darker(0.5) + "")
            .attr("stroke-width", 1);
          // Add status indicator for activities
          if (d.data.status) {
            const half = Math.min(halfWidth, halfHeight);
            d3.select(this.parentNode)
              .append("circle")
              .attr("cx", 0)
              .attr("cy", -halfHeight - 10)
              .attr("r", 8)
              .attr("fill", "white")
              .attr("stroke", getStatusColor(d.data.status))
              .attr("stroke-width", 1);
            if (d.data.status === "completed") {
              d3.select(this.parentNode)
                .append("path")
                .attr("d", "M-3,0 L-1,2 L3,-2")
                .attr("transform", `translate(0,${-halfHeight - 10})`)
                .attr("stroke", getStatusColor(d.data.status))
                .attr("stroke-width", 2)
                .attr("fill", "none");
            } else if (d.data.status === "in_progress") {
              d3.select(this.parentNode)
                .append("circle")
                .attr("cx", 0)
                .attr("cy", -halfHeight - 10)
                .attr("r", 3)
                .attr("fill", getStatusColor(d.data.status));
            } else {
              d3.select(this.parentNode)
                .append("line")
                .attr("x1", -3)
                .attr("y1", -halfHeight - 10)
                .attr("x2", 3)
                .attr("y2", -halfHeight - 10)
                .attr("stroke", getStatusColor(d.data.status))
                .attr("stroke-width", 2);
            }
          }
        } else {
          // Fallback: rectangle
          d3.select(this.parentNode).insert("rect", ":first-child")
            .attr("width", shapeWidth)
            .attr("height", shapeHeight)
            .attr("x", -shapeWidth / 2)
            .attr("y", -shapeHeight / 2)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", getColor(nodeType))
            .attr("stroke", d3.color(getColor(nodeType))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        }
      });

    // Add Legend in the top-right corner (including status indicators)
    const legendData = [
      { type: "roadmap", label: "Roadmap" },
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
    // Variable to hold the active filter key.
    let activeFilter: string | null = null;
    // Set of interactive roadmap types.
    const interactiveTypes = new Set(["roadmap", "strategy", "program", "workstream", "milestone", "activity"]);

    legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * legendItemHeight})`)
      .each(function (d) {
        const g = d3.select(this);
        const shapeSize = 20;
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
            .attr("stroke", getColor(d.type))
            .attr("stroke-width", 2);
          g.append("rect")
            .attr("width", shapeSize - 4)
            .attr("height", shapeSize - 4)
            .attr("x", 2)
            .attr("y", 2)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", getColor(d.type))
            .attr("stroke", d3.color(getColor(d.type))?.darker(0.5) + "")
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
            .attr("fill", getColor(d.type))
            .attr("stroke", d3.color(getColor(d.type))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "program") {
          g.append("rect")
            .attr("width", shapeSize)
            .attr("height", shapeSize)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", getColor(d.type))
            .attr("stroke", d3.color(getColor(d.type))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "workstream") {
          g.append("rect")
            .attr("width", shapeSize)
            .attr("height", shapeSize)
            .attr("rx", shapeSize / 2)
            .attr("ry", shapeSize / 2)
            .attr("fill", getColor(d.type))
            .attr("stroke", d3.color(getColor(d.type))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "milestone") {
          g.append("circle")
            .attr("r", shapeSize / 2)
            .attr("cx", shapeSize / 2)
            .attr("cy", shapeSize / 2)
            .attr("fill", getColor(d.type))
            .attr("stroke", d3.color(getColor(d.type))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        } else if (d.type === "activity") {
          const half = shapeSize / 2;
          const points = `0,${-half} ${half},0 0,${half} ${-half},0`;
          g.append("polygon")
            .attr(
              "points",
              points
                .split(" ")
                .map((point) => {
                  const [x, y] = point.split(",").map(Number);
                  return [x + half, y + half].join(",");
                })
                .join(" ")
            )
            .attr("fill", getColor(d.type))
            .attr("stroke", d3.color(getColor(d.type))?.darker(0.5) + "")
            .attr("stroke-width", 1);
        }
        g.append("text")
          .attr("x", shapeSize + 5)
          .attr("y", shapeSize / 2 + 5)
          .attr("fill", "black")
          .style("font-size", "12px")
          .text(d.label);

        // Make both roadmap and progress legend items interactive.
        if (interactiveTypes.has(d.type) || d.type.startsWith("status_")) {
          g.style("cursor", "pointer")
            .on("click", function () {
              // Determine the filter key.
              const filterKey = d.type.startsWith("status_") ? d.status : d.type;
              // Toggle filter.
              if (activeFilter === filterKey) {
                activeFilter = null;
                nodes.transition().duration(500).style("opacity", 1);
              } else {
                activeFilter = filterKey;
                nodes.transition().duration(500).style("opacity", function (nd) {
                  // For progress filter, only show activity nodes with matching status.
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
              // Update legend styling to reflect the active filter.
              legend.selectAll(".legend-item").style("opacity", function (legData) {
                const legKey = legData.type.startsWith("status_") ? legData.status : legData.type;
                if (activeFilter) {
                  return legKey === activeFilter ? 1 : 0.5;
                }
                return 1;
              });
            });
        }
      });
  }, [data]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef}></svg>
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-white border rounded shadow p-2 opacity-0 transition-opacity text-sm"
      ></div>
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
    </div>
  );
};

export default RoadmapVisualization;
