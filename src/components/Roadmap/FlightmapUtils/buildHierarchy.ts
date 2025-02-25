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
                    workstreamNode.children = [];
                    if (workstream.milestones && workstream.milestones.length > 0) {
                      workstreamNode.children.push({
                        name: "Milestones",
                        type: "milestonesGroup",
                        children: workstream.milestones.map((milestone: any) => {
                          const milestoneNode = mapNode(milestone, "milestone");
                          milestoneNode.deadline = milestone.deadline || "";
                          milestoneNode.status = milestone.status || "";
                          milestoneNode.current_progress = milestone.current_progress || 0;
                          milestoneNode.children =
                            milestone.activities && milestone.activities.length > 0
                              ? milestone.activities.map((activity: any) =>
                                  mapNode(activity, "activity")
                                )
                              : [];
                          return milestoneNode;
                        })
                      });
                    }
                    if (workstream.activities && workstream.activities.length > 0) {
                      workstreamNode.children.push({
                        name: "Activities",
                        type: "activitiesGroup",
                        children: workstream.activities.map((activity: any) =>
                          mapNode(activity, "activity")
                        )
                      });
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
