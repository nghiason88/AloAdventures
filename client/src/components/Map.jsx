import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix default marker icon paths (Leaflet's default assets don't resolve via webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const questIcon = (highlighted) => L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:${highlighted ? '#ffca28' : '#ff9800'};
    border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#2196f3;border:3px solid white;
    box-shadow:0 0 0 4px rgba(33,150,243,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const Map = ({ quests, userLocation, selectedQuest, onSelectQuest }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarker = useRef(null);
  const questMarkers = useRef([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const center = quests.length > 0 ? quests[0].location : { lat: 10.8231, lng: 106.7298 };
    map.current = L.map(mapContainer.current).setView([center.lat, center.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    quests.forEach((quest) => {
      const marker = L.marker([quest.location.lat, quest.location.lng], {
        icon: questIcon(false),
      })
        .addTo(map.current)
        .bindPopup(quest.name);

      marker.on('click', () => onSelectQuest(quest));
      questMarkers.current.push({ id: quest.id, marker });
    });
  }, [quests, onSelectQuest]);

  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (userMarker.current) {
      userMarker.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarker.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map.current)
        .bindPopup('Bạn đang ở đây');
    }
    map.current.panTo([userLocation.lat, userLocation.lng]);
  }, [userLocation]);

  useEffect(() => {
    questMarkers.current.forEach(({ id, marker }) => {
      marker.setIcon(questIcon(selectedQuest?.id === id));
    });
  }, [selectedQuest]);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '60vh', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
};

export default Map;
