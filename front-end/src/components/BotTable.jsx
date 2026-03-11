import { Link } from 'react-router-dom';

/**
 * Reusable bot table used in Seller and Buyer dashboards.
 *
 * @param {Array}   bots           – List of bot objects
 * @param {boolean} loading        – Show loading spinner
 * @param {string}  emptyMessage   – Text when no bots found
 * @param {string}  emptyLinkText  – CTA button text
 * @param {string}  emptyLinkTo    – CTA link target
 * @param {Function} [onDelete]    – If provided, renders a Delete button per row
 * @param {boolean}  [showManage]  – Show a Manage link (default: true)
 */
const BotTable = ({
  bots,
  loading,
  emptyMessage = 'No bots yet.',
  emptyLinkText = 'Create Bot',
  emptyLinkTo = '/email-bot',
  onDelete,
  showManage = true,
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading bots...</p>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="mb-4">{emptyMessage}</p>
        <Link
          to={emptyLinkTo}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
        >
          {emptyLinkText}
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bot Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {bots.map((bot) => (
            <tr key={bot.bot_id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{bot.bot_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">{bot.bot_email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {new Date(bot.created_at).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    bot.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {bot.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {showManage && (
                  <Link to="/email-bot" className="text-primary-600 hover:text-primary-900 mr-4">
                    Manage
                  </Link>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(bot.bot_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BotTable;
