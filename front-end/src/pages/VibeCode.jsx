import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import api from '../utils/api';

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

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedFilePath) || files[0],
    [files, selectedFilePath]
  );

  const selectedLanguage = extensionToLanguage(selectedFile?.path || '');

  const handleSend = async () => {
    const prompt = message.trim();
    if (!prompt || isGenerating) return;

    const nextChat = [...chatHistory, { role: 'user', content: prompt }];
    setChatHistory(nextChat);
    setMessage('');
    setIsGenerating(true);
    setTerminalLogs((prev) => [...prev, `[user] ${prompt}`, '[llm] Generating workspace files...']);

    try {
      const response = await api.post('/vibecode/generate', {
        prompt,
        chatHistory: nextChat,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Generation failed');
      }

      const incomingFiles = normalizeIncomingFiles(response.data.files);
      if (incomingFiles.length === 0) {
        throw new Error('No files returned from generator');
      }

      setFiles(incomingFiles);
      setSelectedFilePath(incomingFiles[0].path);
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
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Generation failed';
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Generation failed: ${errorMessage}`,
        },
      ]);
      setTerminalLogs((prev) => [...prev, `[error] ${errorMessage}`]);
    } finally {
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

  return (
    <div className="h-screen bg-[#05070a] text-gray-100 px-4 py-4">
      <div className="h-full grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="h-full rounded-2xl border border-white/10 bg-[#0b1018] flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h1 className="text-sm md:text-base font-semibold">Isolated Workspace Chat</h1>
            <span className="text-xs text-white/60">JWT secured</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  entry.role === 'user'
                    ? 'ml-auto bg-cyan-500/15 border border-cyan-400/30 text-cyan-100'
                    : 'mr-auto bg-white/5 border border-white/10 text-gray-200'
                }`}
              >
                {entry.content}
              </div>
            ))}
            {isGenerating && (
              <div className="mr-auto bg-white/5 border border-white/10 text-gray-300 rounded-xl px-3 py-2 text-sm">
                Generating files...
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the bot you want (platform, behavior, dependencies)..."
                rows={3}
                className="flex-1 rounded-xl bg-[#111827] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isGenerating || !message.trim()}
                className="self-end rounded-xl px-4 py-2 text-sm font-semibold bg-cyan-500 text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </section>

        <section className="h-full rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden flex flex-col">
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
                  onClick={handleDownloadZip}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition"
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
            {terminalLogs.map((log, index) => (
              <div key={`${log}-${index}`} className="whitespace-pre-wrap break-words">
                {log}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
