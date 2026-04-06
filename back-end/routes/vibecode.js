import express from 'express';
import jwt from 'jsonwebtoken';
import { Sandbox } from '@e2b/code-interpreter';
import { getOrCreateUserCredits, consumeCredits } from '../services/creditService.js';
import supabase from '../config/database.js';

const router = express.Router();

// Auth middleware - keeps JWT protection unchanged.
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const SYSTEM_PROMPT = [
  'You are Node.js Bot Architect for Botify.',
  'Produce a runnable FULL-STACK project based on user instructions.',
  'The project MUST include a React frontend and an Express backend.',
  'Do NOT use Twilio or any paid third-party provider SDK by default unless the user explicitly requests it.',
  'Prefer native/Express logic and mock adapters with environment-safe placeholders.',
  'Return ONLY valid JSON. Do not include markdown fences, commentary, or extra text.',
  'JSON schema is strictly:',
  '{"files":[{"path":"front-end/src/main.jsx","content":"..."},{"path":"back-end/server.js","content":"..."},{"path":"README.md","content":"..."}]}',
  'Rules:',
  '1) Always include root package.json, front-end/package.json, back-end/package.json, and README.md.',
  '2) Always include front-end/index.html, front-end/src/main.jsx, front-end/src/App.jsx.',
  '3) Always include back-end/server.js and back-end/.env.example.',
  '4) front-end must be React + Vite and call backend through /api via Vite proxy.',
  '5) back-end must be Express with CORS + JSON middleware + /api/health endpoint.',
  '6) Include a simple credit system in backend with /api/credits, /api/credits/use, /api/credits/purchase.',
  '7) Frontend must show current credits and allow buying credits.',
  '8) Do not hard-fail on optional providers if env vars are missing.',
  '9) README.md must explain local setup and run commands clearly.',
  '10) Paths must be relative and safe (no ../ and no absolute paths).',
  '11) File contents must be plain source text.',
].join('\n');

const STATIC_FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

const sandboxSessions = new Map();

function normalizeModelName(modelName) {
  if (!modelName || typeof modelName !== 'string') return '';
  return modelName.trim();
}

function collectGroqApiKeys() {
  const keys = [];
  const seen = new Set();

  const addKey = (key) => {
    if (!key || typeof key !== 'string') return;
    const normalized = key.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    keys.push(normalized);
  };

  addKey(process.env.GROQ_API_KEY);

  const list = process.env.GROQ_API_KEYS || '';
  list
    .split(',')
    .map((k) => k.trim())
    .forEach(addKey);

  return keys;
}

function isModelNotFoundError(err) {
  const message = (err?.message || '').toLowerCase();
  return err?.status === 404 || message.includes('model') && message.includes('not found');
}

function isRateLimitOrQuotaError(err) {
  const message = (err?.message || '').toLowerCase();
  return err?.status === 429 || message.includes('quota') || message.includes('rate limit') || message.includes('too many requests');
}

function extractRetryAfterSeconds(err) {
  if (typeof err?.retryAfter === 'number' && err.retryAfter > 0) {
    return Math.ceil(err.retryAfter);
  }

  const message = err?.message || '';
  const retryInMatch = message.match(/retry\s+in\s+([\d.]+)s?/i);
  if (retryInMatch) {
    return Math.max(1, Math.ceil(Number(retryInMatch[1])));
  }

  return 30;
}

