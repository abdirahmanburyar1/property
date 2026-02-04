# Property Registration Frontend

React TypeScript frontend for Property Registration System.

## Features

- **React 19** with TypeScript
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Mapbox GL** for property visualization
- **SignalR** for real-time updates
- **Axios** for API communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:9000/api
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### Development

```bash
npm run dev
```

The app will run on `http://localhost:9001`

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable components
│   ├── auth/      # Authentication components
│   ├── layouts/   # Layout components
│   └── routes/    # Route components
├── config/        # Configuration files
├── pages/         # Page components
├── store/         # Redux store
│   ├── slices/    # Redux slices
│   └── hooks.ts   # Typed hooks
└── App.tsx        # Main app component
```

## API Integration

The frontend communicates with the backend API running on `http://localhost:9000/api`.

## Authentication

- Login: `/login`
- Register: `/register`
- Protected routes require authentication

## Available Routes

- `/dashboard` - Dashboard with statistics
- `/properties` - Property list and management
- `/payments` - Payment management (coming soon)
- `/users` - User management (coming soon)
- `/reports` - Reports (coming soon)
- `/settings` - Settings (coming soon)
