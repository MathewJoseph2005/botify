import { Link } from 'react-router-dom';

/**
 * Reusable bot table used in Seller and Buyer dashboards.
 * Refined for premium glassmorphic dark theme.
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
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffd700] mx-auto mb-4"></div>
        <p className="text-white/30 text-xs font-medium uppercase tracking-widest">Initialising Data...</p>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-white/40 text-sm mb-6">{emptyMessage}</p>
        <Link
          to={emptyLinkTo}
          className="inline-block px-6 py-2 bg-white/5 border border-white/10 hover:border-[#ffd700]/40 text-white rounded-xl transition text-xs font-bold"
        >
          {emptyLinkText}
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-6 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Bot Name</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Interface</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Deployed</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">State</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Ops</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {bots.map((bot) => (
            <tr key={bot.bot_id} className="group hover:bg-white/[0.02] transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors">{bot.bot_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-[12px] text-white/40 font-mono tracking-tight group-hover:text-white/60 transition-colors">{bot.bot_email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-[12px] text-white/30 font-medium">
                  {new Date(bot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${bot.is_active ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/20'}`} />
                  <span className={`text-[11px] font-bold tracking-wide ${bot.is_active ? 'text-green-400/80' : 'text-white/20'}`}>
                    {bot.is_active ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {showManage && (
                    <Link to="/email-bot" className="text-[11px] font-bold text-[#ffd700] hover:text-[#fff6a0] transition-colors">
                      CONFIGURE
                    </Link>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(bot.bot_id)}
                      className="text-[11px] font-bold text-red-400/70 hover:text-red-400 transition-colors"
                    >
                      TERMINATE
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BotTable;
