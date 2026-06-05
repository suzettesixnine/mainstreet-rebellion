import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Map, X } from "lucide-react";

// Fix default marker icons in bundled environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

interface MapFilterProps {
  pins: MapPin[];
  center?: { lat: number; lng: number };
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number } | null) => void;
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: MapFilterProps["onBoundsChange"] }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });
  return null;
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (pins.length > 0 && !fitted.current) {
      const group = L.featureGroup(pins.map((p) => L.marker([p.lat, p.lng])));
      map.fitBounds(group.getBounds().pad(0.2));
      fitted.current = true;
    }
  }, [pins, map]);

  return null;
}

export default function MapFilter({ pins, center, onBoundsChange }: MapFilterProps) {
  const [visible, setVisible] = useState(false);

  const handleToggle = useCallback(() => {
    if (visible) {
      onBoundsChange(null); // clear filter when hiding
    }
    setVisible((v) => !v);
  }, [visible, onBoundsChange]);

  const defaultCenter: [number, number] = center
    ? [center.lat, center.lng]
    : [39.8283, -98.5795]; // geographic center of US

  return (
    <div className="mb-6">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="mb-3 uppercase tracking-wider font-display text-xs border-foreground/20"
      >
        {visible ? <X className="mr-2 h-3.5 w-3.5" /> : <Map className="mr-2 h-3.5 w-3.5" />}
        {visible ? "Hide Map" : "Filter by Map"}
      </Button>

      {visible && (
        <div className="border border-foreground/20 overflow-hidden" style={{ height: 300 }}>
          <MapContainer
            center={defaultCenter}
            zoom={center ? 12 : 4}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <BoundsWatcher onBoundsChange={onBoundsChange} />
            <FitBounds pins={pins} />
            {pins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]}>
                <Popup className="font-display text-xs uppercase tracking-wider">
                  {pin.label}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
