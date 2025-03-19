import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import dagre from "@dagrejs/dagre";
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
 * estimateNodeSize:
 * Returns approximate width/height for Dagre's layout calculations.
 */
function estimateNodeSize(nodeData: any): { width: number; height: number } {
  switch (nodeData.type) {
    case "milestone":
      return { width: 80, height: 80 };
    case "activity":
      return { width: 100, height: 60 };
    case "workstream":
      return { width: 140, height: 60 };
    case "program":
      return { width: 120, height: 50 };
    case "strategy":
      return { width: 130, height: 60 };
    case "roadmap":
      return { width: 160, height: 70 };
    default:
      return { width: 100, height: 40 };
  }
}

/**
 * getNodeColor:
 * Returns the fill color for a node, using an inherited workstream color when available.
 */
function getNodeColor(nodeData: any): string {
  if (nodeData.type === "workstream") {
    return nodeData.color || "#0000FF";
  }
  if (nodeData.type === "milestone" || nodeData.type === "activity") {
    if (nodeData.parentWorkstreamColor) {
      if (nodeData.type === "milestone" && nodeData.status === "completed") {
        return "#ccc";
      }
      return nodeData.parentWorkstreamColor;
    }
    return nodeData.type === "milestone"
      ? nodeData.status === "completed" ? "#ccc" : "#facc15"
      : "#f87171";
  }
  if (nodeData.type === "roadmap") {
    return "#a78bfa";
  }
  if (nodeData.type === "strategy") {
    return "#2dd4bf";
  }
  if (nodeData.type === "program") {
    return "#fb923c";
  }
  return "#d1d5db";
}

