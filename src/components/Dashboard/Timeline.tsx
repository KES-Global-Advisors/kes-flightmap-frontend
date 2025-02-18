// // Timeline Component with D3
// import React, { useEffect } from 'react';
// import * as d3 from 'd3';
// import { TimelineEvent } from '@/types/dashboard';


// const Timeline = ({ events }: { events: TimelineEvent[] }) => {
//   const svgRef = React.useRef<SVGSVGElement>(null);

//   useEffect(() => {
//     if (!svgRef.current || !events.length) return;

//     const margin = { top: 20, right: 30, bottom: 30, left: 100 };
//     const width = 800 - margin.left - margin.right;
//     const height = events.length * 40;

//     const svg = d3.select(svgRef.current)
//       .attr('width', width + margin.left + margin.right)
//       .attr('height', height + margin.top + margin.bottom);

//     const g = svg.append('g')
//       .attr('transform', `translate(${margin.left},${margin.top})`);

//     const timeScale = d3.scaleTime()
//       .domain(d3.extent(events, d => new Date(d.date)) as [Date, Date])
//       .range([0, width]);

//     const yScale = d3.scaleBand()
//       .domain(events.map(d => d.name))
//       .range([0, height])
//       .padding(0.1);

//     // Add axes
//     g.append('g')
//       .attr('transform', `translate(0,${height})`)
//       .call(d3.axisBottom(timeScale));

//     g.append('g')
//       .call(d3.axisLeft(yScale));

//     // Add events
//     g.selectAll('rect')
//       .data(events)
//       .enter()
//       .append('rect')
//       .attr('x', d => timeScale(new Date(d.date)))
//       .attr('y', d => yScale(d.name) || 0)
//       .attr('width', 10)
//       .attr('height', yScale.bandwidth())
//       .attr('fill', d => d.type === 'milestone' ? '#3B82F6' : '#10B981')
//       .attr('rx', 2);
//   }, [events]);

//   return <svg ref={svgRef} />;
// };

// export default Timeline;

import React from 'react';
import Chart from 'react-apexcharts';
import { TimelineEvent } from '@/types/dashboard';
import { ApexOptions } from 'apexcharts';

interface TimelineProps {
  events: TimelineEvent[];
}

const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const options: ApexOptions = {
    chart: {
      id: 'timeline-chart',
      toolbar: { show: true },
    },
    xaxis: {
      type: 'datetime' as "datetime",
      labels: { format: 'dd MMM' },
    },
    yaxis: {
      labels: { show: false },
    },
    tooltip: {
      custom: function({ dataPointIndex }: { dataPointIndex: number }) {
        const event = events[dataPointIndex];
        return `<div class="p-2">
          <strong>${event.name}</strong><br/>
          Date: ${new Date(event.date).toLocaleDateString()}<br/>
          Type: ${event.type}
        </div>`;
      }
    },
    markers: {
      size: 6,
      colors: events.map(event => event.type === 'milestone' ? '#3B82F6' : '#10B981'),
    },
  };

  const series = [
    {
      name: 'Events',
      data: events.map((event, index) => ({
        x: new Date(event.date).getTime(),
        y: index,
      })),
    },
  ];

  return (
    <Chart 
      options={options} 
      series={series} 
      type="scatter" 
      height={events.length * 50} 
    />
  );
};

export default Timeline;
