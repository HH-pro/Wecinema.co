import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  week: string;
  [key: string]: number | string;
}

interface CombinedChartProps {
  genreData: DataPoint[];
  themeData: DataPoint[];
}

const CombinedChart: React.FC<CombinedChartProps> = ({ genreData, themeData }) => {
  // Prepare data for the chart
  const data = genreData.map((item, index) => ({
    genreWeek: item.week,   // Rename genre week
    themeWeek: themeData[index]?.week, // Rename theme week
    ...themeData[index],
    ...item,
  }));
  

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        {/* Render genre lines */}
        <Line type="monotone" dataKey="Action" stroke="#8884d8" />
        <Line type="monotone" dataKey="Comedy" stroke="#82ca9d" />
        <Line type="monotone" dataKey="Horror" stroke="#ff7300" />
        {/* Render theme lines */}
        <Line type="monotone" dataKey="Adventure" stroke="#ff0000" />
        <Line type="monotone" dataKey="Romance" stroke="#00ff00" />
        <Line type="monotone" dataKey="Thriller" stroke="#0000ff" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CombinedChart;
