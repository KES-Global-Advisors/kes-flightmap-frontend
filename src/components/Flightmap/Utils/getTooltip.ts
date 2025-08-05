/* eslint-disable @typescript-eslint/no-explicit-any */
export const getTooltipContent = (d: any): string => {
    const type = d.data.type;
    if (type === "flightmap") {
      return `<strong>${d.data.name}</strong><br/>
              <em>${d.data.description}</em><br/>
              Created: ${
                d.data.created_at ? new Date(d.data.created_at).toLocaleDateString() : "N/A"
              }`;
    } else if (type === "strategy") {
      return `<strong>${d.data.name}</strong><br/>
              <em>${d.data.tagline}</em><br/>
              Vision: ${d.data.vision}`;
    } else if (type === "program") {
      return `<strong>${d.data.name}</strong><br/>
              Progress: ${d.data.progress?.percentage || 0}%<br/>
              Deadline: ${d.data.time_horizon}`;
    } else if (type === "workstream") {
      return `<strong>${d.data.name}</strong><br/>
              Milestones: ${d.data.progress_summary?.total_milestones || 0}<br/>
              Team: ${
                d.data.contributors && d.data.contributors.length > 0
                  ? d.data.contributors.map((c: any) => c.username).join(", ")
                  : "N/A"
              }`;
    } else if (type === "milestone") {
      return `<strong>${d.data.name}</strong><br/>
              Status: ${d.data.status || "N/A"}<br/>
              Deadline: ${d.data.deadline || "N/A"}<br/>
              Progress: ${d.data.current_progress || 0}%<br/>
              ${d.data.description ? `<em>${d.data.description}</em>` : ""}`;
    } else if (type === "activity") {
      return `<strong>${d.data.name}</strong><br/>
              Status: ${d.data.status || "N/A"}<br/>
              Dates: ${d.data.target_start_date || "N/A"} - ${
        d.data.target_end_date || "N/A"
      }`;
    } else {
      return `<strong>${d.data.name}</strong><br/><em>${d.data.type}</em>`;
    }
  };
  