// src/components/Flightmap/FlightmapComponents/QuickEdit/index.ts
// Export barrel for QuickEdit components

// Core edit mode manager
export { EditModeManager } from './EditModeManager';
export type { EditModeManagerProps, VisualizationData } from './EditModeManager';

// Week 2 components (placeholders for now)
// export { MilestoneQuickEditor } from './MilestoneQuickEditor/MilestoneQuickEditor';
// export { MilestoneEditForm } from './MilestoneQuickEditor/MilestoneEditForm';
// export { DependencyCreator } from './DependencyCreator/DependencyCreator';
// export { DependencyPreview } from './DependencyCreator/DependencyPreview';

// Week 3 components (placeholders for now)
// export { ActivityConnectionBuilder } from './ActivityConnectionBuilder/ActivityBuilder';
// export { ActivityForm } from './ActivityConnectionBuilder/ActivityForm';
// export { WorkstreamMilestoneCreator } from './WorkstreamMilestoneCreator/MilestoneCreator';
// export { MilestoneForm } from './WorkstreamMilestoneCreator/MilestoneForm';

// Week 4 components (placeholders for now)
// export { TimelineDeadlineAdjuster } from './TimelineDeadlineAdjuster/TimelineAdjuster';
// export { DeadlinePreview } from './TimelineDeadlineAdjuster/DeadlinePreview';

// Re-export types for convenience
export type { EditMode, EditModeState, EditModeCallbacks } from '../../../../hooks/useQuickEditModes';
export type { EditButton, EditCallbacks } from '../../Utils/legendUtils';