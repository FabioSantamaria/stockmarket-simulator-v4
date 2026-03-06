import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

function PlotChart({ data, layout, config }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      Plotly.newPlot(
        chartRef.current,
        data,
        {
          ...layout,
          responsive: true,
        },
        {
          responsive: true,
          ...config,
        }
      );

      // Handle window resize
      const handleResize = () => {
        Plotly.Plots.resize(chartRef.current);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [data, layout, config]);

  return <div ref={chartRef} style={{ width: '100%', height: '500px' }} />;
}

export default PlotChart;
