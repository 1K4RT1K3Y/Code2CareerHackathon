'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  Play,
  Plus,
  Send,
  Sparkles,
  Target,
  Trophy,
  UserCircle,
  X,
  Zap,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { InterviewEvaluation, Syllabus } from '@/lib/schemas';
import QuizModal from '@/components/quiz-modal';

type View = 'Overview' | 'My learning path' | 'AI tutor' | 'Mock interview' | 'Progress';
type LearningModule = Syllabus['modules'][number];
type TutorMessage = { id: string; role: 'user' | 'assistant'; content: string };

type ModuleProgress = { id: string; title: string; estimatedHours: number; complete: boolean };

const samplePath: Syllabus = {
  roleTitle: 'Machine Learning Engineer',
  estimatedWeeks: 8,
  modules: [
    {
      moduleId: 'mod_1',
      title: 'Python, Data & ML Foundations',
      objective: 'Build a confident foundation in Python and the data workflow used to ship reliable machine learning solutions.',
      keyTopics: ['Python data structures and functions', 'NumPy and pandas', 'Data cleaning and exploratory analysis', 'Git, notebooks and reproducible workflows'],
      estimatedHours: 12,
    },
    {
      moduleId: 'mod_2',
      title: 'Core Machine Learning',
      objective: 'Understand the full supervised learning workflow and choose evaluation methods that match a real business problem.',
      keyTopics: ['Regression and classification', 'Train, validation and test splits', 'Feature engineering', 'Metrics, cross-validation and overfitting'],
      estimatedHours: 18,
    },
    {
      moduleId: 'mod_3',
      title: 'Neural Networks & Model Serving',
      objective: 'Train a compact neural network and wrap a model behind a reliable, testable API.',
      keyTopics: ['Neural network fundamentals', 'PyTorch or TensorFlow basics', 'Model evaluation and error analysis', 'FastAPI inference endpoint'],
      estimatedHours: 20,
    },
    {
      moduleId: 'mod_4',
      title: 'Portfolio Project & Interview Prep',
      objective: 'Ship an end-to-end project with a clear README, measurable results, and the ability to explain design trade-offs.',
      keyTopics: ['Problem framing and baseline model', 'Experiment tracking', 'Deployment and monitoring basics', 'ML system design and interview practice'],
      estimatedHours: 16,
    },
  ],
};

const interviewQuestions = [
  'Walk me through a technical project you are proud of. What problem did it solve, and what trade-offs did you make?',
  'How would you investigate a model or service that performs well in development but fails after deployment?',
  'Explain a technical concept from your target role to a non-technical stakeholder. How would you check they understood?',
  'Tell me about a time you had to learn an unfamiliar tool quickly. How did you decide what to learn first?',
];

const navItems: { label: View; icon: typeof LayoutDashboard; hint: string }[] = [
  { label: 'Overview', icon: LayoutDashboard, hint: 'Your workspace' },
  { label: 'My learning path', icon: BookOpen, hint: 'Your roadmap' },
  { label: 'AI tutor', icon: MessageCircle, hint: 'Learn by asking' },
  { label: 'Mock interview', icon: Mic, hint: 'Practise your answers' },
  { label: 'Progress', icon: Activity, hint: 'See how far you’ve come' },
];

function toModuleProgress(path: Syllabus, completed: string[]): ModuleProgress[] {
  return path.modules.map((module) => ({
    id: module.moduleId,
    title: module.title,
    estimatedHours: module.estimatedHours,
    complete: completed.includes(module.moduleId),
  }));
}

function getInitialTutorMessage(role: string): TutorMessage[] {
  return [{
    id: 'welcome',
    role: 'assistant',
    content: `Hey there! I’m your ${role} learning mentor. Ask me to explain a concept, review a snippet of code, or help you think through a problem. I’ll keep our discussion connected to your learning path.\n\nWhat are you working on today?`,
  }];
}

