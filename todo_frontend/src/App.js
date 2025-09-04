import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Minimalistic React To-Do app UI that integrates with a backend REST API.
 * Theme colors: primary #1976D2, accent #FFB300, secondary #424242 (applied in CSS variables).
 * Backend URL is read from REACT_APP_API_URL, with a fallback to http://localhost:3001.
 * This version adds "priority" support (High, Medium, Low) with graceful, mocked persistence
 * so the UI works even if the backend doesn't yet store the new field.
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Priority constants and helpers
const PRIORITIES = ['High', 'Medium', 'Low'];

/**
 * Returns a normalized priority value. Defaults to 'Medium' if missing/invalid.
 * @param {string | undefined | null} value
 * @returns {'High' | 'Medium' | 'Low'}
 */
function normalizePriority(value) {
  return PRIORITIES.includes(value) ? value : 'Medium';
}

/**
 * Try to merge priority into an existing task using local cache (mock).
 * If the backend doesn't return 'priority', we fall back to a client-side map.
 */
const PriorityCache = {
  // in-memory map id -> priority
  map: new Map(),
  get(id, fallback) {
    return this.map.get(id) ?? normalizePriority(fallback);
  },
  set(id, priority) {
    this.map.set(id, normalizePriority(priority));
  },
  apply(task, fallback) {
    const p = task?.priority ?? this.get(task?.id, fallback);
    return { ...task, priority: normalizePriority(p) };
  },
};

// Types
/**
 * @typedef {Object} Task
 * @property {number} id
 * @property {string} title
 * @property {boolean} completed
 * @property {'High'|'Medium'|'Low'} [priority]
 */

// Helpers
async function httpJson(url, options = {}) {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${msg || resp.statusText}`);
  }
  // Some deletes may return empty
  if (resp.status === 204) return null;
  return resp.json();
}

// PUBLIC_INTERFACE
function App() {
  const [tasks, setTasks] = useState(/** @type {Task[]} */([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingPriority, setEditingPriority] = useState('Medium');
  const [theme] = useState('light'); // locked to light per requirement

  // Apply light theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  // Load tasks on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    httpJson(`${API_URL}/tasks/`)
      .then((data) => {
        if (!mounted) return;
        const list = (Array.isArray(data) ? data : []).map((t) => {
          // Merge priority from backend or local cache; default to Medium
          const merged = PriorityCache.apply(t, 'Medium');
          // Keep cache updated
          if (merged?.id != null) PriorityCache.set(merged.id, merged.priority);
          return merged;
        });
        setTasks(list);
      })
      .catch((e) => mounted && setError(`Failed to load tasks: ${e.message}`))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const hasTasks = useMemo(() => tasks && tasks.length > 0, [tasks]);

  // PUBLIC_INTERFACE
  async function createTask(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setError('');
    try {
      // Send priority if backend supports it; harmless if ignored
      const body = { title, completed: false, priority: normalizePriority(newPriority) };
      const createdRaw = await httpJson(`${API_URL}/tasks/`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      // Apply mock priority if backend doesn't return it
      const created = PriorityCache.apply(createdRaw, newPriority);
      if (created?.id != null) PriorityCache.set(created.id, created.priority);

      setTasks((prev) => [created, ...prev]);
      setNewTitle('');
      setNewPriority('Medium');
    } catch (e) {
      setError(`Create failed: ${e.message}`);
    }
  }

  // PUBLIC_INTERFACE
  async function toggleComplete(task) {
    setError('');
    try {
      const updatedRaw = await httpJson(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT',
        // keep priority in payload so it persists if backend supports it
        body: JSON.stringify({ completed: !task.completed, priority: task.priority }),
      });
      const updated = PriorityCache.apply(updatedRaw, task.priority);
      if (updated?.id != null) PriorityCache.set(updated.id, updated.priority);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      setError(`Update failed: ${e.message}`);
    }
  }

  // PUBLIC_INTERFACE
  function startEdit(task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingPriority(task.priority || 'Medium');
  }

  // PUBLIC_INTERFACE
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle('');
    setEditingPriority('Medium');
  }

  // PUBLIC_INTERFACE
  async function saveEdit(taskId) {
    const title = editingTitle.trim();
    if (!title) return;
    setError('');
    try {
      const body = { title, priority: normalizePriority(editingPriority) };
      const updatedRaw = await httpJson(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const updated = PriorityCache.apply(updatedRaw, editingPriority);
      if (updated?.id != null) PriorityCache.set(updated.id, updated.priority);

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      cancelEdit();
    } catch (e) {
      setError(`Save failed: ${e.message}`);
    }
  }

  // PUBLIC_INTERFACE
  async function deleteTask(taskId) {
    setError('');
    try {
      await httpJson(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      PriorityCache.map.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {
      setError(`Delete failed: ${e.message}`);
    }
  }

  function PriorityBadge({ priority }) {
    const p = normalizePriority(priority);
    const cls =
      p === 'High' ? 'priority-badge priority-high' :
      p === 'Low' ? 'priority-badge priority-low' :
      'priority-badge priority-medium';
    return <span className={cls} aria-label={`Priority ${p}`}>{p}</span>;
  }

  return (
    <div className="App">
      <header className="header">
        <div className="header__content">
          <h1 className="header__title">To-Do</h1>
          <p className="header__subtitle">Minimal, fast, and focused</p>
        </div>
      </header>

      <main className="content">
        <section className="card">
          <form className="task-input" onSubmit={createTask}>
            <input
              type="text"
              className="input"
              placeholder="Add a new task..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              aria-label="Task title"
            />
            <select
              className="select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              aria-label="Task priority"
              title="Priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={!newTitle.trim()}>
              Add
            </button>
          </form>

          {error && <div className="alert">{error}</div>}
          {loading && <div className="muted">Loading...</div>}

          {!loading && !hasTasks && <div className="empty">No tasks yet. Add your first one!</div>}

          <ul className="task-list" role="list">
            {tasks.map((task) => {
              const isEditing = editingId === task.id;
              return (
                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <div className="task-main">
                    <button
                      type="button"
                      className={`chip ${task.completed ? 'chip-complete' : 'chip-open'}`}
                      onClick={() => toggleComplete(task)}
                      aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {task.completed ? '✔' : '○'}
                    </button>

                    {isEditing ? (
                      <>
                        <input
                          className="input input-inline"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(task.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <select
                          className="select select-inline"
                          value={editingPriority}
                          onChange={(e) => setEditingPriority(e.target.value)}
                          aria-label="Edit task priority"
                          title="Priority"
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <span className="task-title">{task.title}</span>
                        <PriorityBadge priority={task.priority} />
                      </>
                    )}
                  </div>

                  <div className="task-actions">
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => saveEdit(task.id)}
                          aria-label="Save"
                        >
                          Save
                        </button>
                        <button className="btn btn-small btn-ghost" onClick={cancelEdit} aria-label="Cancel">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-small btn-ghost" onClick={() => startEdit(task)} aria-label="Edit">
                          Edit
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => deleteTask(task.id)}
                          aria-label="Delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <span className="muted">API: {API_URL}</span>
      </footer>
    </div>
  );
}

export default App;