async function callGroqGenerate({ apiKey, model, llmPrompt }) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: llmPrompt },
      ],
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const retryAfterHeader = response.headers.get('retry-after');
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;

  let payload;
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.error?.message || `Groq request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.retryAfter = Number.isFinite(retryAfter) ? retryAfter : undefined;
    err.payload = payload;
    throw err;
  }

  const rawText = payload?.choices?.[0]?.message?.content || '';
  if (!rawText) {
    const err = new Error('Groq response did not include message content.');
    err.status = 502;
    throw err;
  }

  return rawText;
}

async function generateWithGroqFallback(llmPrompt, configuredModel, apiKeys) {
  const modelsToTry = [configuredModel, ...STATIC_FALLBACK_MODELS].filter(Boolean);
  const uniqueModels = [...new Set(modelsToTry)];
  let lastError;

  for (const modelName of uniqueModels) {
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
      const key = apiKeys[keyIndex];
      try {
        const rawText = await callGroqGenerate({ apiKey: key, model: modelName, llmPrompt });
        return { rawText, modelName, keyIndex };
      } catch (err) {
        lastError = err;

        const shouldRotateKey = isRateLimitOrQuotaError(err) || err?.status === 401 || err?.status === 403;
        if (shouldRotateKey) {
          continue;
        }

        if (isModelNotFoundError(err)) {
          break;
        }

        throw err;
      }
    }
  }

  throw lastError || new Error('All Groq API keys/models failed for generation.');
}

function stripCodeFences(text) {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  return trimmed
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

function collectUserIntentText(prompt, chatHistory) {
  const history = Array.isArray(chatHistory) ? chatHistory : [];
  const userMessages = history
    .filter((entry) => entry && entry.role === 'user' && typeof entry.content === 'string')
    .map((entry) => entry.content.trim())
    .filter(Boolean);

  return [...userMessages, String(prompt || '').trim()].filter(Boolean).join('\n');
}

function analyzePromptClarity(intentText) {
  const text = String(intentText || '').toLowerCase();

  const hasPlatform = /(whatsapp|telegram|discord|slack|instagram|email|web|api|backend|frontend|react|express)/i.test(text);
  const hasObjective = /(send|reply|build|create|automate|schedule|moderate|manage|track|notify|integrate|generate)/i.test(text);
  const hasBehavior = /(every|daily|hourly|when|if|trigger|on message|on command|workflow|flow)/i.test(text);

  const missing = [];
  if (!hasPlatform) missing.push('platform (e.g., WhatsApp, Telegram, Discord, Email)');
  if (!hasObjective) missing.push('main objective (what the bot should do)');
  if (!hasBehavior) missing.push('trigger/frequency (when it should act)');

  return {
    clear: missing.length === 0,
    missing,
  };
}

function ensureJsonFileDefaults(files, path, patcher) {
  const index = files.findIndex((file) => file.path === path);
  if (index === -1) return;

  try {
    const parsed = JSON.parse(files[index].content);
    const updated = patcher(parsed);
    files[index].content = JSON.stringify(updated, null, 2);
  } catch {
    // If JSON is invalid, leave it to starter upsert logic elsewhere.
  }
}

function upsertFile(files, path, content) {
  const index = files.findIndex((file) => file.path === path);
  if (index === -1) {
    files.push({ path, content });
  } else {
    files[index].content = content;
  }
}

function normalizeGeneratedWorkspace(files, prompt) {
  const starterFiles = buildReactExpressStarter(prompt, 'Runtime defaults were normalized for runnability.');
  const starterMap = new Map(starterFiles.map((file) => [file.path, file.content]));
  const allowTwilio = /\btwilio\b/i.test(String(prompt || ''));

  // Ensure core files exist.
  [
    'package.json',
    'front-end/package.json',
    'front-end/vite.config.js',
    'front-end/index.html',
    'front-end/src/main.jsx',
    'front-end/src/App.jsx',
    'back-end/package.json',
    'back-end/server.js',
    'back-end/.env.example',
    'README.md',
  ].forEach((path) => {
    if (!files.some((file) => file.path === path) && starterMap.has(path)) {
      upsertFile(files, path, starterMap.get(path));
    }
  });

  // Merge root package defaults.
  ensureJsonFileDefaults(files, 'package.json', (pkg) => ({
    ...pkg,
    private: true,
    workspaces: ['front-end', 'back-end'],
    scripts: {
      ...(pkg.scripts || {}),
      start: 'concurrently "npm --prefix back-end run dev" "npm --prefix front-end run dev"',
      dev: 'concurrently "npm --prefix back-end run dev" "npm --prefix front-end run dev"',
      'dev:frontend': 'npm --prefix front-end run dev',
      'dev:backend': 'npm --prefix back-end run dev',
      'install:all': 'npm install && npm --prefix front-end install && npm --prefix back-end install',
      postinstall: 'npm --prefix front-end install && npm --prefix back-end install',
    },
    devDependencies: {
      ...(pkg.devDependencies || {}),
      concurrently: pkg.devDependencies?.concurrently || '^9.0.1',
    },
  }));

  // Merge frontend package defaults.
  ensureJsonFileDefaults(files, 'front-end/package.json', (pkg) => ({
    ...pkg,
    private: true,
    type: 'module',
    scripts: {
      ...(pkg.scripts || {}),
      dev: pkg.scripts?.dev || 'vite --port 3000',
      build: pkg.scripts?.build || 'vite build',
      preview: pkg.scripts?.preview || 'vite preview',
    },
    dependencies: {
      ...(pkg.dependencies || {}),
      react: pkg.dependencies?.react || '^19.0.0',
      'react-dom': pkg.dependencies?.['react-dom'] || '^19.0.0',
      axios: pkg.dependencies?.axios || '^1.7.9',
    },
    devDependencies: {
      ...(pkg.devDependencies || {}),
      vite: pkg.devDependencies?.vite || '^5.4.8',
      '@vitejs/plugin-react': pkg.devDependencies?.['@vitejs/plugin-react'] || '^4.3.2',
    },
  }));

  // Merge backend package defaults.
  ensureJsonFileDefaults(files, 'back-end/package.json', (pkg) => ({
    ...pkg,
    private: true,
    type: 'module',
    scripts: {
      ...(pkg.scripts || {}),
      dev: pkg.scripts?.dev || 'nodemon server.js',
      start: pkg.scripts?.start || 'node server.js',
    },
    dependencies: {
      ...(pkg.dependencies || {}),
      express: pkg.dependencies?.express || '^4.21.1',
      cors: pkg.dependencies?.cors || '^2.8.5',
      dotenv: pkg.dependencies?.dotenv || '^16.4.5',
    },
    devDependencies: {
      ...(pkg.devDependencies || {}),
      nodemon: pkg.devDependencies?.nodemon || '^3.1.7',
    },
  }));

  // Unless explicitly requested, strip Twilio dependency if model injected it.
  if (!allowTwilio) {
    ensureJsonFileDefaults(files, 'back-end/package.json', (pkg) => {
      const deps = { ...(pkg.dependencies || {}) };
      const devDeps = { ...(pkg.devDependencies || {}) };
      delete deps.twilio;
      delete devDeps.twilio;
      return {
        ...pkg,
        dependencies: deps,
        devDependencies: devDeps,
      };
    });
  }

  // If backend server is missing core express bootstrap or is twilio-crash prone, replace with starter backend.
  const backendServer = files.find((file) => file.path === 'back-end/server.js');
  const backendNeedsReset =
    !backendServer ||
    !/express\(/.test(backendServer.content) ||
    !/\/api\/health/.test(backendServer.content) ||
    (!allowTwilio && /twilio/i.test(backendServer.content)) ||
    (/twilio/i.test(backendServer.content) && !/if\s*\(!process\.env\.TWILIO_ACCOUNT_SID\)/.test(backendServer.content));

  if (backendNeedsReset && starterMap.has('back-end/server.js')) {
    upsertFile(files, 'back-end/server.js', starterMap.get('back-end/server.js'));
  }

  if (!allowTwilio) {
    const readme = files.find((file) => file.path === 'README.md');
    if (readme && /twilio/i.test(readme.content) && starterMap.has('README.md')) {
      readme.content = starterMap.get('README.md');
    }
  }

  return files;
}

function buildReactExpressStarter(prompt, note) {
  const rootPackageJson = {
    name: 'botify-vibe-workspace',
    private: true,
    version: '1.0.0',
    workspaces: ['front-end', 'back-end'],
    scripts: {
      start: 'concurrently "npm --prefix back-end run dev" "npm --prefix front-end run dev"',
      dev: 'concurrently "npm --prefix back-end run dev" "npm --prefix front-end run dev"',
      'dev:frontend': 'npm --prefix front-end run dev',
      'dev:backend': 'npm --prefix back-end run dev',
      'install:all': 'npm install && npm --prefix front-end install && npm --prefix back-end install',
      postinstall: 'npm --prefix front-end install && npm --prefix back-end install'
    },
    devDependencies: {
      concurrently: '^9.0.1'
    }
  };

  const frontendPackageJson = {
    name: 'botify-vibe-frontend',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite --port 3000',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      axios: '^1.7.9'
    },
    devDependencies: {
      vite: '^5.4.8',
      '@vitejs/plugin-react': '^4.3.2'
    }
  };

  const backendPackageJson = {
    name: 'botify-vibe-backend',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'nodemon server.js',
      start: 'node server.js'
    },
    dependencies: {
      cors: '^2.8.5',
      dotenv: '^16.4.5',
      express: '^4.21.1'
    },
    devDependencies: {
      nodemon: '^3.1.7'
    }
  };

  const appDescription = prompt || 'Generated by Botify Vibe Coder';
  const noteLine = note ? `> ${note}\n\n` : '';

  return [
    { path: 'package.json', content: JSON.stringify(rootPackageJson, null, 2) },
    {
      path: 'README.md',
      content: `# Botify Vibe Workspace\n\n${noteLine}## Project\n\n${appDescription}\n\n## Structure\n\n- front-end: React + Vite app\n- back-end: Express API with credit system\n\n## Startup Instructions\n\n### Option A: Run from root (recommended)\n\n1. Install all dependencies:\n\n   npm run install:all\n\n2. Start both services:\n\n   npm run dev\n\n### Option B: Run manually\n\n1. Root dependencies:\n\n   npm install\n\n2. Backend:\n\n   cd back-end\n   npm install\n   npm run dev\n\n3. Frontend (new terminal):\n\n   cd front-end\n   npm install\n   npm run dev\n\n## URLs\n\n- Frontend: http://localhost:3000\n- Backend Health: http://localhost:5000/api/health\n- Credits API: http://localhost:5000/api/credits?userId=demo-user\n\n## Credits Flow\n\n- Users start with default credits\n- /api/credits/use deducts credits\n- /api/credits/purchase adds credits\n- If credits are exhausted, backend returns HTTP 402 and user must buy more credits\n`
    },
    {
      path: '.gitignore',
      content: 'node_modules\nfront-end/node_modules\nback-end/node_modules\n.env\nback-end/.env\n'
    },
    { path: 'front-end/package.json', content: JSON.stringify(frontendPackageJson, null, 2) },
    {
      path: 'front-end/vite.config.js',
      content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    port: 3000,\n    proxy: {\n      '/api': {\n        target: 'http://localhost:5000',\n        changeOrigin: true\n      }\n    }\n  }\n});\n`
    },
    {
      path: 'front-end/index.html',
      content: `<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>Botify Vibe Frontend</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.jsx\"></script>\n  </body>\n</html>\n`
    },
    {
      path: 'front-end/src/main.jsx',
      content: `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\n\ncreateRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`
    },
    {
      path: 'front-end/src/App.jsx',
      content: `import { useEffect, useState } from 'react';\nimport axios from 'axios';\n\nconst USER_ID = 'demo-user';\n\nexport default function App() {\n  const [status, setStatus] = useState('Ready');\n  const [credits, setCredits] = useState(null);\n\n  const checkHealth = async () => {\n    try {\n      const res = await axios.get('/api/health');\n      setStatus(res.data?.message || 'Backend reachable');\n    } catch (err) {\n      setStatus(err.response?.data?.message || err.message);\n    }\n  };\n\n  const loadCredits = async () => {\n    try {\n      const res = await axios.get('/api/credits', { params: { userId: USER_ID } });\n      setCredits(res.data?.credits ?? 0);\n    } catch (err) {\n      setStatus(err.response?.data?.message || err.message);\n    }\n  };\n\n  const useCredit = async () => {\n    try {\n      const res = await axios.post('/api/credits/use', { userId: USER_ID, amount: 1, reason: 'generate-bot' });\n      setCredits(res.data?.creditsRemaining ?? 0);\n      setStatus('Credit used successfully.');\n    } catch (err) {\n      setStatus(err.response?.data?.message || err.message);\n      if (err.response?.status === 402) {\n        setStatus('No credits left. Please purchase more credits.');\n      }\n    }\n  };\n\n  const buyCredits = async () => {\n    try {\n      const res = await axios.post('/api/credits/purchase', { userId: USER_ID, amount: 10 });\n      setCredits(res.data?.credits ?? 0);\n      setStatus('Purchased 10 credits.');\n    } catch (err) {\n      setStatus(err.response?.data?.message || err.message);\n    }\n  };\n\n  useEffect(() => {\n    loadCredits();\n  }, []);\n\n  return (\n    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 720 }}>\n      <h1>Botify Vibe Workspace</h1>\n      <p>${appDescription.replace(/`/g, "'")}</p>\n\n      <div style={{ margin: '12px 0', padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>\n        <p><strong>User:</strong> {USER_ID}</p>\n        <p><strong>Credits:</strong> {credits ?? 'loading...'}</p>\n        <div style={{ display: 'flex', gap: 8 }}>\n          <button onClick={useCredit}>Use 1 Credit</button>\n          <button onClick={buyCredits}>Buy 10 Credits</button>\n          <button onClick={loadCredits}>Refresh Credits</button>\n        </div>\n      </div>\n\n      <button onClick={checkHealth}>Check Backend Health</button>\n      <p style={{ marginTop: 12 }}>{status}</p>\n    </div>\n  );\n}\n`
    },
    { path: 'back-end/package.json', content: JSON.stringify(backendPackageJson, null, 2) },
    {
      path: 'back-end/.env.example',
      content: 'PORT=5000\nCORS_ORIGIN=http://localhost:3000\nDEFAULT_CREDITS=20\n'
    },
    {
      path: 'back-end/server.js',
      content: `import express from 'express';\nimport cors from 'cors';\nimport dotenv from 'dotenv';\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 5000);\nconst corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';\nconst defaultCredits = Number(process.env.DEFAULT_CREDITS || 20);\n\n// Demo in-memory credit ledger. Replace with database in production.\nconst creditLedger = new Map();\n\nfunction getCredits(userId) {\n  if (!creditLedger.has(userId)) {\n    creditLedger.set(userId, defaultCredits);\n  }\n  return creditLedger.get(userId);\n}\n\napp.use(cors({ origin: corsOrigin }));\napp.use(express.json());\n\napp.get('/api/health', (_req, res) => {\n  res.json({ success: true, message: 'Backend is healthy' });\n});\n\napp.get('/api/credits', (req, res) => {\n  const userId = String(req.query.userId || 'demo-user');\n  const credits = getCredits(userId);\n  res.json({ success: true, userId, credits });\n});\n\napp.post('/api/credits/use', (req, res) => {\n  const userId = String(req.body.userId || 'demo-user');\n  const amount = Math.max(1, Number(req.body.amount || 1));\n  const reason = String(req.body.reason || 'usage');\n\n  const credits = getCredits(userId);\n  if (credits < amount) {\n    return res.status(402).json({\n      success: false,\n      message: 'Insufficient credits. Please buy more credits.',\n      userId,\n      creditsRemaining: credits,\n      required: amount\n    });\n  }\n\n  const remaining = credits - amount;\n  creditLedger.set(userId, remaining);\n  return res.json({\n    success: true,\n    message: 'Used ' + amount + ' credit(s) for ' + reason + '.',\n    userId,\n    creditsRemaining: remaining\n  });\n});\n\napp.post('/api/credits/purchase', (req, res) => {\n  const userId = String(req.body.userId || 'demo-user');\n  const amount = Math.max(1, Number(req.body.amount || 10));\n\n  const current = getCredits(userId);\n  const updated = current + amount;\n  creditLedger.set(userId, updated);\n\n  return res.json({\n    success: true,\n    message: 'Purchased ' + amount + ' credit(s).',\n    userId,\n    credits: updated\n  });\n});\n\napp.listen(port, () => {\n  console.log(\`Backend listening on http://localhost:\${port}\`);\n});\n`
    }
  ];
}

