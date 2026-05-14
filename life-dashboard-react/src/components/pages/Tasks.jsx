import React, { useState } from 'react'
import { useTaskEngine } from '../../lib/hooks/useTaskEngine'

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f97316', low: '#22c55e' }
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

function TaskCard({ task, onStatus, onDelete }) {
  return (
    <div className="card" style={{ marginBottom: 8, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
          {task.description && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, lineHeight: 1.5 }}>{task.description}</div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLOR[task.priority], textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {task.priority}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{task.mode}</span>
            {task.deadline && (
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>due {task.deadline}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}
          title="Delete"
        >✕</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {task.status !== 'todo' && (
          <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => onStatus(task.id, 'todo')}>← To Do</button>
        )}
        {task.status === 'todo' && (
          <button className="btn btn-secondary" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => onStatus(task.id, 'in_progress')}>Start →</button>
        )}
        {task.status === 'in_progress' && (
          <button className="btn btn-primary" style={{ fontSize: 10, padding: '4px 10px', background: '#22c55e' }} onClick={() => onStatus(task.id, 'done')}>Done ✓</button>
        )}
        {task.status === 'done' && (
          <button className="btn btn-secondary" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => onStatus(task.id, 'in_progress')}>Reopen</button>
        )}
      </div>
    </div>
  )
}

function Tasks() {
  const { engine, refresh } = useTaskEngine()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', mode: 'learning', priority: 'medium', deadline: '' })

  const todo       = engine.getTasksByStatus('todo')
  const inProgress = engine.getTasksByStatus('in_progress')
  const done       = engine.getTasksByStatus('done')

  function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    engine.createTask({
      title: form.title.trim(),
      description: form.description.trim(),
      mode: form.mode,
      priority: form.priority,
      deadline: form.deadline || null,
    })
    setForm({ title: '', description: '', mode: 'learning', priority: 'medium', deadline: '' })
    setShowForm(false)
    refresh()
  }

  function handleStatus(id, status) {
    engine.setStatus(id, status)
    refresh()
  }

  function handleDelete(id) {
    engine.deleteTask(id)
    refresh()
  }

  const inputStyle = { display: 'block', width: '100%', padding: '8px 10px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }
  const labelStyle = { fontSize: 12, color: 'var(--muted)', display: 'block' }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-eyebrow">Execution</div>
        <h1 className="page-title">Tasks</h1>
        <p className="page-sub">Organize, prioritize, and execute</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        {showForm ? (
          <div className="card">
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>
                    Title *
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} autoFocus required />
                  </label>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>
                    Description
                    <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
                  </label>
                </div>
                <label style={labelStyle}>
                  Mode
                  <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} style={{ ...inputStyle, marginTop: 4 }}>
                    <option value="work">Work</option>
                    <option value="learning">Learning</option>
                    <option value="class">Class</option>
                    <option value="personal">Personal</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Priority
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ ...inputStyle, marginTop: 4 }}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Deadline (optional)
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">Add Task</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Task</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {(['todo', 'in_progress', 'done']).map((status) => {
          const tasks = status === 'todo' ? todo : status === 'in_progress' ? inProgress : done
          return (
            <div key={status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted-aa)' }}>
                  {STATUS_LABELS[status]}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 7px' }}>
                  {tasks.length}
                </span>
              </div>
              {tasks.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '12px 0' }}>No tasks</div>
              ) : (
                tasks.map((t) => (
                  <TaskCard key={t.id} task={t} onStatus={handleStatus} onDelete={handleDelete} />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Tasks
