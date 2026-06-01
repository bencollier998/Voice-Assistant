import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type AssistantState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
};

type JobMatch = {
  title: string;
  company: string;
  location: string;
  site: string;
  score: number;
  language: "EN" | "FR" | "EN/FR";
  status: "New" | "Review" | "Draft Ready" | "Applied";
};

const jobMatches: JobMatch[] = [
  {
    title: "Data Analyst",
    company: "Welcome to the Jungle",
    location: "Paris / Remote",
    site: "Welcome to the Jungle",
    score: 9,
    language: "EN/FR",
    status: "Draft Ready",
  },
  {
    title: "Junior Business Analyst",
    company: "APEC",
    location: "Île-de-France",
    site: "APEC",
    score: 8,
    language: "FR",
    status: "Review",
  },
  {
    title: "Operations Data Coordinator",
    company: "LinkedIn Jobs",
    location: "Remote Europe",
    site: "LinkedIn",
    score: 7,
    language: "EN",
    status: "New",
  },
];

const scheduleRuns = ["08:00", "12:00", "16:00", "20:00"];

function VoiceOrb({ state }: { state: AssistantState }) {
  const bars = Array.from({ length: 36 }, (_, i) => i);

  return (
    <div className={`voice-orb ${state.toLowerCase()}`}>
      <div className="orb-core">
        <div className="orb-ring" />
        <div className="orb-center">C</div>
      </div>

      <div className="visualizer" aria-hidden="true">
        {bars.map((bar) => (
          <span
            key={bar}
            style={{
              height: `${18 + ((bar * 7) % 42)}px`,
              animationDelay: `${bar * 0.04}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [assistantState, setAssistantState] = useState<AssistantState>("IDLE");
  const [inputText, setInputText] = useState("");
  const [isFrenchMode, setIsFrenchMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "I am Sarah's Assistant. How can I help you? / Je suis l'assistante de Sarah. Comment puis-je vous aider ?",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const topScore = useMemo(() => Math.max(...jobMatches.map((job) => job.score)), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateReply = (prompt: string) => {
    const lower = prompt.toLowerCase();

    if (lower.includes("cover") || lower.includes("lettre")) {
      return isFrenchMode
        ? "Bien sûr. Je peux générer une lettre de motivation ciblée, mais Sarah devra la relire avant l'envoi."
        : "Absolutely. I can generate a tailored cover letter, but Sarah should review it before sending.";
    }

    if (lower.includes("cv")) {
      return isFrenchMode
        ? "Je peux comparer le CV de Sarah avec l'offre et proposer des améliorations ciblées."
        : "I can compare Sarah's CV against the job description and suggest targeted improvements.";
    }

    if (lower.includes("job") || lower.includes("emploi") || lower.includes("search")) {
      return isFrenchMode
        ? "Je rechercherai les offres, les classerai de 1 à 10 selon la compatibilité avec le CV, puis préparerai les meilleures candidatures."
        : "I will search job boards, grade matches from 1 to 10 against Sarah's CV, then prepare the strongest applications.";
    }

    return isFrenchMode
      ? "Je suis prête. Donnez-moi les critères de Sarah : poste, lieu, salaire, langues, télétravail et niveau d'expérience."
      : "I am ready. Give me Sarah's criteria: role, location, salary, languages, remote preference and experience level.";
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.replace(/\/.*/, "").trim());
    utterance.lang = isFrenchMode ? "fr-FR" : "en-GB";

    utterance.onstart = () => setAssistantState("SPEAKING");
    utterance.onend = () => setAssistantState("IDLE");
    utterance.onerror = () => setAssistantState("IDLE");

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setAssistantState("THINKING");

    window.setTimeout(() => {
      const reply = generateReply(text);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speak(reply);

      if (!voiceEnabled) {
        setAssistantState("IDLE");
      }
    }, 650);
  };

  const toggleListening = () => {
    setAssistantState((prev) => (prev === "LISTENING" ? "IDLE" : "LISTENING"));
  };

  return (
    <main className="app-shell">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <section className="hero-panel">
        <nav className="topbar">
          <div>
            <p className="eyebrow">Cortana Systems / Bilingual Agent</p>
            <h1>Job Hunter Agent for Sarah</h1>
          </div>

          <div className="topbar-actions">
            <button onClick={() => setIsFrenchMode((prev) => !prev)} className="pill-button">
              {isFrenchMode ? "FR Mode" : "EN Mode"}
            </button>
            <button onClick={() => setVoiceEnabled((prev) => !prev)} className="pill-button">
              Voice {voiceEnabled ? "On" : "Off"}
            </button>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="assistant-card glass">
            <VoiceOrb state={assistantState} />

            <div className="assistant-copy">
              <p className="eyebrow">Sarah Station 01</p>
              <h2>I am Sarah's Assistant. How can I help you?</h2>
              <p>Je suis l'assistante de Sarah. Comment puis-je vous aider ?</p>
            </div>

            <div className="status-row">
              <span>Status</span>
              <strong>{assistantState}</strong>
            </div>
          </div>

          <div className="dashboard-card glass">
            <div className="section-heading">
              <p className="eyebrow">Live Mission Control</p>
              <h2>Job search dashboard</h2>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <span>Best Match</span>
                <strong>{topScore}/10</strong>
              </div>
              <div className="metric-card">
                <span>Daily Searches</span>
                <strong>4x</strong>
              </div>
              <div className="metric-card">
                <span>Job Sites</span>
                <strong>5</strong>
              </div>
              <div className="metric-card">
                <span>Mode</span>
                <strong>EN/FR</strong>
              </div>
            </div>

            <div className="schedule-card">
              <div>
                <span>Scheduled search times</span>
                <strong>{scheduleRuns.join(" · ")}</strong>
              </div>
              <small>Backend cron/API connection required for real automated searching.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="glass panel job-panel">
          <div className="section-heading">
            <p className="eyebrow">Compatibility Ranking</p>
            <h2>Recommended matches</h2>
          </div>

          <div className="job-list">
            {jobMatches.map((job) => (
              <article key={`${job.title}-${job.company}`} className="job-card">
                <div>
                  <h3>{job.title}</h3>
                  <p>{job.company} · {job.location}</p>
                  <span>{job.site} · {job.language}</span>
                </div>

                <div className="score-box">
                  <strong>{job.score}/10</strong>
                  <small>{job.status}</small>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="glass panel">
          <div className="section-heading">
            <p className="eyebrow">CV Intelligence</p>
            <h2>CV suggestions</h2>
          </div>

          <ul className="insight-list">
            <li>Highlight bilingual English/French communication.</li>
            <li>Add measurable results from previous roles.</li>
            <li>Tailor the profile section to each job description.</li>
            <li>Mirror job keywords before applying.</li>
          </ul>
        </div>

        <div className="glass panel">
          <div className="section-heading">
            <p className="eyebrow">Application Studio</p>
            <h2>Cover letter generator</h2>
          </div>

          <p className="muted">
            Generate a custom cover letter, review edits, then approve before Gmail sending.
          </p>

          <button
            className="primary-button"
            onClick={() => sendMessage("Generate a tailored cover letter for Sarah")}
          >
            Generate draft
          </button>
        </div>

        <div className="glass panel chat-panel">
          <div className="section-heading">
            <p className="eyebrow">Conversation</p>
            <h2>Cortana chat</h2>
          </div>

          <div className="messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <span>{message.role === "assistant" ? "Cortana" : "You"}</span>
                <p>{message.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            className="input-dock"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(inputText);
            }}
          >
            <button type="button" onClick={toggleListening} className="mic-button">
              {assistantState === "LISTENING" ? "Stop" : "Mic"}
            </button>

            <input
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Ask Cortana to search jobs, review CV, or draft a cover letter..."
            />

            <button type="submit" className="send-button">
              Send
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
