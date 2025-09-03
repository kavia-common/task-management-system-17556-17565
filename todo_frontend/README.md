# To-Do Frontend (React)

Minimalistic, light-themed React UI for the To-Do app. It connects to the backend REST API to create, read, update, and delete tasks.

## Features
- Task creation
- View to-do list
- Mark task as completed
- Edit task title
- Delete task

## Quick start
1. Install dependencies:
   - npm install
2. (Optional) Update Browserslist DB to silence CI warnings:
   - npm run browserslist:update
3. Configure backend URL (optional):
   - copy .env.example to .env
   - adjust REACT_APP_API_URL (default http://localhost:3001)
4. Run:
   - npm start
5. Open:
   - http://localhost:3000

## Configuration
- REACT_APP_API_URL: base URL of the backend (default: http://localhost:3001)

## Tech
- React 18 (CRA)
- No UI framework, pure CSS

## Notes
- The theme is intentionally light and minimalistic using:
  - primary: #1976D2
  - accent:  #FFB300
  - secondary: #424242
