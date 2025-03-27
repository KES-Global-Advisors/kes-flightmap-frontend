import { GanttItem } from '../GanttChart';
import { User } from '@/contexts/UserContext';
  
  export async function sendContribution(item: GanttItem,  user: User) {
    console.log(user);
    const API = import.meta.env.VITE_API_BASE_URL;
      const accessToken = sessionStorage.getItem('accessToken');
      let url = '';
      // Determine the correct endpoint and payload key based on item level.
      const numericId = parseInt(item.id.split('-')[1]);
      if (item.level === 'activity') {
        url = `${API}/activity-contributors/`;
      } else if (item.level === 'milestone') {
        url = `${API}/milestone-contributors/`;
      } else {
        return; // No contribution is sent for other levels.
      }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${accessToken || ''}`,
        },
        body: JSON.stringify({
          [item.level]: numericId,
          user: user.id,
       }),
      });
      if (!response.ok) {
         console.error('Failed to send contribution', response.statusText);
      }
    } catch (error) {
        console.error('Error sending contribution', error);
    }
  }
  