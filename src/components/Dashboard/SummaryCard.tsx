// // Summary Card Component
interface SummaryCardProps {
  title: string;
  value: number;
  total?: number;
  color: string;
}

const SummaryCard = ({ title, value, total, color }: SummaryCardProps) => {
  const percentage = total ? Math.round((value / total) * 100) : null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <div className="mt-2">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {total && (
          <>
            <span className="text-gray-500 ml-2">/ {total}</span>
            {percentage !== null && (
              <div className="text-sm text-gray-600 mt-1">{percentage}%</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