function validateAndNormalizePayload(payload, prompt) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.files)) {
    throw new Error('Invalid JSON format. Expected { files: [...] }.');
  }

  const normalizedFiles = payload.files
    .filter((file) => file && typeof file.path === 'string' && typeof file.content === 'string')
    .map((file) => ({
      path: file.path.trim().replace(/^\/+/, ''),
      content: file.content,
    }))
    .filter((file) => file.path.length > 0)
    .filter((file) => !file.path.includes('..'));

  if (normalizedFiles.length === 0) {
    throw new Error('No valid files were returned by model.');
  }

  const requiredFullstackFiles = [
    'package.json',
    'front-end/package.json',
    'front-end/index.html',
    'front-end/src/main.jsx',
    'front-end/src/App.jsx',
    'back-end/package.json',
    'back-end/server.js',
    'README.md'
  ];

  const existingSet = new Set(normalizedFiles.map((f) => f.path));
  const missingCount = requiredFullstackFiles.filter((required) => !existingSet.has(required)).length;

  if (missingCount > 0) {
    const starterFiles = buildReactExpressStarter(prompt, 'Model output was auto-corrected to a runnable React + Express workspace.');
    const starterByPath = new Map(starterFiles.map((f) => [f.path, f]));
    for (const required of requiredFullstackFiles) {
      if (!existingSet.has(required) && starterByPath.has(required)) {
        normalizedFiles.push(starterByPath.get(required));
      }
    }

    if (!existingSet.has('.gitignore') && starterByPath.has('.gitignore')) {
      normalizedFiles.push(starterByPath.get('.gitignore'));
    }
  }

  return normalizeGeneratedWorkspace(normalizedFiles, prompt);
}

