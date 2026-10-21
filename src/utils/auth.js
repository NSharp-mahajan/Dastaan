/**
 * Authentication and Session utilities (Web Crypto SHA-256 + localStorage)
 * Note: Prototype client-side storage as per Phase 1 specification.
 */

export async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('dastaan_users') || '[]');
  } catch {
    return [];
  }
}

export function setUsers(users) {
  localStorage.setItem('dastaan_users', JSON.stringify(users));
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('dastaanUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createSession(user) {
  const session = {
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    loginAt: new Date().toISOString()
  };
  sessionStorage.setItem('dastaan_session', JSON.stringify(session));
  const userData = { name: user.fullName || user.email.split('@')[0] };
  localStorage.setItem('dastaanUser', JSON.stringify(userData));
  
  // Dispatch a custom event so reactive components can update instantly
  window.dispatchEvent(new Event('dastaan-auth-change'));
  return userData;
}

export function clearSession() {
  localStorage.removeItem('dastaanUser');
  sessionStorage.removeItem('dastaan_session');
  window.dispatchEvent(new Event('dastaan-auth-change'));
}
