// Risk Assessment Component
import { RiskMetric } from '@/types/dashboard';

const RiskAssessment = ({ risks }: { risks: RiskMetric[] }) => {
  if (!risks.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        No risks identified.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with risk count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {risks.length} risk{risks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable container with max height */}
      <div className="max-h-96 overflow-y-auto overflow-x-hidden pr-2 -mr-2">
        {/* Responsive grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {risks.map(risk => (
            <div 
              key={risk.milestone_id} 
              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {/* Risk header */}
              <div className="flex justify-between items-start gap-2 mb-3">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1">
                  {risk.name}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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

              {/* Delay probability section */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Delay Probability</span>
                  <span className="text-xs font-medium text-gray-900">
                    {risk.delay_probability}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      risk.delay_probability >= 70
                        ? 'bg-red-500'
                        : risk.delay_probability >= 40
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(risk.delay_probability, 100)}%` }}
                  />
                </div>
              </div>

              {/* Risk factors */}
              <div>
                <span className="text-xs text-gray-600 font-medium">Risk Factors:</span>
                {risk.factors.length > 0 ? (
                  <ul className="mt-1 text-xs text-gray-600 space-y-1">
                    {risk.factors.slice(0, 3).map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span className="leading-tight">{factor}</span>
                      </li>
                    ))}
                    {risk.factors.length > 3 && (
                      <li className="text-gray-400 italic">
                        +{risk.factors.length - 3} more factor{risk.factors.length - 3 !== 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-gray-400 italic">
                    No specific factors identified
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with scroll indicator when content overflows */}
      {risks.length > 6 && (
        <div className="text-center">
          <div className="inline-flex items-center gap-1 text-xs text-gray-400">
            <span>Scroll to view all risks</span>
            <svg 
              className="w-3 h-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAssessment;