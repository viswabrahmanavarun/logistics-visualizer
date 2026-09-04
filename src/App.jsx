import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  Truck, Pause, Play, Moon, Sun, RotateCcw, 
  MapPin, Navigation, CheckCircle2, Clock, 
  Zap, ChevronRight, Activity
} from 'lucide-react';

// --- Theme Colors matching the screenshots ---
const COLORS = {
  primary: '#1F4F3F',     // Dark green for buttons/headers
  route: '#2E7D5C',       // Green for the route line
  origin: '#4ADE80',      // Light green
  transit: '#FB923C',     // Orange for D1/D2
  destination: '#94A3B8', // Grayish/Purple for D3
  bg: '#F8FAF9',          // Off-white background
};

// --- Custom Icons ---
const createDotIcon = (color) => L.divIcon({
  className: 'custom-dot-icon',
  html: `<div style="
    background-color: ${color};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transform: translate(-8px, -8px);
  "></div>`,
});

const truckIcon = L.divIcon({
  className: 'truck-icon',
  html: `<div style="
    background-color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 2px solid ${COLORS.primary};
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(-16px, -16px);
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${COLORS.transit}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 17h4V5H2v12h3"/>
      <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
      <path d="M14 17h1"/>
      <circle cx="7.5" cy="17.5" r="2.5"/>
      <circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  </div>`,
});

// --- Data & Helpers ---
const STOPS = [
  { id: 'origin', name: "Northline Depot", pos: [28.6139, 77.2090], type: 'origin', time: "07:40" },
  { id: 'd1', name: "Riverside Market", pos: [28.4595, 77.0266], type: 'transit', time: "08:15" },
  { id: 'd2', name: "Cedar Industrial", pos: [28.4089, 77.3178], type: 'transit', time: "08:50" },
  { id: 'd3', name: "Harbor Cold Store", pos: [28.5355, 77.3910], type: 'destination', time: "09:35" },
];

const routePositions = STOPS.map(n => n.pos);

