# Journal

A digital journal application for writing daily memories that can be compared across years. Write your thoughts each day and revisit them on the same date in future years.

## Features

- **Authentication**: Register and login with email/password or Google OAuth
- **Daily Entries**: Write journal entries with a rich WYSIWYG editor (TipTap)
- **Calendar Views**:
  - Month View: Classic calendar showing days with entries
  - Week View: Multi-year comparison showing the same week across different years
- **Day View**: Compare all journal entries for the same day across all years
- **Persistent Storage**: Entries saved in PostgreSQL database

## Tech Stack

- **Frontend**: Remix (React Router), TypeScript, TipTap editor
- **Backend**: Hapi.js, Node.js
- **Database**: PostgreSQL (via Docker)
- **Authentication**: JWT + Google OAuth 2.0

## Project Structure

```
journal/
├── backend/           # Hapi.js API server
│   ├── src/
│   │   ├── config/    # Database configuration
│   │   ├── routes/    # API routes (auth, entries)
│   │   ├── utils/     # Utilities (auth helpers)
│   │   └── index.js   # Server entry point
│   └── package.json
├── frontend/          # Remix application
│   ├── app/
│   │   ├── components/  # React components
│   │   ├── routes/      # Remix routes/pages
│   │   ├── styles/      # CSS styles
│   │   ├── utils/       # API client, auth context
│   │   └── root.tsx     # App root
│   └── package.json
├── database/
│   └── init/          # Database initialization SQL
└── docker-compose.yml # PostgreSQL container
```

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- (Optional) Google Cloud Console account for OAuth

### 1. Start the Database

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps
```

The database will automatically create the necessary tables on first startup.

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and update these values:
# - JWT_SECRET: A secure random string
# - GOOGLE_CLIENT_ID: (Optional) From Google Cloud Console
# - GOOGLE_CLIENT_SECRET: (Optional) From Google Cloud Console
```

#### Setting up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Client Secret to backend `.env`

```bash
# Start the backend server
npm run dev

# Server runs at http://localhost:3001
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional, uses defaults)
cp .env.example .env

# Start the development server
npm run dev

# Frontend runs at http://localhost:3000
```

### 4. Access the Application

Open your browser and navigate to `http://localhost:3000`

1. Register a new account or login with Google
2. Write your first journal entry
3. Explore the calendar views
4. Compare entries across years in the Day View

## API Endpoints

### Authentication
- `POST /api/register` - Register with email/password
- `POST /api/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/me` - Get current user (protected)

### Journal Entries
- `POST /api/entries` - Create/update entry
- `GET /api/entries/:date` - Get entry for specific date
- `GET /api/entries/range/:startDate/:endDate` - Get entries in date range
- `GET /api/entries/day/:month/:day` - Get all entries for a day across years
- `DELETE /api/entries/:date` - Delete entry

## Database Schema

### users
- `id` - Serial primary key
- `email` - Unique email address
- `password_hash` - Bcrypt password hash
- `google_id` - Google OAuth ID
- `name` - User's name
- `created_at`, `updated_at` - Timestamps

### journal_entries
- `id` - Serial primary key
- `user_id` - Foreign key to users
- `entry_date` - Date of the entry
- `content` - JSONB (ProseMirror format)
- `created_at`, `updated_at` - Timestamps
- Unique constraint: (user_id, entry_date)

## Development

### Backend Development

```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Debugging in VS Code/Cursor

The project includes a complete debugging setup for VS Code and Cursor:

**Quick Start - Debug Full Stack:**
1. Open the project in VS Code/Cursor
2. Press `F5` or go to Run & Debug panel
3. Select "Full Stack (Backend + Frontend)" from the dropdown
4. Click the green play button

This will start both the backend and frontend with debuggers attached.

**Available Debug Configurations:**

- **Backend (Hapi)** - Debug the Node.js backend with breakpoints
- **Frontend (Chrome)** - Debug the Remix frontend in Chrome with React DevTools
- **Frontend (Edge)** - Debug the Remix frontend in Edge
- **Full Stack (Backend + Frontend)** - Debug both simultaneously (recommended)

**Available Tasks (Terminal → Run Task):**

- **Start All Services** - Starts database, backend, and frontend in sequence
- **Start Database** - Starts PostgreSQL via docker-compose
- **Stop Database** - Stops PostgreSQL container
- **Start Backend Dev Server** - Starts backend with nodemon
- **Start Frontend Dev Server** - Starts Remix dev server

**Setting Breakpoints:**

Backend (JavaScript):
- Open any file in `backend/src/`
- Click in the gutter to set a breakpoint
- Run the "Backend (Hapi)" debug configuration
- Make API requests to hit your breakpoints

Frontend (TypeScript/React):
- Open any file in `frontend/app/`
- Set breakpoints in your React components or API calls
- Run the "Frontend (Chrome)" debug configuration
- Interact with the app to hit breakpoints

### Production Build

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
npm start
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://journal_user:journal_password@localhost:5432/journal
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
API_URL=http://localhost:3001
```

## Troubleshooting

**Database connection fails:**
- Check Docker is running: `docker-compose ps`
- Restart the database: `docker-compose restart`

**Backend won't start:**
- Verify .env file exists in backend/
- Check PostgreSQL is accessible on port 5432

**Frontend auth issues:**
- Ensure backend is running
- Check API_URL in frontend matches backend URL
- Clear browser localStorage if needed

**Google OAuth not working:**
- Verify redirect URI matches in Google Console
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env

## License

MIT
