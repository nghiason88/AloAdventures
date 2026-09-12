export const calculateDistance = (coord1, coord2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const trackUserLocation = (callback) => {
  if (!navigator.geolocation) {
    console.error('Geolocation not supported');
    return null;
  }

  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({ lat: position.coords.latitude, lng: position.coords.longitude });
    },
    (error) => {
      console.error('GPS Error:', error.message);
      callback({ lat: 10.8231, lng: 106.7298 }); // fallback for desktop testing
    },
    options
  );
};
