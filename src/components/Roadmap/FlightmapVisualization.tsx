// export default RoadmapVisualization;

// import React, { useEffect, useRef, useState } from "react";
// import * as d3 from "d3";
// import { RoadmapData } from "@/types/roadmap";

// interface RoadmapProps {
//   data: RoadmapData;
// }

// const RoadmapVisualization: React.FC<RoadmapProps> = ({ data }) => {
//   const svgRef = useRef<SVGSVGElement | null>(null);
//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const tooltipRef = useRef<HTMLDivElement | null>(null);
//   const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
//   const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();
//   const [currentRoot, setCurrentRoot] = useState<d3.HierarchyNode<any> | null>(null);

//   // Resize observer for responsive sizing
//   useEffect(() => {
//     const resizeObserver = new ResizeObserver((entries) => {
//       if (entries[0]) {
//         const { width, height } = entries[0].contentRect;
//         setDimensions({ width, height: Math.max(600, height) });
//       }
//     });

//     if (containerRef.current) {
//       resizeObserver.observe(containerRef.current);
//     }
//     return () => resizeObserver.disconnect();
//   }, []);

//   useEffect(() => {
//     if (!dimensions.width || !dimensions.height) return;

//     // Initialize zoom behavior
//     zoomRef.current = d3
//       .zoom()
//       .scaleExtent([0.5, 5])
//       .on("zoom", (event) => {
//         d3.select(svgRef.current)
//           .selectAll<SVGGElement, unknown>("g.container")
//           .attr("transform", event.transform);
//       });

//     renderVisualization();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [data, dimensions]);

//   const renderVisualization = () => {
//     // Clear any existing SVG content
//     d3.select(svgRef.current).selectAll("*").remove();

//     // Create the SVG container and a group for all visual elements
//     const svg = d3
//       .select(svgRef.current)
//       .attr("width", dimensions.width)
//       .attr("height", dimensions.height)
//       .call(zoomRef.current as any)
//       .append("g")
//       .attr("class", "container");

//     // Transform data into hierarchy and save the current root
//     const hierarchyData = buildHierarchy(data);
//     const root = d3.hierarchy(hierarchyData);
//     setCurrentRoot(root);

//     /* --------- Helper Function Declarations (hoisted) ---------- */

//     // Returns a color based on status value
//     function getStatusColor(status: string): string {
//       const colors: Record<string, string> = {
//         completed: "#10b981",
//         in_progress: "#f59e0b",
//         not_started: "#94a3b8",
//         overdue: "#ef4444",
//         default: "#cbd5e1",
//       };
//       return colors[status] || colors.default;
//     }

//     // Returns a color based on node type
//     function getNodeColor(type: string): string {
//       const colors: Record<string, string> = {
//         roadmap: "#a78bfa",
//         strategy: "#2dd4bf",
//         program: "#fb923c",
//         workstream: "#22d3ee",
//       };
//       return colors[type] || "#cbd5e1";
//     }

//     // Returns adaptive font size based on depth
//     function getFontSize(d: any): string {
//       const baseSize = 12;
//       const depthScale = Math.max(0.8, 1 - d.depth * 0.15);
//       return `${baseSize * depthScale}px`;
//     }

//     // Returns the HTML content for tooltips based on node type
//     function getTooltipContent(d: any): string {
//       const content: Record<string, string> = {
//         roadmap: `
//           <strong>${d.data.name}</strong><br>
//           <em>${d.data.description || ""}</em><br>
//           Created: ${d.data.created_at ? new Date(d.data.created_at).toLocaleDateString() : "N/A"}
//         `,
//         strategy: `
//           <strong>${d.data.name}</strong><br>
//           <em>${d.data.tagline || ""}</em><br>
//           Vision: ${d.data.vision || ""}
//         `,
//         program: `
//           <strong>${d.data.name}</strong><br>
//           Progress: ${d.data.progress?.percentage || 0}%<br>
//           Deadline: ${d.data.time_horizon || "N/A"}
//         `,
//         workstream: `
//           <strong>${d.data.name}</strong><br>
//           Milestones: ${d.data.progress_summary?.total_milestones || 0}<br>
//           Team: ${d.data.contributors?.map((c: any) => c.username).join(", ") || "N/A"}
//         `,
//         milestone: `
//           <strong>${d.data.name}</strong><br>
//           Status: ${d.data.status || "N/A"}<br>
//           Deadline: ${d.data.deadline || "N/A"}<br>
//           Progress: ${d.data.current_progress || 0}%
//         `,
//         activity: `
//           <strong>${d.data.name}</strong><br>
//           Status: ${d.data.status || "N/A"}<br>
//           Dates: ${d.data.target_start_date || "N/A"} - ${d.data.target_end_date || "N/A"}
//         `,
//       };
//       return content[d.data.type] || d.data.name;
//     }

