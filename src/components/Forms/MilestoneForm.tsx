// import React from 'react';
// import { useFormContext } from 'react-hook-form';
// import useFetch from '../../hooks/UseFetch';
// import { StrategicGoal, Workstream } from '../../types/model';

// export type MilestoneFormData = {
//   workstream: number;
//   name: string;
//   description?: string;
//   deadline: string;
//   status: 'not_started' | 'in_progress' | 'completed';
//   strategic_goals: number[];
// };

// export const MilestoneForm: React.FC = () => {
//   const { register } = useFormContext<MilestoneFormData>();
//   const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>('http://127.0.0.1:8000/workstreams/');
//   const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal>('http://127.0.0.1:8000/strategic-goals/');

//   return (
//     <div className="space-y-4">
//       <h2>Milestone Form</h2>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Workstream</label>
//         {loadingWorkstreams ? (
//           <p>Loading workstreams...</p>
//         ) : errorWorkstreams ? (
//           <p>Error: {errorWorkstreams}</p>
//         ) : (
//           <select
//             {...register('workstream')}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//           >
//             <option value="">Select a workstream</option>
//             {workstreams.map((ws) => (
//               <option key={ws.id} value={ws.id}>
//                 {ws.name}
//               </option>
//             ))}
//           </select>
//         )}
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Name</label>
//         <input
//           {...register('name')}
//           type="text"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Description</label>
//         <textarea
//           {...register('description')}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Deadline</label>
//         <input
//           {...register('deadline')}
//           type="date"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Status</label>
//         <select
//           {...register('status')}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         >
//           <option value="not_started">Not Started</option>
//           <option value="in_progress">In Progress</option>
//           <option value="completed">Completed</option>
//         </select>
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Strategic Goals</label>
//         {loadingGoals ? (
//           <p>Loading strategic goals...</p>
//         ) : errorGoals ? (
//           <p>Error: {errorGoals}</p>
//         ) : (
//           <select
//             {...register('strategic_goals')}
//             multiple
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//           >
//             {strategicGoals.map((goal) => (
//               <option key={goal.id} value={goal.id}>
//                 {goal.goal_text}
//               </option>
//             ))}
//           </select>
//         )}
//       </div>
//     </div>
//   );
// };

import React, { useState } from 'react';
import { useFormContext, useForm } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { StrategicGoal, Workstream } from '../../types/model';

export type MilestoneFormData = {
  workstream: number;
  name: string;
  description?: string;
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed';
  strategic_goals: number[];
  dependencies?: number[]; // IDs of dependent milestones
};

type Milestone = {
  id: number;
  name: string;
  // description?: string;
  // deadline: string;
  // status: 'not_started' | 'in_progress' | 'completed';
  // strategic_goals: number[];
};

type DependentMilestoneModalProps = {
  onClose: () => void;
  onCreate: (milestone: Milestone) => void;
};

// Modal for creating a dependent milestone and sending it to the backend.
const DependentMilestoneModal: React.FC<DependentMilestoneModalProps> = ({ onClose, onCreate }) => {
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal>('http://127.0.0.1:8000/strategic-goals/');
  const { register, handleSubmit, reset } = useForm<MilestoneFormData>();

  const onSubmit = async (data: MilestoneFormData) => {
    // Create payload without workstream; this milestone will be created solely as a dependency.
    const payload = {
      name: data.name,
      deadline: data.deadline,
      status: data.status,
      description: data.description || '',
      strategic_goals: data.strategic_goals || [], // if needed
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/milestones/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to create dependent milestone');
      }
      const newMilestone = await response.json();
      onCreate(newMilestone);
      reset();
      onClose();
    } catch (error) {
      console.error(error);
      // Optionally, display an error message to the user.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-4 rounded-md shadow-lg w-1/2">
        <h3 className="text-lg font-medium mb-4">Create Dependent Milestone</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mt-2">
            <label className="block text-sm font-medium">Name</label>
            <input
              {...register('name')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              {...register('description')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Deadline</label>
            <input
              {...register('deadline')}
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Status</label>
            <select
              {...register('status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Strategic Goals</label>
            {loadingGoals ? (
              <p>Loading strategic goals...</p>
            ) : errorGoals ? (
              <p>Error: {errorGoals}</p>
            ) : (
              <select
                {...register('strategic_goals')}
                multiple
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {strategicGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.goal_text}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MilestoneForm: React.FC = () => {
  const { register } = useFormContext<MilestoneFormData>();
  const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>('http://127.0.0.1:8000/workstreams/');
  const { data: strategicGoals, loading: loadingGoals, error: errorGoals } = useFetch<StrategicGoal>('http://127.0.0.1:8000/strategic-goals/');
  // Optionally, fetch existing milestones so users can pick dependencies.
  const { data: milestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone>('http://127.0.0.1:8000/milestones/');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dependentMilestones, setDependentMilestones] = useState<Milestone[]>([]);

  const handleDependentMilestoneCreate = (milestone: Milestone) => {
    setDependentMilestones((prev) => [...prev, milestone]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-10">Milestone Form</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Workstream</label>
        {loadingWorkstreams ? (
          <p>Loading workstreams...</p>
        ) : errorWorkstreams ? (
          <p>Error: {errorWorkstreams}</p>
        ) : (
          <select
            {...register('workstream')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a workstream</option>
            {workstreams.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          {...register('name')}
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Deadline</label>
        <input
          {...register('deadline')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          {...register('status')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Strategic Goals</label>
        {loadingGoals ? (
          <p>Loading strategic goals...</p>
        ) : errorGoals ? (
          <p>Error: {errorGoals}</p>
        ) : (
          <select
            {...register('strategic_goals')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {strategicGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.goal_text}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Dependent Milestones</label>
        {loadingMilestones ? (
          <p>Loading milestones...</p>
        ) : errorMilestones ? (
          <p>Error: {errorMilestones}</p>
        ) : (
          <select
            {...register('dependencies')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {milestones.map((ms) => (
              <option key={ms.id} value={ms.id}>
                {ms.name}
              </option>
            ))}
            {dependentMilestones.map((ms) => (
              <option key={ms.id} value={ms.id}>
                {ms.name}
              </option>
            ))}
          </select>
        )}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 hover:text-indigo-800 underline"
          >
            Create dependent Milestone
          </button>
        </div>
      </div>
      {isModalOpen && (
        <DependentMilestoneModal
          onClose={() => setIsModalOpen(false)}
          onCreate={handleDependentMilestoneCreate}
        />
      )}
    </div>
  );
};
