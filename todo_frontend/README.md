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

## API Contract (assumed)
- GET    /tasks/                 -> returns Task[]
- POST   /tasks/                 -> body { title, completed? } returns created Task
- PUT    /tasks/{id}             -> body { title?, completed? } returns updated Task
- DELETE /tasks/{id}             -> returns 204 No Content

Where Task:
```
{
  id: number,
  title: string,
  completed: boolean
}
```

## Tech
- React 18 (CRA)
- No UI framework, pure CSS

## Notes
- The theme is intentionally light and minimalistic using:
  - primary: #1976D2
  - accent:  #FFB300
  - secondary: #424242
- Content is centered with a header, input on top, and task list below with action buttons (edit, save, cancel, delete; toggle complete).
