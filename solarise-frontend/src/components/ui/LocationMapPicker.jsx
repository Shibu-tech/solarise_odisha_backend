import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default marker icon issue with bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Default center: Bhubaneswar, Odisha
const DEFAULT_LAT = 20.2961;
const DEFAULT_LNG = 85.8245;
const DEFAULT_ZOOM = 13;

/**
 * Internal component: handles map click events to pick a location
 */
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect({
        lat: parseFloat(e.latlng.lat.toFixed(6)),
        lng: parseFloat(e.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
};

/**
 * Internal component: re-centers the map when lat/lng props change externally
 */
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

/**
 * LocationMapPicker — interactive OpenStreetMap picker with draggable marker
 *
 * Props:
 *   lat       (number|string) — current latitude
 *   lng       (number|string) — current longitude
 *   onLocationSelect({ lat, lng }) — called on map click or marker drag
 *   height    (string) — map container height (default "280px")
 */
const LocationMapPicker = ({ lat, lng, onLocationSelect, height = '280px' }) => {
  const [address, setAddress] = useState('');
  const [loadingAddr, setLoadingAddr] = useState(false);
  const reverseGeoTimer = useRef(null);

  const numLat = parseFloat(lat) || DEFAULT_LAT;
  const numLng = parseFloat(lng) || DEFAULT_LNG;
  const hasCoords = !!(parseFloat(lat) && parseFloat(lng));

  // Draggable marker event handlers
  const markerRef = useRef(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          onLocationSelect({
            lat: parseFloat(pos.lat.toFixed(6)),
            lng: parseFloat(pos.lng.toFixed(6)),
          });
        }
      },
    }),
    [onLocationSelect]
  );

  // Reverse geocoding via Nominatim (free, no key required)
  useEffect(() => {
    if (!hasCoords) {
      setAddress('');
      return;
    }

    // Debounce: wait 800ms after last change
    clearTimeout(reverseGeoTimer.current);
    reverseGeoTimer.current = setTimeout(async () => {
      try {
        setLoadingAddr(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setAddress(data.display_name || '');
      } catch {
        setAddress('');
      } finally {
        setLoadingAddr(false);
      }
    }, 800);

    return () => clearTimeout(reverseGeoTimer.current);
  }, [numLat, numLng, hasCoords]);

  return (
    <div className="space-y-2">
      {/* Map Container */}
      <div
        className="rounded-xl overflow-hidden border border-slate-200 shadow-xs"
        style={{ height, width: '100%' }}
      >
        <MapContainer
          center={[numLat, numLng]}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={onLocationSelect} />
          <RecenterMap lat={numLat} lng={numLng} />
          {hasCoords && (
            <Marker
              position={[numLat, numLng]}
              draggable={true}
              eventHandlers={eventHandlers}
              ref={markerRef}
            />
          )}
        </MapContainer>
      </div>

      {/* Reverse geocoded address */}
      {hasCoords && (
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 px-1">
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="leading-relaxed">
            {loadingAddr ? (
              <span className="italic text-slate-400">Looking up address…</span>
            ) : address ? (
              address
            ) : (
              <span className="italic text-slate-400">Click on the map to select a location</span>
            )}
          </span>
        </div>
      )}

      {!hasCoords && (
        <p className="text-[11px] text-slate-400 italic px-1">
          Click anywhere on the map to set a location, or use Auto-detect GPS.
        </p>
      )}
    </div>
  );
};

export default LocationMapPicker;
