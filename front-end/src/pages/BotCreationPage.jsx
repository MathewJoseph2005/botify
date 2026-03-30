import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmailBotForm from '../components/BotCreation/EmailBotForm';
import WhatsAppBotForm from '../components/BotCreation/WhatsAppBotForm';
import TelegramBotForm from '../components/BotCreation/TelegramBotForm';
import DiscordBotForm from '../components/BotCreation/DiscordBotForm';
import SlackBotForm from '../components/BotCreation/SlackBotForm';
import InstagramBotForm from '../components/BotCreation/InstagramBotForm';

const PLATFORMS = [
  {
    id: 'email',
    name: 'Email Bot',
    icon: '📧',
    description: 'Automated email sender, responder, and mail processor',
    color: 'bg-blue-500',
    features: ['SMTP configuration', 'Template support', 'Auto-reply rules', 'Bulk send'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Bot',
    icon: '💬',
    description: 'WhatsApp messaging automation and customer service',
    color: 'bg-green-500',
    features: ['Message automation', 'Webhook integration', 'Media support', 'Group management'],
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    icon: '✈️',
    description: 'Telegram bot with commands, inline buttons, and handlers',
    color: 'bg-sky-500',
    features: ['Command handlers', 'Inline keyboards', 'File uploads', 'Channel support'],
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    icon: '🎮',
    description: 'Discord server automation, moderation, and commands',
    color: 'bg-indigo-500',
    features: ['Server moderation', 'Command system', 'Role management', 'Logging'],
  },
  {
    id: 'slack',
    name: 'Slack Bot',
    icon: '💼',
    description: 'Slack workspace automation and integration',
    color: 'bg-purple-500',
    features: ['Message posting', 'Event handling', 'Dialog flows', 'Integration'],
  },
  {
    id: 'instagram',
    name: 'Instagram Bot',
    icon: '📸',
    description: 'Instagram DM automation and engagement bot',
    color: 'bg-pink-500',
    features: ['Auto-reply to DMs', 'Story interactions', 'Comment automation', 'Follow management'],
  },
];

const BotCreationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [error, setError] = useState('');

  // Redirect non-sellers
  if (user?.role_id !== 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Seller Access Only</h1>
          <p className="text-gray-600 mb-6">Only sellers can create and list bots on the marketplace.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (selectedPlatform) {
    const renderForm = () => {
      switch (selectedPlatform) {
        case 'email':
          return <EmailBotForm onComplete={() => navigate('/dashboard')} onCancel={() => setSelectedPlatform(null)} />;
        case 'whatsapp':
          return <WhatsAppBotForm onComplete={() => navigate('/dashboard')} onCancel={() => setSelectedPlatform(null)} />;
        case 'telegram':
          return <TelegramBotForm onComplete={() => navigate('/dashboard')} onCancel={() => setSelectedPlatform(null)} />;
        case 'discord':
          return <DiscordBotForm onComplete={() => navigate('/dashboard')} onCancel={() => setSelectedPlatform(null)} />;
        case 'slack':
          return <SlackBotForm onComplete={() => navigate('/dashboard')} onCancel={() => setSelectedPlatform(null)} />;
        case 'instagram':
          return <InstagramBotForm onComplete={() => navigate('/dashboard')} onCancel={() => setSelectedPlatform(null)} />;
        default:
          return null;
      }
    };

    return renderForm();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Create Your Bot</h1>
          <p className="text-blue-100 text-lg">
            Choose a platform and configure your bot to start listing it on the marketplace
          </p>
        </div>
      </div>

      {/* Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Platform Selection Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition border border-gray-200 overflow-hidden group"
            >
              {/* Header */}
              <div className={`${platform.color} text-white p-8 flex items-center justify-center`}>
                <div className="text-6xl">{platform.icon}</div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{platform.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{platform.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {platform.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-green-500">✓</span> {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                  Start Creating
                  <span>→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BotCreationPage;
