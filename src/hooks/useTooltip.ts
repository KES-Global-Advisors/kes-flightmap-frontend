// src/hooks/useTooltip.ts
import { useState } from 'react';

export interface TooltipState {
  content: string;
  left: number;
  top: number;
  visible: boolean;
}

/**
 * Custom hook for managing tooltip state and behavior
 * @returns Tooltip state and handlers
 */
export function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>({
    content: "",
    left: 0,
    top: 0,
    visible: false,
  });

  /**
   * Show tooltip with content at specified position
   */
  const showTooltip = (content: string, left: number, top: number) => {
    setTooltip({
      content,
      left,
      top,
      visible: true,
    });
  };

  /**
   * Update tooltip position (used during mousemove)
   */
  const moveTooltip = (left: number, top: number) => {
    setTooltip(prev => ({
      ...prev,
      left,
      top,
    }));
  };

  /**
   * Hide tooltip
   */
  const hideTooltip = () => {
    setTooltip(prev => ({
      ...prev,
      visible: false,
    }));
  };

  /**
   * Create event handlers for an element
   */
  const createTooltipHandlers = (content: string) => ({
    onMouseOver: (event: React.MouseEvent | MouseEvent) => {
      showTooltip(content, event.pageX + 10, event.pageY - 28);
    },
    onMouseMove: (event: React.MouseEvent | MouseEvent) => {
      moveTooltip(event.pageX + 10, event.pageY - 28);
    },
    onMouseOut: () => {
      hideTooltip();
    }
  });

  // For D3 elements that don't use React events
  const handleD3MouseOver = (event: MouseEvent, content: string) => {
    showTooltip(content, event.pageX + 10, event.pageY - 28);
  };

  const handleD3MouseMove = (event: MouseEvent) => {
    moveTooltip(event.pageX + 10, event.pageY - 28);
  };

  return {
    tooltip,
    showTooltip,
    moveTooltip,
    hideTooltip,
    createTooltipHandlers,
    handleD3MouseOver,
    handleD3MouseMove,
    handleD3MouseOut: hideTooltip
  };
}