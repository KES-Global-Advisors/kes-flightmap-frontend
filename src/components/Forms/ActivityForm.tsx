// import React from 'react';
// import { useFormContext } from 'react-hook-form';
// import useFetch from '../../hooks/UseFetch';
// import { Workstream, Milestone, Activity } from '../../types/model';

// export type ActivityFormData = {
//   workstream: number;
//   milestone?: number;
//   name: string;
//   status: 'not_started' | 'in_progress' | 'completed';
//   priority: 1 | 2 | 3;
//   target_start_date: string;
//   target_end_date: string;
//   prerequisite_activities: number[];
//   parallel_activities: number[];
//   successive_activities: number[];
//   impacted_employee_groups: string[];
//   change_leaders: string[];
//   development_support: string[];
//   external_resources: string[];
//   corporate_resources: string[];
// };

// export const ActivityForm: React.FC = () => {
//   const { register } = useFormContext<ActivityFormData>();
//   const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>('http://127.0.0.1:8000/workstreams/');
//   const { data: milestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone>('http://127.0.0.1:8000/milestones/');
//   const { data: activities, loading: loadingActivities, error: errorActivities } = useFetch<Activity>('http://127.0.0.1:8000/activities/');

//   return (
//     <div className="space-y-4">
//       <h2>Activity Form</h2>
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
//         <label className="block text-sm font-medium text-gray-700">Milestone (optional)</label>
//         {loadingMilestones ? (
//           <p>Loading milestones...</p>
//         ) : errorMilestones ? (
//           <p>Error: {errorMilestones}</p>
//         ) : (
//           <select
//             {...register('milestone')}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//           >
//             <option value="">No milestone</option>
//             {milestones.map((m) => (
//               <option key={m.id} value={m.id}>
//                 {m.name}
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
//         <label className="block text-sm font-medium text-gray-700">Priority</label>
//         <select
//           {...register('priority')}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         >
//           <option value={1}>High</option>
//           <option value={2}>Medium</option>
//           <option value={3}>Low</option>
//         </select>
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
//         <label className="block text-sm font-medium text-gray-700">Target Start Date</label>
//         <input
//           {...register('target_start_date')}
//           type="date"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Target End Date</label>
//         <input
//           {...register('target_end_date')}
//           type="date"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       {/* Multi-selects for activity relationships */}
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Prerequisite Activities</label>
//         {loadingActivities ? (
//           <p>Loading activities...</p>
//         ) : errorActivities ? (
//           <p>Error: {errorActivities}</p>
//         ) : (
//           <select
//             {...register('prerequisite_activities')}
//             multiple
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//           >
//             {activities.map((act) => (
//               <option key={act.id} value={act.id}>
//                 {act.name}
//               </option>
//             ))}
//           </select>
//         )}
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Parallel Activities</label>
//         {loadingActivities ? (
//           <p>Loading activities...</p>
//         ) : errorActivities ? (
//           <p>Error: {errorActivities}</p>
//         ) : (
//           <select
//             {...register('parallel_activities')}
//             multiple
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//           >
//             {activities.map((act) => (
//               <option key={act.id} value={act.id}>
//                 {act.name}
//               </option>
//             ))}
//           </select>
//         )}
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">Successive Activities</label>
//         {loadingActivities ? (
//           <p>Loading activities...</p>
//         ) : errorActivities ? (
//           <p>Error: {errorActivities}</p>
//         ) : (
//           <select
//             {...register('successive_activities')}
//             multiple
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//           >
//             {activities.map((act) => (
//               <option key={act.id} value={act.id}>
//                 {act.name}
//               </option>
//             ))}
//           </select>
//         )}
//       </div>
//       {/* For resource fields, using comma-separated string inputs */}
//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           Impacted Employee Groups (comma separated)
//         </label>
//         <input
//           {...register('impacted_employee_groups')}
//           type="text"
//           placeholder="e.g., Group1, Group2"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           Change Leaders (comma separated)
//         </label>
//         <input
//           {...register('change_leaders')}
//           type="text"
//           placeholder="e.g., Leader1, Leader2"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           Development Support (comma separated)
//         </label>
//         <input
//           {...register('development_support')}
//           type="text"
//           placeholder="e.g., Support1, Support2"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           External Resources (comma separated)
//         </label>
//         <input
//           {...register('external_resources')}
//           type="text"
//           placeholder="e.g., Resource1, Resource2"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           Corporate Resources (comma separated)
//         </label>
//         <input
//           {...register('corporate_resources')}
//           type="text"
//           placeholder="e.g., Resource1, Resource2"
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
//         />
//       </div>
//     </div>
//   );
// };


import React, { useState } from 'react';
import { useFormContext, useForm } from 'react-hook-form';
import useFetch from '../../hooks/UseFetch';
import { Workstream, Milestone, Activity } from '../../types/model';

export type ActivityFormData = {
  workstream: number;
  milestone?: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 1 | 2 | 3;
  target_start_date: string;
  target_end_date: string;
  prerequisite_activities: number[];
  parallel_activities: number[];
  successive_activities: number[];
  impacted_employee_groups: string[];
  change_leaders: string[];
  development_support: string[];
  external_resources: string[];
  corporate_resources: string[];
};

type DependentActivityModalProps = {
  dependencyType: 'prerequisite' | 'parallel' | 'successive';
  onClose: () => void;
  onCreate: (activity: Activity) => void;
};