//     // Displays a tooltip near the cursor
//     function showTooltip(event: MouseEvent, d: any): void {
//       if (!tooltipRef.current) return;
//       const tooltip = d3.select(tooltipRef.current);
//       tooltip.transition().duration(200).style("opacity", 0.95);
//       tooltip
//         .html(getTooltipContent(d))
//         .style("left", `${event.pageX + 15}px`)
//         .style("top", `${event.pageY - 28}px`);
//     }

//     // Hides the tooltip
//     function hideTooltip(): void {
//       if (!tooltipRef.current) return;
//       d3.select(tooltipRef.current).transition().duration(200).style("opacity", 0);
//     }

//     // Toggle expand/collapse of node children
//     function toggleNode(d: d3.HierarchyNode<any>): void {
//       if (d.children) {
//         d._children = d.children;
//         d.children = undefined;
//       } else {
//         d.children = d._children;
//       }
//       updateVisualization(root);
//     }

//     // Draws the node shapes based on their type
//     function drawNodeShapes(nodeEnter: d3.Selection<SVGGElement, any, any, any>) {
//       nodeEnter.each(function (d) {
//         const group = d3.select(this);
//         group.selectAll("*").remove();

//         const nodeType = d.data.type;
//         const status = d.data.status?.toLowerCase() || "default";

//         switch (nodeType) {
//           case "milestone":
//             group
//               .append("circle")
//               .attr("r", 15)
//               .style("fill", getStatusColor(status))
//               .style("stroke", d3.color(getStatusColor(status))?.darker(0.5));
//             break;
//           case "activity":
//             group
//               .append("path")
//               .attr("d", "M0,-20 L20,0 L0,20 L-20,0 Z")
//               .style("fill", getStatusColor(status))
//               .style("stroke", d3.color(getStatusColor(status))?.darker(0.5));
//             break;
//           case "roadmap":
//           case "strategy":
//           case "program":
//           case "workstream":
//             group
//               .append("rect")
//               .attr("width", 140)
//               .attr("height", 30)
//               .attr("x", -70)
//               .attr("y", -15)
//               .attr("rx", 6)
//               .style("fill", getNodeColor(nodeType));
//             break;
//           default:
//             group
//               .append("rect")
//               .attr("width", 120)
//               .attr("height", 30)
//               .attr("x", -60)
//               .attr("y", -15)
//               .attr("rx", 5)
//               .style("fill", "#ddd");
//         }

//         group
//           .append("text")
//           .attr("dy", 5)
//           .attr("text-anchor", "middle")
//           .text(d.data.name)
//           .style("font-size", getFontSize(d))
//           .style("display", nodeType === "activity" ? "none" : "block");
//       });
//     }

//     // Updates the visualization (nodes and links) based on the current hierarchy
//     function updateVisualization(newRoot: d3.HierarchyNode<any>) {
//       const treeLayout = d3
//         .tree()
//         .size([dimensions.height - 100, dimensions.width - 200])
//         .separation((a, b) => (a.parent === b.parent ? 1 : 2));

//       treeLayout(newRoot);
//       const t = svg.transition().duration(750);

//       // Update nodes
//       const nodes = svg
//         .selectAll<SVGGElement, any>(".node")
//         .data(newRoot.descendants(), (d: any) => d.data.id);

//       // Enter new nodes
//       const nodeEnter = nodes
//         .enter()
//         .append("g")
//         .attr("class", "node")
//         .attr("transform", (d) => `translate(${d.y},${d.x})`)
//         .on("click", (event, d) => toggleNode(d))
//         .on("mouseover", showTooltip)
//         .on("mouseout", hideTooltip);

//       drawNodeShapes(nodeEnter);

//       // Update existing nodes
//       nodes
//         .merge(nodeEnter)
//         .transition(t)
//         .attr("transform", (d) => `translate(${d.y},${d.x})`);

//       // Remove old nodes
//       nodes
//         .exit()
//         .transition(t)
//         .attr("transform", (d) => `translate(${d.y},${d.x})`)
//         .remove();

//       // Update links
//       const linkGenerator = d3
//         .linkVertical()
//         .x((d: any) => d.y)
//         .y((d: any) => d.x);

//       const links = svg
//         .selectAll<SVGPathElement, any>(".link")
//         .data(newRoot.links(), (d: any) => d.target.data.id);

//       links
//         .enter()
//         .append("path")
//         .attr("class", "link")
//         .merge(links)
//         .transition(t)
//         .attr("d", linkGenerator);

