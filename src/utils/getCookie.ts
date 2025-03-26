// utils/getCookie.ts
export function getCookie(name: string): string {
    const cookieArr = document.cookie.split(';');
    for (let cookie of cookieArr) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.split('=')[1];
      }
    }
    return '';
  }
  