export default function DashboardApp() {
  const [view, setView] = useState<View>('Overview');
  const [path, setPath] = useState<Syllabus>(samplePath);
  const [completed, setCompleted] = useState<string[]>([]);
  const [pathRowId, setPathRowId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>('mod_1');
  const [quizModule, setQuizModule] = useState<LearningModule | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>(getInitialTutorMessage(samplePath.roleTitle));
  const [tutorInput, setTutorInput] = useState('');
  const [tutorBusy, setTutorBusy] = useState(false);
  const [interviewQuestion, setInterviewQuestion] = useState(interviewQuestions[0]);
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [interviewBusy, setInterviewBusy] = useState(false);
  const [interviewError, setInterviewError] = useState('');
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [interviewCount, setInterviewCount] = useState(0);
  const [notice, setNotice] = useState('');

  const progressModules = useMemo(() => toModuleProgress(path, completed), [path, completed]);
  const completionPercent = path.modules.length ? Math.round((completed.length / path.modules.length) * 100) : 0;
  const studyHours = progressModules.filter((module) => module.complete).reduce((total, module) => total + module.estimatedHours, 0);
  const firstName = user?.email?.split('@')[0]?.split(/[._-]/)[0] || 'Learner';

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3400);
  }, []);

  useEffect(() => {
    let mounted = true;
    const storedPath = window.localStorage.getItem('rolepath-path');
    const storedCompleted = window.localStorage.getItem('rolepath-completed');
    const storedInterviewCount = window.localStorage.getItem('rolepath-interview-count');
    if (storedPath) {
      try { setPath(JSON.parse(storedPath) as Syllabus); } catch { /* ignore invalid local cache */ }
    }
    if (storedCompleted) {
      try { setCompleted(JSON.parse(storedCompleted) as string[]); } catch { /* ignore invalid local cache */ }
    }
    if (storedInterviewCount) setInterviewCount(Number(storedInterviewCount) || 0);

    const supabase = createClient();
    if (supabase) {
      void supabase.auth.getUser().then(async ({ data }) => {
        if (!mounted) return;
        setUser(data.user);
        if (data.user) {
          const { data: savedPath } = await supabase.from('learning_paths').select('id, curriculum').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (mounted && savedPath?.curriculum) {
            setPath(savedPath.curriculum as Syllabus);
            setPathRowId(savedPath.id as string);
            window.localStorage.setItem('rolepath-path', JSON.stringify(savedPath.curriculum));
            const { data: rows } = await supabase.from('module_progress').select('module_id').eq('user_id', data.user.id).eq('path_id', savedPath.id);
            const ids = (rows || []).map((row: { module_id: string }) => row.module_id);
            if (mounted) {
              setCompleted(ids);
              window.localStorage.setItem('rolepath-completed', JSON.stringify(ids));
            }
          }
        }
      });
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setUser(session?.user ?? null);
      });
      setHydrated(true);
      return () => { mounted = false; authListener.subscription.unsubscribe(); };
    }
    setHydrated(true);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const destination = (event as CustomEvent<View>).detail;
      if (navItems.some((item) => item.label === destination)) setView(destination);
    };
    document.addEventListener('rolepath:navigate', handleNavigate);
    return () => document.removeEventListener('rolepath:navigate', handleNavigate);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem('rolepath-path', JSON.stringify(path));
    window.localStorage.setItem('rolepath-completed', JSON.stringify(completed));
    window.localStorage.setItem('rolepath-interview-count', String(interviewCount));
  }, [path, completed, hydrated, interviewCount]);

  useEffect(() => {
    setTutorMessages(getInitialTutorMessage(path.roleTitle));
  }, [path.roleTitle]);

  function changeView(nextView: View) {
    setView(nextView);
    setMobileNavOpen(false);
  }

  async function savePath(newPath: Syllabus, context: { background: string }) {
    setPath(newPath);
    setCompleted([]);
    setPathRowId(null);
    setExpandedModule(newPath.modules[0]?.moduleId ?? null);
    window.localStorage.setItem('rolepath-path', JSON.stringify(newPath));
    window.localStorage.setItem('rolepath-completed', JSON.stringify([]));
    const supabase = createClient();
    let persistenceWarning = false;
    if (supabase && user) {
      try {
        const { data, error } = await supabase.from('learning_paths').insert({
          user_id: user.id,
          target_role: newPath.roleTitle,
          background: context.background,
          estimated_weeks: newPath.estimatedWeeks,
          curriculum: newPath,
        }).select('id').single();
        if (error) persistenceWarning = true;
        if (data?.id) setPathRowId(data.id as string);
      } catch {
        persistenceWarning = true;
      }
    }
    setBuilderOpen(false);
    setView('My learning path');
    setCelebrate(true);
    window.setTimeout(() => setCelebrate(false), 2600);
    showNotice(persistenceWarning ? 'Path generated. Cloud save failed, so your current progress remains on this device.' : 'Your role-specific learning path is ready. Let’s make progress.');
  }

  async function toggleComplete(module: LearningModule) {
    const isDone = completed.includes(module.moduleId);
    const next = isDone ? completed.filter((id) => id !== module.moduleId) : [...completed, module.moduleId];
    setCompleted(next);
    window.localStorage.setItem('rolepath-completed', JSON.stringify(next));
    const supabase = createClient();
    if (supabase && user && pathRowId) {
      if (isDone) {
        await supabase.from('module_progress').delete().eq('path_id', pathRowId).eq('module_id', module.moduleId).eq('user_id', user.id);
      } else {
        await supabase.from('module_progress').upsert({ user_id: user.id, path_id: pathRowId, module_id: module.moduleId, completed_at: new Date().toISOString() }, { onConflict: 'user_id,path_id,module_id' });
      }
    }
    if (!isDone && next.length === path.modules.length) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 4300);
      showNotice('🎉 Path completed! You earned the Role Ready badge.');
    } else if (!isDone) {
      showNotice('Module marked complete. Nice momentum!');
    }
  }

  async function sendTutorMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = tutorInput.trim();
    if (!content || tutorBusy) return;
    const userMessage: TutorMessage = { id: `u-${Date.now()}`, role: 'user', content };
    const assistantId = `a-${Date.now()}`;
    const nextMessages = [...tutorMessages, userMessage];
    setTutorMessages([...nextMessages, { id: assistantId, role: 'assistant', content: '' }]);
    setTutorInput('');
    setTutorBusy(true);
    try {
      const response = await fetch('/api/tutor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: path.roleTitle, currentModule: path.modules.find((item) => !completed.includes(item.moduleId))?.title, messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error([data.error || 'The mentor could not respond.', data.detail].filter(Boolean).join(': '));
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming is not supported by this response.');
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTutorMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + chunk } : message));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setTutorMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: `I couldn’t reach the AI mentor just now. ${message}` } : item));
    } finally {
      setTutorBusy(false);
    }
  }

  async function evaluateInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInterviewError('');
    setEvaluation(null);
    setInterviewBusy(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: path.roleTitle, experienceLevel: 'Entry-level', question: interviewQuestion, answer: interviewAnswer }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error([data.error || 'Evaluation failed.', data.detail].filter(Boolean).join(': '));
      const result = data as InterviewEvaluation;
      setEvaluation(result);
      setInterviewCount((count) => count + 1);
      const supabase = createClient();
      if (supabase && user) {
        await supabase.from('interview_sessions').insert({ user_id: user.id, target_role: path.roleTitle, question: interviewQuestion, answer: interviewAnswer, score: result.score, evaluation: result });
      }
    } catch (err) {
      setInterviewError(err instanceof Error ? err.message : 'Could not evaluate your answer.');
    } finally {
      setInterviewBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    showNotice('You’re signed out. Your local demo progress stays on this device.');
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <Link href="/" className="brand"><span className="brand-mark"><Sparkles size={18} /></span><span>rolepath<span className="brand-ai">.ai</span></span></Link>
        <div className="workspace-label">WORKSPACE <ChevronDown size={13} /></div>
        <div className="workspace-switcher"><div className="workspace-avatar"><GraduationCap size={18} /></div><div className="workspace-text"><strong>Career launchpad</strong><small>Personal workspace</small></div><ChevronDown className="workspace-chevron" size={15} /></div>
        <div className="sidebar-section-label">LEARN</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.label} className={`nav-item ${view === item.label ? 'active' : ''}`} onClick={() => changeView(item.label)}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.label === 'Progress' && completed.length > 0 && <span className="nav-count">{completed.length}</span>}</button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-plan-card"><div className="plan-spark"><Sparkles size={17} /></div><strong>One role. One clear path.</strong><p>Small, consistent steps add up to career momentum.</p><button onClick={() => setBuilderOpen(true)}>Refine my goal <ArrowRight size={14} /></button></div>
        <div className="sidebar-profile">
          <div className="profile-avatar">{user ? (firstName.slice(0, 1).toUpperCase()) : 'L'}</div>
          <div className="profile-name"><strong>{user ? firstName : 'Local learner'}</strong><small>{user ? user.email : 'Demo workspace'}</small></div>
          {user ? <button className="profile-action" title="Sign out" onClick={signOut}><LogOut size={16} /></button> : <Link className="profile-action" title="Sign in" href="/login"><LogIn size={16} /></Link>}
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{view}</strong></div></div>
          <div className="topbar-actions"><div className="streak-pill"><Flame size={15} fill="currentColor" /><span><strong>4 day</strong> streak</span></div>{user ? <button className="user-chip" onClick={signOut}><span className="tiny-avatar">{firstName.slice(0, 1).toUpperCase()}</span><span>{firstName}</span><ChevronDown size={14} /></button> : <Link href="/login" className="button button-outline button-small"><UserCircle size={15} /> Sign in</Link>}</div>
        </header>

        <div className="page-content">
          {view === 'Overview' && <OverviewView path={path} completed={completed} completionPercent={completionPercent} studyHours={studyHours} userName={firstName} onBuild={() => setBuilderOpen(true)} onView={changeView} onTutor={() => changeView('AI tutor')} />}
          {view === 'My learning path' && <LearningPathView path={path} completed={completed} completionPercent={completionPercent} expandedModule={expandedModule} setExpandedModule={setExpandedModule} onToggleComplete={toggleComplete} onQuiz={setQuizModule} onBuild={() => setBuilderOpen(true)} />}
          {view === 'AI tutor' && <TutorView path={path} messages={tutorMessages} input={tutorInput} busy={tutorBusy} setInput={setTutorInput} onSubmit={sendTutorMessage} onClear={() => setTutorMessages(getInitialTutorMessage(path.roleTitle))} />}
          {view === 'Mock interview' && <InterviewView path={path} question={interviewQuestion} setQuestion={setInterviewQuestion} answer={interviewAnswer} setAnswer={setInterviewAnswer} busy={interviewBusy} error={interviewError} evaluation={evaluation} count={interviewCount} onSubmit={evaluateInterview} onReset={() => { setInterviewAnswer(''); setEvaluation(null); setInterviewQuestion(interviewQuestions[(interviewQuestions.indexOf(interviewQuestion) + 1) % interviewQuestions.length]); setInterviewError(''); }} onFollowUp={() => { if (evaluation) { setInterviewQuestion(evaluation.followUpQuestion); setInterviewAnswer(''); setEvaluation(null); } }} />}
          {view === 'Progress' && <ProgressView path={path} completed={completed} modules={progressModules} percent={completionPercent} studyHours={studyHours} interviewCount={interviewCount} onViewPath={() => changeView('My learning path')} />}
        </div>
        <footer className="app-footer"><span>Made for your next chapter <span className="footer-heart">✦</span></span><span>RolePath AI <i>·</i> Personal learning, practical outcomes</span></footer>
      </main>

      {builderOpen && <BuilderModal onClose={() => setBuilderOpen(false)} currentRole={path.roleTitle} onSave={savePath} />}
      {quizModule && <QuizModal targetRole={path.roleTitle} module={quizModule} onClose={() => setQuizModule(null)} />}
      {celebrate && <div className="celebration-layer" aria-live="polite"><div className="celebration-card"><div className="celebration-emojis">✦ 🎉 ✦</div><div className="celebration-badge"><Trophy size={25} /></div><h2>{completionPercent === 100 ? 'Role Ready!' : 'Great start!'}</h2><p>{completionPercent === 100 ? 'You completed your learning path. Keep the momentum going into your next project or interview.' : 'Your new roadmap is ready. The next version of you starts with one small step.'}</p><button className="button button-primary" onClick={() => setCelebrate(false)}>Let’s keep going <ArrowRight size={16} /></button></div></div>}
      {notice && <div className="toast-notice"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
    </div>
  );
}

