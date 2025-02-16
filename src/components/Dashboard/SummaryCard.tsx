// Summary Card Component
const SummaryCard = ({ title, value, total, color }: { title: string; value: number; total?: number; color: string }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    <div className="mt-2">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {total && <span className="text-gray-500 ml-2">/ {total}</span>}
    </div>
  </div>
);

export default SummaryCard;