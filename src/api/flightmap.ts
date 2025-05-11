// src/api/flightmap.ts
// cSpell:ignore workstream workstreams roadmaps flightmap flightmaps
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FlightmapData } from '@/types/roadmap';
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
  return useQuery<FlightmapData[], Error>({
    queryKey: ['flightmaps'],
    queryFn: fetchFlightmaps,
    staleTime: 60_000,
  });
}

// — Node positions (milestone/workstream)
export type NodeType = 'milestone'|'workstream';
export interface NodePos { node_type: NodeType; node_id: number | string; rel_y: number; }

const fetchPositions = async (flightmap: number, nodeType: NodeType) => {
  const token = sessionStorage.getItem('accessToken');
  const res = await fetch(
    `${API}/positions/?flightmap=${flightmap}&node_type=${nodeType}`,
    { headers: { 'Content-Type':'application/json', ...(token && { Authorization:`Bearer ${token}` }) }}
  );
  if (!res.ok) throw new Error('Failed to fetch positions');
  return res.json() as Promise<NodePos[]>;
};

export function useNodePositions(flightmap: number, nodeType: NodeType) {
  return useQuery<NodePos[], Error>({
    queryKey: ['positions', flightmap, nodeType],
    queryFn: () => fetchPositions(flightmap, nodeType),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// Update the upsert function to handle duplicates
const upsertPosition = async (
  flightmap: number, 
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
      flightmap, 
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
    flightmap: number; 
    nodeType: NodeType; 
    nodeId: number | string; 
    relY: number;
    isDuplicate?: boolean;
    duplicateKey?: string;
    originalNodeId?: number;
  }>({
    mutationFn: ({ flightmap, nodeType, nodeId, relY, isDuplicate, duplicateKey, originalNodeId }) =>
      upsertPosition(flightmap, nodeType, nodeId, relY, isDuplicate, duplicateKey, originalNodeId),
     onSuccess: (_data, variables) => {
       qc.invalidateQueries({ queryKey: ['positions', variables.flightmap, variables.nodeType] });
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