// Modal for creating a dependent activity that is sent to the backend.
const DependentActivityModal: React.FC<DependentActivityModalProps> = ({
  dependencyType,
  onClose,
  onCreate,
}) => {
  const { register, handleSubmit, reset } = useForm<ActivityFormData>();

  const onSubmit = async (data: ActivityFormData) => {
    // For dependent activities, omit workstream and milestone.
    const payload = {
      name: data.name,
      status: data.status,
      priority: data.priority,
      target_start_date: data.target_start_date,
      target_end_date: data.target_end_date,
      // Other fields can be added if required.
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/activities/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to create dependent activity');
      }
      const newActivity = await response.json();
      onCreate(newActivity);
      reset();
      onClose();
    } catch (error) {
      console.error(error);
      // Optionally, show an error message.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-4 rounded-md shadow-lg w-1/2">
        <h3 className="text-lg font-medium mb-4">
          Create New {dependencyType.charAt(0).toUpperCase() + dependencyType.slice(1)} Activity
        </h3>
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
            <label className="block text-sm font-medium">Target Start Date</label>
            <input
              {...register('target_start_date')}
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="mt-2">
            <label className="block text-sm font-medium">Target End Date</label>
            <input
              {...register('target_end_date')}
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
          <div className="mt-2">
            <label className="block text-sm font-medium">Priority</label>
            <select
              {...register('priority')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
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

export const ActivityForm: React.FC = () => {
  const { register } = useFormContext<ActivityFormData>();

  const { data: workstreams, loading: loadingWorkstreams, error: errorWorkstreams } = useFetch<Workstream>(
    'http://127.0.0.1:8000/workstreams/'
  );
  const { data: milestones, loading: loadingMilestones, error: errorMilestones } = useFetch<Milestone>(
    'http://127.0.0.1:8000/milestones/'
  );
  const { data: activities, loading: loadingActivities, error: errorActivities } = useFetch<Activity>(
    'http://127.0.0.1:8000/activities/'
  );

  // Local state for storing newly created dependent activities.
  const [dependentActivities, setDependentActivities] = useState<{
    prerequisite: Activity[];
    parallel: Activity[];
    successive: Activity[];
  }>({
    prerequisite: [],
    parallel: [],
    successive: [],
  });

  // Control modal visibility and current dependency type.
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentDependencyType, setCurrentDependencyType] = useState<'prerequisite' | 'parallel' | 'successive' | null>(null);

  const handleDependentActivityCreate = (activity: Activity) => {
    if (currentDependencyType) {
      setDependentActivities((prev) => ({
        ...prev,
        [currentDependencyType]: [...prev[currentDependencyType], activity],
      }));
    }
  };

  const openModalForType = (dependencyType: 'prerequisite' | 'parallel' | 'successive') => {
    setCurrentDependencyType(dependencyType);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-10">Activity Form</h2>
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
        <label className="block text-sm font-medium text-gray-700">Milestone (optional)</label>
        {loadingMilestones ? (
          <p>Loading milestones...</p>
        ) : errorMilestones ? (
          <p>Error: {errorMilestones}</p>
        ) : (
          <select
            {...register('milestone')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">No milestone</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
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
        <label className="block text-sm font-medium text-gray-700">Priority</label>
        <select
          {...register('priority')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value={1}>High</option>
          <option value={2}>Medium</option>
          <option value={3}>Low</option>
        </select>
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
        <label className="block text-sm font-medium text-gray-700">Target Start Date</label>
        <input
          {...register('target_start_date')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Target End Date</label>
        <input
          {...register('target_end_date')}
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      {/* Dependency Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Prerequisite Activities</label>
        {loadingActivities ? (
          <p>Loading activities...</p>
        ) : errorActivities ? (
          <p>Error: {errorActivities}</p>
        ) : (
          <select
            {...register('prerequisite_activities')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
            {dependentActivities.prerequisite.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>
        )}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => openModalForType('prerequisite')}
            className="text-indigo-600 hover:text-indigo-800 underline"
          >
            Create new Prerequisite Activity
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Parallel Activities</label>
        {loadingActivities ? (
          <p>Loading activities...</p>
        ) : errorActivities ? (
          <p>Error: {errorActivities}</p>
        ) : (
          <select
            {...register('parallel_activities')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
            {dependentActivities.parallel.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>
        )}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => openModalForType('parallel')}
            className="text-indigo-600 hover:text-indigo-800 underline"
          >
            Create new Parallel Activity
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Successive Activities</label>
        {loadingActivities ? (
          <p>Loading activities...</p>
        ) : errorActivities ? (
          <p>Error: {errorActivities}</p>
        ) : (
          <select
            {...register('successive_activities')}
            multiple
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
            {dependentActivities.successive.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name}
              </option>
            ))}
          </select>
        )}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => openModalForType('successive')}
            className="text-indigo-600 hover:text-indigo-800 underline"
          >
            Create new Successive Activity
          </button>
        </div>
      </div>
      {/* Resource Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Impacted Employee Groups (comma separated)
        </label>
        <input
          {...register('impacted_employee_groups')}
          type="text"
          placeholder="e.g., Group1, Group2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Change Leaders (comma separated)
        </label>
        <input
          {...register('change_leaders')}
          type="text"
          placeholder="e.g., Leader1, Leader2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Development Support (comma separated)
        </label>
        <input
          {...register('development_support')}
          type="text"
          placeholder="e.g., Support1, Support2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          External Resources (comma separated)
        </label>
        <input
          {...register('external_resources')}
          type="text"
          placeholder="e.g., Resource1, Resource2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Corporate Resources (comma separated)
        </label>
        <input
          {...register('corporate_resources')}
          type="text"
          placeholder="e.g., Resource1, Resource2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      {modalOpen && currentDependencyType && (
        <DependentActivityModal
          dependencyType={currentDependencyType}
          onClose={() => setModalOpen(false)}
          onCreate={handleDependentActivityCreate}
        />
      )}
    </div>
  );
};
