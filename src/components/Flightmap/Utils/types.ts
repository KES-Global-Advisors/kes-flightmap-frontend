import * as d3 from 'd3';
import { RefObject } from 'react';

// Add these D3 selection type helpers
export type D3Selection = d3.Selection<SVGGElement, unknown, null, undefined>;
export type D3SelectionRef = RefObject<D3Selection | null>;

// Constants used across multiple utilities
export const NODE_RADIUS = 55;
export const WORKSTREAM_AREA_HEIGHT = 600;
export const WORKSTREAM_AREA_PADDING = 15;

// Common interfaces
export interface NodeCoordinate {
  x: number;
  y: number;
}

export interface PlacementCoordinate extends NodeCoordinate {
  isDuplicate?: boolean;
  originalId?: number;
  duplicateKey?: string | number;
  workstreamId: number;
}

export interface NodePosition {
  y: number;
}

export interface WorkstreamPositions {
  [id: number]: NodePosition;
}

export interface MilestonePositions {
  [id: string]: NodePosition;
}

export interface RemoteNodePosition {
  node_type: 'milestone' | 'workstream';
  node_id: number | string;
  rel_y: number;
  is_duplicate?: boolean;
  duplicate_key?: string;
  original_node_id?: number;
}