function OverviewView({ path, completed, completionPercent, studyHours, userName, onBuild, onView, onTutor }: {
  path: Syllabus; completed: string[]; completionPercent: number; studyHours: number; userName: string; onBuild: () => void; onView: (view: View) => void; onTutor: () => void;
}) {
  const nextModule = path.modules.find((module) => !completed.includes(module.moduleId)) || path.modules[path.modules.length - 1];
  const today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL LEARNING SPACE</div><h1>Good morning, {userName === 'Learner' ? 'there' : userName}<span className="wave">✦</span></h1><p className="page-subtitle">Small steps today. A stronger career tomorrow.</p></div><div className="date-chip"><CalendarDays size={16} /><span>{today}</span></div></div>
    <section className="hero-banner">
      <div className="hero-content"><div className="hero-pill"><Sparkles size={13} /> YOUR NEXT ROLE, DECODED</div><h2>Learn with purpose.<br /><em>Grow with direction.</em></h2><p>Your learning plan should be as specific as the role you want. Build a roadmap around your background, learn with an AI mentor, and practise before the real interview.</p><div className="hero-actions"><button className="button button-white" onClick={onBuild}><Plus size={17} /> Build my learning path <ArrowRight size={16} /></button><button className="hero-quiet-link" onClick={() => onView('My learning path')}>View current path <ChevronRight size={15} /></button></div><div className="hero-meta"><span><span className="hero-meta-dot" /> Personalised curriculum</span><span><span className="hero-meta-dot" /> Interview-ready skills</span></div></div>
      <div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" /><div className="hero-glow" /><div className="hero-core"><div className="core-icon"><Target size={32} /></div><span>YOUR GOAL</span><strong>{path.roleTitle}</strong><div className="core-progress"><span style={{ width: `${completionPercent}%` }} /></div><small>{completionPercent}% path progress</small></div><div className="floating-note note-top"><span className="floating-note-icon purple"><Zap size={14} /></span><span><strong>Focused learning</strong><small>Built around you</small></span></div><div className="floating-note note-bottom"><span className="floating-note-icon green"><Check size={14} /></span><span><strong>One step at a time</strong><small>Keep your momentum</small></span></div><div className="hero-star star-one">✦</div><div className="hero-star star-two">✧</div></div>
    </section>

    <div className="section-heading stats-heading"><div><h2>Your progress at a glance</h2><p>A little consistency goes a long way.</p></div><button className="text-link" onClick={() => onView('Progress')}>See progress <ArrowRight size={15} /></button></div>
    <section className="stats-grid">
      <StatCard icon={<BookOpen size={19} />} iconClass="lavender" label="Modules completed" value={`${completed.length}/${path.modules.length}`} detail="Keep your learning moving" foot={`path ${completionPercent}% complete`} progress={completionPercent} />
      <StatCard icon={<Clock size={19} />} iconClass="mint" label="Focused hours" value={`${studyHours}h`} detail="Estimated hours completed" foot={studyHours ? 'Time invested in your goal' : 'Your first session is waiting'} />
      <StatCard icon={<Flame size={19} />} iconClass="peach" label="Learning streak" value="4 days" detail="You’re building a habit" foot="One more day to make it five" />
      <StatCard icon={<Mic size={19} />} iconClass="sky" label="Interview sessions" value="Practice" detail="Get comfortable out loud" foot="AI feedback, not guesswork" onClick={() => onView('Mock interview')} />
    </section>

    <div className="dashboard-lower-grid">
      <section className="content-card current-path-card"><div className="card-heading"><div><div className="card-icon soft-purple"><GraduationCap size={18} /></div><div><h3>Your learning path</h3><p>One clear step at a time</p></div></div><button className="icon-more" aria-label="Open learning path" onClick={() => onView('My learning path')}><ArrowRight size={17} /></button></div><div className="current-role-row"><div className="role-art-icon"><BrainIcon /></div><div className="current-role-copy"><span className="status-label"><span /> ACTIVE ROADMAP</span><h4>{path.roleTitle}</h4><p>{path.estimatedWeeks} weeks <span>·</span> {path.modules.length} modules <span>·</span> Self-paced</p></div></div><div className="mini-progress-row"><span>Overall progress</span><strong>{completionPercent}%</strong></div><div className="progress-track"><span style={{ width: `${completionPercent}%` }} /></div><div className="next-step-box"><div className="next-step-icon"><Play size={16} fill="currentColor" /></div><div className="next-step-copy"><small>NEXT UP</small><strong>{nextModule?.title || 'Path complete'}</strong><span>{nextModule ? `${nextModule.estimatedHours} estimated hours` : 'Choose another goal to keep growing'}</span></div><button onClick={() => onView('My learning path')} aria-label="Continue learning"><ArrowRight size={17} /></button></div><button className="button button-outline full-button" onClick={() => onView('My learning path')}>Open learning path <ArrowRight size={16} /></button></section>

      <section className="content-card mentor-card"><div className="mentor-card-top"><div className="mentor-illustration"><div className="mentor-spark s1">✦</div><div className="mentor-spark s2">✧</div><div className="mentor-face"><div className="mentor-eyes"><i /><i /></div><div className="mentor-smile" /></div><div className="mentor-orbit" /></div><span className="online-indicator"><span /> AI MENTOR READY</span></div><div className="mentor-copy"><h3>Need a little clarity?</h3><p>Your AI tutor explains concepts, helps untangle code, and keeps your learning tied to the role you’re aiming for.</p></div><div className="mentor-suggestions"><button onClick={onTutor}><span className="suggestion-icon purple"><MessageCircle size={16} /></span><span><strong>Explain a tricky concept</strong><small>Learn it in plain language</small></span><ChevronRight size={16} /></button><button onClick={onTutor}><span className="suggestion-icon amber"><Zap size={16} /></span><span><strong>Get unstuck on a problem</strong><small>Think it through together</small></span><ChevronRight size={16} /></button></div><button className="button button-primary full-button" onClick={onTutor}>Talk to your AI tutor <ArrowRight size={16} /></button></section>
    </div>

    <section className="content-card weekly-card"><div className="card-heading"><div><div className="card-icon soft-green"><Activity size={18} /></div><div><h3>This week, on your terms</h3><p>Self-paced doesn’t mean going it alone.</p></div></div><span className="week-chip">YOUR ROUTINE</span></div><div className="week-days"><div className="week-day active"><span>M</span><i>✓</i></div><div className="week-day active"><span>T</span><i>✓</i></div><div className="week-day"><span>W</span><i /></div><div className="week-day"><span>T</span><i /></div><div className="week-day"><span>F</span><i /></div><div className="week-day"><span>S</span><i /></div><div className="week-day"><span>S</span><i /></div></div><div className="weekly-footer"><div className="weekly-message"><span className="weekly-message-icon"><Flame size={15} /></span><span><strong>Build a rhythm that works for you</strong><small>Even 20 focused minutes can move you forward.</small></span></div><button className="text-link" onClick={() => onView('Progress')}>Track progress <ArrowRight size={15} /></button></div></section>
  </>;
}

