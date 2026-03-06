import React from 'react';
import { AlertCircle } from 'lucide-react';

function ErrorAlert({ message }) {
  return (
    <div className="error-alert">
      <AlertCircle size={20} />
      <div>
        <strong>Error:</strong> {message}
      </div>
    </div>
  );
}

export default ErrorAlert;
