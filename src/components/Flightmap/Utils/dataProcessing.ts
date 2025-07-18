// src/utils/dataProcessing.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// cSpell:ignore workstream workstreams roadmaps Flightmap
import { Strategy } from '@/types/flightmap';
import { buildHierarchy } from './buildHierarchy';

export interface MilestonePlacement {
  id: string;
  milestone: any;
  placementWorkstreamId: number;
  isDuplicate: boolean;
  originalMilestoneId?: number;
  activityId?: number | string;
  duplicateKey?: number | string;
}

/** 
 * Extracts workstreams, milestones, and activities (including dependencies)
 * from the hierarchical flightmap data.
 */
export function extractMilestonesAndActivities(data: Strategy) {
  const rootNode = buildHierarchy(data);
  const workstreams: Record<number, { id: number; name: string; color: string; milestones: any[] }> = {};
  const activities: any[] = [];
  const dependencies: { source: number; target: number }[] = [];

  function visit(node: any, currentWorkstreamId?: number) {
    if (node.type === 'workstream') {
      currentWorkstreamId = node.id;
      workstreams[node.id] = {
        id: node.id,
        name: node.name,
        color: node.color || '#0000FF',
        milestones: [],
      };
    }
    if (node.type === 'milestone' && currentWorkstreamId) {
      workstreams[currentWorkstreamId].milestones.push({
        ...node,
        workstreamId: currentWorkstreamId,
      });
      if (node.dependencies?.length) {
        node.dependencies.forEach((depId: number) =>
          dependencies.push({ source: depId, target: node.id })
        );
      }
    }
    node.children?.forEach((child: any) => {
      child.parent = node;
      visit(child, currentWorkstreamId);
    });
  }
  visit(rootNode);

  // NEW: Extract activities from milestone source_activities
  Object.values(workstreams).forEach(workstream => {
    workstream.milestones.forEach(milestone => {
      if (milestone.source_activities && Array.isArray(milestone.source_activities)) {
        milestone.source_activities.forEach((activity: any) => {
          activities.push({
            ...activity,
            workstreamId: workstream.id, // Activity's workstream comes from its source milestone
          });
        });
      }
    });
  });
  
  return {
    workstreams: Object.values(workstreams),
    activities,
    dependencies,
  };
}

/**
 * Turn an array of milestones into a sorted list of unique Date markers.
 */
export function processDeadlines(milestones: any[]): Date[] {
  const all = milestones
    .filter((m) => m.deadline)
    .map((m) => new Date(m.deadline));
  if (!all.length) {
    const now = new Date();
    const next1 = new Date(now);
    const next2 = new Date(now);
    next1.setMonth(now.getMonth() + 1);
    next2.setMonth(now.getMonth() + 2);
    return [now, next1, next2].sort((a, b) => a.getTime() - b.getTime());
  }
  const uniq = Array.from(
    new Set(all.map((d) => d.toISOString().split('T')[0]))
  )
    .map((s) => new Date(s))
    .sort((a, b) => a.getTime() - b.getTime());
  return uniq;
}

/**
 * When multiple milestones fall on the same date/workstream,
 * group them so you can offset their x/y to avoid overdraw.
 */
export function groupPlacementsByDeadlineAndWorkstream(
  placements: MilestonePlacement[]
): Record<string, MilestonePlacement[]> {
  const groups: Record<string, MilestonePlacement[]> = {};
  placements.forEach((pl) => {
    const dl = new Date(pl.milestone.deadline!).toISOString().split('T')[0];
    const key = `${dl}-${pl.placementWorkstreamId}`;
    groups[key] = groups[key] || [];
    groups[key].push(pl);
  });
  return groups;
}