function BrainIcon() {
  return <div className="brain-icon-inner"><Sparkles size={27} /><span>AI</span></div>;
}

function StatCard({ icon, iconClass, label, value, detail, foot, progress, onClick }: {
  icon: ReactNode; iconClass: string; label: string; value: string; detail: string; foot: string; progress?: number; onClick?: () => void;
}) {
  const contents = <><div className="stat-top"><span className={`stat-icon ${iconClass}`}>{icon}</span><span className="stat-menu">···</span></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div>{typeof progress === 'number' && <div className="mini-stat-progress"><span style={{ width: `${progress}%` }} /></div>}<div className="stat-foot">{foot}</div></>;
  return onClick ? <button className="stat-card stat-card-button" onClick={onClick}>{contents}</button> : <article className="stat-card">{contents}</article>;
}

function LearningPathView({ path, completed, completionPercent, expandedModule, setExpandedModule, onToggleComplete, onQuiz, onBuild }: {
  path: Syllabus; completed: string[]; completionPercent: number; expandedModule: string | null; setExpandedModule: (id: string | null) => void; onToggleComplete: (module: LearningModule) => void; onQuiz: (module: LearningModule) => void; onBuild: () => void;
}) {
  return <>
    <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR ROADMAP</div><h1>My learning path</h1><p className="page-subtitle">A focused route from where you are to where you want to be.</p></div><button className="button button-primary" onClick={onBuild}><Plus size={17} /> Build a new path</button></div>
    <section className="path-summary-banner"><div className="path-summary-copy"><span className="role-chip"><Sparkles size={13} /> PERSONALISED FOR YOU</span><h2>{path.roleTitle}</h2><p>Four connected modules, designed to build confidence through concepts, practical work, and job-ready proof.</p><div className="path-summary-meta"><span><CalendarDays size={15} /> {path.estimatedWeeks} weeks</span><span><BookOpen size={15} /> {path.modules.length} modules</span><span><Clock size={15} /> {path.modules.reduce((sum, mod) => sum + mod.estimatedHours, 0)} focused hours</span></div></div><div className="path-summary-progress"><div className="ring-progress" style={{ '--progress': `${completionPercent * 3.6}deg` } as unknown as CSSProperties}><div><strong>{completionPercent}%</strong><small>complete</small></div></div><span>{completed.length} of {path.modules.length} modules finished</span></div></section>
    <div className="module-section-heading"><div><h2>Your curriculum</h2><p>Work through the modules in order, or revisit any topic whenever you need to.</p></div><span className="level-pill"><span /> SELF-PACED</span></div>
    <div className="modules-list">
      {path.modules.map((module, index) => {
        const done = completed.includes(module.moduleId);
        const open = expandedModule === module.moduleId;
        return <article className={`module-card ${done ? 'module-done' : ''} ${open ? 'module-open' : ''}`} key={module.moduleId}>
          <button className="module-main-row" onClick={() => setExpandedModule(open ? null : module.moduleId)} aria-expanded={open}>
            <div className={`module-number ${done ? 'number-done' : ''}`}>{done ? <Check size={19} /> : String(index + 1).padStart(2, '0')}</div>
            <div className="module-main-copy"><div className="module-badges"><span>MODULE {String(index + 1).padStart(2, '0')}</span>{done && <span className="done-mini-badge"><CheckCircle2 size={12} /> COMPLETED</span>}{index === completed.length && !done && <span className="current-mini-badge">UP NEXT</span>}</div><h3>{module.title}</h3><p>{module.objective}</p><div className="module-metadata"><span><Clock size={14} /> {module.estimatedHours} hours</span><span><Target size={14} /> {module.keyTopics.length} key topics</span></div></div>
            <span className={`module-expand ${open ? 'expanded' : ''}`}><ChevronDown size={18} /></span>
          </button>
          {open && <div className="module-details"><div className="module-details-inner"><div><h4>What you’ll work on</h4><ul className="topic-list">{module.keyTopics.map((topic) => <li key={topic}><span><Check size={13} /></span>{topic}</li>)}</ul></div><div className="module-outcome"><span className="outcome-icon"><Trophy size={17} /></span><strong>Learning objective</strong><p>{module.objective}</p><span className="outcome-note">Make sure you can explain the “why”, not just the “how”.</span></div></div><div className="module-actions"><button className={`button ${done ? 'button-complete' : 'button-primary'}`} onClick={() => onToggleComplete(module)}>{done ? <><CheckCircle2 size={16} /> Mark as in progress</> : <><Check size={16} /> Mark module complete</>}</button><button className="button button-outline" onClick={() => onQuiz(module)}><Sparkles size={15} /> Take a quick quiz</button></div></div>}
        </article>;
      })}
    </div>
    <div className="path-footer-tip"><div className="tip-icon"><Sparkles size={19} /></div><div><strong>Progress over perfection</strong><p>Complete a module when you can explain the core ideas and apply them to a small example. You can always come back to revise.</p></div></div>
  </>;
}

