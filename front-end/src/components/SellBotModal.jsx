import React, { useState, useRef } from 'react';

const SellBotModal = ({ isOpen, onClose }) => {
  const [method, setMethod] = useState('zip'); // 'zip' or 'git'
  const [file, setFile] = useState(null);
  const [gitUrl, setGitUrl] = useState('');
  const [botName, setBotName] = useState('');
  const [botType, setBotType] = useState('WhatsApp Bot');
  const [price, setPrice] = useState('');
  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleAddFeature = (e) => {
    e.preventDefault();
    if (featureInput.trim() && !features.includes(featureInput.trim())) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (featToRemove) => {
    setFeatures(features.filter((f) => f !== featToRemove));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.zip')) {
        setFile(droppedFile);
      } else {
        alert('Please upload a .zip file only.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
      } else {
        alert('Please upload a .zip file only.');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate
    if (method === 'zip' && !file) return alert('Please upload a ZIP file.');
    if (method === 'git' && (!gitUrl || !gitUrl.includes('git'))) return alert('Please provide a valid Git URL.');
    if (!botName || !price) return alert('Please fill strictly required fields.');

    const payload = {
      botName,
      botType,
      price: parseFloat(price),
      features,
      method,
      gitUrl,
      file,
    };
    console.log('Selling bot with payload:', payload);
    // Here we would typically call our API
    alert('Bot listing created successfully! (Mocked)');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md overflow-y-auto pt-24 pb-12">
      <div className="bg-white/80 backdrop-blur-[20px] rounded-[32px] border border-white max-w-2xl w-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-gray-200/50 flex justify-between items-center bg-white/40">
          <h2 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
            Sell Your Bot
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          {/* Submission Method Toggle */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Submission Method</label>
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setMethod('zip')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  method === 'zip'
                    ? 'text-[#FFD56B] bg-[#1A1A1A] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Upload ZIP File
              </button>
              <button
                type="button"
                onClick={() => setMethod('git')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  method === 'git'
                    ? 'text-[#FFD56B] bg-[#1A1A1A] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Provide Git URL
              </button>
            </div>
          </div>

          {/* Conditional Input based on Method */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100/50">
            {method === 'zip' ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50/80'
                }`}
              >
                <input
                  type="file"
                  accept=".zip"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  {file ? (
                    <>
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-green-700 font-medium">Selected: {file.name}</div>
                      <div className="text-green-600/70 text-sm">Click or drag to replace</div>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="text-gray-700 font-medium">
                        Drag and drop your <span className="text-primary-600">.zip</span> file here
                      </div>
                      <div className="text-gray-500 text-sm">or click to browse</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Repository Link (GitHub/GitLab)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    className="pl-10 block w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm py-3 px-4 shadow-sm"
                    placeholder="https://github.com/username/bot-repo"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bot Name */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Bot Name</label>
              <input
                type="text"
                required
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="block w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 py-3 px-4 shadow-sm"
                placeholder="e.g. WhatsApp AutoResponder"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Price</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">$</span>
                </div>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-8 block w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 py-3 px-4 shadow-sm"
                  placeholder="29.99"
                />
              </div>
            </div>
          </div>

          {/* Bot Type */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Bot Type</label>
            <select
              value={botType}
              onChange={(e) => setBotType(e.target.value)}
              className="block w-full border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 py-3 px-4 shadow-sm"
            >
              <option value="WhatsApp Bot">WhatsApp Bot</option>
              <option value="Email Bot">Email Bot</option>
              <option value="Discord Bot">Discord Bot</option>
              <option value="Telegram Bot">Telegram Bot</option>
            </select>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Key Features</label>
            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFeature(e)}
                className="flex-1 bg-transparent border-none focus:ring-0 py-2.5 px-3 text-sm"
                placeholder="Type a feature and press Enter (e.g. Auto-reply)"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
              >
                Add
              </button>
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(feature)}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-primary-400 hover:text-primary-600 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 transition-colors"
                    >
                      <span className="sr-only">Remove feature</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-[16px] text-[#FFD56B] bg-[#1A1A1A] hover:bg-black font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              List Bot for Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellBotModal;
