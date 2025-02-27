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
