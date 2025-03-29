// cSpell:ignore workstream workstreams roadmaps Gantt hoverable flightmap
import React, { useEffect } from 'react';
import {
  FlightmapData,
  Strategy,
  Program,
  Workstream,
} from '@/types/roadmap';

interface FrameworkViewProps {
  data: FlightmapData;
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
            className="bg-white rounded-lg shadow border"
          >
            {/* Strategy Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-bold">{strategy.name}</h2>
              {strategy.tagline && (
                <p className="italic">{strategy.tagline}</p>
              )}
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold">Vision</h3>
              <p className="mb-6">{strategy.vision}</p>

              {/* Strategic Objectives */}
              <h3 className="text-lg font-semibold mb-3">Strategic Objectives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">Business Objectives (Measurable)</h4>
                  <ul className="list-disc ml-5">
                    {Array.from({ length: strategy.goal_summary.business_goals }).map(
                      (_val, idx) => (
                        <li key={idx}>Objective {idx + 1}</li>
                      )
                    )}
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">Organizational Objectives (Observable)</h4>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-100 p-4 rounded">
                <div>
                  <span className="font-semibold block">Strategy Lead:</span> 
                  <span>{strategyLeads}</span>
                </div>
                <div>
                  <span className="font-semibold block">Communications Lead:</span> 
                  <span>{commLeads}</span>
                </div>
                <div>
                  <span className="font-semibold block">Executive Sponsor:</span> 
                  <span>{execSponsors}</span>
                </div>
              </div>

              {/* Program Framework */}
              <div className="bg-blue-600 text-white p-3 rounded mt-8">
                <h3 className="text-lg font-bold">Program Framework</h3>
              </div>

              {strategy.programs && strategy.programs.length > 0 ? (
                <div className="space-y-6 mt-4">
                  {strategy.programs.map((program: Program) => {
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
                      <section key={program.id} className="border-l-4 border-blue-400 pl-4 ml-2">
                        <div className="bg-blue-200 text-black p-3 rounded">
                          <h4 className="text-md font-bold">{program.name}</h4>
                        </div>

                        <div className="p-4">
                          <p className="mb-4">
                            <span className="font-semibold">Vision: </span>
                            {program.vision || 'N/A'}
                          </p>

                          {/* Program Governance */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-100 p-4 rounded">
                            <div>
                              <span className="font-semibold block">Executive Sponsors:</span>
                              <span>{programExecSponsors}</span>
                            </div>
                            <div>
                              <span className="font-semibold block">Program Leads:</span>
                              <span>{programLeads}</span>
                            </div>
                            <div>
                              <span className="font-semibold block">Workforce Sponsors:</span>
                              <span>{workforceSponsors}</span>
                            </div>
                          </div>

                          {/* Workstream Framework */}
                          <div className="bg-blue-500 text-white p-2 rounded mt-6">
                            <h4 className="text-md font-bold">Workstream Framework</h4>
                          </div>

                          {program.workstreams && program.workstreams.length > 0 ? (
                            <div className="space-y-4 mt-4">
                              {program.workstreams.map((ws: Workstream) => {
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
                                  <div key={ws.id} className="border-l-4 border-blue-300 pl-4 ml-2 bg-blue-50 p-3 rounded">
                                    <h5 className="text-lg font-semibold text-blue-700">{ws.name}</h5>
                                    <div className="ml-2 mt-2 space-y-1">
                                      <p><span className="font-semibold">Vision:</span> {ws.vision || 'N/A'}</p>
                                      <p><span className="font-semibold">Leads:</span> {wsLeads}</p>
                                      <p><span className="font-semibold">Team Members:</span> {wsTeam || 'N/A'}</p>
                                      <p><span className="font-semibold">Target End Date:</span> {ws.time_horizon || 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="ml-4 mt-2">No workstreams available.</p>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 mt-2">No programs available.</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default FrameworkView;