// updateTaskStatus.ts
export const updateTaskStatus = async (task: any): Promise<void> => {
    let endpoint = `/api/tasks/${task.id}`;
    if (task.level === 'milestone') {
      endpoint = `/api/milestones/${task.id}`;
    } else if (task.level === 'activity') {
      endpoint = `/api/activities/${task.id}`;
    }
    
    const accessToken = sessionStorage.getItem('accessToken');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: task.status, progress: task.progress })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  };
  