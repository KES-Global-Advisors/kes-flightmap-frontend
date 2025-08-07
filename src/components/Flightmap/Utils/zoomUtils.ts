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
  config: ZoomConfig = {},
  viewportRef?: React.RefObject<HTMLDivElement | null>
) {
  if (!svgRef.current || !container.current) return null;
  
  const {
    minScale = 0.5,
    maxScale = 5,
    margin = { top: 40, right: 10, bottom: 10, left: 10 }
  } = config;
  
  const svgEl = d3.select(svgRef.current);
  
  // Store current scale and initial dimensions
  let currentScale = 1;
  let baseDimensions = { width: 0, height: 0 };
  
  // Capture initial SVG dimensions
  const svgNode = svgRef.current;
  baseDimensions.width = svgNode.clientWidth || Number(svgNode.getAttribute('width')) || 0;
  baseDimensions.height = svgNode.clientHeight || Number(svgNode.getAttribute('height')) || 0;
  
  // Create zoom behavior that only handles scaling
  const zoom = d3.zoom<Element, unknown>()
    .scaleExtent([minScale, maxScale])
    .filter((event) => {
      // Only allow zoom on Ctrl+Wheel, Meta+Wheel (Cmd on Mac), or pinch
      return event.ctrlKey || event.metaKey || event.type !== 'wheel';
    })
    .on("zoom", (event) => {
      if (!container.current || !viewportRef?.current) return;
      
      const viewport = viewportRef.current;
      const { k: newScale } = event.transform;
      
      // Handle cursor-centered zoom
      if (event.sourceEvent && event.sourceEvent.type === 'wheel') {
        const mouseEvent = event.sourceEvent as WheelEvent;
        
        // Get mouse position relative to viewport
        const rect = viewport.getBoundingClientRect();
        const mouseXInViewport = mouseEvent.clientX - rect.left;
        const mouseYInViewport = mouseEvent.clientY - rect.top;
        
        // Calculate scroll positions before zoom
        const scrollXBefore = viewport.scrollLeft;
        const scrollYBefore = viewport.scrollTop;
        
        // Calculate mouse position in document space
        const mouseXInDoc = scrollXBefore + mouseXInViewport;
        const mouseYInDoc = scrollYBefore + mouseYInViewport;
        
        // Calculate the focal point as a percentage of the current document size
        const xPercent = mouseXInDoc / (baseDimensions.width * currentScale);
        const yPercent = mouseYInDoc / (baseDimensions.height * currentScale);
        
        // Apply the scale transformation
        container.current.attr(
          "transform", 
          `translate(${margin.left}, ${margin.top}) scale(${newScale})`
        );
        
        // Update canvas wrapper dimensions to reflect zoomed size
        const canvasWrapper = viewport.querySelector('.flightmap-canvas-wrapper') as HTMLElement;
        if (canvasWrapper) {
          canvasWrapper.style.width = `${baseDimensions.width * newScale}px`;
          canvasWrapper.style.height = `${baseDimensions.height * newScale}px`;
        }
        
        // Calculate new mouse position in scaled document
        const newMouseXInDoc = xPercent * baseDimensions.width * newScale;
        const newMouseYInDoc = yPercent * baseDimensions.height * newScale;
        
        // Calculate required scroll to keep mouse position fixed
        const scrollXAfter = newMouseXInDoc - mouseXInViewport;
        const scrollYAfter = newMouseYInDoc - mouseYInViewport;
        
        // Apply new scroll position to maintain cursor position
        viewport.scrollLeft = scrollXAfter;
        viewport.scrollTop = scrollYAfter;
        
        currentScale = newScale;
      } else {
        // For programmatic zoom (like reset), just apply the scale
        container.current.attr(
          "transform", 
          `translate(${margin.left}, ${margin.top}) scale(${newScale})`
        );
        
        // Update canvas wrapper dimensions
        const canvasWrapper = viewportRef.current.querySelector('.flightmap-canvas-wrapper') as HTMLElement;
        if (canvasWrapper) {
          canvasWrapper.style.width = `${baseDimensions.width * newScale}px`;
          canvasWrapper.style.height = `${baseDimensions.height * newScale}px`;
        }
        
        currentScale = newScale;
      }
    });
    
  // Apply zoom behavior to SVG (only for zoom, no pan)
  svgEl
    .call(zoom as any)
    .on("mousedown.zoom", null)     // Disable drag-to-pan
    .on("dblclick.zoom", null)      // Disable double-click zoom
    .on("touchstart.zoom", null)    // Disable touch pan
    .on("touchmove.zoom", null);    // Disable touch pan
    
  // Prevent default wheel behavior when not zooming
  svgEl.on("wheel", function(event) {
    if (!event.ctrlKey && !event.metaKey) {
      // Let the scroll happen naturally in the viewport
      event.stopPropagation();
    } else {
      // Prevent page scroll when zooming
      event.preventDefault();
    }
  });
  
  // Store methods for external access
  (zoom as any).getCurrentScale = () => currentScale;
  (zoom as any).getBaseDimensions = () => baseDimensions;
  (zoom as any).updateBaseDimensions = (width: number, height: number) => {
    baseDimensions = { width, height };
  };
  
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
  duration: number = 500,
  viewportRef?: React.RefObject<HTMLDivElement | null>
) {
  if (!svgRef.current) return;
  
  const svgEl = d3.select(svgRef.current);
  
  // Animate zoom reset to scale 1
  svgEl
    .transition()
    .duration(duration)
    .call(zoom.transform as any, d3.zoomIdentity);
  
  // Reset scroll position if viewport provided
  if (viewportRef?.current) {
    // Reset canvas wrapper dimensions
    const canvasWrapper = viewportRef.current.querySelector('.flightmap-canvas-wrapper') as HTMLElement;
    if (canvasWrapper) {
      const baseDimensions = (zoom as any).getBaseDimensions?.();
      if (baseDimensions) {
        canvasWrapper.style.width = `${baseDimensions.width}px`;
        canvasWrapper.style.height = `${baseDimensions.height}px`;
      }
    }
    
    // Smooth scroll to top-left
    viewportRef.current.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }
}