import React from 'react';

function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Running simulation...</p>
      <p className="loading-subtext">This may take a minute depending on the date range.</p>
    </div>
  );
}

export default LoadingSpinner;
