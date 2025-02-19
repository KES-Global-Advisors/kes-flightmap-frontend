// import React from 'react';
// import Chart from 'react-apexcharts';
// import { ApexOptions } from 'apexcharts';
// import { RoadmapData } from '@/types/roadmap';

// /* ------------------------------------------------------------------
//    3) GanttRangeBar (ApexCharts Range Bar)
//    ------------------------------------------------------------------ */
//    interface GanttProps {
//     data: RoadmapData;
//     chartHeight?: number;
//   }
  
//   const GanttRangeBar: React.FC<GanttProps> = ({ data, chartHeight = 600 }) => {
//     const parseDate = (d: string) => new Date(d).getTime();
  
//     // Flatten data into series
//     const seriesData = data.strategies.flatMap((strategy) =>
//       strategy.programs.flatMap((program) =>
//         program.workstreams.map((ws) => {
//           // Each workstream is a series
//           const activities = ws.milestones.flatMap((m) => m.activities);
//           return {
//             name: ws.name,
//             data: activities.map((act) => ({
//               x: act.name,
//               y: [parseDate(act.target_start_date), parseDate(act.target_end_date)],
//             })),
//           };
//         })
//       )
//     );
  
//     const options: ApexOptions = {
//       chart: {
//         type: 'rangeBar',
//         toolbar: { show: true },
//       },
//       plotOptions: {
//         bar: {
//           horizontal: true,
//         },
//       },
//       xaxis: {
//         type: 'datetime' as const,
//       },
//       tooltip: {
//         x: {
//           format: 'dd MMM yyyy',
//         },
//       },
//     };
  
//     return (
//       <Chart
//         options={options}
//         series={seriesData}
//         type="rangeBar"
//         height={chartHeight}
//       />
//     );
//   };
  
//     export default GanttRangeBar;

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import useFetch from "@/hooks/UseFetch";
import { RoadmapData } from "@/types/roadmap";
import { Program, Strategy, Workstream, Activity } from "@/types/roadmap";

// interface Activity {
//   id: number;
//   name: string;
//   status: string;
//   target_start_date: string;
//   target_end_date: string;
// }

const GanttChart: React.FC = () => {
  const { data, loading, error } = useFetch<RoadmapData>("http://127.0.0.1:8000/roadmaps/1/");
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (loading || error || !data) return;

    const activities: Activity[] = data.strategies.flatMap((strategy: Strategy) =>
      strategy.programs.flatMap((program: Program) =>
        program.workstreams.flatMap((workstream: Workstream) =>
          workstream.activities.map((activity: Activity) => ({
            id: activity.id,
            name: activity.name,
            status: activity.status,
            target_start_date: activity.target_start_date,
            target_end_date: activity.target_end_date,
          }))
        )
      )
    );

    const margin = { top: 40, right: 30, bottom: 30, left: 150 };
    const width = 800 - margin.left - margin.right;
    const height = activities.length * 30;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m-%d");

    const x = d3
      .scaleTime()
      .domain([
        d3.min(activities, (d) => parseDate(d.target_start_date))!,
        d3.max(activities, (d) => parseDate(d.target_end_date))!,
      ])
      .range([0, width]);

    const y = d3
      .scaleBand()
      .domain(activities.map((d) => d.name))
      .range([0, height])
      .padding(0.2);

    g.append("g").call(d3.axisLeft(y));
    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));

    g.selectAll(".bar")
      .data(activities)
      .enter()
      .append("rect")
      .attr("x", (d) => x(parseDate(d.target_start_date)!))
      .attr("y", (d) => y(d.name)!)
      .attr("width", (d) =>
        x(parseDate(d.target_end_date)!) - x(parseDate(d.target_start_date)!)
      )
      .attr("height", y.bandwidth())
      .attr("fill", (d) => (d.status === "completed" ? "#4caf50" : "#ff9800"))
      .on("click", function (event, d) {
        d3.select(this).attr("fill", d.status === "completed" ? "#ff9800" : "#4caf50");
      })
      .append("title")
      .text((d) => `${d.name}\nStatus: ${d.status}\nStart: ${d.target_start_date}\nEnd: ${d.target_end_date}`);
  }, [data, loading, error]);

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Gantt Chart</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      <svg ref={svgRef} className="w-full" />
    </div>
  );
};

export default GanttChart;
