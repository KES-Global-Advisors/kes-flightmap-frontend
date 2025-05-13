// src/utils/flightmap/svgSetup.ts
import * as d3 from 'd3';
import { D3Selection } from './types';

export interface SvgSetupConfig {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  className?: string;
}

export interface SvgContainers {
  container: D3Selection;
  timelineGroup: D3Selection;
  activitiesGroup: D3Selection;
  workstreamGroup: D3Selection;
  milestonesGroup: D3Selection;
  dependencyGroup: D3Selection;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
}

/**
 * Initialize the basic SVG structure for Flightmap visualization
 * @param svgRef Reference to the SVG element
 * @param config SVG configuration object
 * @returns Object containing all created D3 selections
 */
export function initializeVisualizationSVG(
  svgRef: React.RefObject<SVGSVGElement | null>,
  config: SvgSetupConfig
): SvgContainers | null {
  if (!svgRef.current) return null;
  
  const { width, height, margin, className = "bg-white" } = config;
  
  // Get SVG element and clear it
  const svgEl = d3.select(svgRef.current);
  svgEl.selectAll("*").remove();

  // Set up basic SVG attributes
  svgEl
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", className);

  // Create container group
  const container = svgEl.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .attr("class", "flightmap-container");
    
  // Create layer groups
  const timelineGroup = container.append("g").attr("class", "timeline");
  const activitiesGroup = container.append("g").attr("class", "activities");
  const workstreamGroup = container.append("g").attr("class", "workstreams");
  const milestonesGroup = container.append("g").attr("class", "milestones");
  const dependencyGroup = container.append("g").attr("class", "dependencies");
  
  // Define arrow markers
  const defs = svgEl.append("defs");
  
  // Activity arrow marker
  defs.append("marker")
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

  // Dependency arrow marker
  defs.append("marker")
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
  
  // Return all created selections
  return {
    svg: svgEl,
    container,
    timelineGroup,
    activitiesGroup,
    workstreamGroup,
    milestonesGroup,
    dependencyGroup
  };
}

/**
 * Adds a "Reset View" button to the SVG
 * @param svg The SVG selection
 * @param resetCallback Function to call when button is clicked
 * @param position Position object {right, bottom} for button placement
 */
export function addResetViewButton(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  resetCallback: () => void,
  position: { right: number, bottom: number }
) {
  const button = svg
    .append("g")
    .attr("class", "reset-view-button")
    .attr("cursor", "pointer")
    .attr("transform", `translate(${position.right}, ${position.bottom})`)
    .on("click", resetCallback);

  button
    .append("rect")
    .attr("width", 80)
    .attr("height", 30)
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", "white")
    .attr("stroke", "#d1d5db")
    .attr("stroke-width", 1);

  button
    .append("text")
    .attr("x", 40)
    .attr("y", 19)
    .attr("text-anchor", "middle")
    .attr("fill", "#4b5563")
    .attr("font-size", "12px")
    .text("Reset View");

  return button;
}