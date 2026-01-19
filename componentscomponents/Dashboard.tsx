
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Domain, UserProgress } from '../types';
import { DOMAIN_INFO, CURRICULUM } from '../data/curriculum';
import { GoogleGenAI } from "@google/genai";
import { createOnDemandSession, queryOnDemand } from '../services/onDemandService';

interface DashboardProps {
  user: { name: string };
  progress: UserProgress;
  onSelectDomain: (domain: Domain, language: string, level: string) => void;
  onNavigateInterview: () => void;
  onNavigateMentor: () => void;
  onNavigateAnalyzer: () => void;
  onNavigateJobMatch: () => void;
  onNavigateTechScout: () => void;
  onNavigateMockAssessment: () => void;
  onNavigateCodeChallenge: () => void;
  onLogout: () => void;
  onUpdatePrefs: () => void;
}

const MOTIVATION_API_KEY = "pfauKRrs2jWzy7KjGZQcgc6dYgxdPdE9";
const MOTIVATION_PROMPT = "You are the Career Motivation Engine for an AI-powered placement preparation platform. Objective: Generate short, high-energy motivational quotes that reset a student’s mindset before technical or HR interviews. User Context: Students may be stressed from coding practice, discouraged by rejections, or mentally fatigued. Tone: Empathetic, ambitious, professional, and tech-forward. Length Constraint: Each quote must be 15 words or fewer. Themes to Emphasize: Consistency over intensity, Growth mindset, Debugging failures like runtime errors, Discipline, preparation, and long-term success. Strict Constraints: Do not use generic clichés (e.g., “Just do it”, “Never give up”), Use technology-inspired language where relevant, Output only the quote, no explanations or emojis";

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  progress, 
  onSelectDomain, 
  onNavigateInterview, 
  onNavigateMentor,
  onNavigateAnalyzer,
  onNavigateJobMatch,
  onNavigateTechScout,
  onNavigateMockAssessment,
  onNavigateCodeChallenge,
  onLogout,
  onUpdatePrefs
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Motivation State
  const [motivation, setMotivation] = useState<string>("Loading your daily focus...");
  const [isMotivationLoading, setIsMotivationLoading] = useState(false);

  const fetchMotivation = async () => {
    setIsMotivationLoading(true);
    try {
      const sid = await createOnDemandSession(user.name, MOTIVATION_API_KEY);
      const quote = await queryOnDemand(sid, "Give me a motivation quote for today.", MOTIVATION_API_KEY, {
        fulfillmentPrompt: MOTIVATION_PROMPT,
        temperature: 0.6,
        maxTokens: 50
      });
      setMotivation(quote || "Consistency is the key to mastering your career path.");
    } catch (e) {
      console.error("Motivation Error:", e);
      setMotivation("Success is the sum of small efforts, repeated day-in and day-out.");
    } finally {
      setIsMotivationLoading(false);
    }
  };

  useEffect(() => {
    fetchMotivation();
  }, [user.name]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;
    
    const userText = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsSending(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userText,
        config: {
          systemInstruction: "You are PrepTrack AI's Site Assistant. You help students with placement preparation queries, navigating the app, and technical doubts. Keep responses concise and helpful."
        }
      });
      
      const botText = response.text || "I'm sorry, I couldn't process that request right now.";
      setChatHistory(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setChatHistory(prev => [...prev, { role: 'bot', text: "Error connecting to AI service. Please check your connection." }]);
    } finally {
      setIsSending(false);
    }
  };

  const activeTracks = useMemo(() => {
    const prefs = progress.preferences;
    if (!prefs) return [];

    return CURRICULUM.filter(path => {
      if (!progress.activeDomains.includes(path.domain)) return false;
      
      const config = prefs.configs[path.domain];
      if (!config) return false;

      const userLevel = config.level || 'Beginner';
      if (path.level.toLowerCase() !== userLevel.toLowerCase()) return false;

      if (path.domain === 'ML') {
        const selectedFrameworks = config.libraries || [];
        return selectedFrameworks.includes(path.languageOrTech);
      }
      
      const userLanguage = config.language || '';
      return path.languageOrTech.toLowerCase() === userLanguage.toLowerCase();
    });
  }, [progress.activeDomains, progress.preferences]);

  const totalPossibleTopics = activeTracks.reduce((acc, curr) => acc + curr.topics.length, 0);
  const totalCompletedTopics = progress.completedTopicIds.length;
  const globalCompletionRate = totalPossibleTopics > 0 
    ? Math.round((totalCompletedTopics / totalPossibleTopics) * 100) 
    : 0;

  return (
    <div className="flex-1 flex flex-col animate-pop-up relative z-10">
      <header className="bg-white/10 backdrop-blur-xl border-b border-white/10 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-black shadow-lg">P</div>
          <span className="font-black text-xl text-white tracking-tight">PrepTrack AI</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onUpdatePrefs} className="hidden md:flex items-center gap-2 text-xs font-black text-white/70 uppercase tracking-widest hover:text-white px-4 py-2 rounded-xl transition-all">Preferences</button>
          <div className="w-[1px] h-6 bg-white/10 hidden md:block"></div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-white leading-none">{user.name}</p>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-1">Student Elite</p>
            </div>
            <button 
              onClick={onLogout} 
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 transition-all border border-white/5 hover:border-red-500/20"
              title="Logout and reset session"
            >
              <span className="text-[10px] font-black text-white/50 group-hover:text-red-400 uppercase tracking-widest hidden sm:inline">Logout</span>
              <svg className="w-5 h-5 text-white/50 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="p-8 lg:p-12 max-w-7xl mx-auto w-full space-y-12">
        <section className="animate-pop-up stagger-1">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight">Ready for your shift, {user.name.split(' ')[0]}?</h2>
              <p className="text-white/60 font-medium text-lg mt-2">Manage your individualized <span className="text-indigo-400 font-black">Performance Tracks</span></p>
            </div>
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-4 rounded-3xl border-2 border-white/40 shadow-2xl flex items-center gap-8">
               <div>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Status</p>
                  <p className="text-2xl font-black text-white tracking-tighter">Active</p>
               </div>
               <div className="w-[1px] h-10 bg-white/20"></div>
               <div>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Mastery</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{globalCompletionRate}%</p>
               </div>
            </div>
          </div>
        </section>

        {/* MOTIVATION SECTION */}
        <section className="animate-pop-up stagger-1.5 overflow-hidden">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-2xl overflow-hidden">
               <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0 animate-pulse">⚡</div>
               <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 block">Career Motivation Engine</span>
                  <p className={`text-xl md:text-2xl font-black text-white tracking-tight italic transition-all duration-700 ${isMotivationLoading ? 'opacity-30 blur-sm' : 'opacity-100 blur-0'}`}>
                    "{motivation}"
                  </p>
               </div>
               <button 
                onClick={fetchMotivation}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
                title="Refresh Motivation"
               >
                 <svg className={`w-5 h-5 text-white/30 group-hover:text-white transition-transform ${isMotivationLoading ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                 </svg>
               </button>
            </div>
          </div>
        </section>

        <section className="animate-pop-up stagger-2">
          <div className="items-center justify-between mb-8 flex">
            <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-widest">Active Learning Tracks</h3>
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{activeTracks.length} Specialized Paths</span>
          </div>
          {activeTracks.length === 0 ? (
            <div className="bg-white/5 border-2 border-white/10 rounded-[2.5rem] p-20 text-center space-y-4">
              <div className="text-5xl">🧭</div>
              <h4 className="text-2xl font-black text-white">No Tracks Found</h4>
              <p className="text-white/40 max-w-md mx-auto">Try adjusting your preferences to see learning modules.</p>
              <button onClick={onUpdatePrefs} className="px-8 py-3 bg-white text-indigo-900 font-black rounded-2xl uppercase text-[10px] tracking-widest mt-4">Update Preferences</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTracks.map((path) => {
                const info = DOMAIN_INFO[path.domain];
                const completedInTrack = path.topics.filter(t => progress.completedTopicIds.includes(t.id)).length;
                const trackRate = path.topics.length > 0 ? Math.round((completedInTrack / path.topics.length) * 100) : 0;
                
                return (
                  <button 
                    key={path.id}
                    onClick={() => onSelectDomain(path.domain, path.languageOrTech, path.level)}
                    className="bg-gradient-to-br from-indigo-600 to-purple-700 border-2 border-white/50 p-8 rounded-[2.5rem] hover:scale-[1.03] transition-all group text-left relative overflow-hidden flex flex-col h-full shadow-xl"
                  >
                    <div className="text-4xl mb-4 relative drop-shadow-lg">{info.icon}</div>
                    <div className="mb-auto relative">
                      <h4 className="text-xl font-black text-white leading-tight mb-1">{info.title}</h4>
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-3">{path.languageOrTech}</p>
                      <p className="text-sm text-white/70 font-medium leading-relaxed">
                        Master {path.topics.length} modules for {path.level} level.
                      </p>
                    </div>
                    <div className="mt-8 space-y-3 relative">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{trackRate}% Mastery</span>
                         <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md border border-white/10">{path.level}</span>
                      </div>
                      <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                         <div className="h-full bg-white transition-all duration-700" style={{ width: `${trackRate}%` }}></div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="pt-12 border-t border-white/10 animate-pop-up stagger-3">
          <div className="mb-10 text-center">
            <h3 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Final Assessment Labs</h3>
            <p className="text-white/50 font-medium">Standardized tools for the ultimate hiring edge.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <button onClick={onNavigateMockAssessment} className="bg-gradient-to-br from-indigo-700 to-emerald-800 border-2 border-white/50 p-10 rounded-[3rem] text-left hover:scale-[1.02] transition-all shadow-2xl group relative overflow-hidden">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 relative border border-white/20">📝</div>
              <h4 className="text-white text-3xl font-black mb-4 relative tracking-tight uppercase">AI Mock Assessment</h4>
              <p className="text-white/60 mb-8 font-medium leading-relaxed relative">Adaptive 5-question technical audits with detailed analysis and suggestions.</p>
              <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest relative">Take Assessment</div>
            </button>

            <button onClick={onNavigateInterview} className="bg-gradient-to-br from-purple-800 to-indigo-900 border-2 border-white/50 p-10 rounded-[3rem] text-left hover:scale-[1.02] transition-all shadow-2xl group relative overflow-hidden">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 relative border border-white/20">🤖</div>
              <h4 className="text-white text-3xl font-black mb-4 relative tracking-tight uppercase">Interview Simulator</h4>
              <p className="text-white/60 mb-8 font-medium leading-relaxed relative">Live video simulations with AI speech synthesis and transcript tracking.</p>
              <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest relative">Launch Pro Lab</div>
            </button>

            <button onClick={onNavigateMentor} className="bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/50 p-10 rounded-[3rem] text-left hover:scale-[1.02] transition-all shadow-2xl group relative overflow-hidden">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 relative border border-white/20">🗺️</div>
              <h4 className="text-white text-3xl font-black mb-4 relative tracking-tight uppercase">Road Map Architect</h4>
              <p className="text-white/60 mb-8 font-medium leading-relaxed relative">Build a personalized multi-month strategy for high-stakes hiring.</p>
              <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest relative">Build Plan</div>
            </button>

            <button onClick={onNavigateAnalyzer} className="bg-gradient-to-br from-indigo-600 to-purple-800 border-2 border-white/50 p-10 rounded-[3rem] text-left hover:scale-[1.02] transition-all shadow-2xl group relative overflow-hidden">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 relative border border-white/20">📄</div>
              <h4 className="text-white text-3xl font-black mb-4 relative tracking-tight uppercase">Resume Analyzer</h4>
              <p className="text-white/60 mb-8 font-medium leading-relaxed relative">Audit your resume with ATS-grade intelligence for target roles.</p>
              <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest relative">Audit Resume</div>
            </button>

            <button onClick={onNavigateJobMatch} className="bg-gradient-to-br from-emerald-600 to-teal-800 border-2 border-white/50 p-10 rounded-[3rem] text-left hover:scale-[1.02] transition-all shadow-2xl group relative overflow-hidden">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 relative border border-white/20">🔍</div>
              <h4 className="text-white text-3xl font-black mb-4 relative tracking-tight uppercase">AI JobMatch</h4>
              <p className="text-white/60 mb-8 font-medium leading-relaxed relative">Instantly discover relevant career opportunities matched to your profile.</p>
              <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest relative">Find Matches</div>
            </button>

            <button onClick={onNavigateTechScout} className="bg-gradient-to-br from-cyan-600 to-blue-800 border-2 border-white/50 p-10 rounded-[3rem] text-left hover:scale-[1.02] transition-all shadow-2xl group relative overflow-hidden">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 relative border border-white/20">📰</div>
              <h4 className="text-white text-3xl font-black mb-4 relative tracking-tight uppercase">TechScout</h4>
              <p className="text-white/60 mb-8 font-medium leading-relaxed relative">Stay ahead with intelligent summaries of trending tech news and learning resources.</p>
              <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest relative">Explore Trends</div>
            </button>

            <button onClick={onNavigateCodeChallenge} className="bg-gradient-to-br from-red-600 to-orange-800 border-2 border-white/50 p-10 rounded-[3rem] text-left hover:scale-[1.02] transition-all shadow-2xl group relative overflow-hidden">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 relative border border-white/20">💻</div>
              <h4 className="text-white text-3xl font-black mb-4 relative tracking-tight uppercase">Code Challenge</h4>
              <p className="text-white/60 mb-8 font-medium leading-relaxed relative">High-stakes timed coding assessments with detailed logical evaluation.</p>
              <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest relative">Start Challenge</div>
            </button>
          </div>
        </section>
      </main>

      {/* CHATBOT INTEGRATION */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{ 
            background: '#4285f4', 
            color: 'white', 
            border: 'none', 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            cursor: 'pointer', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', 
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          className="hover:scale-110 active:scale-95"
        >
          {isChatOpen ? '✕' : '💬'}
        </button>
        
        {isChatOpen && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            width: '320px', 
            height: '450px', 
            background: '#1e293b', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '24px', 
            position: 'absolute', 
            bottom: '80px', 
            right: 0, 
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ background: '#4285f4', color: 'white', padding: '20px', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PrepTrack AI Assistant
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scroll">
              {chatHistory.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: '20px' }}>
                  Ask me anything about your placement preparation!
                </div>
              )}
              {chatHistory.map((chat, idx) => (
                <div key={idx} style={{ 
                  alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                  background: chat.role === 'user' ? '#4285f4' : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  padding: '10px 14px',
                  borderRadius: chat.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                  maxWidth: '85%',
                  lineHeight: '1.5',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                  {chat.text}
                </div>
              ))}
              {isSending && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '16px 16px 16px 0', color: 'rgba(255,255,255,0.5)' }}>
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.1)' }}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a question..." 
                  style={{ 
                    flex: 1, 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    padding: '10px 14px', 
                    borderRadius: '12px', 
                    outline: 'none', 
                    background: 'rgba(255,255,255,0.03)', 
                    color: 'white',
                    fontSize: '13px'
                  }}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isSending || !chatInput.trim()}
                  style={{ 
                    background: '#4285f4', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0 16px', 
                    borderRadius: '12px', 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    opacity: isSending || !chatInput.trim() ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  className="hover:brightness-110 active:scale-95"
                >
                  Send
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
