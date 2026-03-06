# Stock Market Simulator Frontend

React-based frontend for the stock market simulator application.

## Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Environment Variables

Create a `.env.local` file for local development:

```
VITE_API_URL=http://localhost:8000/api
```

For production, set the API URL through environment variables in your deployment platform.

## Features

- 📊 Interactive stock index selection
- 📈 Historical portfolio simulation
- 💰 Investment metrics (CAGR, returns, drawdown)
- 🎯 Monte Carlo forecasting
- 📱 Responsive design
- 🚀 Real-time data from Yahoo Finance

## Built with

- React 18
- Vite
- Plotly.js for interactive charts
- Axios for API calls
- TailwindCSS-like custom styling
