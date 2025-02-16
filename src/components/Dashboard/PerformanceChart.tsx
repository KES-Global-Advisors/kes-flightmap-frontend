// Performance Chart Component with D3
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { EmployeeContribution } from '@/types/dashboard';

const PerformanceChart = ({ data }: { data: EmployeeContribution[] }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 90 };
    const width = 600 - margin.left - margin.right;
    const height = data.length * 40;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.milestones.completed + d.activities.completed) || 0])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.username))
      .range([0, height])
      .padding(0.1);

    // Add bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.username) || 0)
      .attr('width', d => xScale(d.milestones.completed + d.activities.completed))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#3B82F6');

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    g.append('g')
      .call(d3.axisLeft(yScale));
  }, [data]);

  return <svg ref={svgRef} />;
};

export default PerformanceChart;