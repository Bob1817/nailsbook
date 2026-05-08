import React, { useEffect, useRef, useState } from 'react';
import { useAMap } from '../../hooks/useAMap';

interface MapMarker {
  id: string | number;
  position: [number, number]; // [lng, lat]
  title?: string;
  label?: string;
}

interface AMapContainerProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  showRoute?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onMarkerClick?: (marker: MapMarker) => void;
}

export const AMapContainer: React.FC<AMapContainerProps> = ({
  markers = [],
  center,
  zoom = 12,
  showRoute = false,
  className = '',
  style = {},
  onMarkerClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const { isLoaded, AMap } = useAMap();
  const [error, setError] = useState<string | null>(null);

  const normalizeLayerZIndex = () => {
    const root = mapRef.current;
    if (!root) return;

    root.style.position = 'relative';
    root.style.zIndex = '0';

    const selectors = [
      '.amap-maps',
      '.amap-layers',
      '.amap-layer',
      '.amap-overlays',
      '.amap-markers',
      '.amap-labels-layer',
      '.amap-labels',
      '.amap-logo',
      '.amap-copyright',
      '.amap-controls',
    ];

    selectors.forEach((selector) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.style.zIndex = '0';
      });
    });
  };

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !AMap || !mapRef.current || mapInstanceRef.current) return;

    try {
      // Calculate center if not provided
      let mapCenter = center;
      if (!mapCenter && markers.length > 0) {
        const lngSum = markers.reduce((sum, m) => sum + m.position[0], 0);
        const latSum = markers.reduce((sum, m) => sum + m.position[1], 0);
        mapCenter = [lngSum / markers.length, latSum / markers.length];
      }
      // Default center for Beijing
      const defaultCenter: [number, number] = [116.397428, 39.90923];

      const map = new AMap.Map(mapRef.current, {
        zoom,
        center: mapCenter || defaultCenter,
        viewMode: '2D',
      });

      mapInstanceRef.current = map;
      requestAnimationFrame(() => normalizeLayerZIndex());
    } catch (err) {
      setError('地图初始化失败');
      console.error('Map initialization error:', err);
    }
  }, [isLoaded, AMap, center, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !AMap) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // Clear existing route
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // Add new markers
    markers.forEach((markerData) => {
      const marker = new AMap.Marker({
        position: markerData.position,
        title: markerData.title || '',
        label: markerData.label
          ? {
              content: markerData.label,
              direction: 'top',
            }
          : undefined,
        map: mapInstanceRef.current,
      });

      // Add click event
      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(markerData));
      }

      markersRef.current.push(marker);
    });

    // Draw route if enabled and there are multiple markers
    if (showRoute && markers.length > 1) {
      const path = markers.map((m) => m.position);
      const polyline = new AMap.Polyline({
        path,
        strokeColor: '#FF7C7F',
        strokeWeight: 4,
        strokeStyle: 'dashed',
        strokeDasharray: [10, 8],
        map: mapInstanceRef.current,
      });
      polylineRef.current = polyline;

      // Fit bounds to show all markers
      mapInstanceRef.current.setFitView();
    }

    requestAnimationFrame(() => normalizeLayerZIndex());
  }, [markers, showRoute, AMap, onMarkerClick]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={style}
      >
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={style}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          <p className="text-sm text-gray-500">地图加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 0,
        ...style,
      }}
    />
  );
};
