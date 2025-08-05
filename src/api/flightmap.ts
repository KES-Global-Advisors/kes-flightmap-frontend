// src/api/flightmap.ts
// cSpell:ignore workstream workstreams roadmaps flightmap flightmaps
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Strategy } from '@/types/flightmap';
const API = import.meta.env.VITE_API_BASE_URL;

export interface NodePos { 
  node_type: NodeType; 
  node_id: number | string; 
  rel_y: number;
  is_duplicate?: boolean;
  duplicate_key?: string;
  original_node_id?: number;
}

// — Flightmaps list
export const fetchFlightmaps = async () => {
    const token = sessionStorage.getItem('accessToken');
    const res = await fetch(`${API}/flightmaps/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch flightmaps');
    return res.json();
};


export function useFlightmaps() {
  return useQuery<Strategy[], Error>({
    queryKey: ['flightmaps'],
    queryFn: fetchFlightmaps,
    staleTime: 60_000,
  });
}

// — Node positions (milestone/workstream)
export type NodeType = 'milestone'|'workstream';
export interface NodePos { node_type: NodeType; node_id: number | string; rel_y: number; }

const fetchPositions = async (strategy: number, nodeType: NodeType) => {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(
    `${API}/positions/?strategy=${strategy}&node_type=${nodeType}`,
    { headers: { 'Content-Type':'application/json', ...(token && { Authorization:`Bearer ${token}` }) }}
  );
  if (!res.ok) throw new Error('Failed to fetch positions');
  return res.json() as Promise<NodePos[]>;
};

export function useNodePositions(strategy: number, nodeType: NodeType) {
  return useQuery<NodePos[], Error>({
    queryKey: ['positions', strategy, nodeType],
    queryFn: () => fetchPositions(strategy, nodeType),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// Update the upsert function to handle duplicates
const upsertPosition = async (
  strategy: number, 
  nodeType: NodeType, 
  nodeId: number | string, 
  relY: number,
  isDuplicate = false,
  duplicateKey?: string,
  originalNodeId?: number
) => {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(`${API}/positions/`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', ...(token && { Authorization:`Bearer ${token}` }) },
    body: JSON.stringify({ 
      strategy, 
      node_type: nodeType, 
      // Use duplicateKey as the node_id for duplicates instead of original ID
      node_id: isDuplicate && duplicateKey ? duplicateKey : nodeId, 
      rel_y: relY,
      is_duplicate: isDuplicate,
      duplicate_key: duplicateKey || "",
      original_node_id: originalNodeId
    })
  });
  if (!res.ok) throw new Error('Failed to save position');
};

export function useUpsertPosition() {
  const qc = useQueryClient();
  return useMutation<void, Error, { 
    strategy: number; 
    nodeType: NodeType; 
    nodeId: number | string; 
    relY: number;
    isDuplicate?: boolean;
    duplicateKey?: string;
    originalNodeId?: number;
  }>({
    mutationFn: ({ strategy, nodeType, nodeId, relY, isDuplicate, duplicateKey, originalNodeId }) =>
      upsertPosition(strategy, nodeType, nodeId, relY, isDuplicate, duplicateKey, originalNodeId),
     onSuccess: (_data, variables) => {
       qc.invalidateQueries({ queryKey: ['positions', variables.strategy, variables.nodeType] });
     },
  });
}

// — Milestone deadline
const patchMilestone = async (milestoneId: number, deadline: string): Promise<void> => {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(`${API}/milestones/${milestoneId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ deadline }),
  });
  if (!res.ok) throw new Error('Failed to update milestone');
};

export function useUpdateMilestoneDeadline() {
  const qc = useQueryClient();
  return useMutation<void, Error, { milestoneId: number; deadline: string }>({
    mutationFn: ({ milestoneId, deadline }) => patchMilestone(milestoneId, deadline),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });
}

// — Delete Milestone
const deleteMilestone = async (milestoneId: number): Promise<void> => {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(`${API}/milestones/${milestoneId}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error('Failed to delete milestone');
};

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation<void, Error, { milestoneId: number }>({
    mutationFn: ({ milestoneId }) => deleteMilestone(milestoneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });
}

// — Delete Workstream
const deleteWorkstream = async (workstreamId: number): Promise<void> => {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(`${API}/workstreams/${workstreamId}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error('Failed to delete workstream');
};

export function useDeleteWorkstream() {
  const qc = useQueryClient();
  return useMutation<void, Error, { workstreamId: number }>({
    mutationFn: ({ workstreamId }) => deleteWorkstream(workstreamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });
}

// — Delete Activity
const deleteActivity = async (activityId: number): Promise<void> => {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(`${API}/activities/${activityId}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error('Failed to delete activity');
};

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation<void, Error, { activityId: number }>({
    mutationFn: ({ activityId }) => deleteActivity(activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });
}

// — Remove Dependency
const removeMilestoneDependency = async (milestoneId: number, dependencyId: number): Promise<void> => {
  const token = sessionStorage.getItem('accessToken');
  
  // First fetch the milestone to get current dependencies
  const getRes = await fetch(`${API}/milestones/${milestoneId}/`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!getRes.ok) throw new Error('Failed to fetch milestone');
  
  const milestone = await getRes.json();
  const updatedDependencies = (milestone.dependencies || []).filter((id: number) => id !== dependencyId);
  
  // Update milestone with removed dependency
  const patchRes = await fetch(`${API}/milestones/${milestoneId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ dependencies: updatedDependencies }),
  });
  if (!patchRes.ok) throw new Error('Failed to remove dependency');
};

export function useRemoveDependency() {
  const qc = useQueryClient();
  return useMutation<void, Error, { milestoneId: number; dependencyId: number }>({
    mutationFn: ({ milestoneId, dependencyId }) => removeMilestoneDependency(milestoneId, dependencyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flightmaps'] });
    },
  });
}