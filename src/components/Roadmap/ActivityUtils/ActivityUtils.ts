/* eslint-disable @typescript-eslint/no-explicit-any */
// ActivityUtils.ts
import { Activity } from '@/types/roadmap';

const API = process.env.REACT_APP_API_BASE_URL;
const accessToken = sessionStorage.getItem('accessToken');


/**
 * Updates the status of an activity.
 * If the new status is "completed", it sets the completed_date to today's date.
 */
export async function updateActivityStatus(activity: Activity) {
  const url = `${API}/activities/${activity.id}/`;
  const payload: any = { status: activity.status };

  if (activity.status === 'completed') {
    // Set today's date as YYYY-MM-DD
    payload.completed_date = new Date().toISOString().split('T')[0];
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
      console.error('Failed to update activity status', response.statusText);
      return;
    }
    if (response.status === 204) {
      return {};
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating activity status', error);
  }
}

/**
 * Sends a contribution record for an activity.
 * This payload includes the activity id and the user's id.
 */
export async function sendActivityContribution(activity: Activity, user: { id: number }) {
  const url = `${API}/activity-contributors/`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || ''}`,
       },
      body: JSON.stringify({
        activity: activity.id,
        user: user.id,
      }),
    });
    if (!response.ok) {
      console.error('Failed to send activity contribution', response.statusText);
    }
  } catch (error) {
    console.error('Error sending activity contribution', error);
  }
}
