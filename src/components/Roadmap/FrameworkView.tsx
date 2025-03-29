import React, { useEffect } from 'react';
import {
  RoadmapData,
  Strategy,
  Program,
  Workstream,
} from '@/types/roadmap';

interface FrameworkViewProps {
  data: RoadmapData;
}

const FrameworkView: React.FC<FrameworkViewProps> = ({ data }) => {
  useEffect(() => {
    console.log('FrameworkView received data:', data);
  }, [data]);

  return (
    <div className="p-6 bg-gray-50 text-gray-800 space-y-8">
      {/* Roadmap Header */}
      <section className="rounded-lg shadow border overflow-hidden">
      {/* Blue Header */}
      <div className="bg-blue-600 text-white p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">{data.name}</h2>
        {data.description && (
          <p className="text-base opacity-90">{data.description}</p>
        )}
      </div>
    </section>


      {/* For each Strategy in the Roadmap */}
      {data.strategies.map((strategy: Strategy) => {
        // Pull arrays of numeric IDs for leads, sponsors, etc.
        // In a real-world scenario, you might fetch user details, but here we just display the IDs.
        const strategyLeads =
          strategy.strategy_leads && strategy.strategy_leads.length > 0
            ? strategy.strategy_leads.join(', ')
            : 'N/A';
        const commLeads =
          strategy.communication_leads && strategy.communication_leads.length > 0
            ? strategy.communication_leads.join(', ')
            : 'N/A';
        const execSponsors =
          strategy.executive_sponsors && strategy.executive_sponsors.length > 0
            ? strategy.executive_sponsors.join(', ')
            : 'N/A';

        return (
          <section
            key={strategy.id}
            className="bg-white p-6 rounded-lg shadow border space-y-4"
          >
            {/* Strategy Header */}
            <div className="bg-blue-600 text-white p-4 rounded">
              <h2 className="text-xl font-bold">{strategy.name}</h2>
              {strategy.tagline && (
                <p className="italic">{strategy.tagline}</p>
              )}
            </div>

            <div className="px-4">
              <h3 className="text-md font-semibold mt-2">Vision</h3>
              <p className="mb-4">{strategy.vision}</p>

              {/* Strategic Objectives */}
              <h3 className="text-md font-semibold mb-2">Strategic Objectives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Business Objectives (Measurable)</h4>
                  <ul className="list-disc ml-5">
                    {Array.from({ length: strategy.goal_summary.business_goals }).map(
                      (_val, idx) => (
                        <li key={idx}>Objective {idx + 1}</li>
                      )
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">Organizational Objectives (Observable)</h4>
                  <ul className="list-disc ml-5">
                    {Array.from({ length: strategy.goal_summary.organizational_goals }).map(
                      (_val, idx) => (
                        <li key={idx}>Objective {idx + 1}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>

              {/* Governance for Strategy */}
              <div className="flex flex-col md:flex-row md:justify-between mt-4">
                <p>
                  <span className="font-semibold">Strategy Lead:</span> {strategyLeads}
                </p>
                <p>
                  <span className="font-semibold">Communications Lead:</span> {commLeads}
                </p>
                <p>
                  <span className="font-semibold">Executive Sponsor:</span> {execSponsors}
                </p>
              </div>
            </div>

            {/* Program Framework */}
            <div className="bg-blue-600 text-white p-2 rounded mt-6">
              <h3 className="text-lg font-bold">Program Framework</h3>
            </div>

            {strategy.programs && strategy.programs.length > 0 ? (
              strategy.programs.map((program: Program) => {
                // Build governance fields from numeric arrays:
                const programExecSponsors =
                  program.executive_sponsors && program.executive_sponsors.length > 0
                    ? program.executive_sponsors.join(', ')
                    : 'N/A';
                const programLeads =
                  program.program_leads && program.program_leads.length > 0
                    ? program.program_leads.join(', ')
                    : 'N/A';
                const workforceSponsors =
                  program.workforce_sponsors && program.workforce_sponsors.length > 0
                    ? program.workforce_sponsors.join(', ')
                    : 'N/A';

                return (
                  <section key={program.id} className="px-4 pt-4">
                    <div className="bg-blue-200 text-black p-3 rounded">
                      <h4 className="text-md font-bold">{program.name}</h4>
                    </div>

                    <p className="mt-2">
                      <span className="font-semibold">Vision: </span>
                      {program.vision || 'N/A'}
                    </p>

                    {/* Program Governance */}
                    <div className="flex flex-col md:flex-row md:justify-between mt-2">
                      <p>
                        <span className="font-semibold">Executive Sponsors:</span>{' '}
                        {programExecSponsors}
                      </p>
                      <p>
                        <span className="font-semibold">Program Leads:</span> {programLeads}
                      </p>
                      <p>
                        <span className="font-semibold">Workforce Sponsors:</span>{' '}
                        {workforceSponsors}
                      </p>
                    </div>

                    {/* Program-level strategic objectives if we had them:
                        - Some designs have separate business/organizational objectives per program,
                          but that data doesn't exist in the provided structure. 
                        - If needed, adapt to display them here. 
                    */}

                    {/* Workstream Framework */}
                    <div className="bg-blue-600 text-white p-2 mt-6 rounded">
                      <h4 className="text-md font-bold">Workstream Framework</h4>
                    </div>

                    {program.workstreams && program.workstreams.length > 0 ? (
                      program.workstreams.map((ws: Workstream) => {
                        // Workstream governance fields
                        const wsLeads =
                          ws.workstream_leads && ws.workstream_leads.length > 0
                            ? ws.workstream_leads.join(', ')
                            : 'N/A';
                        const wsTeam =
                          ws.team_members && ws.team_members.length > 0
                            ? ws.team_members.join(', ')
                            : 'N/A';

                        return (
                          <div key={ws.id} className="border-t pt-4 ml-4">
                            <h5 className="text-lg font-semibold">{ws.name}</h5>
                            <p>
                              <span className="font-semibold">Vision:</span> {ws.vision || 'N/A'}
                            </p>
                            <p>
                              <span className="font-semibold">Leads:</span> {wsLeads}
                            </p>
                            <p>
                              <span className="font-semibold">Team Members:</span>{' '}
                              {wsTeam || 'N/A'}
                            </p>
                            <p>
                              <span className="font-semibold">Target End Date:</span>{' '}
                              {ws.time_horizon || 'N/A'}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="ml-4 mt-2">No workstreams available.</p>
                    )}
                  </section>
                );
              })
            ) : (
              <p className="px-4 mt-2">No programs available.</p>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default FrameworkView;
