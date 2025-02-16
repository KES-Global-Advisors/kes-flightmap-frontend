// Trend Analysis Component
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { TrendData } from '@/types/dashboard';

const TrendChart = ({ data }: { data: TrendData[] }) => {
    const svgRef = React.useRef<SVGSVGElement>(null);
  
    useEffect(() => {
      if (!svgRef.current || !data.length) return;
  
      const margin = { top: 20, right: 30, bottom: 30, left: 50 };
      const width = 600 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;
  
      const svg = d3.select(svgRef.current)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
  
      const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
        .range([0, width]);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.completed, d.in_progress)) as number])
        .range([height, 0]);
  
      // Add lines
      const completedLine = d3.line<TrendData>()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.completed));
  
      const inProgressLine = d3.line<TrendData>()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.in_progress));
  
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#10B981')
        .attr('stroke-width', 2)
        .attr('d', completedLine);
  
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#3B82F6')
        .attr('stroke-width', 2)
        .attr('d', inProgressLine);
  
      // Add axes
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
  
      svg.append('g')
        .call(d3.axisLeft(y));
    }, [data]);
  
    return <svg ref={svgRef} />;
  };


  export default TrendChart;