function buildConversationPrompt(prompt, chatHistory) {
  const history = Array.isArray(chatHistory) ? chatHistory : [];
  const historyText = history
    .filter((entry) => entry && typeof entry.role === 'string' && typeof entry.content === 'string')
    .slice(-12)
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
    .join('\n');

  return [
    'Generate a bot project as JSON file system.',
    historyText ? `Conversation:\n${historyText}` : '',
    `Current user request:\n${prompt}`,
    'Remember: return only pure JSON with a files array.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildQuotaFallbackFiles(prompt) {
  return buildReactExpressStarter(
    prompt,
    'Groq quota was exceeded, so a local full-stack React + Express scaffold was generated.'
  );
}

function normalizeWorkspaceFiles(files) {
  if (!Array.isArray(files)) {
    throw new Error('files must be an array.');
  }

  const normalizedFiles = files
    .filter((file) => file && typeof file.path === 'string' && typeof file.content === 'string')
    .map((file) => ({
      path: file.path.trim().replace(/^\/+/, ''),
      content: file.content,
    }))
    .filter((file) => file.path && !file.path.includes('..'));

  if (normalizedFiles.length === 0) {
    throw new Error('No valid files were provided for the sandbox.');
  }

  return normalizedFiles;
}

function splitLogLines(text) {
  return String(text || '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function hasConfiguredE2bKey() {
  const key = String(process.env.E2B_API_KEY || '').trim();
  return key && !/^your[-_ ]?e2b[-_ ]?api[-_ ]?key$/i.test(key);
}

function findActiveSessionForUser(userId) {
  for (const session of sandboxSessions.values()) {
    if (session.userId === userId && session.status === 'running') {
      return session;
    }
  }

  return null;
}

function buildSandboxPreviewUrls(sandbox) {
  if (!sandbox || typeof sandbox.getHost !== 'function') {
    return null;
  }

  const toUrl = (port) => {
    try {
      const host = sandbox.getHost(port);
      if (!host) {
        return null;
      }
      return host.startsWith('http://') || host.startsWith('https://') ? host : `https://${host}`;
    } catch {
      return null;
    }
  };

  const frontend = toUrl(3000);
  const backend = toUrl(5000);

  return {
    frontend,
    backend,
  };
}

async function safeKillSandbox(session, reason = 'stopped') {
  if (!session) {
    return;
  }

  session.status = reason;
  session.updatedAt = new Date().toISOString();

  if (session.sandbox) {
    try {
      await session.sandbox.kill();
    } catch (error) {
      session.logs.push(`[sandbox] Failed to terminate sandbox: ${error?.message || error}`);
    }
  }
}

async function writeWorkspaceFilesToSandbox(sandbox, files) {
  const payload = JSON.stringify(files);
  const script = `
const fs = require('fs');
const path = require('path');
const ROOT = '/home/user';

const files = ${payload};

for (const file of files) {
  const filePath = String(file.path || '').replace(/^\\/+/, '');
  if (!filePath || filePath.includes('..')) {
    throw new Error('Invalid file path: ' + filePath);
  }

  const targetPath = path.join(ROOT, filePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, file.content, 'utf8');
}

JSON.stringify({ ok: true, count: files.length });
`;

  return sandbox.runCode(script, {
    language: 'javascript',
    timeoutMs: 120000,
  });
}

async function captureSandboxCommand(session, code, opts = {}) {
  const capture = (prefix) => (chunk) => {
    const text = typeof chunk === 'string' ? chunk : chunk?.line || chunk?.text || '';
    splitLogLines(text).forEach((line) => {
      session.logs.push(`[${prefix}] ${line}`);
    });
  };

  const execution = await session.sandbox.runCode(code, {
    ...opts,
    onStdout: capture('stdout'),
    onStderr: capture('stderr'),
  });

  if (execution?.text && String(execution.text).trim()) {
    session.logs.push(`[result] ${String(execution.text).trim()}`);
  }

  return execution;
}

async function createSandboxSession({ userId, files, prompt }) {
  const activeSession = findActiveSessionForUser(userId);
  if (activeSession) {
    await safeKillSandbox(activeSession, 'replaced');
    sandboxSessions.delete(activeSession.id);
  }

  if (!hasConfiguredE2bKey()) {
    const error = new Error('E2B_API_KEY is not configured on the server. Add a real E2B API key to back-end/.env and restart the backend.');
    error.status = 503;
    throw error;
  }

  const sandbox = await Sandbox.create({
    timeoutMs: Number(process.env.E2B_SANDBOX_TIMEOUT_MS || 120000),
  });
  const sessionId = `${userId}-${Date.now()}`;
  const session = {
    id: sessionId,
    userId,
    sandbox,
    status: 'starting',
    prompt,
    files,
    logs: [
      '[sandbox] E2B sandbox created.',
      '[sandbox] Uploading generated workspace files...'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sandboxSessions.set(sessionId, session);

  try {
    await writeWorkspaceFilesToSandbox(sandbox, files);
    session.logs.push(`[sandbox] Uploaded ${files.length} files.`);

    session.logs.push('[sandbox] Installing dependencies with npm run install:all...');
    await captureSandboxCommand(
      session,
      'cd /home/user && npm run install:all',
      { language: 'bash', timeoutMs: 900000 }
    );

    session.logs.push('[sandbox] Starting the generated workspace in the background...');
    await captureSandboxCommand(
      session,
      "cd /home/user && mkdir -p .vibe && (nohup npm run dev > /home/user/.vibe/sandbox.log 2>&1 & echo $! > /home/user/.vibe/sandbox.pid) && echo 'VM started'",
      { language: 'bash', timeoutMs: 120000 }
    );

    session.status = 'running';
    session.updatedAt = new Date().toISOString();

    return session;
  } catch (error) {
    session.status = 'error';
    session.logs.push(`[sandbox] Startup failed: ${error?.message || error}`);
    session.updatedAt = new Date().toISOString();

    try {
      await sandbox.kill();
    } catch {
      // ignore cleanup failures
    }

    throw error;
  }
}

async function readSandboxLogs(session, cursor = 0) {
  if (!session?.sandbox) {
    return {
      logs: [],
      nextCursor: cursor,
      status: session?.status || 'stopped',
    };
  }

  const script = `
const fs = require('fs');

  const logPath = '/home/user/.vibe/sandbox.log';
  const pidPath = '/home/user/.vibe/sandbox.pid';
const cursor = Number(${Number(cursor) || 0});

let lines = [];
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  lines = content.split(/\r?\n/).filter(Boolean);
}

let running = false;
let pid = null;
if (fs.existsSync(pidPath)) {
  const rawPid = Number(fs.readFileSync(pidPath, 'utf8').trim());
  if (!Number.isNaN(rawPid) && rawPid > 0) {
    pid = rawPid;
    try {
      process.kill(rawPid, 0);
      running = true;
    } catch {
      running = false;
    }
  }
}

JSON.stringify({
  running,
  pid,
  lines: lines.slice(cursor),
  total: lines.length,
});
`;

  const execution = await session.sandbox.runCode(script, {
    language: 'javascript',
    timeoutMs: 30000,
  });

  let payload = {};
  try {
    payload = JSON.parse(execution.text || '{}');
  } catch {
    payload = {};
  }

  const logs = Array.isArray(payload.lines) ? payload.lines : [];
  const nextCursor = Number.isFinite(Number(payload.total)) ? Number(payload.total) : cursor;

  logs.forEach((line) => {
    if (line) {
      session.logs.push(`[sandbox] ${line}`);
    }
  });

  session.status = payload.running ? 'running' : session.status === 'running' ? 'stopped' : session.status;
  session.updatedAt = new Date().toISOString();

  return {
    logs,
    nextCursor,
    status: session.status,
    sandboxId: session.sandbox.sandboxId,
    pid: payload.pid || null,
  };
}

router.post('/generate', authenticate, async (req, res) => {
  const { prompt, chatHistory } = req.body || {};
  const userId = req.user.user_id;
  const generationCreditCost = Number(process.env.VIBE_GENERATION_CREDIT_COST || 1);

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: prompt',
    });
  }

  const mergedIntent = collectUserIntentText(prompt, chatHistory);
  const clarity = analyzePromptClarity(mergedIntent);
  if (!clarity.clear) {
    return res.status(422).json({
      success: false,
      needsClarification: true,
      message: 'Please clarify your bot requirements before generation.',
      questions: [
        `Please specify: ${clarity.missing.join(', ')}.`,
        'Example: "Build a WhatsApp bot that sends a good-morning message every day at 8:00 AM to +91XXXXXXXXXX."',
      ],
    });
  }

  const apiKeys = collectGroqApiKeys();
  if (apiKeys.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'GROQ_API_KEY or GROQ_API_KEYS is not configured on the server.',
    });
  }

  try {
    const creditState = await getOrCreateUserCredits(userId);
    if (Number(creditState.credits_balance) < generationCreditCost) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient credits. Please purchase more credits to continue generating.',
        data: {
          credits: Number(creditState.credits_balance),
          required: generationCreditCost,
          buyCreditsPath: '/vibe-code/credits',
        },
      });
    }

    const configuredModel = normalizeModelName(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile');
    const llmPrompt = buildConversationPrompt(mergedIntent.trim(), chatHistory);
    const { rawText, modelName, keyIndex } = await generateWithGroqFallback(llmPrompt, configuredModel, apiKeys);
    const jsonText = stripCodeFences(rawText);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (_err) {
      throw new Error('Model returned invalid JSON.');
    }

    const files = validateAndNormalizePayload(parsed, mergedIntent.trim());
    const debitResult = await consumeCredits({
      userId,
      credits: generationCreditCost,
      reason: 'vibe-generation',
      metadata: { provider: 'groq', model: modelName },
    });

    if (!debitResult.success) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient credits. Please purchase more credits to continue generating.',
        data: {
          credits: Number(debitResult.credits_balance || 0),
          required: generationCreditCost,
          buyCreditsPath: '/vibe-code/credits',
        },
      });
    }

    return res.json({
      success: true,
      files,
      fileCount: files.length,
      generatedAt: new Date().toISOString(),
      provider: 'groq',
      model: modelName,
      keyIndex,
      creditsRemaining: Number(debitResult.credits_balance),
      creditsUsed: generationCreditCost,
    });
  } catch (err) {
    console.error('Vibe Code generation error:', err);

    if (isRateLimitOrQuotaError(err)) {
      const retryAfterSeconds = extractRetryAfterSeconds(err);
      const fallbackFiles = buildQuotaFallbackFiles(mergedIntent.trim());
      const debitResult = await consumeCredits({
        userId,
        credits: generationCreditCost,
        reason: 'vibe-generation-fallback',
        metadata: { provider: 'local-fallback' },
      });

      if (!debitResult.success) {
        return res.status(402).json({
          success: false,
          message: 'Insufficient credits. Please purchase more credits to continue generating.',
          data: {
            credits: Number(debitResult.credits_balance || 0),
            required: generationCreditCost,
            buyCreditsPath: '/vibe-code/credits',
          },
        });
      }

      return res.json({
        success: true,
        degraded: true,
        warning: `Groq quota/rate limit exceeded for all configured keys. Returned fallback starter files. Retry in about ${retryAfterSeconds}s.`,
        retryAfterSeconds,
        files: fallbackFiles,
        fileCount: fallbackFiles.length,
        generatedAt: new Date().toISOString(),
        provider: 'local-fallback',
        model: normalizeModelName(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'),
        creditsRemaining: Number(debitResult.credits_balance),
        creditsUsed: generationCreditCost,
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate bot code.',
      error: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    });
  }
});

