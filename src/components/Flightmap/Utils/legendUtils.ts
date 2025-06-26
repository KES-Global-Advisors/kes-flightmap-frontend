/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/legendUtils.ts - Enhanced Version
import * as d3 from 'd3';
import { getStatusColor } from './getStatusColor';
import { EditMode } from '@/hooks/useQuickEditModes';

export interface LegendItem {
  type: string;
  label: string;
  status?: string;
}

export interface EditButton {
  mode: EditMode;
  label: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
}

export interface EditCallbacks {
  onEditModeChange: (mode: EditMode) => void;
  resetCallback?: () => void;
}

/**
 * Definition of available edit modes with their visual styling
 */
export const EDIT_BUTTONS: EditButton[] = [
  {
    mode: 'milestone-editor',
    label: 'Edit Milestone',
    icon: '✏️',
    description: 'Click milestones to edit details',
    color: '#1f2937',
    bgColor: '#f3f4f6'
  },
  {
    mode: 'dependency-creator',
    label: 'Create Dependencies',
    icon: '🔗',
    description: 'Click source then target milestone',
    color: '#059669',
    bgColor: '#d1fae5'
  },
  {
    mode: 'activity-builder',
    label: 'Connect Activities',
    icon: '➡️',
    description: 'Link milestones with activities',
    color: '#0d9488',
    bgColor: '#ccfbf1'
  },
  {
    mode: 'timeline-adjuster',
    label: 'Adjust Timeline',
    icon: '📅',
    description: 'Reschedule milestone deadlines',
    color: '#7c3aed',
    bgColor: '#ede9fe'
  },
  {
    mode: 'milestone-creator',
    label: 'Add Milestone',
    icon: '➕',
    description: 'Create new milestones',
    color: '#dc2626',
    bgColor: '#fef2f2'
  }
];

/**
 * Creates a legend for the Flightmap visualization with edit capabilities
 * @param svg The SVG selection to add the legend to
 * @param legendData Array of legend items to display
 * @param position Position object {x, y} for legend placement
 * @param editCallbacks Callbacks for edit mode changes and reset
 * @param currentEditMode Currently active edit mode (for visual feedback)
 */
