// FlightmapUtils/api/sendContribution.ts
export const sendContribution = async (
    type: 'milestone' | 'activity',
    task: any,
    user: any
  ): Promise<void> => {
    const endpoint = type === 'milestone' ? '/api/milestone_contributions' : '/api/activity_contributions';
    const payload = { userId: user.id, taskId: task.id };
    
    const accessToken = sessionStorage.getItem('accessToken');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to update ${type} contribution`);
      }
    } catch (error) {
      console.error(`Failed to update ${type} contributions:`, error);
      throw error;
    }
  };
  