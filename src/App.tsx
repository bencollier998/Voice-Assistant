import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Terminal,
  Languages,
  Sparkles,
  Trash2,
  Play,
  CheckCircle,
  Info,
} from "lucide-react";
import { Message, AssistantState, TechLog } from "./types";
import VoiceVisualizer from "./components/VoiceVisualizer";

type JobMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  score: number;
  language: "FR" | "EN" | "FR/EN";
  salary: string;
  highlights: string[];
};

type CvSuggestion = {
  title: string;
  detail: string;
  impact: "High" | "Medium" | "Low";
};

const JOB_SITES = ["Welcome to the Jungle", "APEC", "LinkedIn", "Indeed", "France Travail"];
const SEARCH_TIMES = ["08:00", "12:00", "16:00", "20:00"];

const MOCK_MATCHES: JobMatch[] = [
  {
    id: "job-1",
    title: "Data Analyst Junior",
    company: "Fintech Paris Studio",
    location: "Paris / Hybrid",
    source: "Welcome to the Jungle",
    score: 9,
    language: "FR/EN",
    salary: "€38k–€45k",
    highlights: ["SQL + dashboards", "Junior friendly", "Strong bilingual fit"],
  },
  {
    id: "job-2",
    title: "Business Intelligence Assistant",
    company: "APEC Partner Network",
    location: "Lyon / Remote partial",
    source: "APEC",
    score: 8,
    language: "FR",
    salary: "€34k–€40k",
    highlights: ["Power BI", "CV keyword match", "Good growth path"],
  },
  {
    id: "job-3",
    title: "Junior Operations Analyst",
    company: "SaaS Talent Group",
    location: "Remote France",
    source: "LinkedIn",
    score: 7,
    language: "EN",
    salary: "€36k–€42k",
    highlights: ["Excel modelling", "Process improvement", "Remote compatible"],
  },
];

const CV_SUGGESTIONS: CvSuggestion[] = [
  {
    title: "Add a bilingual profile summary",
    detail: "Lead with French/English communication, analysis skills, and the exact tools requested in each job advert.",
    impact: "High",
  },
  {
    title: "Create a skills keyword block",
    detail: "Include SQL, Excel, Power BI, reporting, dashboards, CRM, stakeholder communication, and data quality.",
    impact: "High",
  },
  {
    title: "Quantify experience",
    detail: "Add numbers such as files processed, reporting frequency, accuracy improvements, or time saved.",
    impact: "Medium",
  },
];

const SYSTEM_BRIEF = `You are Cortana, Sarah's premium bilingual job hunting assistant. Speak naturally in French and English. Your opening identity is: "I am Sarah's Assistant. How can I help you?" Help Sarah find jobs, grade compatibility from 1 to 10 against her CV, suggest CV improvements, generate tailored cover letters, and prepare applications for review before sending via Gmail.`;

