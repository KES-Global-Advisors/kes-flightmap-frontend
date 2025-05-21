/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/zoomUtils.ts
import * as d3 from 'd3';
import { D3SelectionRef } from './types';

export interface ZoomConfig {
  minScale?: number;
  maxScale?: number;
  constrained?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
}

/**
 * Sets up zoom behavior for an SVG visualization
 * @param svgRef Reference to the SVG element
 * @param container Reference to the main container group
 * @param config Zoom behavior configuration
 * @returns D3 zoom behavior instance for external control
 */
export function setupZoomBehavior(
  svgRef: React.RefObject<SVGSVGElement | null>,
  container: D3SelectionRef,
  config: ZoomConfig = {}
) {
  if (!svgRef.current) return null;
  
  const {
    minScale = 0.5,
    maxScale = 5,
    constrained = true,
    margin = { top: 40, right: 10, bottom: 10, left: 10 }
  } = config;
  
  const svgEl = d3.select(svgRef.current);
  
  // Create zoom behavior with proper constraints
  const zoom = d3.zoom<Element, unknown>()
    .scaleExtent([minScale, maxScale])
    .on("zoom", (event) => {
      if (!container.current) return;
      
      // Apply transform with optional constraints
      if (constrained) {
        // Create a constrained transform
        const { x, y, k } = event.transform;
        
        // Important: Constrain only the minimum Y to prevent going above margin.top
        // But preserve the X position and scale factors exactly as user intended
        const constrainedY = Math.min(y, margin.top);
        
        container.current.attr(
          "transform", 
          `translate(${x}, ${constrainedY}) scale(${k})`
        );
      } else {
        // Apply transform directly
        container.current.attr("transform", event.transform.toString());
      }
    });
    
  // Apply zoom and disable double-click zoom
  svgEl
    .call(zoom as any)
    .on("dblclick.zoom", null);
    
  // Prevent default wheel behavior
  svgEl.on("wheel", function(event) {
    event.preventDefault();
  });
  
  return zoom;
}

/**
 * Resets zoom to initial state
 * @param svgRef Reference to the SVG element
 * @param zoom D3 zoom behavior instance
 * @param duration Animation duration in ms
 */
export function resetZoom(
  svgRef: React.RefObject<SVGSVGElement | null>,
  zoom: d3.ZoomBehavior<Element, unknown>,
  duration: number = 500
) {
  if (!svgRef.current) return;
  
  d3.select(svgRef.current)
    .transition()
    .duration(duration)
    .call(zoom.transform as any, d3.zoomIdentity);
}