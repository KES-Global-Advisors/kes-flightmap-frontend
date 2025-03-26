import React from 'react';
import Chart from 'react-apexcharts';
import { TrendData } from '@/types/dashboard';
import { ApexOptions } from 'apexcharts';

interface TrendChartProps {
  data: TrendData[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  if (!data.length) {
    return <div className="text-gray-500">No trend data available.</div>;
  }

  const options: ApexOptions = {
    chart: {
      id: 'trend-chart',
      toolbar: { show: true },
      zoom: { enabled: false },
    },
    markers: {
      size: 5,
    },
    xaxis: {
      type: 'datetime',
      categories: data.map(d => new Date(d.date).toISOString()),
    },
    yaxis: {
      title: { text: 'Count' },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy',
      },
    },
  };

  const series = [
    {
      name: 'Completed',
      data: data.map(d => d.completed),
    },
    {
      name: 'In Progress',
      data: data.map(d => d.in_progress),
    },
  ];

  return (
    <Chart
      options={options}
      series={series}
      type="line"
      height="300"
    />
  );
};

export default TrendChart;