router.post('/run-sandbox', authenticate, async (req, res) => {
  const userId = req.user.user_id;
  const sandboxCreditCost = Number(process.env.VIBE_SANDBOX_CREDIT_COST || 1);

  try {
    const rawFiles = normalizeWorkspaceFiles(req.body?.files);
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    const files = normalizeGeneratedWorkspace(rawFiles, prompt || 'Workspace normalized for sandbox execution.');
    const creditState = await getOrCreateUserCredits(userId);

    if (Number(creditState.credits_balance) < sandboxCreditCost) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient credits. Please purchase more credits to start the virtual machine.',
        data: {
          credits: Number(creditState.credits_balance),
          required: sandboxCreditCost,
          buyCreditsPath: '/vibe-code/credits',
        },
      });
    }

    const session = await createSandboxSession({ userId, files, prompt });
    const debitResult = await consumeCredits({
      userId,
      credits: sandboxCreditCost,
      reason: 'vibe-sandbox-start',
      metadata: { sandboxId: session.sandbox.sandboxId },
    });

    if (!debitResult.success) {
      await safeKillSandbox(session, 'stopped');
      sandboxSessions.delete(session.id);
      return res.status(402).json({
        success: false,
        message: 'Insufficient credits. Please purchase more credits to start the virtual machine.',
        data: {
          credits: Number(debitResult.credits_balance || 0),
          required: sandboxCreditCost,
          buyCreditsPath: '/vibe-code/credits',
        },
      });
    }

    return res.json({
      success: true,
      sessionId: session.id,
      sandboxId: session.sandbox.sandboxId,
      status: session.status,
      logs: session.logs,
      nextCursor: 0,
      previewUrls: buildSandboxPreviewUrls(session.sandbox),
      creditsRemaining: Number(debitResult.credits_balance),
      creditsUsed: sandboxCreditCost,
      message: 'Sandbox started successfully.',
    });
  } catch (error) {
    console.error('Vibe sandbox start error:', error);
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Failed to start the sandbox.',
    });
  }
});