function TutorView({ path, messages, input, busy, setInput, onSubmit, onClear }: {
  path: Syllabus; messages: TutorMessage[]; input: string; busy: boolean; setInput: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClear: () => void;
}) {
  const suggestedPrompts = ['Explain this concept like I’m new to it', 'Give me a practical example', 'Quiz me on my current module'];
  const currentModule = path.modules[0];
  return <>
    <div className="page-title-row tutor-page-title"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING COMPANION</div><h1>AI tutor</h1><p className="page-subtitle">No judgement, no silly questions. Just a clearer way forward.</p></div><div className="mentor-status"><span className="mentor-status-avatar"><Sparkles size={17} /></span><span><strong>RolePath mentor</strong><small><i /> Ready when you are</small></span></div></div>
    <div className="tutor-layout"><section className="tutor-chat-card"><div className="chat-header"><div className="chat-avatar"><Sparkles size={18} /></div><div><strong>Your {path.roleTitle} mentor</strong><small><span className="online-dot" /> Personalised to your learning path</small></div><button className="chat-clear" onClick={onClear}>New conversation <Plus size={14} /></button></div><div className="chat-context-banner"><div className="context-symbol"><BookOpen size={16} /></div><div><small>LEARNING CONTEXT</small><strong>{path.roleTitle}</strong><span>Currently focusing on: {currentModule?.title ?? 'your next step'}</span></div><button title="Open curriculum" onClick={() => document.dispatchEvent(new CustomEvent('rolepath:navigate', { detail: 'My learning path' }))}><ArrowRight size={16} /></button></div><div className="chat-messages" aria-live="polite">{messages.map((message) => <div className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`} key={message.id}>{message.role === 'assistant' && <div className="message-avatar"><Sparkles size={14} /></div>}<div className="message-content"><div className="message-author">{message.role === 'user' ? 'You' : 'Your AI mentor'} <span>{message.role === 'assistant' ? '· Role-specific guidance' : '· just now'}</span></div><div className="message-bubble">{message.content ? message.content : <span className="typing-dots"><i /><i /><i /></span>}</div></div></div>)}</div><form className="chat-composer" onSubmit={onSubmit}><div className="composer-suggestions">{suggestedPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => setInput(prompt)}>{prompt}</button>)}</div><div className="composer-input-row"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); (event.currentTarget.form as HTMLFormElement | null)?.requestSubmit(); } }} placeholder="Ask a question, paste code, or share what feels confusing…" rows={2} /><button className="send-button" disabled={!input.trim() || busy} type="submit" aria-label="Send message">{busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button></div><div className="composer-footnote"><span><ShieldCheckMini /> Your mentor stays focused on your target role.</span><span>Enter to send <i>·</i> Shift + Enter for a new line</span></div></form></section>
      <aside className="tutor-side-column"><div className="tutor-side-card tutor-guidelines"><div className="side-card-icon violet"><Sparkles size={18} /></div><h3>Make the most of your mentor</h3><p>Good questions lead to better learning. Try asking for:</p><div className="guideline-item"><span>01</span><div><strong>Plain-English explanations</strong><small>Start with intuition, then go deeper.</small></div></div><div className="guideline-item"><span>02</span><div><strong>Real-world examples</strong><small>Connect ideas to the actual job.</small></div></div><div className="guideline-item"><span>03</span><div><strong>Feedback on your thinking</strong><small>Share your approach before asking for a solution.</small></div></div></div><div className="tutor-side-card tutor-context"><div className="context-top"><div className="side-card-icon mint"><Target size={17} /></div><span className="small-status"><i /> IN YOUR PATH</span></div><h3>Stay on track</h3><p>Your tutor can reinforce the next lesson so every question moves you closer to your goal.</p><div className="context-module"><div className="context-module-number">01</div><div><small>NEXT MODULE</small><strong>{path.modules.find((item, index) => index === 0)?.title || 'Learning module'}</strong></div></div></div><div className="tutor-privacy-note"><ShieldCheckMini /> AI can make mistakes. Use explanations as a learning aid and verify important technical details.</div></aside></div>
  </>;
}

function ShieldCheckMini() { return <span className="shield-mini"><Check size={11} /></span>; }

function InterviewView({ path, question, setQuestion, answer, setAnswer, busy, error, evaluation, count, onSubmit, onReset, onFollowUp }: {
  path: Syllabus; question: string; setQuestion: (value: string) => void; answer: string; setAnswer: (value: string) => void; busy: boolean; error: string; evaluation: InterviewEvaluation | null; count: number; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onReset: () => void; onFollowUp: () => void;
}) {
  return <>
    <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> PRACTISE BEFORE IT COUNTS</div><h1>Mock interview</h1><p className="page-subtitle">Think out loud, get useful feedback, and improve one answer at a time.</p></div><div className="interview-count-chip"><Mic size={17} /><span><strong>{count}</strong> answers reviewed</span></div></div>
    <section className="interview-hero"><div className="interview-hero-copy"><div className="hero-pill"><Sparkles size={13} /> YOUR PRIVATE PRACTICE ROOM</div><h2>Build confidence<br />one answer at a time.</h2><p>Get structured feedback based on technical accuracy, clarity, depth, and hands-on understanding for your target role.</p><div className="interview-hero-tags"><span><CheckCircle2 size={14} /> Role-specific prompts</span><span><CheckCircle2 size={14} /> Actionable feedback</span></div></div><div className="interview-hero-art"><div className="interview-circle circle-back" /><div className="interview-circle circle-front"><Mic size={34} /></div><div className="interview-score-bubble"><span>AI FEEDBACK</span><strong>01—10</strong><small>Score + next step</small></div><div className="interview-decoration deco-a">✦</div><div className="interview-decoration deco-b">✧</div></div></section>
    <div className="interview-layout"><section className="content-card interview-question-card"><div className="interview-step-header"><div><span className="step-label">QUESTION OF THE SESSION</span><h3>Let’s hear your thinking.</h3></div><span className="question-tag">Technical + behavioural</span></div><label className="field-label" htmlFor="interview-question">Interview question</label><textarea id="interview-question" className="interview-question-input" rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} /><div className="question-controls"><span><Sparkles size={14} /> Tailored for {path.roleTitle}</span><button className="text-link" type="button" onClick={onReset}>Try another question <ArrowRight size={14} /></button></div><form onSubmit={onSubmit} className="interview-answer-form"><label className="field-label" htmlFor="interview-answer">Your answer</label><textarea id="interview-answer" className="interview-answer-input" rows={7} minLength={10} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer as if you're in the real interview. Explain your reasoning, mention trade-offs, and use a concrete example when you can…" required /><div className="answer-footer"><span>{answer.trim().length} characters <i>·</i> Aim for a clear, specific answer</span><button className="button button-primary" type="submit" disabled={busy || answer.trim().length < 10}>{busy ? <><Loader2 size={16} className="spin" /> Reviewing…</> : <><Sparkles size={16} /> Evaluate my answer <ArrowRight size={15} /></>}</button></div>{error && <div className="form-alert error-alert">{error}</div>}</form></section>
      <aside className="interview-side-column"><div className="content-card interview-tip-card"><div className="tip-card-symbol"><Target size={19} /></div><h3>A simple answer framework</h3><p>Make your thinking easy to follow. Try this structure:</p><div className="framework-step"><span>1</span><div><strong>Context</strong><small>What was the situation or problem?</small></div></div><div className="framework-step"><span>2</span><div><strong>Approach</strong><small>What did you do, and why?</small></div></div><div className="framework-step"><span>3</span><div><strong>Outcome</strong><small>What changed or what did you learn?</small></div></div></div><div className="content-card evaluation-preview"><div className="preview-icon"><Zap size={17} /></div><h3>Your feedback will include</h3><div className="preview-line"><CheckCircle2 size={15} /><span>Overall score from 1–10</span></div><div className="preview-line"><CheckCircle2 size={15} /><span>Specific strengths to keep</span></div><div className="preview-line"><CheckCircle2 size={15} /><span>Blind spots to improve</span></div><div className="preview-line"><CheckCircle2 size={15} /><span>One targeted follow-up question</span></div></div></aside></div>
    {evaluation && <section className="evaluation-card"><div className="evaluation-header"><div><span className="eyebrow"><span className="eyebrow-line" /> YOUR FEEDBACK</span><h2>Here’s how that answer landed.</h2><p>Use this as a coaching signal, not a verdict.</p></div><div className="score-disc" style={{ '--score-angle': `${evaluation.score * 36}deg` } as unknown as CSSProperties}><div><strong>{evaluation.score}<small>/10</small></strong><span>ANSWER SCORE</span></div></div></div><div className="evaluation-columns"><div className="evaluation-list strengths-list"><h3><span><CheckCircle2 size={16} /></span> What worked well</h3>{evaluation.strengths.map((strength) => <p key={strength}><Check size={14} />{strength}</p>)}</div><div className="evaluation-list blindspots-list"><h3><span><Target size={16} /></span> What to sharpen</h3>{evaluation.blindSpots.map((blindSpot) => <p key={blindSpot}><ArrowRight size={14} />{blindSpot}</p>)}</div></div><div className="follow-up-box"><div className="follow-up-icon"><MessageCircle size={18} /></div><div><small>YOUR NEXT QUESTION</small><strong>{evaluation.followUpQuestion}</strong><p>A good follow-up is an opportunity to show depth, not to repeat the same answer.</p></div><button className="button button-outline" onClick={onFollowUp}>Answer follow-up <ArrowRight size={15} /></button></div></section>}
  </>;
}

function ProgressView({ path, completed, modules, percent, studyHours, interviewCount, onViewPath }: {
  path: Syllabus; completed: string[]; modules: ModuleProgress[]; percent: number; studyHours: number; interviewCount: number; onViewPath: () => void;
}) {
  return <>
    <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR MOMENTUM</div><h1>Progress & achievements</h1><p className="page-subtitle">Every completed module is proof that you’re moving forward.</p></div><button className="button button-outline" onClick={onViewPath}><BookOpen size={16} /> Open curriculum <ArrowRight size={15} /></button></div>
    <section className="progress-hero"><div><span className="hero-pill"><Activity size={13} /> YOUR PROGRESS, YOUR PACE</span><h2>Look how far<br />you can go.</h2><p>Your progress is more than a percentage. It’s consistent practice, growing understanding, and skills you can explain with confidence.</p></div><div className="progress-hero-ring"><div className="ring-progress large-ring" style={{ '--progress': `${percent * 3.6}deg` } as unknown as CSSProperties}><div><strong>{percent}%</strong><small>of path complete</small></div></div><span>{completed.length === path.modules.length ? 'All modules completed' : `${path.modules.length - completed.length} modules to go`}</span></div><div className="progress-hero-stars"><span>✦</span><span>✧</span><span>✦</span></div></section>
    <section className="stats-grid progress-stats"><StatCard icon={<BookOpen size={19} />} iconClass="lavender" label="Modules complete" value={`${completed.length}/${path.modules.length}`} detail="Your roadmap milestones" foot={`${percent}% of this path`} progress={percent} /><StatCard icon={<Clock size={19} />} iconClass="mint" label="Learning hours" value={`${studyHours}h`} detail="Estimated time completed" foot="Focused effort compounds" /><StatCard icon={<Mic size={19} />} iconClass="sky" label="Answers reviewed" value={String(interviewCount)} detail="Interview practice sessions" foot="Confidence through repetition" /><StatCard icon={<Trophy size={19} />} iconClass="peach" label="Achievements" value={completed.length === path.modules.length ? '3 earned' : completed.length ? '1 earned' : 'Ready to earn'} detail="Celebrate meaningful progress" foot={completed.length === path.modules.length ? 'Role Ready unlocked!' : 'Complete a module to begin'} /> </section>
    <div className="progress-detail-grid"><section className="content-card progress-breakdown"><div className="card-heading"><div><div className="card-icon soft-purple"><Activity size={18} /></div><div><h3>Learning path breakdown</h3><p>{path.roleTitle}</p></div></div><span className="subtle-pill">{percent}% overall</span></div><div className="breakdown-list">{modules.map((module, index) => <div className="breakdown-row" key={module.id}><div className={`breakdown-status ${module.complete ? 'is-complete' : ''}`}>{module.complete ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</div><div className="breakdown-main"><div className="breakdown-title-row"><strong>{module.title}</strong><span>{module.complete ? 'Complete' : 'Not started'}</span></div><div className="progress-track"><span style={{ width: module.complete ? '100%' : '0%' }} /></div></div><span className="breakdown-hours">{module.estimatedHours}h</span></div>)}</div><button className="button button-outline full-button" onClick={onViewPath}>Continue your path <ArrowRight size={16} /></button></section>
      <div className="achievement-stack"><section className="content-card achievements-card"><div className="card-heading"><div><div className="card-icon soft-amber"><Trophy size={18} /></div><div><h3>Achievements</h3><p>Milestones worth noticing</p></div></div></div><div className={`achievement-row ${completed.length >= 1 ? 'unlocked' : ''}`}><div className="achievement-icon achievement-bronze"><BookOpen size={20} /></div><div><strong>First Step</strong><p>Complete your first module</p></div>{completed.length >= 1 ? <span className="unlocked-label"><Check size={12} /> EARNED</span> : <span className="locked-label">LOCKED</span>}</div><div className={`achievement-row ${completed.length === path.modules.length ? 'unlocked' : ''}`}><div className="achievement-icon achievement-silver"><Zap size={20} /></div><div><strong>Path Finisher</strong><p>Complete all modules in a path</p></div>{completed.length === path.modules.length ? <span className="unlocked-label"><Check size={12} /> EARNED</span> : <span className="locked-label">LOCKED</span>}</div><div className={`achievement-row ${interviewCount >= 3 ? 'unlocked' : ''}`}><div className="achievement-icon achievement-gold"><Mic size={20} /></div><div><strong>Interview Ready</strong><p>Review three practice answers</p></div>{interviewCount >= 3 ? <span className="unlocked-label"><Check size={12} /> EARNED</span> : <span className="locked-label">LOCKED</span>}</div></section><section className="content-card encouragement-card"><div className="encouragement-icon"><Sparkles size={20} /></div><h3>Consistency beats intensity.</h3><p>You don’t have to master everything today. Show up, complete one useful step, and let the progress accumulate.</p><button className="text-link" onClick={onViewPath}>Take the next step <ArrowRight size={15} /></button></section></div></div>
  </>;
}

function BuilderModal({ currentRole, onClose, onSave }: { currentRole: string; onClose: () => void; onSave: (path: Syllabus, context: { background: string }) => Promise<void> }) {
  const [targetRole, setTargetRole] = useState(currentRole || 'Machine Learning Engineer');
  const [background, setBackground] = useState('I am a computer science student with basic programming knowledge. I want a practical, structured path to become job-ready and build portfolio projects.');
  const [currentLevel, setCurrentLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [focusSkills, setFocusSkills] = useState('Python, projects, technical interviews');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/learning-path', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, background, currentLevel, hoursPerWeek, focusSkills }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error([data.error || 'Could not build your learning path.', data.detail].filter(Boolean).join(': '));
      await onSave(data as Syllabus, { background });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build your learning path.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section className="builder-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="builder-title"><div className="modal-topline"><span className="modal-kicker"><Sparkles size={15} /> PERSONALISE YOUR PLAN</span><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close builder"><X size={18} /></button></div><div className="builder-heading"><div className="builder-mark"><GraduationCap size={23} /></div><div><h2 id="builder-title">Build your learning path</h2><p>Tell us where you are and where you want to go. Your roadmap will be built around you.</p></div></div><form className="builder-form" onSubmit={submit}><div className="field-two-columns"><label className="form-field">Target job role<input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} required maxLength={120} placeholder="e.g. Backend Engineer" /></label><label className="form-field">Current level<select value={currentLevel} onChange={(event) => setCurrentLevel(event.target.value as typeof currentLevel)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label></div><label className="form-field">Your current background<textarea rows={4} value={background} onChange={(event) => setBackground(event.target.value)} required minLength={10} maxLength={2500} placeholder="Tell us what you already know, what you’ve built, and where you need support…" /></label><div className="field-two-columns"><label className="form-field">Study time per week<select value={hoursPerWeek} onChange={(event) => setHoursPerWeek(Number(event.target.value))}><option value={2}>2 hours</option><option value={4}>4 hours</option><option value={6}>6 hours</option><option value={8}>8 hours</option><option value={10}>10 hours</option><option value={15}>15 hours</option><option value={20}>20 hours</option><option value={30}>30 hours</option><option value={40}>40 hours</option></select></label><label className="form-field">Skills to focus on<input value={focusSkills} onChange={(event) => setFocusSkills(event.target.value)} maxLength={500} placeholder="e.g. APIs, SQL, system design" /></label></div>{error && <div className="form-alert error-alert">{error}<p className="small-note">Make sure AI_GATEWAY_API_KEY and AI_GATEWAY_MODEL are configured in your local environment.</p></div>}<div className="builder-footer"><span><ShieldCheckMini /> Your path is generated from your inputs.</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? <><Loader2 size={16} className="spin" /> Building your path…</> : <><Sparkles size={16} /> Generate my path <ArrowRight size={16} /></>}</button></div></form></section></div>;
}
