/* eslint-disable @typescript-eslint/no-explicit-any */
import { FlightmapData } from "@/types/roadmap";

export function buildHierarchy(data: FlightmapData): any {
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

  // Create the roadmap node.
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
                    // Process milestones with the new parent relationship.
                    if (workstream.milestones && workstream.milestones.length > 0) {
                      // First, create milestone nodes and build a map.
                      const milestoneNodesMap: { [key: number]: any } = {};
                      const milestoneNodes: any[] = [];
                      workstream.milestones.forEach((milestone: any) => {
                        const milestoneNode = mapNode(milestone, "milestone");
                        milestoneNode.deadline = milestone.deadline || "";
                        milestoneNode.status = milestone.status || "";
                        milestoneNode.current_progress = milestone.current_progress || 0;
                        // Copy the new parent field (assumed to be provided as milestone.parent)
                        milestoneNode.parentId = milestone.parent || null;
                        // Attach any activities directly under this milestone.
                        if (milestone.activities && milestone.activities.length > 0) {
                          milestoneNode.children = milestone.activities.map((activity: any) =>
                            mapNode(activity, "activity")
                          );
                        }
                        milestoneNodesMap[milestone.id] = milestoneNode;
                        milestoneNodes.push(milestoneNode);
                      });
                      // Organize milestones by nesting child milestones under their parent.
                      const rootMilestones: any[] = [];
                      milestoneNodes.forEach((node: any) => {
                        if (node.parentId) {
                          const parentNode = milestoneNodesMap[node.parentId];
                          if (parentNode) {
                            parentNode.children.push(node);
                          } else {
                            // If the parent isn’t found, treat as root.
                            rootMilestones.push(node);
                          }
                        } else {
                          rootMilestones.push(node);
                        }
                      });
                      // Attach the top-level milestones to the workstream.
                      workstreamNode.children.push(...rootMilestones);
                    }

                    // Also add activities directly under the workstream.
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


/* eslint-disable @typescript-eslint/no-explicit-any */
// import { FlightmapData } from "@/types/roadmap";

// export function buildHierarchy(data: FlightmapData): any {
//   // Map a raw node to our visual node structure.
//   const mapNode = (node: any, type: string): any => ({
//     id: node.id,
//     name: node.name,
//     type,
//     description: node.description || "",
//     tagline: node.tagline || "",
//     vision: node.vision || "",
//     time_horizon: node.time_horizon || "",
//     progress: node.progress || {},
//     progress_summary: node.progress_summary || {},
//     status: node.status || "",
//     deadline: node.deadline || "",
//     current_progress: node.current_progress || 0,
//     target_start_date: node.target_start_date || "",
//     target_end_date: node.target_end_date || "",
//     contributors: node.contributors || [],
//     created_at: node.created_at || "",
//     // Existing fields for activity connections (if needed)
//     supported_milestones: node.supported_milestones || [],
//     additional_milestones: node.additional_milestones || [],
//     // NEW: parent milestone field (use the backend’s parent_milestone property)
//     parentMilestoneId: node.parent_milestone || null,
//     color: node.color || "",
//     children: []
//   });

//   // Create the root roadmap node.
//   const roadmapNode = mapNode(data, "roadmap");
//   roadmapNode.children = [];

//   // Process strategies.
//   if (data.strategies && Array.isArray(data.strategies)) {
//     roadmapNode.children = data.strategies.map((strategy: any) => {
//       const strategyNode = mapNode(strategy, "strategy");
//       strategyNode.children = [];
//       if (strategy.programs && Array.isArray(strategy.programs)) {
//         strategyNode.children = strategy.programs.map((program: any) => {
//           const programNode = mapNode(program, "program");
//           programNode.children = [];
//           if (program.workstreams && Array.isArray(program.workstreams)) {
//             programNode.children = program.workstreams.map((workstream: any) => {
//               const workstreamNode = mapNode(workstream, "workstream");
//               workstreamNode.children = [];

//               // Process milestones within the workstream.
//               if (workstream.milestones && Array.isArray(workstream.milestones)) {
//                 // First, create flat milestone nodes (with their activities as children).
//                 const milestoneNodes = workstream.milestones.map((milestone: any) => {
//                   const milestoneNode = mapNode(milestone, "milestone");
//                   milestoneNode.children = [];
//                   if (milestone.activities && Array.isArray(milestone.activities)) {
//                     milestoneNode.children = milestone.activities.map((activity: any) =>
//                       mapNode(activity, "activity")
//                     );
//                   }
//                   return milestoneNode;
//                 });

//                 // Now nest milestones based on the parentMilestoneId field.
//                 const milestoneMap: { [id: number]: any } = {};
//                 milestoneNodes.forEach((m) => {
//                   milestoneMap[m.id] = m;
//                 });
//                 const topLevelMilestones: any[] = [];
//                 milestoneNodes.forEach((m) => {
//                   if (m.parentMilestoneId && milestoneMap[m.parentMilestoneId]) {
//                     // Nest this milestone under its parent.
//                     milestoneMap[m.parentMilestoneId].children.push(m);
//                   } else {
//                     // No parent defined; attach at the top level for the workstream.
//                     topLevelMilestones.push(m);
//                   }
//                 });
//                 workstreamNode.children.push(...topLevelMilestones);
//               }

//               // Also add any workstream-level activities not attached to a milestone.
//               if (workstream.activities && Array.isArray(workstream.activities)) {
//                 const activityNodes = workstream.activities.map((activity: any) =>
//                   mapNode(activity, "activity")
//                 );
//                 workstreamNode.children.push(...activityNodes);
//               }
//               return workstreamNode;
//             });
//           }
//           return programNode;
//         });
//       }
//       return strategyNode;
//     });
//   }
//   return roadmapNode;
// }
