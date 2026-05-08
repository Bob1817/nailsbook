import { useEffect, useRef, useState } from 'react';

const AMAP_KEY = 'c6d51eb016527eff3b3025112682dfdd';
const AMAP_SECURITY_CONFIG = '69f8e64490653f8dcdb801bd812b2d0b';

interface UseAMapOptions {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function useAMap(options: UseAMapOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Check if AMap is already loaded
    if (window.AMap) {
      setIsLoaded(true);
      options.onLoad?.();
      return;
    }

    // Set security config
    (window as any)._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_CONFIG,
    };

    // Load AMap script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Driving,AMap.Marker,AMap.Polyline`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
      options.onLoad?.();
    };

    script.onerror = () => {
      const err = new Error('Failed to load AMap');
      setError(err);
      options.onError?.(err);
    };

    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && document.head.contains(scriptRef.current)) {
        document.head.removeChild(scriptRef.current);
      }
    };
  }, []);

  return { isLoaded, error, AMap: window.AMap };
}

// Extend Window interface for AMap
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}