export default function App() {
  const [state, setState] = useState<AssistantState>("IDLE");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isVoiceOn, setIsVoiceOn] = useState(true);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [logs, setLogs] = useState<TechLog[]>([]);
  const [browserHasSpeech, setBrowserHasSpeech] = useState(false);
  const [browserHasSpeechSynth, setBrowserHasSpeechSynth] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobMatch>(MOCK_MATCHES[0]);
  const [activePanel, setActivePanel] = useState<"matches" | "cv" | "letters">("matches");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const addLog = (message: string, type: "info" | "success" | "warn" | "api" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Math.random().toString(), time, message, type }, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBrowserHasSpeechSynth("speechSynthesis" in window);

      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setBrowserHasSpeech(!!SpeechRecognitionClass);

      addLog("Job Hunter Agent for Sarah initialized.", "success");
      addLog("Bilingual Cortana voice engine online.", "success");
      addLog("Scheduled search plan loaded: 4 scans per day across 5 job sites.", "api");

      if (!SpeechRecognitionClass) {
        addLog("Speech Recognition API not supported in this browser. Keyboard input remains active.", "warn");
      } else {
        addLog("Voice capture calibrated for Sarah's assistant.", "success");
      }

      const defaultMsg: Message = {
        id: "sys-welcome",
        role: "assistant",
        parts: [
          {
            text: "I am Sarah's Assistant. How can I help you? / Je suis l'assistante de Sarah. Comment puis-je vous aider ?",
          },
        ],
        timestamp: new Date(),
        isSpoken: false,
      };

      setMessages([defaultMsg]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      addLog("Microphone authorized. Listening for Sarah's request...", "api");
      setState("LISTENING");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      addLog(`Captured voice request: "${transcript}"`, "success");
      if (transcript.trim()) handleSendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      addLog(`Voice capture error: ${event.error}`, "warn");
      stopMicrophone();
      setState("IDLE");
    };

    recognition.onend = () => {
      addLog("Microphone pipeline closed.", "info");
      setState((prev) => (prev === "LISTENING" ? "IDLE" : prev));
      stopMicrophone();
    };

    recognitionRef.current = recognition;
  }, []);

  const startMicrophone = async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    try {
      addLog("Requesting microphone permissions...", "info");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      recognitionRef.current?.start();
    } catch (err) {
      addLog("Microphone denied or unavailable.", "warn");
      alert("Microphone access denied or not connected. Check browser permissions.");
    }
  };

  const stopMicrophone = () => {
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const toggleMic = () => {
    if (state === "LISTENING") {
      stopMicrophone();
      setState("IDLE");
    } else {
      startMicrophone();
    }
  };

  const speakAloud = (text: string) => {
    if (!isVoiceOn || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();

      const cleanText = text
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/[#_*~]/g, "")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const looksFrench = cleanText
        .toLowerCase()
        .match(/(bonjour|salut|aide|pourquoi|avoir|je |tu |elle|il |nous|comment|oui|non|merci|assistante|sarah|vous|emploi|candidature|lettre)/);

      utterance.lang = looksFrench ? "fr-FR" : "en-US";
      addLog(`Classified voice output as: [${utterance.lang}]`, "info");

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((voice) =>
        looksFrench ? voice.lang.startsWith("fr") : voice.lang.startsWith("en")
      );
      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.onstart = () => {
        setState("SPEAKING");
        addLog("Cortana voice projection started.", "api");
      };

      utterance.onend = () => {
        setState("IDLE");
        addLog("Voice feedback finished.", "success");
      };

      utterance.onerror = () => setState("IDLE");

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech failed to execute:", e);
      setState("IDLE");
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const userMessage: Message = {
      id: Math.random().toString(),
      role: "user",
      parts: [{ text: textToSend }],
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInputText("");
    setState("THINKING");
    addLog("Sending request to Cortana job intelligence core...", "info");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_BRIEF,
          history: updatedHistory.map((msg) => ({ role: msg.role, parts: msg.parts })),
        }),
      });

      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);

      const data = await response.json();
      const reply = data.text || "I was unable to formulate a response.";

      addLog("Received response from job assistant model.", "success");

      const assistantMessage: Message = {
        id: Math.random().toString(),
        role: "assistant",
        parts: [{ text: reply }],
        timestamp: new Date(),
        isSpoken: false,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speakAloud(reply);
    } catch (err: any) {
      addLog(`Failed resolving prompt: ${err.message}`, "warn");

      const errMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        parts: [
          {
            text: "System Error: Unable to sync with Cortana core. Please verify that your API key and /api/chat route are configured.",
          },
        ],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errMsg]);
      setState("IDLE");
    }
  };

  const handleClearHistory = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    setMessages([
      {
        id: "sys-welcome-reset",
        role: "assistant",
        parts: [
          {
            text: "I am Sarah's Assistant. How can I help you? / Je suis l'assistante de Sarah. Comment puis-je vous aider ?",
          },
        ],
        timestamp: new Date(),
      },
    ]);

    addLog("Conversation memory cleared.", "warn");
    setState("IDLE");
  };

  const handleQuickPrompt = (en: string, fr: string) => {
    addLog(`Triggered action: "${en}"`, "info");
    handleSendMessage(`${en} / ${fr}`);
  };

  const handleSimulatedSearch = () => {
    addLog("Running manual job search simulation across 5 sources...", "api");
    addLog("Scored 3 high-potential matches against Sarah's CV profile.", "success");
    setActivePanel("matches");
  };

  const scoreColor = (score: number) => {
    if (score >= 9) return "text-emerald-300 border-emerald-400/30 bg-emerald-400/10";
    if (score >= 7) return "text-sky-300 border-sky-400/30 bg-sky-400/10";
    return "text-amber-300 border-amber-400/30 bg-amber-400/10";
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col font-sans relative overflow-x-hidden cyber-grid selection:bg-cyan-500/30">
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-120px] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-[-200px] w-[420px] h-[420px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col min-h-screen max-w-7xl mx-auto px-4 md:px-8 py-6 z-10 w-full">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 shrink-0 glass px-6 py-5 rounded-3xl border border-white/10 shadow-2xl shadow-cyan-950/30">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full shadow-lg ${
              state === "LISTENING" ? "bg-red-500 animate-pulse shadow-red-500/60" :
              state === "THINKING" ? "bg-amber-400 animate-pulse shadow-amber-400/60" :
              state === "SPEAKING" ? "bg-cyan-400 animate-pulse shadow-cyan-400/60" :
              "bg-emerald-400 shadow-emerald-400/60"
            }`} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display font-semibold text-xl md:text-2xl tracking-wider text-white">Job Hunter Agent for Sarah</span>
                <span className="text-[10px] text-cyan-300 font-mono uppercase tracking-widest px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20">CORTANA · {state}</span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Bilingual AI job search, CV optimisation, cover letters, and application review.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="glass px-3 py-1.5 rounded-full flex gap-2 text-xs font-semibold border border-white/10 shadow-inner">
              <Languages size={14} className="text-cyan-300" />
              <span className="text-cyan-300">EN</span>
              <span className="opacity-30">|</span>
              <span className="text-slate-300">FR</span>
            </div>

            <button
              onClick={handleSimulatedSearch}
              className="px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-200 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400/20 transition-all"
            >
              Run Search Demo
            </button>

            <button
              onClick={() => {
                setIsVoiceOn(!isVoiceOn);
                addLog(`Voice synthesis toggled ${!isVoiceOn ? "ON" : "OFF"}.`, !isVoiceOn ? "success" : "warn");
                if (isVoiceOn && window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              title="Toggle Cortana voice"
              className={`p-2 rounded-full border transition-all duration-300 ${
                isVoiceOn
                  ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/20"
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
            >
              {isVoiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={handleClearHistory}
              title="Reset conversation"
              className="p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-300"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
          <main className="xl:col-span-5 glass p-6 rounded-[2rem] relative overflow-hidden border border-white/10 min-h-[560px] flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none" />

            <div className="relative z-10 flex-1 flex flex-col justify-center items-center py-4">
              <div className="orb flex items-center justify-center scale-90 md:scale-100">
                <div className="orb-inner" />
                <VoiceVisualizer state={state} micStream={micStream} />
              </div>

              <div className="mt-7 text-center max-w-lg px-4 select-text">
                <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-cyan-300 border border-cyan-400/20 bg-cyan-400/5 rounded-full px-4 py-2 mb-4">
                  <Sparkles size={12} /> Premium Job Intelligence
                </div>
                <h1 className="text-2xl md:text-4xl font-light tracking-wide text-white leading-tight">
                  I am Sarah's Assistant. How can I help you?
                </h1>
                <h2 className="text-sm md:text-base font-light text-slate-400 mt-3">
                  Je suis l'assistante de Sarah. Comment puis-je vous aider ?
                </h2>
              </div>
            </div>

            <div className="relative z-10 w-full mt-auto pt-5 border-t border-white/10">
              <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-3">Smart actions / Actions rapides</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleQuickPrompt("Find Sarah's best jobs today and score them out of 10", "Trouve les meilleures offres pour Sarah aujourd'hui et note-les sur 10")}
                  className="px-3 py-3 text-left rounded-2xl bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 text-slate-300 hover:text-cyan-200 transition-all leading-tight"
                >
                  <span className="block font-semibold">🔎 Find jobs</span>
                  <span className="block text-[10px] text-slate-500 mt-1">Score matches / Noter les offres</span>
                </button>
                <button
                  onClick={() => handleQuickPrompt("Generate a tailored cover letter for the selected job", "Génère une lettre de motivation personnalisée pour l'offre sélectionnée")}
                  className="px-3 py-3 text-left rounded-2xl bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 text-slate-300 hover:text-cyan-200 transition-all leading-tight"
                >
                  <span className="block font-semibold">✍️ Cover letter</span>
                  <span className="block text-[10px] text-slate-500 mt-1">FR/EN tailored draft</span>
                </button>
                <button
                  onClick={() => handleQuickPrompt("Review Sarah's CV and suggest improvements for data analyst jobs", "Analyse le CV de Sarah et propose des améliorations pour des postes de data analyst")}
                  className="px-3 py-3 text-left rounded-2xl bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 text-slate-300 hover:text-cyan-200 transition-all leading-tight"
                >
                  <span className="block font-semibold">🧠 CV review</span>
                  <span className="block text-[10px] text-slate-500 mt-1">Suggestions & keywords</span>
                </button>
                <button
                  onClick={() => handleQuickPrompt("Prepare an application checklist before sending through Gmail", "Prépare une checklist de candidature avant l'envoi via Gmail")}
                  className="px-3 py-3 text-left rounded-2xl bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 text-slate-300 hover:text-cyan-200 transition-all leading-tight"
                >
                  <span className="block font-semibold">📨 Gmail review</span>
                  <span className="block text-[10px] text-slate-500 mt-1">Review before send</span>
                </button>
              </div>
            </div>
          </main>

          <section className="xl:col-span-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-[2rem] p-5 border border-white/10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300 font-mono">Scheduled Search</p>
                  <h3 className="text-xl font-semibold text-white mt-1">4 scans per day</h3>
                </div>
                <CheckCircle className="text-emerald-300" size={26} />
              </div>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {SEARCH_TIMES.map((time) => (
                  <div key={time} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-3 text-center">
                    <p className="text-cyan-200 font-mono font-bold">{time}</p>
                    <p className="text-[10px] text-slate-500 mt-1">scan</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {JOB_SITES.map((site) => (
                  <div key={site} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2">
                    <span className="text-sm text-slate-300">{site}</span>
                    <span className="text-[10px] uppercase tracking-widest text-emerald-300">ready</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-[2rem] p-5 border border-white/10">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300 font-mono">Sarah's Criteria</p>
              <h3 className="text-xl font-semibold text-white mt-1 mb-5">Compatibility scoring</h3>
              <div className="space-y-3">
                {["CV keyword match", "French + English fit", "Location / remote preference", "Salary and seniority", "Cover letter strength"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-xs text-cyan-200 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{item}</p>
                      <div className="h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" style={{ width: `${92 - index * 7}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 glass rounded-[2rem] p-5 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300 font-mono">Dashboard</p>
                  <h3 className="text-2xl font-semibold text-white mt-1">Job intelligence workspace</h3>
                </div>
                <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                  {[
                    ["matches", "Matches"],
                    ["cv", "CV"],
                    ["letters", "Letters"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setActivePanel(key as "matches" | "cv" | "letters")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        activePanel === key ? "bg-cyan-400/20 text-cyan-100 border border-cyan-300/20" : "text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activePanel === "matches" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {MOCK_MATCHES.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        selectedJob.id === job.id ? "bg-cyan-500/10 border-cyan-400/30" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex justify-between gap-3 mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-white leading-snug">{job.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">{job.company}</p>
                        </div>
                        <div className={`shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center font-black ${scoreColor(job.score)}`}>
                          {job.score}/10
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{job.location}</p>
                      <p className="text-[10px] text-cyan-300 uppercase tracking-widest mt-2">{job.source}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.highlights.map((tag) => (
                          <span key={tag} className="text-[10px] rounded-full bg-white/5 border border-white/10 px-2 py-1 text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activePanel === "cv" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CV_SUGGESTIONS.map((suggestion) => (
                    <div key={suggestion.title} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white">{suggestion.title}</h4>
                        <span className="text-[10px] uppercase tracking-widest text-cyan-300">{suggestion.impact}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{suggestion.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {activePanel === "letters" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2">Selected role</p>
                    <h4 className="text-lg font-semibold text-white">{selectedJob.title}</h4>
                    <p className="text-sm text-slate-400 mt-1">{selectedJob.company} · {selectedJob.location}</p>
                    <div className={`inline-flex mt-4 px-3 py-2 rounded-xl border text-sm font-bold ${scoreColor(selectedJob.score)}`}>
                      Compatibility: {selectedJob.score}/10
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2">Application flow</p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p>1. Generate tailored cover letter</p>
                      <p>2. Review CV suggestions</p>
                      <p>3. Approve final version</p>
                      <p>4. Send via Gmail OAuth</p>
                    </div>
                    <button
                      onClick={() => handleQuickPrompt(`Draft a bilingual cover letter for ${selectedJob.title} at ${selectedJob.company}`, `Rédige une lettre de motivation bilingue pour ${selectedJob.title} chez ${selectedJob.company}`)}
                      className="mt-4 w-full rounded-xl bg-cyan-400/10 border border-cyan-300/30 text-cyan-100 px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400/20 transition-all"
                    >
                      Generate Cover Letter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6 min-h-0 flex-1">
          <div className="xl:col-span-7 flex flex-col glass p-5 rounded-[2rem] min-h-[360px] border border-white/10">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 shrink-0 select-none">
              <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-cyan-300">
                <Terminal size={14} />
                <span>CORTANA CONVERSATION</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">JOB_AGENT: ONLINE</div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 py-3 text-xs font-mono space-y-3 no-scrollbar select-text">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl border ${
                    msg.role === "user" ? "bg-cyan-500/5 border-cyan-500/20" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 text-[10px] uppercase tracking-wider select-none">
                    <span className={msg.role === "user" ? "text-cyan-300 font-bold" : "text-emerald-300 font-bold"}>
                      {msg.role === "user" ? "👤 SARAH_QUERY" : "💎 CORTANA_FEEDBACK"}
                    </span>
                    <span className="text-slate-500 font-normal">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30">
                    {msg.parts[0].text}
                  </div>

                  {msg.role === "assistant" && browserHasSpeechSynth && isVoiceOn && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => speakAloud(msg.parts[0].text)}
                        className="bg-white/5 hover:bg-cyan-500/10 text-cyan-300 border border-white/10 hover:border-cyan-500/20 px-2.5 py-1 rounded-md text-[10px] flex items-center gap-1.5 transition-all duration-200"
                        title="Speak response again"
                      >
                        <Play size={10} className="fill-current" />
                        <span>REPLAY VOICE</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="xl:col-span-5 glass p-5 rounded-[2rem] flex flex-col min-h-[360px] border border-white/10">
            <div className="text-[10px] font-mono tracking-widest text-[#94a3b8] uppercase pb-3 border-b border-white/10 flex items-center gap-2">
              <Info size={12} className="text-cyan-300" />
              <span>NEURAL CORE STATUS LOGS</span>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-1.5 text-[10px] font-mono select-text">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">Listening for system events...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-2 leading-tight">
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    <span className={`shrink-0 font-bold ${
                      log.type === "success" ? "text-emerald-300" :
                      log.type === "warn" ? "text-red-300" :
                      log.type === "api" ? "text-violet-300" : "text-cyan-300"
                    }`}>
                      {log.type.toUpperCase()}:
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <footer className="shrink-0 flex flex-col items-center gap-3">
          <div className="w-full max-w-5xl flex items-center gap-3 glass p-2 rounded-2xl border border-white/10">
            <div className="hidden md:flex flex-col pl-4 text-left select-none shrink-0 pr-4 border-r border-white/10">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">VOICE TRANSCEIVER</span>
              <span className="text-xs font-semibold text-slate-300">
                {state === "LISTENING" ? "Listening..." : state === "THINKING" ? "Thinking..." : state === "SPEAKING" ? "Speaking..." : "Ready"}
              </span>
            </div>

            <button
              onClick={toggleMic}
              disabled={!browserHasSpeech}
              title={state === "LISTENING" ? "Mute Microphone" : "Speak to Cortana"}
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 relative shrink-0 border disabled:opacity-30 ${
                state === "LISTENING"
                  ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse outline outline-offset-2 outline-red-500/20 shadow-lg"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-inner"
              }`}
            >
              {state === "LISTENING" ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex-1 flex gap-2 items-center"
            >
              <input
                type="text"
                placeholder={state === "LISTENING" ? "Cortana is listening..." : "Ask Cortana to find jobs, score a role, improve the CV, or draft a cover letter..."}
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                disabled={state === "LISTENING"}
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 text-slate-100 placeholder-slate-500 transition-all duration-200 disabled:opacity-40 select-text font-sans"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center hover:bg-cyan-500/20 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-white/10 disabled:hover:text-slate-500 transition-all duration-300"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

          <div className="faded-text text-center text-[10px] md:text-xs">
            {state === "LISTENING" ? "Listening... / Écoute en cours..." :
             state === "THINKING" ? "Processing job intelligence... / Analyse en cours..." :
             state === "SPEAKING" ? "Voice projection activated / Sortie vocale active" :
             "Ready to hunt jobs for Sarah / Prête à chercher des offres pour Sarah"}
          </div>
        </footer>
      </div>
    </div>
  );
}