router.get('/sandbox-logs/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const cursor = Number(req.query.cursor || 0);
  const session = sandboxSessions.get(sessionId);

  if (!session || session.userId !== req.user.user_id) {
    return res.status(404).json({
      success: false,
      message: 'Sandbox session not found.',
    });
  }

  try {
    const result = await readSandboxLogs(session, cursor);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Vibe sandbox log error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to read sandbox logs.',
    });
  }
});

router.post('/stop-sandbox/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const session = sandboxSessions.get(sessionId);

  if (!session || session.userId !== req.user.user_id) {
    return res.status(404).json({
      success: false,
      message: 'Sandbox session not found.',
    });
  }

  await safeKillSandbox(session, 'stopped');
  sandboxSessions.delete(sessionId);

  return res.json({
    success: true,
    message: 'Sandbox stopped.',
    sessionId,
  });
});

router.post('/save-session', authenticate, async (req, res) => {
  const userId = req.user.user_id;
  const { chatHistory, files, selectedFilePath, terminalLogs, messageDraft } = req.body || {};

  try {
    const { data, error } = await supabase
      .from('vibe_sessions')
      .upsert(
        {
          user_id: Number(userId),
          chat_history: Array.isArray(chatHistory) ? chatHistory : [],
          files: Array.isArray(files) ? files : [],
          selected_file_path: selectedFilePath || null,
          terminal_logs: Array.isArray(terminalLogs) ? terminalLogs.slice(-300) : [],
          message_draft: messageDraft || '',
          is_active: true,
        },
        { onConflict: 'user_id' }
      )
      .select('session_id, updated_at');

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      sessionId: data?.[0]?.session_id,
      message: 'Session saved successfully',
    });
  } catch (err) {
    console.error('Save session error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to save session',
    });
  }
});