//       links.exit().transition(t).remove();
//     }

//     /* --------- End Helper Function Declarations ---------- */

//     // Kick off the visualization update
//     updateVisualization(root);
//   };

//   return (
//     <div ref={containerRef} className="relative w-full h-full overflow-hidden">
//       <svg ref={svgRef} className="bg-white rounded-lg shadow-lg"></svg>
//       <div
//         ref={tooltipRef}
//         className="absolute p-3 bg-white border rounded-lg shadow-lg pointer-events-none opacity-0 transition-opacity text-sm min-w-[200px]"
//       ></div>
//       <button
//         onClick={() => {
//           if (svgRef.current) {
//             d3.select(svgRef.current)
//               .transition()
//               .duration(500)
//               .call(zoomRef.current!.transform, d3.zoomIdentity);
//           }
//         }}
//         className="absolute bottom-4 right-4 p-2 bg-white rounded shadow hover:bg-gray-50 transition-colors"
//       >
//         Reset View
//       </button>
//     </div>
//   );
// };

// // Hierarchy builder with basic error checks
// function buildHierarchy(data: RoadmapData): any {
//   if (!data) {
//     throw new Error("No roadmap data provided");
//   }

//   const mapNode = (node: any, type: string) => ({
//     id: node.id,
//     name: node.name,
//     type,
//     status: node.status,
//     progress: node.progress,
//     deadline: node.deadline,
//     target_start_date: node.target_start_date,
//     target_end_date: node.target_end_date,
//     vision: node.vision,
//     description: node.description,
//     created_at: node.created_at,
//     tagline: node.tagline,
//     contributors: node.contributors,
//     progress_summary: node.progress_summary,
//     current_progress: node.current_progress,
//     children: [] as any[],
//   });

//   return {
//     ...mapNode(data, "roadmap"),
//     children:
//       data.strategies?.map((strategy: any) => ({
//         ...mapNode(strategy, "strategy"),
//         children:
//           strategy.programs?.map((program: any) => ({
//             ...mapNode(program, "program"),
//             children:
//               program.workstreams?.map((workstream: any) => ({
//                 ...mapNode(workstream, "workstream"),
//                 children: [
//                   ...(
//                     workstream.milestones?.map((milestone: any) => ({
//                       ...mapNode(milestone, "milestone"),
//                       children: milestone.activities?.map((activity: any) =>
//                         mapNode(activity, "activity")
//                       ),
//                     })) || []
//                   ),
//                   ...(
//                     workstream.activities?.map((activity: any) =>
//                       mapNode(activity, "activity")
//                     ) || []
//                   ),
//                 ],
//               })) || [],
//           })) || [],
//       })) || [],
//   };
// }

// export default RoadmapVisualization;

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { RoadmapData } from "@/types/roadmap";

interface RoadmapProps {
  data: RoadmapData; // Ideally, define a more specific type
}

// A helper function to wrap SVG text into multiple lines
function wrap(
  textSelection: d3.Selection<SVGTextElement, unknown, null, undefined>,
  maxWidth: number
) {
  textSelection.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word: string;
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const x = text.attr("x") || 0;
    const y = text.attr("y") || 0;
    const dy = parseFloat(text.attr("dy") || "0") || 0;
    let tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

    while (words.length) {
      word = words.pop()!;
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node()!.getComputedTextLength() > maxWidth) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}

