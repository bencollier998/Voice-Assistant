import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type AssistantState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
type LanguageMode = "EN" | "FR" | "BILINGUAL";
type ApplicationStatus = "New" | "Review CV" | "Cover Letter" | "Ready to Apply" | "Applied";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
};

type JobMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  site: string;
  score: number;
  language: "EN" | "FR" | "EN/FR";
  salary: string;
  contract: string;
  remote: string;
  status: ApplicationStatus;
  strengths: string[];
  gaps: string[];
};

type CvSuggestion = {
  title: string;
  impact: "High" | "Medium" | "Low";
  suggestion: string;
};

const searchSites = [
  "Welcome to the Jungle",
  "APEC",
  "LinkedIn Jobs",
  "Indeed",
  "France Travail",
];

const scheduleRuns = ["08:00", "12:00", "16:00", "20:00"];

const jobMatches: JobMatch[] = [
  {
    id: "job-001",
    title: "Data Analyst",
    company: "Maison Lumière",
    location: "Paris / Hybrid",
    site: "Welcome to the Jungle",
    score: 9.2,
    language: "EN/FR",
    salary: "€42k–€48k",
    contract: "CDI",
    remote: "Hybrid 3 days",
    status: "Cover Letter",
    strengths: ["Excel reporting", "Data cleaning", "Bilingual communication", "Stakeholder support"],
    gaps: ["Add SQL examples", "Mention dashboard ownership"],
  },
  {
    id: "job-002",
    title: "Junior Business Analyst",
    company: "APEC Partner Firm",
    location: "Île-de-France",
    site: "APEC",
    score: 8.7,
    language: "FR",
    salary: "€38k–€44k",
    contract: "CDI",
    remote: "Hybrid",
    status: "Review CV",
    strengths: ["Analytical mindset", "Process improvement", "Client communication"],
    gaps: ["Translate CV summary into French", "Add business impact metrics"],
  },
  {
    id: "job-003",
    title: "Operations Data Coordinator",
    company: "Northstar Systems",
    location: "Remote Europe",
    site: "LinkedIn Jobs",
    score: 8.1,
    language: "EN",
    salary: "£34k–£39k",
    contract: "Full time",
    remote: "Remote",
    status: "Ready to Apply",
    strengths: ["Operational accuracy", "Spreadsheet automation", "Clear reporting"],
    gaps: ["Add examples of data validation", "Mention cross-team coordination"],
  },
  {
    id: "job-004",
    title: "Reporting Assistant",
    company: "Cobalt Conseil",
    location: "Lyon / Remote",
    site: "Indeed",
    score: 7.6,
    language: "FR",
    salary: "€32k–€36k",
    contract: "CDD to CDI",
    remote: "2 days remote",
    status: "New",
    strengths: ["Reporting discipline", "Detail focus", "Admin/data experience"],
    gaps: ["Clarify French working proficiency", "Add reporting software keywords"],
  },
];

const cvSuggestions: CvSuggestion[] = [
  {
    title: "Add a bilingual profile headline",
    impact: "High",
    suggestion: "Open Sarah's CV with a short EN/FR profile that matches data, operations, and client-facing roles.",
  },
  {
    title: "Quantify data work",
    impact: "High",
    suggestion: "Add numbers: records cleaned, reports delivered, turnaround improvements, or error reductions.",
  },
  {
    title: "Create a French CV variant",
    impact: "Medium",
    suggestion: "For APEC and France Travail, keep a polished French version with French job-title keywords.",
  },
  {
    title: "Add a skills evidence block",
    impact: "Medium",
    suggestion: "Under each core skill, add one proof point from Sarah's experience rather than only listing tools.",
  },
];

const compatibilitySignals = [
  { label: "Skills match", value: 92 },
  { label: "Experience level", value: 84 },
  { label: "Language fit", value: 96 },
  { label: "Location fit", value: 88 },
  { label: "CV readiness", value: 76 },
];

const coverLetterPreview = `Dear Hiring Team,

I am writing to express Sarah's interest in the Data Analyst position. Her experience in data cleaning, reporting accuracy, and stakeholder communication makes her a strong match for this role.

Sarah brings a bilingual English/French profile, a careful approach to data quality, and the ability to translate complex information into clear, useful insight.

Kind regards,
Sarah`;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function ScoreRing({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(10, score));
  const percentage = normalized * 10;

  return (
    <div className="score-ring" style={{ "--score": `${percentage}%` } as React.CSSProperties}>
      <div>
        <strong>{normalized.toFixed(1)}</strong>
        <span>/10</span>
      </div>
    </div>
  );
}