router.get('/load-session', authenticate, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const { data, error } = await supabase
      .from('vibe_sessions')
      .select('session_id, chat_history, files, selected_file_path, terminal_logs, message_draft, created_at')
      .eq('user_id', Number(userId))
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      // No session found, return empty
      return res.json({
        success: true,
        session: null,
        message: 'No saved session found',
      });
    }

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      session: {
        sessionId: data.session_id,
        chatHistory: data.chat_history || [],
        files: data.files || [],
        selectedFilePath: data.selected_file_path,
        terminalLogs: data.terminal_logs || [],
        messageDraft: data.message_draft || '',
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error('Load session error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load session',
    });
  }
});

router.post('/delete-session', authenticate, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const { error } = await supabase
      .from('vibe_sessions')
      .update({ is_active: false })
      .eq('user_id', Number(userId));

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      message: 'Session deleted. New session started.',
    });
  } catch (err) {
    console.error('Delete session error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete session',
    });
  }
});

router.get('/list-sessions', authenticate, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const { data, error } = await supabase
      .from('vibe_sessions')
      .select('session_id, created_at, updated_at, is_active')
      .eq('user_id', Number(userId))
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      sessions: data || [],
    });
  } catch (err) {
    console.error('List sessions error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to list sessions',
    });
  }
});

router.get('/options', authenticate, (_req, res) => {
  return res.json({
    success: true,
    mode: 'llm-isolated-workspace',
    provider: 'groq',
    expects: {
      input: {
        prompt: 'string',
        chatHistory: 'optional array of { role, content }',
      },
      output: {
        files: [
          { path: 'front-end/src/App.jsx', content: '...' },
          { path: 'back-end/server.js', content: '...' },
          { path: 'README.md', content: '...' },
        ],
      },
    },
    auth: {
      env: ['GROQ_API_KEY', 'GROQ_API_KEYS', 'GROQ_MODEL'],
      keyRotation: 'Automatic across GROQ_API_KEYS in order',
    },
    credits: {
      billedPerGeneration: Number(process.env.VIBE_GENERATION_CREDIT_COST || 1),
      buyCreditsPath: '/vibe-code/credits',
    },
  });
});

export default router;
