# VS Code/Cursor Debug Configuration

This directory contains VS Code/Cursor configuration files for debugging the Journal application.

## Files

- **launch.json** - Debug configurations for backend and frontend
- **tasks.json** - Automated tasks for starting services
- **settings.json** - Project-specific editor settings
- **extensions.json** - Recommended extensions

## Quick Start

### Option 1: Using the Debug Panel (Recommended)

1. Press `F5` or click the Debug icon in the sidebar
2. Select **"Full Stack (Backend + Frontend)"** from the dropdown
3. Click the green play button or press `F5`

This will:
- Start the backend with Node.js debugger attached
- Start the frontend dev server
- Open Chrome with the frontend app
- Attach debuggers to both

### Option 2: Using Tasks

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Tasks: Run Task"
3. Select **"Start All Services"**

This will start the database, backend, and frontend in sequence.

## Debug Configurations

### Backend (Hapi)
- **Type**: Node.js debugger
- **Entry Point**: `backend/src/index.js`
- **Features**:
  - Automatic restart on file changes
  - Environment variables loaded from `.env`
  - Source maps enabled
  - Skip Node.js internals

**Usage:**
```javascript
// backend/src/routes/auth.js
export default authRoutes = [
  {
    handler: async (request, h) => {
      debugger; // This breakpoint will pause execution
      const { email } = request.payload;
      // ... rest of code
    }
  }
];
```

### Frontend (Chrome/Edge)
- **Type**: Browser debugger
- **URL**: http://localhost:3000
- **Features**:
  - Source maps for TypeScript
  - React DevTools integration
  - Hot Module Replacement (HMR)

**Usage:**
```typescript
// frontend/app/routes/login.tsx
export default function Login() {
  const handleSubmit = async (e: React.FormEvent) => {
    debugger; // This breakpoint will pause in Chrome DevTools
    await login(email, password);
  };
  // ... rest of code
}
```

### Full Stack (Compound)
- Launches both backend and frontend debuggers simultaneously
- Stops both when you stop debugging
- Ideal for debugging API calls from frontend to backend

## Tasks

Access tasks via `Terminal → Run Task` or `Cmd+Shift+P` → "Tasks: Run Task"

### Start All Services
Runs in sequence:
1. Starts PostgreSQL container
2. Starts backend dev server (nodemon)
3. Starts frontend dev server (Vite)

### Individual Service Tasks
- **Start Database** - `docker-compose up -d`
- **Stop Database** - `docker-compose down`
- **Start Backend Dev Server** - `npm run dev` in backend/
- **Start Frontend Dev Server** - `npm run dev` in frontend/

## Tips & Tricks

### Debugging API Calls

1. Set a breakpoint in the frontend API call:
   ```typescript
   // frontend/app/utils/api.ts
   async login(email: string, password: string) {
     debugger; // Pause before sending request
     const response = await this.request('/api/login', { ... });
   }
   ```

2. Set a breakpoint in the backend handler:
   ```javascript
   // backend/src/routes/auth.js
   handler: async (request, h) => {
     debugger; // Pause when request arrives
     const { email, password } = request.payload;
   }
   ```

3. Step through the entire flow from frontend → backend → frontend

### Debugging Database Queries

```javascript
// backend/src/routes/entries.js
handler: async (request, h) => {
  const result = await pool.query(
    'SELECT * FROM journal_entries WHERE user_id = $1',
    [userId]
  );
  debugger; // Inspect the result
  return result.rows;
}
```

### Conditional Breakpoints

Right-click on a breakpoint and select "Edit Breakpoint" to add conditions:

```typescript
// Only break when specific email is used
email === 'debug@example.com'

// Only break on errors
error !== null
```

### Logpoints

Instead of adding `console.log`, right-click in the gutter and select "Add Logpoint":

```
User logged in: {email}
Entry count: {result.rows.length}
```

## Recommended Extensions

The `extensions.json` file recommends these extensions:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Error Lens** - Inline error messages
- **Path Intellisense** - Autocomplete for file paths
- **Docker** - Docker container management

Install them via: `Cmd+Shift+P` → "Extensions: Show Recommended Extensions"

## Troubleshooting

### Breakpoints not hitting in backend

1. Ensure you're running the "Backend (Hapi)" debug configuration
2. Check that the backend is running on port 3001
3. Verify `.env` file exists in `backend/`
4. Try restarting the debugger

### Breakpoints not hitting in frontend

1. Ensure you're running "Frontend (Chrome)" configuration
2. Check that source maps are enabled (they are by default)
3. Clear browser cache and restart
4. Make sure you're setting breakpoints in `.tsx` files, not compiled `.js`

### "Cannot connect to runtime process" error

1. Make sure the dev server is running
2. Check if another process is using port 3000 or 3001
3. Restart VS Code/Cursor
4. Run `docker-compose ps` to verify database is running

### Frontend dev server not starting automatically

The task may not have waited long enough. Manually start it:
```bash
cd frontend && npm run dev
```

Then attach the debugger using "Frontend (Chrome)" configuration.

## Environment Variables

The debugger loads environment variables from:
- Backend: `backend/.env`
- Frontend: Uses values from `frontend/.env` (optional)

Make sure these files exist before debugging. Copy from `.env.example` if needed.
