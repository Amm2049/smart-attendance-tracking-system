export function haversineDistanceMeters(params: {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}) {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(params.lat2 - params.lat1);
  const dLng = toRad(params.lng2 - params.lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(params.lat1)) *
      Math.cos(toRad(params.lat2)) *
      (Math.sin(dLng / 2) * Math.sin(dLng / 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

