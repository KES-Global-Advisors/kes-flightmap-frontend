// import React from 'react';
// import * as d3 from 'd3';
// import { RoadmapData } from '@/types/roadmap';

// /* ------------------------------------------------------------------
//    2) FlightmapVisualization (D3)
//    ------------------------------------------------------------------ */

// interface FlightmapProps {
//   data: RoadmapData;
//   width?: number;
//   height?: number;
// }

// const FlightmapVisualization: React.FC<FlightmapProps> = ({
//   data,
//   width = 1200,
//   height = 600,
// }) => {
//   const svgRef = React.useRef<SVGSVGElement>(null);
//   const margin = { top: 20, right: 90, bottom: 30, left: 90 };

//   React.useEffect(() => {
//     if (!svgRef.current || !data) return;

//     // Clear any existing content on re-render
//     d3.select(svgRef.current).selectAll('*').remove();

//     const svg = d3
//       .select(svgRef.current)
//       .attr('width', width)
//       .attr('height', height)
//       .append('g')
//       .attr('transform', `translate(${margin.left},${margin.top})`);

//     // Parse date strings
//     const parseDate = d3.timeParse('%Y-%m-%d');

//     // Flatten all activities
//     const allActivities = data.strategies.flatMap((s) =>
//       s.programs.flatMap((p) =>
//         p.workstreams.flatMap((w) =>
//           w.milestones.flatMap((m) => m.activities)
//         )
//       )
//     );

//     if (!allActivities.length) {
//       // No activities at all
//       return;
//     }

//     // Gather all parsed dates and filter out null
//     const allDates = allActivities
//       .flatMap((a) => [
//         parseDate(a.target_start_date),
//         parseDate(a.target_end_date),
//       ])
//       .filter((d): d is Date => d !== null);

//     if (!allDates.length) {
//       // No valid dates after parsing
//       return;
//     }

//     const earliestDate = d3.min(allDates);
//     const latestDate = d3.max(allDates);

//     // If for some reason we can't find valid min or max, return early
//     if (!earliestDate || !latestDate) {
//       return;
//     }

//     const innerWidth = width - margin.left - margin.right;
//     const innerHeight = height - margin.top - margin.bottom;

//     // Time scale
//     const xScale = d3
//       .scaleTime()
//       .domain([earliestDate, latestDate])
//       .range([0, innerWidth]);

//     // Simple lane approach for each activity
//     const laneCount = allActivities.length;
//     const yScale = d3
//       .scaleLinear()
//       .domain([0, laneCount])
//       .range([0, innerHeight]);

//     // X-axis
//     svg
//       .append('g')
//       .attr('transform', `translate(0,${innerHeight})`)
//       .call(d3.axisBottom(xScale).ticks(6));

//     // Render each activity as a bar
//     let laneIndex = 0;
//     data.strategies.forEach((strategy) => {
//       strategy.programs.forEach((program) => {
//         program.workstreams.forEach((ws) => {
//           ws.milestones.forEach((ms) => {
//             ms.activities.forEach((act) => {
//               const startDate = parseDate(act.target_start_date);
//               const endDate = parseDate(act.target_end_date);

//               // Ensure we only plot valid parsed dates
//               if (!startDate || !endDate) {
//                 return;
//               }

//               // Bar
//               svg
//                 .append('rect')
//                 .attr('x', xScale(startDate))
//                 .attr('y', yScale(laneIndex))
//                 .attr('width', xScale(endDate) - xScale(startDate))
//                 .attr('height', 20)
//                 .attr('fill', '#69b3a2');

//               // Label
//               svg
//                 .append('text')
//                 .attr('x', xScale(startDate) + 5)
//                 .attr('y', yScale(laneIndex) + 14)
//                 .text(act.name)
//                 .style('font-size', '10px')
//                 .style('fill', '#fff');

//               laneIndex++;
//             });
//           });
//         });
//       });
//     });
//   }, [data, width, height]);

//   return <svg ref={svgRef} />;
// };

// export default FlightmapVisualization;

import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { RoadmapData, Activity } from '@/types/roadmap';
import useFetch from '@/hooks/UseFetch';

const Treemap = () => {
  const { data, loading, error } = useFetch<RoadmapData>('http://127.0.0.1:8000/roadmaps/1/');
  const [activities, setActivities] = useState<Activity[]>([]);
  
  useEffect(() => {
    if (data) {
      const extractedActivities = data.strategies.flatMap(strategy =>
        strategy.programs.flatMap(program =>
          program.workstreams.flatMap(workstream => workstream.activities)
        )
      );
      setActivities(extractedActivities);
    }
  }, [data]);

  useEffect(() => {
    if (!activities.length) return;

    const width = 800;
    const height = 500;

    const svg = d3.select('#treemap')
      .attr('width', width)
      .attr('height', height);

    const root = d3.hierarchy({ children: activities }, d => d.children)
      .sum(() => 1)
      .sort((a, b) => b.value! - a.value!);

    const treemapLayout = d3.treemap<Activity>()
      .size([width, height])
      .padding(4);

    treemapLayout(root);

    const colorScale = d3.scaleOrdinal()
      .domain(['not_started', 'in_progress', 'completed'])
      .range(['#d1d5db', '#fbbf24', '#10b981']);

    const nodes = svg.selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .on('mouseover', function (event, d) {
        d3.select('#tooltip')
          .style('visibility', 'visible')
          .text(d.data.name);
      })
      .on('mousemove', function (event) {
        d3.select('#tooltip')
          .style('top', `${event.pageY - 10}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', function () {
        d3.select('#tooltip').style('visibility', 'hidden');
      })
      .on('click', function (event, d) {
        const updatedActivities = activities.map(activity =>
          activity.id === d.data.id
            ? {
                ...activity,
                status:
                  activity.status === 'not_started'
                    ? 'in_progress'
                    : activity.status === 'in_progress'
                    ? 'completed'
                    : 'not_started',
              }
            : activity
        );
        setActivities(updatedActivities);
      });

    nodes.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => colorScale(d.data.status))
      .transition()
      .duration(500)
      .style('opacity', 1);

    nodes.append('text')
      .attr('x', 5)
      .attr('y', 20)
      .text(d => d.data.name)
      .style('fill', 'white')
      .style('font-size', '12px');
  }, [activities]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="relative">
      <svg id="treemap"></svg>
      <div
        id="tooltip"
        className="absolute bg-black text-white text-xs px-2 py-1 rounded"
        style={{ visibility: 'hidden' }}
      ></div>
    </div>
  );
};

export default Treemap;
