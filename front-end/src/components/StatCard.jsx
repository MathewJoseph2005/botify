/**
 * Reusable stat card component used across dashboards.
 *
 * @param {string}  label  – Short label above the number (e.g. "Active Bots")
 * @param {string|number} value – The primary stat value
 * @param {string}  [icon] – Emoji or text icon displayed beside the value
 * @param {string}  [bg]   – Tailwind background class (default: 'bg-white')
 * @param {string}  [sub]  – Optional subtitle/description below the value
 * @param {React.ReactNode} [iconNode] – Optional JSX icon element (replaces emoji)
 */
const StatCard = ({ label, value, icon, bg = 'bg-white', sub, iconNode }) => (
  <div className={`${bg} rounded-lg shadow p-5`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {iconNode ? (
        <div>{iconNode}</div>
      ) : (
        icon && <span className="text-2xl">{icon}</span>
      )}
    </div>
  </div>
);

export default StatCard;
