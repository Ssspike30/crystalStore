# Project Guidelines

## Tech Stack
- **Frontend**: WeChat Mini-Program (TypeScript + Native API)
- **Backend**: Node.js (recommended for integration)
- **Package Manager**: npm for both frontend and backend

## Project Structure
- `frontend/miniprogram/` - WeChat mini-program source
- `backend/` - API server
- `docs/` - Architecture and API docs

## Frontend: Build and Test
```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Preview in WeChat DevTools
npm run preview
```

## Backend: Build and Test
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Run tests
npm test

# Production build
npm run build
```

Agents will attempt to run these commands automatically for build and test operations.

## WeChat Development Standards
- Use TypeScript for type safety
- Follow WXML/WXSS conventions
- Always use HTTPS for backend APIs
- Register backend domain in WeChat Official Account
- Handle network timeouts and wx.request() properly
- Manage lifecycle clean-up in onUnload()

## Key Files
- app.json - App configuration and permissions
- project.config.json - WeChat DevTools settings
- Backend domain must be registered in WeChat backend settings

## Common Pitfalls
1. Network requests fail if backend domain not registered
2. HTTPS required (HTTP fails silently)
3. Session management requires proper token validation
4. Memory leaks if async callbacks aren't cleaned up
5. Storage limited to 10MB per domain