function VoiceOrb({ state }: { state: AssistantState }) {
  const bars = Array.from({ length: 54 }, (_, index) => index);

  return (
    <div className={`voice-orb ${state.toLowerCase()}`}>
      <div className="orb-halo halo-one" />
      <div className="orb-halo halo-two" />
      <div className="orb-core">
        <div className="orb-grid" />
        <div className="orb-letter">C</div>
      </div>

      <div className="voice-bars" aria-hidden="true">
        {bars.map((bar) => (
          <span
            key={bar}
            style={{
              height: `${14 + ((bar * 9) % 64)}px`,
              animationDelay: `${bar * 0.035}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, selected, onSelect }: { job: JobMatch; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`job-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="job-card-main">
        <div>
          <span className="source-chip">{job.site}</span>
          <h3>{job.title}</h3>
          <p>{job.company} · {job.location}</p>
        </div>

        <div className="job-score">
          <strong>{job.score.toFixed(1)}</strong>
          <span>/10</span>
        </div>
      </div>

      <div className="job-card-meta">
        <span>{job.salary}</span>
        <span>{job.contract}</span>
        <span>{job.remote}</span>
        <span>{job.language}</span>
      </div>

      <div className="status-pill">{job.status}</div>
    </button>
  );
}

export default function App() {
  const [assistantState, setAssistantState] = useState<AssistantState>("IDLE");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("BILINGUAL");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [inputText, setInputText] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(jobMatches[0].id);
  const [isSearchRunning, setIsSearchRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "I am Sarah's Assistant. How can I help you? / Je suis l'assistante de Sarah. Comment puis-je vous aider ?",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedJob = useMemo(
    () => jobMatches.find((job) => job.id === selectedJobId) ?? jobMatches[0],
    [selectedJobId]
  );

  const averageScore = useMemo(() => {
    const total = jobMatches.reduce((sum, job) => sum + job.score, 0);
    return total / jobMatches.length;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isFrench = languageMode === "FR";

  const generateReply = (prompt: string) => {
    const lower = prompt.toLowerCase();

    if (lower.includes("cover") || lower.includes("lettre")) {
      return isFrench
        ? `J'ai préparé une lettre de motivation ciblée pour ${selectedJob.title} chez ${selectedJob.company}. Sarah doit la relire avant tout envoi Gmail.`
        : `I have prepared a targeted cover letter for ${selectedJob.title} at ${selectedJob.company}. Sarah should review it before any Gmail send.`;
    }

    if (lower.includes("cv")) {
      return isFrench
        ? `Voici ma revue CV pour ${selectedJob.title} chez ${selectedJob.company} :

Score de préparation CV : ${Math.round(selectedJob.score * 10) - 8}%

Points forts à garder :
- ${selectedJob.strengths.join("\n- ")}

Améliorations recommandées :
- ${selectedJob.gaps.join("\n- ")}

Suggestion de résumé CV :
"Profil bilingue anglais/français avec expérience en qualité des données, reporting opérationnel et communication avec les parties prenantes. Capable de transformer des données complexes en informations claires et exploitables."

Avant candidature, je recommande d'adapter le CV avec 3 à 5 mots-clés repris directement de l'offre.`
        : `Here is my CV review for ${selectedJob.title} at ${selectedJob.company}:

CV readiness score: ${Math.round(selectedJob.score * 10) - 8}%

Strengths to keep:
- ${selectedJob.strengths.join("\n- ")}

Recommended improvements:
- ${selectedJob.gaps.join("\n- ")}

Suggested CV profile line:
"Bilingual English/French profile with experience in data quality, operational reporting and stakeholder communication. Able to turn complex data into clear, useful insight."

Before applying, I recommend tailoring the CV with 3 to 5 keywords taken directly from the job description.`;
    }

    if (lower.includes("gmail") || lower.includes("send") || lower.includes("apply") || lower.includes("candidature")) {
      return isFrench
        ? "Je peux préparer la candidature, mais l'envoi Gmail doit rester soumis à validation finale de Sarah."
        : "I can prepare the application package, but Gmail sending should stay behind Sarah's final approval.";
    }

    if (lower.includes("job") || lower.includes("emploi") || lower.includes("search")) {
      return isFrench
        ? "Je vais rechercher sur 5 sites, noter chaque offre de 1 à 10, puis classer les meilleures candidatures selon le CV de Sarah."
        : "I will search 5 job sites, score each role from 1 to 10, then rank the strongest applications against Sarah's CV.";
    }

    return isFrench
      ? "Je suis prête. Donnez-moi les critères : poste, lieu, salaire, langues, télétravail et niveau d'expérience."
      : "I am ready. Give me the criteria: role, location, salary, languages, remote preference and experience level.";
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const textToSpeak = text.split("/")[0].trim();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = languageMode === "FR" ? "fr-FR" : "en-GB";

    utterance.onstart = () => setAssistantState("SPEAKING");
    utterance.onend = () => setAssistantState("IDLE");
    utterance.onerror = () => setAssistantState("IDLE");

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: createId(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInputText("");
    setAssistantState("THINKING");

    window.setTimeout(() => {
      const reply = generateReply(text);

      const assistantMessage: Message = {
        id: createId(),
        role: "assistant",
        text: reply,
        timestamp: new Date(),
      };

      setMessages((previous) => [...previous, assistantMessage]);
      speak(reply);

      if (!voiceEnabled) {
        setAssistantState("IDLE");
      }
    }, 760);
  };

  const runDemoSearch = () => {
    setIsSearchRunning(true);
    setAssistantState("THINKING");

    window.setTimeout(() => {
      setIsSearchRunning(false);
      setAssistantState("IDLE");
      sendMessage("Search jobs and rank compatibility");
    }, 900);
  };

  return (
    <main className="app-shell">
      <div className="grid-overlay" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <section className="workspace">
        <header className="topbar glass">
          <div className="brand-lockup">
            <div className="brand-mark">C</div>
            <div>
              <p className="eyebrow">Cortana · Sarah Station 01</p>
              <h1>Job Hunter Agent for Sarah</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className={`mode-button ${languageMode === "EN" ? "active" : ""}`}
              onClick={() => setLanguageMode("EN")}
            >
              EN
            </button>
            <button
              className={`mode-button ${languageMode === "FR" ? "active" : ""}`}
              onClick={() => setLanguageMode("FR")}
            >
              FR
            </button>
            <button
              className={`mode-button ${languageMode === "BILINGUAL" ? "active" : ""}`}
              onClick={() => setLanguageMode("BILINGUAL")}
            >
              EN/FR
            </button>
            <button className="ghost-button" onClick={() => setVoiceEnabled((previous) => !previous)}>
              Voice {voiceEnabled ? "On" : "Off"}
            </button>
          </div>
        </header>

        <section className="hero-grid">
          <div className="glass hero-card">
            <div className="orb-column">
              <VoiceOrb state={assistantState} />

              <div className="assistant-intro">
                <p className="eyebrow">Voice Interface</p>
                <h2>I am Sarah's Assistant. How can I help you?</h2>
                <p>Je suis l'assistante de Sarah. Comment puis-je vous aider ?</p>
              </div>
            </div>

            <div className="hero-control-panel">
              <div className="live-status">
                <span>Agent status</span>
                <strong>{assistantState}</strong>
              </div>

              <div className="mission-list">
                <div>
                  <span>Mission</span>
                  <strong>Find, score, tailor, apply</strong>
                </div>
                <div>
                  <span>Safety</span>
                  <strong>Review before Gmail send</strong>
                </div>
                <div>
                  <span>Language</span>
                  <strong>{languageMode}</strong>
                </div>
              </div>

              <button className="primary-button" onClick={runDemoSearch}>
                {isSearchRunning ? "Searching..." : "Run job search simulation"}
              </button>
            </div>
          </div>

          <aside className="glass command-card">
            <p className="eyebrow">Scheduled Task Plan</p>
            <h2>4 searches per day across 5 job sites</h2>

            <div className="schedule-grid">
              {scheduleRuns.map((time, index) => (
                <div className="schedule-node" key={time}>
                  <span>Run {index + 1}</span>
                  <strong>{time}</strong>
                </div>
              ))}
            </div>

            <div className="site-stack">
              {searchSites.map((site) => (
                <span key={site}>{site}</span>
              ))}
            </div>

            <div className="architecture-note">
              <strong>Production note</strong>
              <p>
                A real scheduled search needs a backend cron job, job-board API/scraper layer,
                CV parser, scoring model, Gmail OAuth and approval workflow.
              </p>
            </div>
          </aside>
        </section>

        <section className="metrics-strip">
          <div className="glass metric-tile">
            <span>Average match</span>
            <strong>{averageScore.toFixed(1)}/10</strong>
          </div>
          <div className="glass metric-tile">
            <span>Tracked roles</span>
            <strong>{jobMatches.length}</strong>
          </div>
          <div className="glass metric-tile">
            <span>Search sources</span>
            <strong>{searchSites.length}</strong>
          </div>
          <div className="glass metric-tile">
            <span>Applications ready</span>
            <strong>1</strong>
          </div>
        </section>

        <section className="main-grid">
          <div className="glass panel matches-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Compatibility Ranking</p>
                <h2>Matched opportunities</h2>
              </div>
              <span className="panel-badge">Live demo data</span>
            </div>

            <div className="job-list">
              {jobMatches.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selectedJob.id === job.id}
                  onSelect={() => setSelectedJobId(job.id)}
                />
              ))}
            </div>
          </div>

          <div className="glass panel selected-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Selected Match</p>
                <h2>{selectedJob.title}</h2>
              </div>
              <ScoreRing score={selectedJob.score} />
            </div>

            <div className="selected-meta">
              <span>{selectedJob.company}</span>
              <span>{selectedJob.location}</span>
              <span>{selectedJob.salary}</span>
              <span>{selectedJob.contract}</span>
            </div>

            <div className="split-list">
              <div>
                <h3>Compatibility strengths</h3>
                <ul>
                  {selectedJob.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>CV gaps to review</h3>
                <ul>
                  {selectedJob.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="action-row">
              <button onClick={() => sendMessage("Review Sarah's CV for this job")}>Review CV</button>
              <button onClick={() => sendMessage("Generate cover letter for this job")}>Cover letter</button>
              <button onClick={() => sendMessage("Prepare Gmail application for Sarah")}>Prepare Gmail</button>
            </div>
          </div>

          <div className="glass panel cv-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CV Intelligence</p>
                <h2>Suggestions queue</h2>
              </div>
            </div>

            <div className="suggestion-list">
              {cvSuggestions.map((suggestion) => (
                <article key={suggestion.title} className="suggestion-card">
                  <span className={`impact ${suggestion.impact.toLowerCase()}`}>{suggestion.impact}</span>
                  <h3>{suggestion.title}</h3>
                  <p>{suggestion.suggestion}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="glass panel cover-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Application Studio</p>
                <h2>Cover letter preview</h2>
              </div>
              <span className="panel-badge">Needs review</span>
            </div>

            <pre>{coverLetterPreview}</pre>

            <div className="approval-flow">
              <div className="flow-step done">Generate</div>
              <div className="flow-step active">Review</div>
              <div className="flow-step">Approve</div>
              <div className="flow-step">Send Gmail</div>
            </div>
          </div>

          <div className="glass panel signal-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Scoring Model</p>
                <h2>Compatibility signals</h2>
              </div>
            </div>

            <div className="signal-list">
              {compatibilitySignals.map((signal) => (
                <div className="signal-row" key={signal.label}>
                  <div>
                    <span>{signal.label}</span>
                    <strong>{signal.value}%</strong>
                  </div>
                  <div className="signal-bar">
                    <span style={{ width: `${signal.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass panel chat-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Cortana Console</p>
                <h2>Bilingual conversation</h2>
              </div>
              <span className="panel-badge">{voiceEnabled ? "Voice enabled" : "Voice muted"}</span>
            </div>

            <div className="messages">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <span>{message.role === "assistant" ? "Cortana" : "You"}</span>
                  <p>{message.text}</p>
                  <small>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
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
              <button
                type="button"
                className={`mic-button ${assistantState === "LISTENING" ? "listening" : ""}`}
                onClick={() => setAssistantState((previous) => (previous === "LISTENING" ? "IDLE" : "LISTENING"))}
              >
                {assistantState === "LISTENING" ? "Stop" : "Mic"}
              </button>

              <input
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Ask Cortana to search jobs, review CV, generate a cover letter..."
              />

              <button type="submit" className="send-button">
                Send
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
