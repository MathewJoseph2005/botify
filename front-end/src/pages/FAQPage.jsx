import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const FAQPage = () => {
  const { t } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqItems = [
    { q: 'q1', a: 'a1' },
    { q: 'q2', a: 'a2' },
    { q: 'q3', a: 'a3' },
    { q: 'q4', a: 'a4' },
    { q: 'q5', a: 'a5' },
    { q: 'q6', a: 'a6' },
    { q: 'q7', a: 'a7' },
    { q: 'q8', a: 'a8' },
    { q: 'q9', a: 'a9' },
    { q: 'q10', a: 'a10' },
  ];

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="pt-20 pb-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {t('faq.title')}
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          {t('faq.subtitle')}
        </p>
      </div>

      {/* FAQ Items */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg border border-gray-700 hover:border-yellow-500 transition"
            >
              <button
                onClick={() => toggleExpand(index)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition"
              >
                <h3 className="text-lg font-semibold text-white text-left">
                  {t(`faq.${item.q}`)}
                </h3>
                <span
                  className={`text-yellow-500 text-2xl transition-transform ${
                    expandedIndex === index ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              {expandedIndex === index && (
                <div className="px-6 py-4 border-t border-gray-700 bg-gray-750">
                  <p className="text-gray-300 leading-relaxed">
                    {t(`faq.${item.a}`)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-800 border-t border-gray-700 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-gray-400 mb-6">
            Can't find the answer you're looking for? Please contact our support team.
          </p>
          <button className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
