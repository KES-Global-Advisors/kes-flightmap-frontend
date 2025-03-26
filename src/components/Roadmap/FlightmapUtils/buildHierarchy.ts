/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoadmapData } from "@/types/roadmap";

export function buildHierarchy(data: RoadmapData): any {
  const mapNode = (node: any, type: string): any => ({
    id: node.id,
    name: node.name,
    type,
    description: node.description || "",
    tagline: node.tagline || "",
    vision: node.vision || "",
    time_horizon: node.time_horizon || "",
    progress: node.progress || {},
    progress_summary: node.progress_summary || {},
    status: node.status || "",
    deadline: node.deadline || "",
    current_progress: node.current_progress || 0,
    target_start_date: node.target_start_date || "",
    target_end_date: node.target_end_date || "",
    contributors: node.contributors || [],
    created_at: node.created_at || "",
    supported_milestones: node.supported_milestones || [],
    additional_milestones: node.additional_milestones || [],
    color: node.color || "",
    children: []
  });

  const roadmapNode = mapNode(data, "roadmap");
  roadmapNode.description = data.description || "";
  roadmapNode.created_at = data.created_at || "";

  roadmapNode.children = data.strategies
    ? data.strategies.map((strategy: any) => {
        const strategyNode = mapNode(strategy, "strategy");
        strategyNode.tagline = strategy.tagline || "";
        strategyNode.vision = strategy.vision || "";
        strategyNode.time_horizon = strategy.time_horizon || "";

        strategyNode.children = strategy.programs
          ? strategy.programs.map((program: any) => {
              const programNode = mapNode(program, "program");
              programNode.vision = program.vision || "";
              programNode.time_horizon = program.time_horizon || "";

              programNode.children = program.workstreams
                ? program.workstreams.map((workstream: any) => {
                    const workstreamNode = mapNode(workstream, "workstream");
                    // workstreamNode.color is now set from the backend via mapNode

                    // Instead of pushing a "Milestones" group node, we push the milestone nodes directly.
                    if (workstream.milestones && workstream.milestones.length > 0) {
                      const milestoneNodes = workstream.milestones.map((milestone: any) => {
                        const milestoneNode = mapNode(milestone, "milestone");
                        milestoneNode.deadline = milestone.deadline || "";
                        milestoneNode.status = milestone.status || "";
                        milestoneNode.current_progress = milestone.current_progress || 0;

                        // Attach activities as direct children of the milestone node.
                        if (milestone.activities && milestone.activities.length > 0) {
                          milestoneNode.children = milestone.activities.map((activity: any) =>
                            mapNode(activity, "activity")
                          );
                        }
                        return milestoneNode;
                      });
                      // Push milestone nodes directly.
                      workstreamNode.children.push(...milestoneNodes);
                    }

                    // Same for activities directly under the workstream.
                    if (workstream.activities && workstream.activities.length > 0) {
                      const activityNodes = workstream.activities.map((activity: any) =>
                        mapNode(activity, "activity")
                      );
                      workstreamNode.children.push(...activityNodes);
                    }

                    return workstreamNode;
                  })
                : [];
              return programNode;
            })
          : [];
        return strategyNode;
      })
    : [];

  return roadmapNode;
}
