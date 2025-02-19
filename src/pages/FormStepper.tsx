import React, { useState, useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useForm, FormProvider } from 'react-hook-form';
import { Check } from 'lucide-react';
import { RoadmapForm, RoadmapFormData } from '../components/Forms/RoadmapForm';
import { StrategyForm, StrategyFormData } from '../components/Forms/StrategyForm';
import { StrategicGoalForm, StrategicGoalFormData } from '../components/Forms/StrategicGoalForm';
import { ProgramForm, ProgramFormData } from '../components/Forms/ProgramForm';
import { WorkstreamForm, WorkstreamFormData } from '../components/Forms/WorkstreamForm';
import { MilestoneForm, MilestoneFormData } from '../components/Forms/MilestoneForm';
import { ActivityForm, ActivityFormData } from '../components/Forms/ActivityForm';

// Define the allowed step ids.
type StepId = 'roadmap' | 'strategy' | 'strategic-goal' | 'program' | 'workstream' | 'milestone' | 'activity';

// Mapping interface for form data
interface FormDataMap {
  roadmap?: RoadmapFormData;
  strategy?: StrategyFormData;
  'strategic-goal'?: StrategicGoalFormData;
  program?: ProgramFormData;
  workstream?: WorkstreamFormData;
  milestone?: MilestoneFormData;
  activity?: ActivityFormData;
}

// Union of all possible form data shapes
type AllFormData =
  | RoadmapFormData
  | StrategyFormData
  | StrategicGoalFormData
  | ProgramFormData
  | WorkstreamFormData
  | MilestoneFormData
  | ActivityFormData;

// Define your steps (IDs, labels, and associated components)
const FORM_STEPS = [
  { id: 'roadmaps' as StepId, label: 'Roadmap', component: RoadmapForm },
  { id: 'strategies' as StepId, label: 'Strategy', component: StrategyForm },
  { id: 'strategic-goals' as StepId, label: 'Strategic Goal', component: StrategicGoalForm },
  { id: 'programs' as StepId, label: 'Program', component: ProgramForm },
  { id: 'workstreams' as StepId, label: 'Workstream', component: WorkstreamForm },
  { id: 'milestones' as StepId, label: 'Milestone', component: MilestoneForm },
  { id: 'activities' as StepId, label: 'Activity', component: ActivityForm },
] as const;

const FormStepper: React.FC = () => {
  const { themeColor } = useContext(ThemeContext);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<FormDataMap>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Get the current step's id.
  const currentStepId = FORM_STEPS[currentStepIndex].id;

  // Initialize the parent form with default values if available.
  const methods = useForm<AllFormData>({
    defaultValues: formData[currentStepId] || {},
  });

  // Retrieve the access token from session storage.
  const accessToken = sessionStorage.getItem('accessToken');

  const onSubmitStep = async (data: AllFormData) => {
    const isLastStep = currentStepIndex === FORM_STEPS.length - 1;
    
    try {
      // If data exists and contains an "id", update it via PATCH; otherwise, create via POST.
      if (formData[currentStepId] && (formData[currentStepId] as { id?: number }).id) {
        await fetch(`http://127.0.0.1:8000/${currentStepId}/${(formData[currentStepId] as unknown as { id: number }).id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || ''}`,
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });
      } else {
        const response = await fetch(`http://127.0.0.1:8000/${currentStepId}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || ''}`,
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        data = await response.json();
      }

      // Persist the data for this step.
      setFormData((prev) => ({
        ...prev,
        [currentStepId]: data,
      }));

      if (isLastStep) {
        setShowSuccess(true);
        setFormData({});
        setCurrentStepIndex(0);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setCurrentStepIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const CurrentStepComponent = FORM_STEPS[currentStepIndex].component;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg">
          Process completed successfully!
        </div>
      )}

      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {FORM_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index <= currentStepIndex ? 'text-white' : 'text-gray-500'
                }`}
                style={{
                  backgroundColor: index <= currentStepIndex ? themeColor : '#e5e7eb' // gray-200 equivalent
                }}
              >
                {index < currentStepIndex ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              
              {/* Connector Line */}
              {index < FORM_STEPS.length - 1 && (
                <div 
                  className="flex-1 h-0.5" 
                  style={{ 
                    backgroundColor: index < currentStepIndex ? themeColor : '#e5e7eb' // gray-200 equivalent
                  }} 
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <FormProvider {...methods}>
          {/* One single form wraps all step fields */}
          <form onSubmit={methods.handleSubmit(onSubmitStep)}>
            {/* Render the fields for the current step */}
            <CurrentStepComponent />

            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className={`px-4 py-2 rounded-md ${
                  currentStepIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Back
              </button>
              <button
                type="submit"
                style={{ backgroundColor: themeColor, cursor: 'pointer' }}
                className=" text-white px-4 py-2 rounded-md"
              >
                {currentStepIndex === FORM_STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export default FormStepper;