/**
 * getStatusColor:
 * For drawing status icons on activities.
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

const RoadmapVisualizationDagre: React.FC<{ data: RoadmapData }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();

  const [tooltip, setTooltip] = useState({
    content: "",
    left: 0,
    top: 0,
    visible: false,
  });
  const [defaultWorkstreamColor, setDefaultWorkstreamColor] = useState("#22d3ee");
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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

    // Create container for zoom and later adjustments
    const container = svgEl.append("g");

    // Zoom / pan
    zoomRef.current = d3
      .zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svgEl.call(zoomRef.current);

    // 1) Convert to hierarchy and flatten into nodes + edges,
    //    while passing inherited workstream color.
    const hierarchyData = buildHierarchy(data);

    const graphNodes: Array<{ id: string; nodeData: any; width: number; height: number }> = [];
    const graphEdges: Array<{ source: string; target: string; type: string }> = [];

    function traverse(node: any, parentId: string | null, inheritedColor: string | null) {
      if (node.type === "workstream" && !node.color && inheritedColor) {
        node.color = inheritedColor;
      }
      if ((node.type === "milestone" || node.type === "activity") && inheritedColor) {
        node.parentWorkstreamColor = inheritedColor;
      }

      const nodeId = `${node.type}-${node.id}`;
      const size = estimateNodeSize(node);
      graphNodes.push({ id: nodeId, nodeData: node, width: size.width, height: size.height });
      if (parentId) {
        graphEdges.push({ source: parentId, target: nodeId, type: "hierarchy" });
      }
      let newInheritedColor = inheritedColor;
      if (node.type === "workstream") {
        newInheritedColor = node.color || inheritedColor;
      }
      if (node.children) {
        node.children.forEach((child: any) => traverse(child, nodeId, newInheritedColor));
      }
    }
    traverse(hierarchyData, null, null);

    // Extra links (e.g., activities -> supported_milestones)
    function gatherExtraLinks(node: any) {
      if (node.type === "activity" && node.id) {
        const nodeId = `${node.type}-${node.id}`;
        const sM = node.supported_milestones || [];
        const aM = node.additional_milestones || [];
        [...sM, ...aM].forEach((mid: number) => {
          const milestoneId = `milestone-${mid}`;
          graphEdges.push({ source: nodeId, target: milestoneId, type: "extra" });
        });
      }
      if (node.children) {
        node.children.forEach((child: any) => gatherExtraLinks(child));
      }
    }
    gatherExtraLinks(hierarchyData);

    // 2) Build a Dagre graph with increased margins for better spacing.
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", marginx: 150, marginy: 150 });
    g.setDefaultEdgeLabel(() => ({}));

    // 3) Add nodes
    graphNodes.forEach((n) => {
      g.setNode(n.id, { width: n.width, height: n.height });
    });

    // 4) Add edges
    graphEdges.forEach((e) => {
      g.setEdge(e.source, e.target, { type: e.type });
    });

    // 5) Run Dagre layout
    dagre.layout(g);

    // 5a) Adjust container transform based on bounding box.
    let xMin = Infinity, yMin = Infinity;
    g.nodes().forEach((nodeId) => {
      const pos = g.node(nodeId);
      if (pos.x < xMin) xMin = pos.x;
      if (pos.y < yMin) yMin = pos.y;
    });
    // Add extra horizontal offset (e.g., 100px) to push nodes to the right.
    const offsetX = 300;
    container.attr("transform", `translate(${margin.left - yMin + offsetX}, ${margin.top - xMin})`);

    // 6) Render edges
    const edgesGroup = container.append("g").attr("class", "edges");
    edgesGroup
      .selectAll("path.edge")
      .data(g.edges())
      .enter()
      .append("path")
      .attr("class", "edge")
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const edgeData = g.edge(d);
        return edgeData.type === "extra" ? "#888" : "#ccc";
      })
      .attr("stroke-dasharray", (d) => {
        const edgeData = g.edge(d);
        return edgeData.type === "extra" ? "4 2" : null;
      })
      .attr("stroke-width", 1)
      .attr("d", (d) => {
        const edgeData = g.edge(d);
        const points = edgeData.points;
        const pathGen = d3
          .line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .curve(d3.curveBasis);
        return pathGen(points);
      });

    // 7) Render nodes
    const nodesGroup = container.append("g").attr("class", "nodes");
    const nodeSelection = nodesGroup
      .selectAll("g.node")
      .data(g.nodes())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        const coord = g.node(d);
        return `translate(${coord.x},${coord.y})`;
      })
      .on("mouseover", (event, nodeId) => {
        const nodeObj = graphNodes.find((n) => n.id === nodeId);
        if (!nodeObj) return;
        setTooltip({
          content: getTooltipContent({ data: nodeObj.nodeData }),
          left: event.pageX + 10,
          top: event.pageY - 28,
          visible: true,
        });
      })
      .on("mousemove", (event) => {
        setTooltip((prev) => ({ ...prev, left: event.pageX + 10, top: event.pageY - 28 }));
      })
      .on("mouseout", () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      });

    // 8) Draw each node’s shape and text
    nodeSelection.each(function (nodeId) {
      const group = d3.select(this);
      const nodeObj = graphNodes.find((n) => n.id === nodeId);
      if (!nodeObj) return;
      const nodeData = nodeObj.nodeData;
      const text = group
        .append("text")
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(nodeData.name);
      wrapText(d3.select(text.node()), 120);
      const bbox = (text.node() as SVGTextElement).getBBox();
      let paddingX = 20, paddingY = 15;
      switch (nodeData.type) {
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
      const shapeWidth = bbox.width + paddingX * 2;
      const shapeHeight = bbox.height + paddingY * 2;
      const fillColor = getNodeColor(nodeData);

      if (nodeData.type === "milestone") {
        const radius = Math.max(shapeWidth, shapeHeight) / 2;
        group
          .insert("circle", "text")
          .attr("r", radius)
          .attr("cx", 0)
          .attr("cy", 0)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5)?.toString() || "#333")
          .attr("stroke-width", 1);
      } else if (nodeData.type === "roadmap") {
        group
          .insert("rect", "text")
          .attr("width", shapeWidth)
          .attr("height", shapeHeight)
          .attr("x", -shapeWidth / 2)
          .attr("y", -shapeHeight / 2)
          .attr("rx", 10)
          .attr("ry", 10)
          .attr("fill", "none")
          .attr("stroke", fillColor)
          .attr("stroke-width", 3);
        group
          .insert("rect", "text")
          .attr("width", shapeWidth - 6)
          .attr("height", shapeHeight - 6)
          .attr("x", -(shapeWidth - 6) / 2)
          .attr("y", -(shapeHeight - 6) / 2)
          .attr("rx", 8)
          .attr("ry", 8)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5)?.toString() || "#333")
          .attr("stroke-width", 1);
      } else if (nodeData.type === "strategy") {
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
        group
          .insert("polygon", "text")
          .attr("points", points)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5)?.toString() || "#333")
          .attr("stroke-width", 1);
      } else if (nodeData.type === "program") {
        group
          .insert("rect", "text")
          .attr("width", shapeWidth)
          .attr("height", shapeHeight)
          .attr("x", -shapeWidth / 2)
          .attr("y", -shapeHeight / 2)
          .attr("rx", 5)
          .attr("ry", 5)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5)?.toString() || "#333")
          .attr("stroke-width", 1);
      } else if (nodeData.type === "workstream") {
        group
          .insert("rect", "text")
          .attr("width", shapeWidth)
          .attr("height", shapeHeight)
          .attr("x", -shapeWidth / 2)
          .attr("y", -shapeHeight / 2)
          .attr("rx", shapeHeight / 2)
          .attr("ry", shapeHeight / 2)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5)?.toString() || "#333")
          .attr("stroke-width", 1);
      } else if (nodeData.type === "activity") {
        const halfWidth = shapeWidth / 2;
        const halfHeight = shapeHeight / 2;
        const points = `0,${-halfHeight} ${halfWidth},0 0,${halfHeight} ${-halfWidth},0`;
        group
          .insert("polygon", "text")
          .attr("points", points)
          .attr("fill", fillColor)
          .attr("stroke", d3.color(fillColor)?.darker(0.5)?.toString() || "#333")
          .attr("stroke-width", 1);
        if (nodeData.status) {
          const statusStroke = getStatusColor(nodeData.status);
          group
            .append("circle")
            .attr("cx", 0)
            .attr("cy", -halfHeight - 10)
            .attr("r", 8)
            .attr("fill", "white")
            .attr("stroke", statusStroke)
            .attr("stroke-width", 1);
          if (nodeData.status === "completed") {
            group
              .append("path")
              .attr("d", "M-3,0 L-1,2 L3,-2")
              .attr("transform", `translate(0,${-halfHeight - 10})`)
              .attr("stroke", statusStroke)
              .attr("stroke-width", 2)
              .attr("fill", "none");
          } else if (nodeData.status === "in_progress") {
            group
              .append("circle")
              .attr("cx", 0)
              .attr("cy", -halfHeight - 10)
              .attr("r", 3)
              .attr("fill", statusStroke);
          } else {
            group
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

    // Apply filtering logic: set node opacity based on active filter.
    nodeSelection.style("opacity", (nodeId) => {
      if (!activeFilter) return 1;
      const nodeObj = graphNodes.find((n) => n.id === nodeId);
      if (!nodeObj) return 1;
      const { type, status } = nodeObj.nodeData;
      if (activeFilter === "completed" || activeFilter === "in_progress" || activeFilter === "not_started") {
        return type === "activity" && status === activeFilter ? 1 : 0.2;
      } else {
        return type === activeFilter ? 1 : 0.2;
      }
    });
  }, [data, defaultWorkstreamColor, activeFilter]);

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

  const interactiveTypes = new Set(["roadmap", "strategy", "program", "workstream", "milestone", "activity"]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef}></svg>
      <Tooltip content={tooltip.content} left={tooltip.left} top={tooltip.top} visible={tooltip.visible} />
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
      <WorkstreamColorPickerModal
        visible={colorModalVisible}
        onClose={() => setColorModalVisible(false)}
        onColorChange={(color) => setDefaultWorkstreamColor(color)}
        initialColor={defaultWorkstreamColor}
      />
      <svg width={200} height={legendData.length * 30 + 20} style={{ position: "absolute", top: 20, right: 20 }}>
        {legendData.map((d, i) => {
          const shapeSize = 20;
          const yOffset = i * 30;
          const fill = d.type.startsWith("status_")
            ? "#fff"
            : getNodeColor({ type: d.type, color: defaultWorkstreamColor });
          const stroke = d.type.startsWith("status_")
            ? getStatusColor(d.status || "")
            : d3.color(fill)?.darker(0.5)?.toString() || "#333";
          return (
            <g
              key={i}
              transform={`translate(10, ${yOffset})`}
              style={{ cursor: "pointer", opacity: activeFilter ? 0.5 : 1 }}
              onClick={() => {
                const filterKey = d.type.startsWith("status_") ? d.status : d.type;
                setActiveFilter((prev) => (prev === filterKey ? null : filterKey));
              }}
            >
              {(() => {
                if (d.type === "pick_workstream_color") {
                  return (
                    <text x={0} y={shapeSize / 2 + 5} fill="blue" fontSize={12}>
                      {d.label}
                    </text>
                  );
                }
                if (d.type.startsWith("status_")) {
                  return (
                    <>
                      <circle cx={shapeSize / 2} cy={shapeSize / 2} r={8} fill="white" stroke={stroke} strokeWidth={1} />
                      {d.status === "completed" ? (
                        <path
                          d="M-3,0 L-1,2 L3,-2"
                          transform={`translate(${shapeSize / 2},${shapeSize / 2})`}
                          stroke={stroke}
                          strokeWidth={2}
                          fill="none"
                        />
                      ) : d.status === "in_progress" ? (
                        <circle cx={shapeSize / 2} cy={shapeSize / 2} r={3} fill={stroke} />
                      ) : (
                        <line
                          x1={shapeSize / 2 - 3}
                          y1={shapeSize / 2}
                          x2={shapeSize / 2 + 3}
                          y2={shapeSize / 2}
                          stroke={stroke}
                          strokeWidth={2}
                        />
                      )}
                    </>
                  );
                }
                if (d.type === "roadmap") {
                  return (
                    <>
                      <rect
                        width={shapeSize}
                        height={shapeSize}
                        rx={6}
                        ry={6}
                        fill="none"
                        stroke={fill}
                        strokeWidth={2}
                      />
                      <rect
                        width={shapeSize - 4}
                        height={shapeSize - 4}
                        x={2}
                        y={2}
                        rx={4}
                        ry={4}
                        fill={fill}
                        stroke={d3.color(fill)?.darker(0.5)?.toString() || "#333"}
                        strokeWidth={1}
                      />
                    </>
                  );
                }
                if (d.type === "strategy") {
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
                  return (
                    <polygon
                      points={points}
                      fill={fill}
                      stroke={d3.color(fill)?.darker(0.5)?.toString() || "#333"}
                      strokeWidth={1}
                    />
                  );
                }
                if (d.type === "program") {
                  return (
                    <rect
                      width={shapeSize}
                      height={shapeSize}
                      rx={4}
                      ry={4}
                      fill={fill}
                      stroke={d3.color(fill)?.darker(0.5)?.toString() || "#333"}
                      strokeWidth={1}
                    />
                  );
                }
                if (d.type === "workstream") {
                  return (
                    <rect
                      width={shapeSize}
                      height={shapeSize}
                      rx={shapeSize / 2}
                      ry={shapeSize / 2}
                      fill={fill}
                      stroke={d3.color(fill)?.darker(0.5)?.toString() || "#333"}
                      strokeWidth={1}
                    />
                  );
                }
                if (d.type === "milestone") {
                  return (
                    <circle
                      cx={shapeSize / 2}
                      cy={shapeSize / 2}
                      r={shapeSize / 2}
                      fill={fill}
                      stroke={d3.color(fill)?.darker(0.5)?.toString() || "#333"}
                      strokeWidth={1}
                    />
                  );
                }
                if (d.type === "activity") {
                  const half = shapeSize / 2;
                  const points = `0,${-half} ${half},0 0,${half} ${-half},0`;
                  const finalPoints = points
                    .split(" ")
                    .map((pt) => {
                      const [x, y] = pt.split(",").map(Number);
                      return [x + half, y + half].join(",");
                    })
                    .join(" ");
                  return (
                    <polygon
                      points={finalPoints}
                      fill={fill}
                      stroke={d3.color(fill)?.darker(0.5)?.toString() || "#333"}
                      strokeWidth={1}
                    />
                  );
                }
                return null;
              })()}
              <text x={shapeSize + 5} y={shapeSize / 2 + 5} fill="black" fontSize={12}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RoadmapVisualizationDagre;
