// src/utils/storageHelpers.ts

/**
 * Keys & helpers for saving & loading node positions in localStorage.
 */

export function getMilestonePositionsKey(dataId: string): string {
    return `flightmap-milestone-positions-${dataId}`;
  }
  
  export function saveMilestonePositions(
    dataId: string,
    positions: Record<string, { y: number }>
  ): void {
    try {
      localStorage.setItem(getMilestonePositionsKey(dataId), JSON.stringify(positions));
    } catch (e) {
      console.error('Error saving milestone positions:', e);
    }
  }
  
  export function getWorkstreamPositionsKey(dataId: string): string {
    return `flightmap-workstream-positions-${dataId}`;
  }
  
  export function saveWorkstreamPositions(
    dataId: string,
    positions: Record<number, { y: number }>
  ): void {
    try {
      localStorage.setItem(getWorkstreamPositionsKey(dataId), JSON.stringify(positions));
    } catch (e) {
      console.error('Error saving workstream positions:', e);
    }
  }
  