const calculateDistance = (p1, p2) => {
  const R = 6371; 
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLon = (p2[1] - p1[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const segmentDistances = [];
let totalRouteDistance = 0;
for(let i = 0; i < STOPS.length - 1; i++) {
  const dist = calculateDistance(STOPS[i].pos, STOPS[i+1].pos);
  segmentDistances.push(dist);
  totalRouteDistance += dist;
}

export default function App() {
  const [truckPos, setTruckPos] = useState(STOPS[0].pos);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [distanceCovered, setDistanceCovered] = useState(0);
  
  // Dashboard states
  const [isPaused, setIsPaused] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [eta, setEta] = useState(0);

  const BASE_SECONDS_PER_SEGMENT = 15; 
  const progressRef = useRef(0);

  // Restart function
  const handleRestart = () => {
    setCurrentSegment(0);
    setDistanceCovered(0);
    setTruckPos(STOPS[0].pos);
    progressRef.current = 0;
    setIsPaused(false);
  };

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    const animate = (time) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      if (!isPaused && currentSegment < STOPS.length - 1) {
        // Adjust speed based on user selection
        const speedFactor = simSpeed;
        progressRef.current += (deltaTime / 1000) / (BASE_SECONDS_PER_SEGMENT / speedFactor);

        if (progressRef.current >= 1) {
          progressRef.current = 1;
        }

        const startNode = STOPS[currentSegment].pos;
        const endNode = STOPS[currentSegment + 1].pos;
        const p = progressRef.current;

        // Smooth cubic easing for movement
        const easeP = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

        const lat = startNode[0] + (endNode[0] - startNode[0]) * easeP;
        const lng = startNode[1] + (endNode[1] - startNode[1]) * easeP;
        setTruckPos([lat, lng]);

        let baseDistance = 0;
        for (let i = 0; i < currentSegment; i++) {
           baseDistance += segmentDistances[i];
        }
        const currentSegmentDist = calculateDistance(startNode, [lat, lng]);
        setDistanceCovered(baseDistance + currentSegmentDist);
        
        // ETA Calculation
        const totalSegments = STOPS.length - 1;
        const remainingSegments = (totalSegments - currentSegment) - progressRef.current;
        setEta(remainingSegments * (BASE_SECONDS_PER_SEGMENT / speedFactor));

        if (progressRef.current >= 1) {
          setCurrentSegment(prev => prev + 1);
          progressRef.current = 0; 
        }
      } else if (isPaused) {
         lastTime = time;
      }

      if (currentSegment < STOPS.length - 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setEta(0); // Arrived
      }
    };

    if (currentSegment < STOPS.length - 1) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentSegment, isPaused, simSpeed]);

  // Derived state for the UI Panel
  const isComplete = currentSegment >= STOPS.length - 1;
  const nextStop = isComplete ? STOPS[STOPS.length - 1] : STOPS[currentSegment + 1];
  const currentStop = STOPS[currentSegment];
  const completedCount = Math.min(currentSegment, 3);
  const routeProgressPercent = Math.min(100, (distanceCovered / totalRouteDistance) * 100);

  // Map Theme - using standard OSM to avoid API key limits
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950' : 'bg-[#F8FAF9]'} transition-colors duration-300 font-sans`}>
      
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="bg-[#1F4F3F] p-2 rounded-lg text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">Routewise</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Fleet Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/50">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            LIVE TRACKING
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="w-8 h-8 rounded-full bg-[#1F4F3F] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white dark:border-slate-800">
            AN
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="max-w-[1400px] mx-auto p-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1F4F3F] dark:text-emerald-400 mb-2 tracking-wide uppercase">
              <Activity size={14} /> Run Monitor
            </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Morning delivery run</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">TRK-204</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span>Delhi North Loop</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span>Tuesday, 24 June 2025</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleRestart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"
            >
              <RotateCcw size={16} /> Restart route
            </button>
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all shadow-md ${isPaused ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-[#1F4F3F] hover:bg-[#163a2e] shadow-[#1F4F3F]/20'}`}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />} 
              {isPaused ? 'Resume tracking' : 'Pause tracking'}
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard 
            icon={<MapPin size={20} className="text-emerald-600 dark:text-emerald-400" />} 
            title="Current location"
            main={isComplete ? currentStop.name : (progressRef.current < 0.1 ? currentStop.name : `En route to ${nextStop.name}`)}
            sub={isComplete ? "Arrived" : `Next: ${nextStop.name}`}
            blobColor="bg-emerald-500"
          />
          <StatCard 
            icon={<Navigation size={20} className="text-orange-600 dark:text-orange-400" />} 
            title="Distance covered"
            main={`${distanceCovered.toFixed(1)} km`}
            sub={`${Math.round(routeProgressPercent)}% of ${totalRouteDistance.toFixed(1)} km route`}
            blobColor="bg-orange-500"
            progressBar={routeProgressPercent}
          />
          <StatCard 
            icon={<MapPin size={20} className="text-yellow-600 dark:text-yellow-400" />} 
            title="Next stop"
            main={isComplete ? "-" : nextStop.name}
            sub={isComplete ? "Finished" : `${(totalRouteDistance - distanceCovered).toFixed(1)} km remaining`}
            blobColor="bg-yellow-500"
          />
          <StatCard 
            icon={<CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" />} 
            title="Completed stops"
            main={`${completedCount}/3`}
            sub={isComplete ? "All stops completed" : `${3 - completedCount} stops remaining`}
            blobColor="bg-blue-500"
          />
        </div>

        {/* Main Grid: Map & Live Status */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Map Section */}
          <div className="col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
                  <span className="w-4 h-[3px] rounded-full bg-slate-300 dark:bg-slate-600"></span> ROUTE MAP
                </h3>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Delhi North Loop</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Updated just now
              </div>
            </div>

            <div className={`relative flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden min-h-[400px] shadow-inner ${isDarkMode ? 'dark-map-container' : ''}`}>
              <style>{`.dark-map-container .leaflet-layer { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }`}</style>
              <MapContainer 
                center={[28.48, 77.20]} 
                zoom={10} 
                zoomControl={false}
                className="w-full h-full"
              >
                <TileLayer key="osm" url={tileUrl} />

                {/* Smooth solid route line */}
                <Polyline positions={routePositions} color={COLORS.route} weight={6} opacity={0.8} />

                {/* Stop Markers */}
                <Marker position={STOPS[0].pos} icon={createDotIcon(COLORS.origin)} />
                <Marker position={STOPS[1].pos} icon={createDotIcon(COLORS.transit)} />
                <Marker position={STOPS[2].pos} icon={createDotIcon(COLORS.transit)} />
                <Marker position={STOPS[3].pos} icon={createDotIcon(COLORS.destination)} />

                {/* Moving Truck */}
                <Marker position={truckPos} icon={truckIcon} zIndexOffset={1000} />
              </MapContainer>

              {/* Map Overlay Labels */}
              <div className="absolute bottom-4 left-4 z-[1000] flex gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4ADE80]"></span> Origin</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FB923C]"></span> Delivery point</span>
                <span className="flex items-center gap-1.5"><Truck size={14} className="text-orange-500"/> Live position</span>
              </div>
            </div>

            {/* Map Bottom Progress */}
            <div className="mt-6 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span>Route progress</span>
              <span>{Math.round(routeProgressPercent)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full mt-2" style={{ height: '8px' }}>
              <div 
                className="rounded-full" 
                style={{ 
                  width: `${Math.max(0.5, routeProgressPercent)}%`, 
                  height: '100%',
                  backgroundColor: '#2E7D5C',
                  display: 'block'
                }}
              ></div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-1 flex flex-col gap-6">
            
            {/* Live Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-2">
                    <span className="w-4 h-[2px] bg-slate-300"></span> LIVE STATUS
                  </h3>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Truck is {isPaused ? 'paused' : (isComplete ? 'arrived' : 'moving')}</h2>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-700 dark:text-green-400">
                  <Truck size={24} />
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {isComplete ? "Arrived at final destination." : `Heading toward ${nextStop.name}.`}
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-slate-500">Current location</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {isComplete ? "Destination 3" : `Between ${currentStop.name} - ${nextStop.name}`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-slate-500">Estimated arrival</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isComplete ? "-" : `~ ${Math.ceil(eta)}m`}
                  </span>
                </div>
                <div className="flex justify-between pb-4">
                  <span className="text-slate-500">Remaining distance</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isComplete ? "0 km" : `${(totalRouteDistance - distanceCovered).toFixed(1)} km`}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setIsPaused(!isPaused)}
                className="w-full mt-2 py-3 rounded-xl font-bold text-white bg-[#1F4F3F] hover:bg-[#163a2e] transition-colors flex justify-center items-center gap-2"
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />} 
                {isPaused ? 'Resume tracking' : 'Pause tracking'}
              </button>
            </div>

            {/* Simulation Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Zap size={16} /> Simulation speed
                </h3>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{simSpeed}x</span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {[0.5, 1, 2, 4].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setSimSpeed(speed)}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${simSpeed === speed ? 'bg-[#1F4F3F] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Stop Sequence */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-slate-300"></span> STOP SEQUENCE
              </h3>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Delivery checkpoints</h2>
            </div>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Clock size={16} /> Total route time <span className="font-bold text-slate-900 dark:text-white">1h 55m</span>
            </div>
          </div>

          <div className="flex items-center justify-between relative">
            <div className="absolute left-8 right-8 top-1/2 h-[2px] bg-slate-200 dark:bg-slate-800 -z-10"></div>
            
            {STOPS.map((stop, index) => {
              const isPast = currentSegment > index || isComplete;
              const isCurrent = currentSegment === index && !isComplete;
              
              return (
                <div key={stop.id} className={`flex flex-col items-center bg-white dark:bg-slate-900 px-4 ${isCurrent ? 'scale-110' : ''} transition-transform`}>
                  <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">{index === 0 ? 'ORIGIN' : `D${index}`}</div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] ${isPast ? 'bg-[#2E7D5C] border-[#2E7D5C] text-white' : (isCurrent ? 'bg-white dark:bg-slate-800 border-[#2E7D5C] text-[#2E7D5C]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400')}`}>
                    {isPast ? <CheckCircle2 size={20} /> : <span className="font-bold">{index || 'O'}</span>}
                  </div>
                  <div className="mt-3 text-center">
                    <div className={`font-bold text-sm ${isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{stop.name}</div>
                    <div className="text-xs text-slate-400 font-medium mt-1">{stop.time} &bull; {index === 0 ? '0 km' : `${segmentDistances.slice(0, index).reduce((a,b)=>a+b, 0).toFixed(1)} km`}</div>
                  </div>
                  {isCurrent && (
                    <div className="absolute -top-3 right-0 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">CURRENT</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </main>
    </div>
  );
}

// Reusable Stat Card Component
function StatCard({ icon, title, main, sub, blobColor, progressBar = null }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${blobColor} dark:opacity-10`}></div>
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
          {icon}
        </div>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{title}</span>
      </div>
      <div className="relative z-10">
        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1 truncate">{main}</div>
        <div className="text-sm font-medium text-slate-500">{sub}</div>
      </div>
      {progressBar !== null && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full mt-4 relative z-10" style={{ height: '6px' }}>
          <div 
            className="rounded-full" 
            style={{ 
              width: `${Math.max(0.5, progressBar)}%`, 
              height: '100%',
              backgroundColor: '#f97316', // orange-500
              display: 'block'
            }}
          ></div>
        </div>
      )}
    </div>
  );
}
