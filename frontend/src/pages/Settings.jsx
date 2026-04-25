import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Settings = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [botTokens, setBotTokens] = useState({
    TELEGRAM_BOT_TOKEN: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const res = await api.config.list();
      const configMap = {};
      res.data.forEach(c => {
        configMap[c.key] = c.value;
      });
      setBotTokens({
        TELEGRAM_BOT_TOKEN: configMap.TELEGRAM_BOT_TOKEN || '',
      });
      setConfigs(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key) => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.config.update({ key, value: botTokens[key] });
      setMessage({ type: 'success', text: `${key.replace(/_/g, ' ')} updated successfully!` });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update ${key}.` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 rounded w-1/4"></div>
          <div className="h-32 bg-zinc-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-8">
        <h1 className="app-page-title text-3xl text-zinc-950">Settings</h1>
        <p className="text-zinc-500 mt-2">Manage your HireFlow configurations and integrations.</p>
      </header>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="app-section-title-sm text-xl text-zinc-950">Telegram Bot Integration</h2>
            <p className="text-sm text-zinc-500 mt-1">Configure your Telegram bots for candidate interaction.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
              <div className="text-blue-600 shrink-0">
                <svg viewBox="0 0 20 20" className="h-6 w-6" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-blue-800">How to get a Telegram Bot Token?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  1. Open <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-bold underline">@BotFather</a> on Telegram.<br />
                  2. Send <code>/newbot</code> and follow instructions.<br />
                  3. Copy the API Token provided and paste it below.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">HR Interview Bot Token</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={botTokens.TELEGRAM_BOT_TOKEN}
                    onChange={(e) => setBotTokens({ ...botTokens, TELEGRAM_BOT_TOKEN: e.target.value })}
                    placeholder="Enter bot token from BotFather"
                    className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  />
                  <button
                    onClick={() => handleSave('TELEGRAM_BOT_TOKEN')}
                    disabled={saving}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-800 transition disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="app-section-title-sm text-xl text-zinc-950">Bot Status</h2>
            <p className="text-sm text-zinc-500 mt-1">Current status of your bot integrations.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Interview Bot</p>
                  <p className="text-xs text-zinc-500">{botTokens.TELEGRAM_BOT_TOKEN ? 'Token Configured' : 'Not Configured'}</p>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${botTokens.TELEGRAM_BOT_TOKEN ? 'bg-green-500' : 'bg-zinc-300'}`}></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
