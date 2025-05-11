/* eslint-disable @typescript-eslint/no-explicit-any */
import { GanttItem } from '../GanttChart';

export async function updateTaskStatus(item: GanttItem) {
  const API = import.meta.env.VITE_API_BASE_URL;
  const accessToken = sessionStorage.getItem('accessToken');
  // Extract the numeric ID from the item.id (e.g. "a-13" becomes 13)
  const numericId = parseInt(item.id.split('-')[1]);
  let url = '';

  if (item.level === 'activity') {
    url = `${API}/activities/${numericId}/`;
  } else if (item.level === 'milestone') {
    url = `${API}/milestones/${numericId}/`;
  } else {
    return;
  }

  // When marking complete, ensure a valid completed_date is provided.
  const payload: any = { status: item.status };
  if (item.status === 'completed') {
    // Use today's date as a string in YYYY-MM-DD format.
    payload.completed_date = new Date().toISOString().split('T')[0];
  } else {
    payload.completed_date = item.completedDate;
  }

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || ''}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error('Failed to update task status', response.statusText);
      return;
    }
    // If there's no content (204), avoid calling response.json()
    if (response.status === 204) {
      return {};
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating task status', error);
  }
}