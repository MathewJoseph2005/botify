const Marketplace = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bot Marketplace</h1>
          <p className="text-gray-600 mt-2">Discover and purchase powerful messaging bots</p>
        </div>

        {/* Coming Soon */}
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Marketplace Coming Soon!</h2>
          <p className="text-gray-600">
            We're working hard to bring you an amazing selection of bots. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