export function createEditableLegend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  legendData: LegendItem[],
  position: { x: number, y: number },
  editCallbacks: EditCallbacks,
  currentEditMode: EditMode = 'none'
) {
  // Remove any existing legend
  svg.select(".legend").remove();

  // Create main legend group
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${position.x}, ${position.y})`);

  const legendItemHeight = 25;
  const editButtonHeight = 32;
  const sectionSpacing = 15;
  
  // Add legend title
  legend
    .append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("fill", "#374151")
    .text("Legend");

  // Add standard legend items
  const legendItems = legend
    .append("g")
    .attr("class", "legend-items")
    .attr("transform", "translate(0, 10)");

  legendItems
    .selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(0, ${i * legendItemHeight})`)
    .each(function (d) {
      const g = d3.select(this);
      const shapeSize = 15;
      
      // Draw different shapes based on item type (existing logic)
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
        .attr("x", shapeSize + 8)
        .attr("y", shapeSize / 2 + 4)
        .attr("fill", "#374151")
        .style("font-size", "11px")
        .text(d.label);
    });

  // Add edit modes section
  const editSection = legend
    .append("g")
    .attr("class", "edit-buttons-section")
    .attr("transform", `translate(0, ${legendData.length * legendItemHeight + sectionSpacing + 10})`);

  // Add edit section title
  editSection
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .attr("fill", "#6b7280")
    .text("Quick Edit Tools");

  // Add edit buttons
  const editButtons = editSection
    .append("g")
    .attr("class", "edit-buttons")
    .attr("transform", "translate(0, 10)");

  const buttons = editButtons
    .selectAll(".edit-button")
    .data(EDIT_BUTTONS)
    .enter()
    .append("g")
    .attr("class", "edit-button")
    .attr("transform", (_, i) => `translate(0, ${i * editButtonHeight + i * 2})`)
    .attr("cursor", "pointer");

  // Button backgrounds
  buttons
    .append("rect")
    .attr("class", "edit-button-bg")
    .attr("width", 160)
    .attr("height", editButtonHeight - 2)
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("fill", (d) => currentEditMode === d.mode ? d.bgColor : "#f9fafb")
    .attr("stroke", (d) => currentEditMode === d.mode ? d.color : "#e5e7eb")
    .attr("stroke-width", (d) => currentEditMode === d.mode ? 2 : 1)
    .style("transition", "all 0.2s ease");

  // Button text
  buttons
    .append("text")
    .attr("x", 12)
    .attr("y", editButtonHeight / 2 + 1)
    .attr("font-size", "11px")
    .attr("font-weight", (d) => currentEditMode === d.mode ? "600" : "normal")
    .attr("fill", (d) => currentEditMode === d.mode ? d.color : "#374151")
    .attr("dominant-baseline", "middle")
    .text((d) => `${d.icon} ${d.label}`);

  // Add hover effects and click handlers
  buttons
    .on("mouseenter", function(event, d) {
      if (currentEditMode !== d.mode) {
        d3.select(this).select(".edit-button-bg")
          .attr("fill", "#f3f4f6")
          .attr("stroke", "#d1d5db");
      }
      
      // Show tooltip with description
      showEditButtonTooltip(d, event);
    })
    .on("mouseleave", function(event, d) {
      if (currentEditMode !== d.mode) {
        d3.select(this).select(".edit-button-bg")
          .attr("fill", "#f9fafb")
          .attr("stroke", "#e5e7eb");
      }
      
      hideEditButtonTooltip();
    })
    .on("click", function(event, d) {
      event.stopPropagation();
      console.log(`Edit mode button clicked: ${d.mode}`);
      
      // Toggle mode (deactivate if already active)
      if (currentEditMode === d.mode) {
        editCallbacks.onEditModeChange('none');
      } else {
        editCallbacks.onEditModeChange(d.mode);
      }
    });

  // Add reset button if callback provided
  if (editCallbacks.resetCallback) {
    const resetButton = legend
      .append("g")
      .attr("class", "reset-positions-button")
      .attr("transform", `translate(0, ${legendData.length * legendItemHeight + EDIT_BUTTONS.length * (editButtonHeight + 2) + sectionSpacing * 2 + 30})`)
      .attr("cursor", "pointer")
      .on("click", editCallbacks.resetCallback);

    resetButton
      .append("rect")
      .attr("width", 160)
      .attr("height", 28)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#fef2f2")
      .attr("stroke", "#fca5a5")
      .attr("stroke-width", 1);

    resetButton
      .append("text")
      .attr("x", 80)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("fill", "#dc2626")
      .text("🔄 Reset Positions");
  }

  return legend;
}

/**
 * Show tooltip for edit button
 */
function showEditButtonTooltip(editButton: EditButton, event: MouseEvent) {
  // Remove existing tooltip
  d3.select("body").select(".edit-button-tooltip").remove();
  
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "edit-button-tooltip")
    .style("position", "absolute")
    .style("background", "#374151")
    .style("color", "white")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "11px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("opacity", "0")
    .text(editButton.description);

  // Position tooltip
  const tooltipNode = tooltip.node() as HTMLElement;
  const rect = tooltipNode?.getBoundingClientRect();
  
  tooltip
    .style("left", `${event.pageX - (rect?.width || 0) / 2}px`)
    .style("top", `${event.pageY - (rect?.height || 0) - 8}px`)
    .transition()
    .duration(200)
    .style("opacity", "1");
}

/**
 * Hide edit button tooltip
 */
function hideEditButtonTooltip() {
  d3.select("body").select(".edit-button-tooltip")
    .transition()
    .duration(200)
    .style("opacity", "0")
    .remove();
}

/**
 * Update legend to reflect current edit mode
 * This function can be called to update visual state without recreating the entire legend
 */
export function updateLegendEditState(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  currentEditMode: EditMode
) {
  const legend = svg.select(".legend");
  if (legend.empty()) return;

  // Update button styles based on current mode
  legend.selectAll(".edit-button")
    .each(function(d: any) {
      const button = d3.select(this);
      const isActive = currentEditMode === d.mode;
      
      button.select(".edit-button-bg")
        .attr("fill", isActive ? d.bgColor : "#f9fafb")
        .attr("stroke", isActive ? d.color : "#e5e7eb")
        .attr("stroke-width", isActive ? 2 : 1);
        
      button.select("text")
        .attr("font-weight", isActive ? "600" : "normal")
        .attr("fill", isActive ? d.color : "#374151");
    });
}