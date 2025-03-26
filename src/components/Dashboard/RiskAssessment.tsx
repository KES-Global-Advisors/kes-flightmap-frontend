// // Risk Assessment Component
import { RiskMetric } from '@/types/dashboard';

const RiskAssessment = ({ risks }: { risks: RiskMetric[] }) => {
  if (!risks.length) {
    return <div className="text-gray-500">No risks identified.</div>;
  }

  return (
    <div className="space-y-4">
      {risks.map(risk => (
        <div key={risk.milestone_id} className="border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">{risk.name}</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                risk.risk_level === 'high'
                  ? 'bg-red-100 text-red-800'
                  : risk.risk_level === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {risk.risk_level.toUpperCase()}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-sm text-gray-600">
              Delay Probability: {risk.delay_probability}%
            </div>
            {/* Progress bar for delay probability */}
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${risk.delay_probability}%` }}
              ></div>
            </div>
            <ul className="mt-2 text-sm text-gray-500">
              {risk.factors.length > 0 ? (
                risk.factors.map((factor, idx) => (
                  <li key={idx} className="list-disc ml-4">
                    {factor}
                  </li>
                ))
              ) : (
                <li className="ml-4">No risk factors listed.</li>
              )}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RiskAssessment;
