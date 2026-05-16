import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Send, Image as ImageIcon, Camera, Loader2, ZoomIn, Info, Trash2, MessageCircle, AlertCircle } from 'lucide-react';



interface Question {
  id: string;
  user: string;
  question: string;
  image: string; // Base64 encoded string from Go
  contentType: string;
}

interface ImageResponse {
  id: string;
  questionId: string;
  questionNumber: string;
  response: string;
  createdAt: string;
  firstPulledAt?: string;
  lastPulledAt?: string;
}

const ImageMode: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [responses, setResponses] = useState<ImageResponse[]>([]);
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'single' | 'all', id?: string, user?: string } | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions(1, true);
  }, []);

  useEffect(() => {
    if (selectedQuestion) {
      fetchResponses(selectedQuestion.id);
      setStatus('idle');
    } else {
      setResponses([]);
    }
  }, [selectedQuestion]);

  const fetchQuestions = async (pageNum: number, isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await axios.get(`${API_URL}/api/image/questions?page=${pageNum}&limit=6`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const newQs = res.data || [];
      if (isInitial) {
        setQuestions(newQs);
      } else {
        setQuestions(prev => [...prev, ...newQs]);
      }
      setHasMore(newQs.length === 6);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch questions', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchResponses = async (questionId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/image/response/id/${questionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setResponses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch responses', err);
    }
  };

  const handleSendResponse = async () => {
    if (!selectedQuestion || !response.trim()) return;
    setSending(true);
    setStatus('idle');
    try {
      await axios.post(`${API_URL}/api/image/response`, {
        questionId: selectedQuestion.id,
        questionNumber: selectedQuestion.question,
        response: response
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setResponse('');
      fetchResponses(selectedQuestion.id);
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
        await axios.delete(`${API_URL}/api/image/questions/${confirmDelete.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setQuestions(questions.filter(q => q.id !== confirmDelete.id));
        if (selectedQuestion?.id === confirmDelete.id) setSelectedQuestion(null);
      } else if (confirmDelete.type === 'all' && confirmDelete.user) {
        const userQuestions = questions.filter(q => q.user === confirmDelete.user);
        for (const q of userQuestions) {
          await axios.delete(`${API_URL}/api/image/questions/${q.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        }
        setQuestions(questions.filter(q => q.user !== confirmDelete.user));
        if (selectedQuestion?.user === confirmDelete.user) setSelectedQuestion(null);
      }
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete failed');
    }
  };

  const handleDeleteResponse = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/api/image/responses/${id}`, {
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

  // Calculate First and Last timestamps for the selected question's user/id
  const firstTime = responses.length > 0 ? new Date(Math.min(...responses.map(r => new Date(r.createdAt).getTime()))).toLocaleString() : 'N/A';
  const lastTime = responses.length > 0 ? new Date(Math.max(...responses.map(r => new Date(r.createdAt).getTime()))).toLocaleString() : 'N/A';

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 lg:gap-8 h-auto lg:h-full relative">
      {/* Fullscreen Overlay */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setFullScreenImage(null)}
        >
          <img 
            src={fullScreenImage} 
            alt="Fullscreen Preview" 
            className="max-w-[95vw] max-h-[95vh] object-contain shadow-2xl ring-1 ring-white/10 rounded-lg animate-in zoom-in-95 duration-300"
          />
          <div className="absolute top-8 right-8 text-white/50 hover:text-white flex items-center gap-2 font-mono text-sm">
            <ZoomIn className="w-4 h-4" />
            Click anywhere to exit
          </div>
        </div>
      )}
      {/* Sidebar: Question Grid */}
      <div className="flex-none lg:col-span-1 flex flex-col space-y-4 h-auto lg:h-full min-h-0 min-w-0 w-full">
        <div className="flex justify-between items-center px-2 shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            Captured Screens
          </h2>
          {selectedQuestion && (
            <button 
              onClick={() => setConfirmDelete({ type: 'all', user: selectedQuestion.user })}
              className="text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-900/50 px-2 py-1 rounded bg-red-500/10 transition-all"
            >
              Clear User
            </button>
          )}
        </div>
        <div className="lg:flex-1 flex flex-col min-h-0 min-w-0 w-full">
          <div className="w-full flex flex-row lg:grid lg:grid-cols-2 overflow-x-auto overflow-y-hidden lg:overflow-x-hidden lg:overflow-y-auto pr-2 custom-scrollbar gap-4 pb-4 lg:content-start snap-x">
            {questions.map((q) => (
              <div key={q.id} className="w-[200px] lg:w-full shrink-0 snap-start">
                <div
                  onClick={() => setSelectedQuestion(q)}
                  className={`relative w-full aspect-square rounded-xl cursor-pointer overflow-hidden transition-all border-2 group ${
                  selectedQuestion?.id === q.id
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <img
                  src={`data:${q.contentType};base64,${q.image}`}
                  alt="Question"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                  <p className="text-[10px] font-bold text-white truncate w-full">{q.user}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'single', id: q.id }); }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded shadow-lg transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            ))}

            {hasMore && (
              <div className="w-[200px] lg:w-full shrink-0 snap-start lg:col-span-2 flex">
                <button
                  onClick={() => fetchQuestions(page + 1)}
                  disabled={loadingMore}
                  className="w-full h-[200px] lg:h-auto py-3 text-sm font-medium text-slate-400 bg-slate-800/20 border border-slate-700/50 rounded-xl hover:bg-slate-800/40 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loadingMore ? 'Loading...' : 'Load More Screenshots'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Area: Image Preview & Response */}
      <div className="lg:col-span-3 space-y-6 flex flex-col h-auto lg:h-full">
        {selectedQuestion ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-slate-700 gap-4">
              <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 relative shrink-0">
                  <ImageIcon className="w-6 h-6" />
                  {status === 'success' && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 animate-pulse border-2 border-slate-900" />}
                  {status === 'error' && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-slate-900" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-white truncate">Question: <span className="text-indigo-400">{selectedQuestion.question}</span></h3>
                  <div className="flex flex-wrap gap-2 md:gap-4 mt-1">
                    <p className="text-[10px] text-slate-400">User: <span className="text-slate-200 font-medium">{selectedQuestion.user}</span></p>
                    <p className="text-[10px] text-slate-500">First: <span className="text-slate-300">{firstTime}</span></p>
                    <p className="text-[10px] text-slate-500">Last: <span className="text-slate-300">{lastTime}</span></p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-lg text-xs text-slate-400 border border-slate-700 shrink-0">
                <Info className="w-3.5 h-3.5" />
                Original Resolution
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0 mb-6">
              {/* Left: Image */}
              <div className="flex flex-col min-h-0">
                <label className="block text-sm font-medium text-slate-300 mb-2">Screenshot Preview (Click to expand)</label>
                <div 
                  className="h-[300px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center group relative cursor-zoom-in"
                  onClick={() => setFullScreenImage(`data:${selectedQuestion.contentType};base64,${selectedQuestion.image}`)}
                >
                  <img
                    src={`data:${selectedQuestion.contentType};base64,${selectedQuestion.image}`}
                    alt="Screenshot"
                    className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-all" />
                </div>
              </div>

              {/* Right: History */}
              <div className="flex flex-col min-h-0">
                <label className="block text-sm font-medium text-slate-300 mb-2">Response History (Pre-text)</label>
                <div className="h-[300px] bg-slate-900/50 border border-slate-800 rounded-xl overflow-y-auto custom-scrollbar no-scrollbar p-4 space-y-4">
                  {responses.length > 0 ? (
                    responses.map((res) => (
                      <div key={res.id} className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg group">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-[10px] text-slate-500 font-mono">
                            <div>Submitted: {new Date(res.createdAt).toLocaleString()}</div>
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
                <label className="block text-sm font-medium text-slate-300">Submit Solution</label>
                {status !== 'idle' && (
                  <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className={`w-2 h-2 rounded-full ${status === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className={`text-[10px] font-bold ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {status === 'success' ? 'SENT SUCCESSFULLY' : 'FAILED TO SEND'}
                    </span>
                  </div>
                )}
              </div>
              <div className="relative">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Analyze the screenshot and provide the correct answer..."
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
              <ImageIcon className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-300">Select a Screenshot</h3>
            <p className="text-slate-500 max-w-xs mt-2">Pick an image from the gallery to analyze it and provide a response.</p>
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
                ? `This will permanently delete ALL questions and responses for user "${confirmDelete.user}".` 
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

export default ImageMode;
