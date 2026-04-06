import express from 'express';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  'Produce a runnable bot project based on user instructions.',
  'Return ONLY valid JSON. Do not include markdown fences, commentary, or extra text.',
  'JSON schema is strictly:',
  '{"files":[{"path":"index.js","content":"..."},{"path":"package.json","content":"..."},{"path":"README.md","content":"..."}]}',
  'Rules:',
  '1) Always include package.json and README.md in files.',
  '2) package.json must include correct dependencies for requested platform/framework (e.g., telegraf, whatsapp-web.js, discord.js, @slack/bolt, nodemailer).',
  '3) README.md must explain local setup and run commands.',
  '4) Paths must be relative and safe (no ../ and no absolute paths).',
  '5) File contents must be plain source text.',
  '6) Prefer JavaScript Node.js project structure unless user explicitly asks for another language.',
].join('\n');

function stripCodeFences(text) {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  return trimmed
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

function validateAndNormalizePayload(payload) {
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

  const hasPackageJson = normalizedFiles.some((file) => file.path === 'package.json');
  const hasReadme = normalizedFiles.some((file) => file.path.toLowerCase() === 'readme.md');

  if (!hasPackageJson) {
    normalizedFiles.push({
      path: 'package.json',
      content: JSON.stringify(
        {
          name: 'botify-generated-bot',
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
    });
  }

  if (!hasReadme) {
    normalizedFiles.push({
      path: 'README.md',
      content: '# Botify Generated Bot\n\n## Run\n1. npm install\n2. npm start\n',
    });
  }

  return normalizedFiles;
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

router.post('/generate', authenticate, async (req, res) => {
  const { prompt, chatHistory } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: prompt',
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      message: 'GEMINI_API_KEY is not configured on the server.',
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const llmPrompt = buildConversationPrompt(prompt.trim(), chatHistory);
    const result = await model.generateContent(llmPrompt);
    const rawText = result?.response?.text?.() || '';
    const jsonText = stripCodeFences(rawText);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (_err) {
      throw new Error('Model returned invalid JSON.');
    }

    const files = validateAndNormalizePayload(parsed);

    return res.json({
      success: true,
      files,
      fileCount: files.length,
      generatedAt: new Date().toISOString(),
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    });
  } catch (err) {
    console.error('Vibe Code generation error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate bot code.',
      error: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    });
  }
});

router.get('/options', authenticate, (_req, res) => {
  return res.json({
    success: true,
    mode: 'llm-isolated-workspace',
    provider: 'gemini',
    expects: {
      input: {
        prompt: 'string',
        chatHistory: 'optional array of { role, content }',
      },
      output: {
        files: [
          { path: 'index.js', content: '...' },
          { path: 'package.json', content: '...' },
          { path: 'README.md', content: '...' },
        ],
      },
    },
  });
});

export default router;
