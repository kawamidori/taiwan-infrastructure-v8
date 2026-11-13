'use client';
import React, { useState, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { GIS_DATA, VERIFIED_TRANSPORT_GEOJSON } from '@/data/store';

export default function DeckGLMap({
  activeEvent,
  viewState,
  setViewState,
  selectedYear
}: {
  activeEvent: any;
  viewState: any;
  setViewState: any;
  selectedYear: number;
}) {
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [transportGeoJson, setTransportGeoJson] = useState<any>(VERIFIED_TRANSPORT_GEOJSON);

  useEffect(() => {
    fetch('/api/transport')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.geojson) {
          setTransportGeoJson(res.geojson);
        }
      })
      .catch(() => {});
  }, []);

  // Filter point nodes by selectedYear
  const visibleHubs = GIS_DATA.hubs.filter(h => h.activeFrom <= selectedYear);
  const visiblePower = GIS_DATA.powerPlants.filter(p => p.activeFrom <= selectedYear);
  const visibleWater = GIS_DATA.waterNodes.filter(w => w.activeFrom <= selectedYear);
  const visibleDigital = GIS_DATA.digitalNodes.filter(d => d.activeFrom <= selectedYear);
  const visiblePorts = GIS_DATA.portsAndAirports.filter(p => p.activeFrom <= selectedYear);

  const layers: any[] = [
    // 1. Metropolitan Population Clusters (#64748b, opacity 15% = alpha 38)
    new ScatterplotLayer({
      id: 'cities-layer',
      data: GIS_DATA.cities,
      getPosition: (d: any) => d.coords,
      getRadius: (d: any) => Math.sqrt(d.pop) * 3.2,
      getFillColor: [100, 116, 139, 38],
      getLineColor: [203, 213, 225, 140],
      lineWidthMinPixels: 1,
      stroked: true,
      pickable: false
    }),

    // 2. Verified Open Data Transport Corridors (THSR, TRA, Freeway 1/3, Highway 61 in Slate Greys #334155~#64748b)
    new GeoJsonLayer({
      id: 'verified-transport-geojson',
      data: transportGeoJson,
      pickable: true,
      stroked: true,
      filled: false,
      lineWidthUnits: 'pixels',
      lineCapRounded: true,
      lineJoinRounded: true,
      getLineColor: (f: any) => {
        const cat = f.properties?.category;
        if (cat === 'hsr') return [51, 65, 85, 220];       // #334155 高鐵走廊
        if (cat === 'freeway') return [71, 85, 105, 195];  // #475569 國道1/3號
        if (cat === 'expressway') return [100, 116, 139, 185]; // #64748b 台61線
        return [148, 163, 184, 190];                       // #94a3b8 台鐵西部幹線
      },
      getLineWidth: (f: any) => {
        const cat = f.properties?.category;
        if (cat === 'hsr') return 2.5;
        if (cat === 'freeway') return 2;
        return 1.5;
      },
      onHover: (info: any) =>
        setHoverInfo(
          info.object
            ? {
                name: info.object.properties?.name,
                sub: info.object.properties?.source,
                x: info.x,
                y: info.y
              }
            : null
        )
    }),

    // 3. Power System Nodes ONLY (White fill + Deep Amber #b45309 stroke)
    new ScatterplotLayer({
      id: 'power-nodes-layer',
      data: visiblePower,
      getPosition: (d: any) => d.coords,
      getRadius: 2800,
      getFillColor: [255, 255, 255, 255],
      getLineColor: [180, 83, 9, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      onHover: (info: any) =>
        setHoverInfo(
          info.object
            ? { name: info.object.name, sub: `${info.object.township} · ${info.object.capacity}`, x: info.x, y: info.y }
            : null
        )
    }),

    // 4. Water System Nodes ONLY (White fill + Deep Blue #2563eb stroke)
    new ScatterplotLayer({
      id: 'water-nodes-layer',
      data: visibleWater,
      getPosition: (d: any) => d.coords,
      getRadius: 2600,
      getFillColor: [255, 255, 255, 255],
      getLineColor: [37, 99, 235, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      onHover: (info: any) =>
        setHoverInfo(
          info.object
            ? { name: info.object.name, sub: `${info.object.township} · 水資源${info.object.role}`, x: info.x, y: info.y }
            : null
        )
    }),

    // 5. Digital & Subsea Landing Nodes ONLY (White fill + Deep Purple #6d28d9 stroke)
    new ScatterplotLayer({
      id: 'digital-nodes-layer',
      data: visibleDigital,
      getPosition: (d: any) => d.coords,
      getRadius: 2600,
      getFillColor: [255, 255, 255, 255],
      getLineColor: [109, 40, 217, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      onHover: (info: any) =>
        setHoverInfo(
          info.object
            ? { name: info.object.name, sub: `${info.object.township} · 數位${info.object.role}`, x: info.x, y: info.y }
            : null
        )
    }),

    // 6. Airports (Deep Blue #1d4ed8) & Seaports (Deep Teal #0f766e)
    new ScatterplotLayer({
      id: 'ports-airports-layer',
      data: visiblePorts,
      getPosition: (d: any) => d.coords,
      getRadius: 3200,
      getFillColor: (d: any) => (d.kind === 'Airport' ? [29, 78, 216, 240] : [15, 118, 110, 240]),
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 1.5,
      stroked: true,
      pickable: true,
      onHover: (info: any) =>
        setHoverInfo(
          info.object
            ? { name: info.object.name, sub: `${info.object.township} · ${info.object.kind === 'Airport' ? '國際機場' : '國際商港'}`, x: info.x, y: info.y }
            : null
        )
    }),

    // 7. Semiconductor Core Load Terminals (Fab Sinks - Pure Black #0f172a, Crimson #dc2626 on alert)
    new ScatterplotLayer({
      id: 'hubs-layer',
      data: visibleHubs,
      getPosition: (d: any) => d.coords,
      getRadius: 4200,
      getFillColor: (d: any) => (activeEvent?.node === d.id ? [220, 38, 38, 255] : [15, 23, 42, 255]),
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      onHover: (info: any) =>
        setHoverInfo(
          info.object
            ? { name: info.object.name, sub: `${info.object.township} · ${info.object.type}`, x: info.x, y: info.y }
            : null
        ),
      updateTriggers: {
        getFillColor: [activeEvent?.node]
      }
    })
  ];

  return (
    <div className="absolute inset-0 w-full h-full z-0 bg-slate-50">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
      >
        <Map
          reuseMaps
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        />
      </DeckGL>

      {hoverInfo && (
        <div
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
          className="pointer-events-none fixed z-40 bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-2 rounded-lg shadow-md text-xs text-slate-800"
        >
          <div className="font-bold">{hoverInfo.name}</div>
          {hoverInfo.sub && <div className="text-[11px] text-slate-500 mt-0.5">{hoverInfo.sub}</div>}
        </div>
      )}
    </div>
  );
}
