// utils/getCookie.ts
export function getCookie(name: string): string {
    const cookieArr = document.cookie.split(';');
    for (let cookie of cookieArr) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.split('=')[1];
      }
    }
    
    // fallback: read from localStorage if cookie not present
    return localStorage.getItem(name) ?? '';
  }
  