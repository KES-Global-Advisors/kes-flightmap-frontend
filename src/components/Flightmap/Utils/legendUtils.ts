// src/utils/flightmap/legendUtils.ts
import * as d3 from 'd3';
import { getStatusColor } from './getStatusColor';

export interface LegendItem {
  type: string;
  label: string;
  status?: string;
}

/**
 * Creates a legend for the Flightmap visualization
 * @param svg The SVG selection to add the legend to
 * @param legendData Array of legend items to display
 * @param position Position object {x, y} for legend placement
 * @param resetCallback Optional callback for the reset button
 */
export function createLegend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  legendData: LegendItem[],
  position: { x: number, y: number },
  resetCallback?: () => void
) {
  // Create legend group
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${position.x}, ${position.y})`);

  const legendItemHeight = 30;
  
  // Add legend items
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
      
      // Draw different shapes based on item type
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
      
      // Add label text
      g.append("text")
        .attr("x", shapeSize + 5)
        .attr("y", shapeSize / 2 + 4)
        .attr("fill", "black")
        .style("font-size", "12px")
        .text(d.label);
    });

  // Add reset button if callback provided
  if (resetCallback) {
    const resetButton = svg
      .append("g")
      .attr("class", "reset-positions-button")
      .attr("transform", `translate(${position.x}, ${position.y + (legendData.length + 1) * legendItemHeight})`)
      .attr("cursor", "pointer")
      .on("click", resetCallback);

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
      
    return resetButton; // Return for reference if needed
  }
  
  return legend; // Return for reference if needed
}