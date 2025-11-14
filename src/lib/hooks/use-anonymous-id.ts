'use client';

import { useState, useEffect } from 'react';

const ANONYMOUS_ID_KEY = 'whispr-anonymous-id';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAnonymousId(): string | null {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let storedId = localStorage.getItem(ANONYMOUS_ID_KEY);
      if (!storedId) {
        storedId = `anon_${generateUUID()}`;
        localStorage.setItem(ANONYMOUS_ID_KEY, storedId);
      }
      setAnonymousId(storedId);
    } catch (error) {
      console.error('Could not access localStorage:', error);
      // Fallback for environments where localStorage is not available
      if (!anonymousId) {
        setAnonymousId(`anon_${generateUUID()}`);
      }
    }
  }, []);

  return anonymousId;
}
