import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { paymentsAPI, vibeCodeAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const BUILD_STEPS = [
  'Analyzing your prompt and extracting bot intent...',
  'Choosing full-stack architecture and folder structure...',
  'Generating backend API + frontend client scaffolding...',
  'Validating scripts, dependencies, and startup flow...',
  'Packaging workspace files for editor preview...',
];

const SESSION_STORAGE_PREFIX = 'botify:vibe-session';

const INITIAL_FILES = [
  {
    path: 'index.js',
    content: "console.log('Describe your bot in chat to start generating files.');\n",
  },
  {
    path: 'package.json',
    content: JSON.stringify(
      {
        name: 'my-bot',
        version: '1.0.0',
        main: 'index.js',
        scripts: {
          start: 'node index.js',
        },
        dependencies: {},
      },
      null,
      2
    ),
  },
  {
    path: 'README.md',
    content: '# My Bot\n\nUse the chat panel to generate your bot workspace.\n',
  },
];

function extensionToLanguage(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.cjs') || filePath.endsWith('.mjs')) return 'javascript';
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return 'yaml';
  return 'plaintext';
}

function normalizeIncomingFiles(files) {
  if (!Array.isArray(files)) return [];

  return files
    .filter((file) => file && typeof file.path === 'string' && typeof file.content === 'string')
    .map((file) => ({
      path: file.path.trim(),
      content: file.content,
    }))
    .filter((file) => file.path.length > 0);
}

export default function VibeCode() {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content:
        'Welcome to Isolated Workspace. Describe the bot you want, and I will generate a runnable project file system.',
    },
  ]);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [selectedFilePath, setSelectedFilePath] = useState(INITIAL_FILES[0].path);
  const [terminalLogs, setTerminalLogs] = useState([
    '[workspace] Isolated workspace initialized.',
    '[workspace] Awaiting instructions...',
  ]);
  const [credits, setCredits] = useState(null);
  const [sandboxSessionId, setSandboxSessionId] = useState(null);
  const [sandboxStatus, setSandboxStatus] = useState('idle');
  const [previewUrls, setPreviewUrls] = useState(null);
  const [isStartingSandbox, setIsStartingSandbox] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const sandboxCursorRef = useRef(0);
  const sessionHydratedRef = useRef(false);

  const sessionStorageKey = useMemo(
    () => `${SESSION_STORAGE_PREFIX}:${user?.user_id || 'guest'}`,
    [user?.user_id]
  );

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedFilePath) || files[0],
    [files, selectedFilePath]
  );

  const selectedLanguage = extensionToLanguage(selectedFile?.path || '');
  const hasSubmittedPrompt = chatHistory.some(
    (entry) => entry.role === 'user' && typeof entry.content === 'string' && entry.content.trim().length > 0
  );
  const sandboxStatusClass =
    sandboxStatus === 'running'
      ? 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
      : sandboxStatus === 'starting'
        ? 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10'
        : sandboxStatus === 'needs_credits'
          ? 'text-amber-300 border-amber-400/30 bg-amber-500/10'
          : sandboxStatus === 'error'
            ? 'text-rose-300 border-rose-400/30 bg-rose-500/10'
            : 'text-white/60 border-white/10 bg-white/5';

  useEffect(() => {
    let mounted = true;
    const loadCredits = async () => {
      try {
        const response = await paymentsAPI.getCreditsBalance();
        if (mounted) {
          setCredits(response.data?.data?.credits ?? 0);
        }
      } catch {
        if (mounted) {
          setCredits(null);
        }
      }
    };

    loadCredits();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    sessionHydratedRef.current = false;
    setSessionRestored(false);

    const loadBackendSession = async () => {
      try {
        const response = await vibeCodeAPI.loadSession();
        if (!response.data?.success || !response.data?.session) {
          sessionHydratedRef.current = true;
          return;
        }

        const session = response.data.session;
        const savedFiles = normalizeIncomingFiles(session?.files);
        const savedHistory = Array.isArray(session?.chatHistory) ? session.chatHistory : [];
        const savedTerminal = Array.isArray(session?.terminalLogs) ? session.terminalLogs : [];
        const savedPath = typeof session?.selectedFilePath === 'string' ? session.selectedFilePath : null;

        if (savedFiles.length > 0) {
          setFiles(savedFiles);
          setSelectedFilePath(savedPath && savedFiles.some((f) => f.path === savedPath) ? savedPath : savedFiles[0].path);
        }

        if (savedHistory.length > 0) {
          setChatHistory(savedHistory);
        }

        if (savedTerminal.length > 0) {
          setTerminalLogs(savedTerminal);
        }

        if (typeof session?.messageDraft === 'string') {
          setMessage(session.messageDraft);
        }

        setSessionRestored(savedFiles.length > 0 || savedHistory.length > 0 || savedTerminal.length > 0);
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        sessionHydratedRef.current = true;
      }
    };

    loadBackendSession();
  }, [user?.user_id]);

  useEffect(() => {
    if (!sessionHydratedRef.current) {
      return;
    }

    const payload = {
      chatHistory,
      files,
      selectedFilePath,
      terminalLogs: terminalLogs.slice(-300),
      messageDraft: message,
    };

    vibeCodeAPI.saveSession(payload).catch((error) => {
      console.error('Failed to save session:', error);
    });
  }, [chatHistory, files, selectedFilePath, terminalLogs, message]);

  useEffect(() => {
    if (!sandboxSessionId) {
      return undefined;
    }

    let mounted = true;
    const pollLogs = async () => {
      try {
        const response = await vibeCodeAPI.getSandboxLogs(sandboxSessionId, sandboxCursorRef.current);
        const payload = response.data || {};

        if (!mounted || !payload.success) {
          return;
        }

        const newLogs = Array.isArray(payload.logs) ? payload.logs : [];
        if (newLogs.length > 0) {
          setTerminalLogs((prev) => [...prev, ...newLogs.map((line) => `[sandbox] ${line}`)]);
        }

        if (typeof payload.nextCursor === 'number') {
          sandboxCursorRef.current = payload.nextCursor;
        }

        if (payload.status) {
          setSandboxStatus(payload.status);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error?.response?.status === 404) {
          return;
        }

        const errorMessage = error?.response?.data?.message || error.message || 'Sandbox log polling failed';
        setTerminalLogs((prev) => [...prev, `[sandbox:error] ${errorMessage}`]);
        setSandboxStatus('error');
      }
    };

    pollLogs();
    const interval = setInterval(pollLogs, 2500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sandboxSessionId]);

  const handleSend = async () => {
    const prompt = message.trim();
    if (!prompt || isGenerating) return;

    const nextChat = [...chatHistory, { role: 'user', content: prompt }];
    setChatHistory(nextChat);
    setMessage('');
    setIsGenerating(true);
    setTerminalLogs((prev) => [...prev, `[user] ${prompt}`, '[llm] Generating workspace files...']);

    const startedAt = Date.now();
    const stepTimers = BUILD_STEPS.map((step, index) =>
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: step,
          },
        ]);
        setTerminalLogs((prev) => [...prev, `[build:${index + 1}/${BUILD_STEPS.length}] ${step}`]);
      }, 650 * (index + 1))
    );

    try {
      const response = await vibeCodeAPI.generate({
        prompt,
        chatHistory: nextChat,
      });

      const elapsed = Date.now() - startedAt;
      const minBuildMs = 2600;
      if (elapsed < minBuildMs) {
        await new Promise((resolve) => setTimeout(resolve, minBuildMs - elapsed));
      }

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Generation failed');
      }

      if (typeof response.data?.creditsRemaining === 'number') {
        setCredits(response.data.creditsRemaining);
      }

      const incomingFiles = normalizeIncomingFiles(response.data.files);
      if (incomingFiles.length === 0) {
        throw new Error('No files returned from generator');
      }

      setFiles(incomingFiles);
      setSelectedFilePath(incomingFiles[0].path);
      setSandboxSessionId(null);
      setSandboxStatus('idle');
      setPreviewUrls(null);
      sandboxCursorRef.current = 0;
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Generated ${incomingFiles.length} files. You can now inspect, edit, and download the project.`,
        },
      ]);
      setTerminalLogs((prev) => [
        ...prev,
        `[llm] Workspace ready: ${incomingFiles.length} files received.`,
      ]);

      if (response.data?.warning) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.data.warning,
          },
        ]);
        setTerminalLogs((prev) => [...prev, `[warn] ${response.data.warning}`]);
      }
    } catch (error) {
      const apiData = error?.response?.data;
      if (apiData?.needsClarification) {
        const questionText = Array.isArray(apiData.questions)
          ? apiData.questions.join(' ')
          : (apiData.message || 'Please add more details and try again.');

        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: questionText,
          },
        ]);
        setTerminalLogs((prev) => [...prev, `[clarify] ${questionText}`]);
      } else {
        const errorMessage = apiData?.message || error.message || 'Generation failed';
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Generation failed: ${errorMessage}`,
          },
        ]);
        setTerminalLogs((prev) => [...prev, `[error] ${errorMessage}`]);
      }
    } finally {
      stepTimers.forEach((timer) => clearTimeout(timer));
      setIsGenerating(false);
    }
  };

  const handleEditorChange = (value) => {
    const nextContent = value ?? '';
    setFiles((prev) =>
      prev.map((file) =>
        file.path === selectedFile?.path
          ? {
              ...file,
              content: nextContent,
            }
          : file
      )
    );
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) return;

    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.path, file.content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'botify-vibe-workspace.zip');
    setTerminalLogs((prev) => [...prev, '[workspace] Downloaded botify-vibe-workspace.zip']);
  };

  const handleStartSandbox = async () => {
    if (isStartingSandbox || isGenerating || files.length === 0) {
      return;
    }

    setIsStartingSandbox(true);
    setSandboxStatus('starting');
    sandboxCursorRef.current = 0;
    setTerminalLogs((prev) => [
      ...prev,
      '[sandbox] Starting E2B sandbox for the current workspace...',
    ]);

    try {
      const response = await vibeCodeAPI.runSandbox({
        files,
        prompt: chatHistory.filter((entry) => entry.role === 'user').map((entry) => entry.content).join('\n'),
      });

      const payload = response.data || {};
      if (!payload.success) {
        throw new Error(payload.message || 'Failed to start sandbox');
      }

      setSandboxSessionId(payload.sessionId || null);
      if (typeof payload.nextCursor === 'number') {
        sandboxCursorRef.current = payload.nextCursor;
      }
      setSandboxStatus(payload.status || 'running');
      setPreviewUrls(payload.previewUrls || null);
      if (typeof payload.creditsRemaining === 'number') {
        setCredits(payload.creditsRemaining);
      }

      if (Array.isArray(payload.logs) && payload.logs.length > 0) {
        setTerminalLogs((prev) => [...prev, ...payload.logs]);
      }
      setTerminalLogs((prev) => [
        ...prev,
        `[sandbox] VM started${payload.sandboxId ? ` (${payload.sandboxId})` : ''}`,
      ]);
      if (payload.previewUrls?.frontend) {
        setTerminalLogs((prev) => [
          ...prev,
          `[sandbox] Preview URL: ${payload.previewUrls.frontend}`,
        ]);
      }
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiData = error?.response?.data || {};
      const errorMessage = apiData.message || error.message || 'Failed to start sandbox';
      setSandboxStatus(statusCode === 402 ? 'needs_credits' : 'error');

      if (statusCode === 402 && apiData.data?.buyCreditsPath) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `You need ${apiData.data.required} more credit(s) to start the VM. Buy more credits here: ${apiData.data.buyCreditsPath}`,
          },
        ]);
      }

      if (statusCode === 503) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: errorMessage,
          },
        ]);
      }

      setTerminalLogs((prev) => [...prev, `[sandbox:error] ${errorMessage}`]);
    } finally {
      setIsStartingSandbox(false);
    }
  };

  const handleStopSandbox = async () => {
    if (!sandboxSessionId) {
      return;
    }

    try {
      const response = await vibeCodeAPI.stopSandbox(sandboxSessionId);
      const payload = response.data || {};
      if (!payload.success) {
        throw new Error(payload.message || 'Failed to stop sandbox');
      }

      setTerminalLogs((prev) => [...prev, '[sandbox] VM stopped.']);
      setSandboxSessionId(null);
      setSandboxStatus('stopped');
      setPreviewUrls(null);
      sandboxCursorRef.current = 0;
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to stop sandbox';
      setTerminalLogs((prev) => [...prev, `[sandbox:error] ${errorMessage}`]);
    }
  };

  const handleNewSession = async () => {
    try {
      await vibeCodeAPI.deleteSession();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }

    setChatHistory([
      {
        role: 'assistant',
        content:
          'Welcome to Isolated Workspace. Describe the bot you want, and I will generate a runnable project file system.',
      },
    ]);
    setFiles(INITIAL_FILES);
    setSelectedFilePath(INITIAL_FILES[0].path);
    setTerminalLogs([
      '[workspace] Isolated workspace initialized.',
      '[workspace] Awaiting instructions...',
    ]);
    setMessage('');
    setSandboxSessionId(null);
    setSandboxStatus('idle');
    setPreviewUrls(null);
    sandboxCursorRef.current = 0;
    setSessionRestored(false);
  };

  return (
    <div className="h-screen bg-[#070b13] text-gray-100 px-4 py-4 overflow-hidden">
      <div className="h-full flex flex-col gap-4">
        <header className="rounded-2xl border border-white/10 bg-[#0b111a]/95 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-black tracking-tight">Vibe Coder</div>
            <span className="text-xs text-white/45">Build full-stack bots by chatting</span>
          </div>
          <div className="flex items-center gap-2">
            {sessionRestored && (
              <span className="text-[11px] rounded-full px-2 py-1 border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                Session restored
              </span>
            )}
            <Link
              to="/vibe-code/credits"
              className="rounded-full px-3 py-1 text-xs font-semibold bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30"
            >
              Credits: {credits === null ? '...' : credits}
            </Link>
            <button
              type="button"
              onClick={handleNewSession}
              className="rounded-full px-3 py-1 text-xs font-semibold bg-white/5 border border-white/15 text-white/80 hover:bg-white/10"
            >
              New Session
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-sky-300/25 bg-[radial-gradient(circle_at_18%_10%,rgba(99,179,237,0.28),transparent_40%),radial-gradient(circle_at_82%_12%,rgba(56,189,248,0.2),transparent_44%),linear-gradient(140deg,#0a1322,#0b1628_45%,#0d1a2f)] px-6 py-8 relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-[-32px] h-[110px] bg-[radial-gradient(ellipse_at_center,rgba(125,211,252,0.42)_0%,rgba(125,211,252,0.1)_40%,transparent_74%)]" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs text-white/85 mb-4">
              Botify Build Lab
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Describe it once, then <span className="text-cyan-300 italic">enter your lab</span>
            </h1>
            <p className="text-white/65 mt-3 text-base md:text-lg">The full workspace appears after your first prompt so you can focus on intent before tooling.</p>
            <div className="mt-6 rounded-2xl border border-white/15 bg-[#1d2330]/90 p-3 flex gap-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the bot you want (platform, behavior, dependencies)..."
                rows={2}
                className="flex-1 rounded-xl bg-[#111827] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isGenerating || !message.trim()}
                className="self-end rounded-xl px-5 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-400 to-sky-500 text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Sending...' : 'Build now'}
              </button>
            </div>
          </div>
        </section>

        {hasSubmittedPrompt ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="h-full rounded-2xl border border-cyan-400/20 bg-[#0b1018]/95 shadow-[0_0_40px_rgba(24,120,170,0.12)] flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <h1 className="text-sm md:text-base font-semibold">Isolated Workspace Chat</h1>
              <p className="text-[11px] text-white/40 mt-0.5">Step-by-step guided generation</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">JWT secured</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  entry.role === 'user'
                    ? 'ml-auto bg-cyan-500/15 border border-cyan-400/40 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                    : 'mr-auto bg-white/5 border border-white/10 text-gray-200'
                }`}
              >
                {entry.content}
              </div>
            ))}
            {isGenerating && (
              <div className="mr-auto bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/25 text-cyan-100 rounded-xl px-3 py-2 text-sm">
                Building your workspace, step by step...
              </div>
            )}
          </div>
        </section>

        <section className="h-full rounded-2xl border border-cyan-400/20 bg-[#0a0f17]/95 shadow-[0_0_40px_rgba(24,120,170,0.12)] overflow-hidden flex flex-col">
          <div className="h-[70%] min-h-0 border-b border-white/10 flex">
            <aside className="w-56 border-r border-white/10 bg-[#0d1420] flex flex-col">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/60 border-b border-white/10">
                Files
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition ${
                      selectedFilePath === file.path
                        ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30'
                        : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleStartSandbox}
                  disabled={isGenerating || isStartingSandbox || files.length === 0}
                  className="mb-2 w-full rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-400 to-sky-500 text-black hover:from-cyan-300 hover:to-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                >
                  {isStartingSandbox ? 'Starting VM...' : 'Test Bot (Start VM)'}
                </button>
                <button
                  type="button"
                  onClick={handleStopSandbox}
                  disabled={!sandboxSessionId}
                  className="mb-2 w-full rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-rose-500 to-rose-600 text-black hover:from-rose-400 hover:to-rose-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Stop VM
                </button>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-400 to-lime-400 text-black hover:from-emerald-300 hover:to-lime-300 transition"
                >
                  Download Bot (.zip)
                </button>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <Editor
                theme="vs-dark"
                language={selectedLanguage}
                value={selectedFile?.content || ''}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          <div className="h-[30%] min-h-0 bg-[#070b11] text-green-300 font-mono text-xs overflow-y-auto p-3 space-y-1">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center justify-between">
              <span>Terminal</span>
              <div className="flex items-center gap-2">
                {previewUrls?.frontend && (
                  <a
                    href={previewUrls.frontend}
                    target="_blank"
                    rel="noreferrer"
                    className="normal-case tracking-normal text-[11px] rounded-full px-2 py-0.5 border border-cyan-400/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Open Preview
                  </a>
                )}
                <span className={`rounded-full px-2 py-0.5 border ${sandboxStatusClass}`}>{sandboxStatus}</span>
              </div>
            </div>
            {terminalLogs.map((log, index) => (
              <div key={`${log}-${index}`} className="whitespace-pre-wrap break-words">
                {log}
              </div>
            ))}
          </div>
        </section>
      </div>
        ) : (
        <section className="flex-1 min-h-0 rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-[#0b1628] via-[#08111f] to-[#0a1420] grid place-items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1/4 -left-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 text-center px-6 max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-cyan-400/40 flex items-center justify-center bg-cyan-500/10">
                  <div className="w-16 h-16 rounded-full border border-cyan-400/60 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400/40 to-sky-500/30 animate-pulse" />
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Lab is ready</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Send your bot idea above to populate the editor, chat, and terminal. Then hit <span className="font-semibold text-cyan-300">Test Bot</span> to spin up a live VM preview.
            </p>
            <div className="mt-6 p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
              <p className="text-xs text-cyan-200">✨ Pro tip: Be specific about platform and behavior for best results</p>
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
