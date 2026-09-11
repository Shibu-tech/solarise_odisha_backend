import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
 * Internal component: smoothly flies/pans the map when coordinates change
 */
const MapController = ({ targetCenter, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCenter && targetCenter[0] && targetCenter[1]) {
      map.flyTo(targetCenter, zoom || map.getZoom() || 15, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [targetCenter, zoom, map]);
  return null;
};

/**
 * LocationMapPicker — interactive OpenStreetMap picker with area search bar and draggable marker
 *
 * Props:
 *   lat       (number|string) — current latitude
 *   lng       (number|string) — current longitude
 *   onLocationSelect({ lat, lng }) — called on map click, marker drag, or search selection
 *   height    (string) — map container height (default "300px")
 */
const LocationMapPicker = ({ lat, lng, onLocationSelect, height = '300px' }) => {
  const [address, setAddress] = useState('');
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [targetCenter, setTargetCenter] = useState(null);
  const [targetZoom, setTargetZoom] = useState(DEFAULT_ZOOM);

  const reverseGeoTimer = useRef(null);
  const searchDebounceTimer = useRef(null);
  const searchContainerRef = useRef(null);
  const markerRef = useRef(null);

  const numLat = parseFloat(lat) || DEFAULT_LAT;
  const numLng = parseFloat(lng) || DEFAULT_LNG;
  const hasCoords = !!(parseFloat(lat) && parseFloat(lng));

  // Sync targetCenter when external lat/lng changes
  useEffect(() => {
    if (hasCoords) {
      setTargetCenter([parseFloat(lat), parseFloat(lng)]);
    }
  }, [lat, lng, hasCoords]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function using Nominatim Search API
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim()
        )}&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced live search when user types in search bar
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    clearTimeout(searchDebounceTimer.current);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchDebounceTimer.current = setTimeout(() => {
      performSearch(val);
    }, 450);
  };

  // Handle direct search submission (Enter key / Search button)
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    clearTimeout(searchDebounceTimer.current);
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery);
    }
  };

  // Handle selecting an area/location from search suggestions
  const handleSelectSearchResult = (result) => {
    const selectedLat = parseFloat(parseFloat(result.lat).toFixed(6));
    const selectedLng = parseFloat(parseFloat(result.lon).toFixed(6));

    setShowDropdown(false);
    setSearchQuery(result.name || result.display_name.split(',')[0]);
    setTargetCenter([selectedLat, selectedLng]);
    setTargetZoom(16);

    onLocationSelect({
      lat: selectedLat,
      lng: selectedLng,
    });
  };

  // Clear search input
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Draggable marker event handlers
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          setTargetCenter([newLat, newLng]);
          onLocationSelect({
            lat: newLat,
            lng: newLng,
          });
        }
      },
    }),
    [onLocationSelect]
  );

  // Reverse geocoding via Nominatim
  useEffect(() => {
    if (!hasCoords) {
      setAddress('');
      return;
    }

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
    }, 600);

    return () => clearTimeout(reverseGeoTimer.current);
  }, [numLat, numLng, hasCoords]);

  return (
    <div className="space-y-2">
      {/* Search Bar Container */}
      <div ref={searchContainerRef} className="relative z-30">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search area, city, locality (e.g. Nayapalli, Bhubaneswar, Cuttack)..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            {isSearching ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <span>Search Area</span>
            )}
          </button>
        </form>

        {/* Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {isSearching ? (
              <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Searching places...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, idx) => {
                const parts = (item.display_name || '').split(',');
                const title = item.name || parts[0];
                const subtitle = parts.slice(1).join(',').trim();

                return (
                  <button
                    key={`${item.place_id || idx}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/80 transition-colors flex items-start gap-2.5 group"
                  >
                    <div className="p-1 rounded-md bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 shrink-0 mt-0.5 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-800">
                        {title}
                      </div>
                      {subtitle && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                No matching locations found for "{searchQuery}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        className="rounded-xl overflow-hidden border border-slate-200 shadow-xs relative z-10"
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
          <MapController targetCenter={targetCenter} zoom={targetZoom} />
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

      {/* Selected coordinate feedback & reverse geocoded address */}
      {hasCoords ? (
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex items-start gap-2 text-xs">
          <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-700 font-medium">
              <span>Lat: <strong className="text-slate-900 font-mono">{numLat.toFixed(6)}</strong></span>
              <span>•</span>
              <span>Lng: <strong className="text-slate-900 font-mono">{numLng.toFixed(6)}</strong></span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-normal">
                Draggable & Clickable
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed truncate">
              {loadingAddr ? (
                <span className="italic text-slate-400">Looking up address details…</span>
              ) : address ? (
                address
              ) : (
                <span className="italic text-slate-400">Address preview unavailable</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 italic px-1 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Search for an area above, click anywhere on the map, or drag the pin to pick coordinates.
        </p>
      )}
    </div>
  );
};

export default LocationMapPicker;
