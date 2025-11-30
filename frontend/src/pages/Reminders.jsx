import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn } from '../services/auth';
import Layout from '../components/Layout';
import { Plus, Trash2, Edit2, Check, X, Bell, Pill, Calendar, Droplet, Activity } from 'lucide-react';

const Reminders = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    datetime: '',
    type: 'medication' // medication, appointment, other
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    fetchReminders();
  }, [navigate]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reminders');
      setReminders(response.data.reminders || []);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reminders', formData);
      setShowForm(false);
      resetForm();
      fetchReminders();
    } catch (err) {
      console.error('Create error:', err);
      alert('Failed to create reminder');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/reminders/${editingReminder.id}`, formData);
      setShowForm(false);
      setEditingReminder(null);
      resetForm();
      fetchReminders();
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }
    try {
      await api.delete(`/reminders/${id}`);
      fetchReminders();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete reminder');
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/reminders/${id}/toggle`);
      fetchReminders();
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Failed to toggle reminder');
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      datetime: reminder.datetime ? new Date(reminder.datetime).toISOString().slice(0, 16) : '',
      type: reminder.type || 'medication'
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      datetime: '',
      type: 'medication'
    });
  };

  // Get icon based on reminder type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'medication':
        return <Pill size={24} className="text-blue-400" />;
      case 'appointment':
        return <Calendar size={24} className="text-purple-400" />;
      default:
        return <Activity size={24} className="text-green-400" />;
    }
  };

  // Get color scheme based on type
  const getTypeColors = (type) => {
    switch (type) {
      case 'medication':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          glow: 'shadow-blue-500/20'
        };
      case 'appointment':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          glow: 'shadow-purple-500/20'
        };
      default:
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          text: 'text-green-400',
          glow: 'shadow-green-500/20'
        };
    }
  };

  return (
    <Layout title="Reminders">
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Bell size={32} className="text-primary" />
              </div>
              My Reminders
            </h2>
            <p className="text-slate-400 ml-14">Manage your medications, appointments, and health tasks</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className={`btn px-6 py-3 text-base font-semibold shadow-lg ${showForm ? 'btn-ghost' : 'btn-primary shadow-primary/30'
              }`}
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? 'Cancel' : 'Add Reminder'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/30 text-red-400 px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Modal-style Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass-panel max-w-2xl w-full p-8 shadow-2xl border-2 border-white/20">
              <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                {editingReminder ? <Edit2 className="text-primary" /> : <Plus className="text-primary" />}
                {editingReminder ? 'Edit Reminder' : 'New Reminder'}
              </h3>
              <form onSubmit={editingReminder ? handleUpdate : handleCreate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-slate-300 mb-2 text-sm font-semibold">Title *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="e.g., Take medication"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-2 text-sm font-semibold">Type *</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="medication">💊 Medication</option>
                      <option value="appointment">📅 Appointment</option>
                      <option value="other">🏃 Other Activity</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-300 mb-2 text-sm font-semibold">Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.datetime}
                      onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-300 mb-2 text-sm font-semibold">Description</label>
                    <textarea
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                      rows="3"
                      placeholder="Additional details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-6 border-t-2 border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn btn-ghost px-6 py-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-6 py-3 shadow-lg shadow-primary/30"
                  >
                    {editingReminder ? 'Update Reminder' : 'Create Reminder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Timeline-style Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 && !loading ? (
            <div className="card text-center py-20 border-dashed border-2 border-slate-700 bg-slate-800/30">
              <Bell size={64} className="mx-auto mb-6 opacity-50 text-slate-500" />
              <h3 className="text-2xl font-bold text-white mb-3">No Reminders Yet</h3>
              <p className="text-slate-400 text-lg mb-6">Create your first reminder to get started!</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary px-8 py-3 shadow-lg shadow-primary/30"
              >
                <Plus size={20} />
                Add Your First Reminder
              </button>
            </div>
          ) : (
            reminders.map((reminder) => {
              const colors = getTypeColors(reminder.type);
              return (
                <div
                  key={reminder.id}
                  className={`relative pl-16 pr-6 py-6 rounded-2xl border-2 transition-all hover:scale-[1.02] ${reminder.completed
                      ? 'opacity-60 bg-slate-900 border-slate-700'
                      : `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
                    }`}
                >
                  {/* Timeline Icon */}
                  <div className={`absolute left-6 top-6 p-4 rounded-2xl ${reminder.completed ? 'bg-green-500/20' : colors.bg
                    }`}>
                    {reminder.completed ? (
                      <Check size={28} className="text-green-400" />
                    ) : (
                      getTypeIcon(reminder.type)
                    )}
                  </div>

                  {/* Vertical Timeline Line */}
                  <div className="absolute left-[42px] top-20 bottom-0 w-0.5 bg-slate-700"></div>

                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-xl font-bold ${reminder.completed ? 'line-through text-slate-500' : 'text-white'
                          }`}>
                          {reminder.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${reminder.type === 'medication' ? 'bg-blue-500/20 text-blue-400' :
                            reminder.type === 'appointment' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'
                          }`}>
                          {reminder.type}
                        </span>
                      </div>

                      <p className="text-slate-400 mb-4 leading-relaxed">
                        {reminder.description || 'No description provided'}
                      </p>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar size={16} className={colors.text} />
                          <span className="font-medium">{new Date(reminder.datetime).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(reminder)}
                        className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(reminder.id)}
                        className="p-3 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-xl transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleToggle(reminder.id)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${reminder.completed
                            ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-primary/20 hover:text-primary border-2 border-slate-600'
                          }`}
                      >
                        {reminder.completed ? (
                          <span className="flex items-center gap-2">
                            <Check size={16} /> Done
                          </span>
                        ) : (
                          'Mark Done'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Reminders;