const RoadmapVisualization: React.FC<RoadmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>();

  useEffect(() => {
    // Clear any existing content
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    // Set dimensions to cover the full viewport width and 80% of viewport height
    const width = window.innerWidth;
    const height = window.innerHeight * 0.8;
    const margin = { top: 20, right: 150, bottom: 30, left: 150 };

    // Set up the main SVG container with a viewBox so it scales responsively
    svgEl
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("class", "bg-white");

    // Append a group to act as the zoomable container and apply margins
    const container = svgEl
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Initialize and store zoom/pan behavior
    zoomRef.current = d3
      .zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svgEl.call(zoomRef.current);

    // Transform the roadmap data into a tree hierarchy
    const hierarchyData = buildHierarchy(data);
    const root = d3.hierarchy(hierarchyData);

    // Generate the tree layout (the layout size is based on the available area)
    const treeLayout = d3
      .tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    treeLayout(root);

    // Create a link generator for horizontal links
    const linkGenerator = d3
      .linkHorizontal<{ x: number; y: number }>()
      .x((d) => d.y)
      .y((d) => d.x);

    // Append links connecting nodes
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

    // Helper to choose node colors based on type
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

    // Adaptive font sizing based on node depth
    const getFontSize = (d: any): string =>
      `${Math.max(10, 16 - d.depth * 2)}px`;

    // Detailed tooltip content based on node type
    const getTooltipContent = (d: any): string => {
      const type = d.data.type;
      if (type === "roadmap") {
        return `<strong>${d.data.name}</strong><br/>
                <em>${d.data.description || ""}</em><br/>
                Created: ${
                  d.data.created_at ? new Date(d.data.created_at).toLocaleDateString() : "N/A"
                }`;
      } else if (type === "strategy") {
        return `<strong>${d.data.name}</strong><br/>
                <em>${d.data.tagline || ""}</em><br/>
                Vision: ${d.data.vision || ""}`;
      } else if (type === "program") {
        return `<strong>${d.data.name}</strong><br/>
                Progress: ${d.data.progress?.percentage || 0}%<br/>
                Deadline: ${d.data.time_horizon || "N/A"}`;
      } else if (type === "workstream") {
        return `<strong>${d.data.name}</strong><br/>
                Milestones: ${d.data.progress_summary?.total_milestones || 0}<br/>
                Team: ${
                  d.data.contributors
                    ? d.data.contributors.map((c: any) => c.username).join(", ")
                    : "N/A"
                }`;
      } else if (type === "milestone") {
        return `<strong>${d.data.name}</strong><br/>
                Status: ${d.data.status || "N/A"}<br/>
                Deadline: ${d.data.deadline || "N/A"}<br/>
                Progress: ${d.data.current_progress || 0}%`;
      } else if (type === "activity") {
        return `<strong>${d.data.name}</strong><br/>
                Status: ${d.data.status || "N/A"}<br/>
                Dates: ${d.data.target_start_date || "N/A"} - ${
          d.data.target_end_date || "N/A"
        }`;
      } else {
        return `<strong>${d.data.name}</strong><br/><em>${d.data.type}</em>`;
      }
    };

    const paddingX = 10;
    const paddingY = 5;
    // Append nodes and handle text wrapping/dynamic rect sizing
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

    // Append text to each node, wrap it, and then insert a rect behind it based on the text size
    nodes
      .append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", (d) => getFontSize(d))
      .attr("fill", "black")
      .text((d) => d.data.name)
      .each(function (d) {
        // Wrap text to a maximum width of 120 pixels
        wrap(d3.select(this), 120);
        // Measure the wrapped text's bounding box
        const bbox = this.getBBox();
        // Insert a background rectangle behind the text
        d3.select(this.parentNode)
          .insert("rect", ":first-child")
          .attr("width", bbox.width + paddingX * 2)
          .attr("height", bbox.height + paddingY * 2)
          .attr("x", -(bbox.width + paddingX * 2) / 2)
          .attr("y", -(bbox.height + paddingY * 2) / 2)
          .attr("rx", 5)
          .attr("ry", 5)
          .attr("fill", getColor(d.data.type))
          .attr("stroke", d3.color(getColor(d.data.type))?.darker(0.5) + "");
      });
  }, [data]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef}></svg>
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-white border rounded shadow p-2 opacity-0 transition-opacity text-sm"
      ></div>
      {/* Reset View Button */}
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
    </div>
  );
};

// Helper function to convert the roadmap data into a hierarchical tree structure
function buildHierarchy(data: any) {
  return {
    name: data.name,
    type: "roadmap",
    children: data.strategies
      ? data.strategies.map((strategy: any) => ({
          name: strategy.name,
          type: "strategy",
          children: strategy.programs
            ? strategy.programs.map((program: any) => ({
                name: program.name,
                type: "program",
                children:
                  program.workstreams && program.workstreams.length > 0
                    ? program.workstreams.map((workstream: any) => {
                        // For each workstream, combine milestones and activities into children groups.
                        const children = [];
                        if (workstream.milestones && workstream.milestones.length > 0) {
                          children.push({
                            name: "Milestones",
                            type: "milestonesGroup",
                            children: workstream.milestones.map((milestone: any) => ({
                              name: milestone.name,
                              type: "milestone",
                              children:
                                milestone.activities && milestone.activities.length > 0
                                  ? milestone.activities.map((activity: any) => ({
                                      name: activity.name,
                                      type: "activity",
                                    }))
                                  : [],
                            })),
                          });
                        }
                        if (workstream.activities && workstream.activities.length > 0) {
                          children.push({
                            name: "Activities",
                            type: "activitiesGroup",
                            children: workstream.activities.map((activity: any) => ({
                              name: activity.name,
                              type: "activity",
                            })),
                          });
                        }
                        return {
                          name: workstream.name,
                          type: "workstream",
                          children: children,
                        };
                      })
                    : [],
              }))
            : [],
        }))
      : [],
  };
}

export default RoadmapVisualization;
