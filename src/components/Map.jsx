import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "deck.gl";
import { TripsLayer } from "@deck.gl/geo-layers";
import { createGeoJSONCircle } from "../helpers";
import { useEffect, useRef, useState } from "react";
import { getBoundingBoxFromPolygon, getMapGraph, getNearestNode } from "../services/MapService";
import PathfindingState from "../models/PathfindingState";
import Interface from "./Interface";
import { INITIAL_COLORS, INITIAL_VIEW_STATE, MAP_STYLE } from "../config";
import useSmoothStateChange from "../hooks/useSmoothStateChange";

function Map() {
    const [startNode, setStartNode] = useState(null);
    const [endNode, setEndNode] = useState(null);
    const [selectionRadius, setSelectionRadius] = useState([]);
    const [tripsData, setTripsData] = useState([]);
    const [started, setStarted] = useState();
    const [time, setTime] = useState(0);
    const [animationEnded, setAnimationEnded] = useState(false);
    const [playbackOn, setPlaybackOn] = useState(false);
    const [playbackDirection, setPlaybackDirection] = useState(1);
    const [fadeRadiusReverse, setFadeRadiusReverse] = useState(false);
    const [cinematic, setCinematic] = useState(false);
    const [placeEnd, setPlaceEnd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({ algorithm: "astar", radius: 4, speed: 5 });
    const [colors, setColors] = useState(INITIAL_COLORS);
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const ui = useRef();
    const fadeRadius = useRef();
    const requestRef = useRef();
    const previousTimeRef = useRef();
    const timer = useRef(0);
    const waypoints = useRef([]);
    const state = useRef(new PathfindingState());
    const traceNode = useRef(null);
    const traceNode2 = useRef(null);
    const selectionRadiusOpacity = useSmoothStateChange(0, 0, 1, 400, fadeRadius.current, fadeRadiusReverse);
    const [metrics, setMetrics] = useState({
        distance: 0,
        time: 0,
        visited: 0,
        memory: 0
    });
    const searchStartTime = useRef(null); // ⏱️ waktu mulai
    const searchEndTime = useRef(null);   // ⏱️ waktu selesai
    async function mapClick(e, info, radius = null) {
        if (started && !animationEnded) return;

        setFadeRadiusReverse(false);
        fadeRadius.current = true;
        clearPath();

        // Place end node
        if (info.rightButton || placeEnd) {
            if (e.layer?.id !== "selection-radius") {
                ui.current.showSnack("Please select a point inside the radius.", "info");
                return;
            }

            if (loading) {
                ui.current.showSnack("Please wait for all data to load.", "info");
                return;
            }

            const loadingHandle = setTimeout(() => {
                setLoading(true);
            }, 300);

            const node = await getNearestNode(e.coordinate[1], e.coordinate[0]);
            if (!node) {
                ui.current.showSnack("No path was found in the vicinity, please try another location.");
                clearTimeout(loadingHandle);
                setLoading(false);
                return;
            }

            const realEndNode = state.current.getNode(node.id);
            setEndNode(node);

            clearTimeout(loadingHandle);
            setLoading(false);

            if (!realEndNode) {
                ui.current.showSnack("An error occurred. Please try again.");
                return;
            }
            state.current.endNode = realEndNode;

            return;
        }

        const loadingHandle = setTimeout(() => {
            setLoading(true);
        }, 300);

        // Fectch nearest node
        const node = await getNearestNode(e.coordinate[1], e.coordinate[0]);
        if (!node) {
            ui.current.showSnack("No path was found in the vicinity, please try another location.");
            clearTimeout(loadingHandle);
            setLoading(false);
            return;
        }

        setStartNode(node);
        setEndNode(null);
        const circle = createGeoJSONCircle([node.lon, node.lat], radius ?? settings.radius);
        setSelectionRadius([{ contour: circle }]);

        // Fetch nodes inside the radius
        getMapGraph(getBoundingBoxFromPolygon(circle), node.id).then(graph => {
            state.current.graph = graph;
            clearPath();
            clearTimeout(loadingHandle);
            setLoading(false);
        });
    }

    // Start new pathfinding animation
    function startPathfinding() {
        setFadeRadiusReverse(true);

        if (!state.current.nodes) {
            if (state.current.grid) {
                // Jika berbasis grid
                state.current.nodes = state.current.grid.flat();
            } else if (state.current.startNode && state.current.startNode.edges) {
                // Jika berbasis graph (node dengan edges), lakukan BFS untuk kumpulkan semua node
                const visited = new Set();
                const queue = [state.current.startNode];
                const allNodes = [];

                while (queue.length > 0) {
                    const node = queue.shift();
                    if (visited.has(node)) continue;
                    visited.add(node);
                    allNodes.push(node);

                    for (const edge of node.edges || []) {
                        const neighbor = edge.getOtherNode(node);
                        if (!visited.has(neighbor)) {
                            queue.push(neighbor);
                        }
                    }
                }

                state.current.nodes = allNodes;
            }
        }

        setTimeout(() => {
            clearPath();
            state.current.start(settings.algorithm);

            searchStartTime.current = performance.now(); // ⏱️ Inisialisasi waktu pencarian sebelum animasi
            setStarted(true); // Ini akan memicu `requestAnimationFrame(animate)` di useEffect
        }, 400);
    }

    // Start or pause already running animation
    function toggleAnimation(loop = true, direction = 1) {
        if (time === 0 && !animationEnded) return;
        setPlaybackDirection(direction);
        if (animationEnded) {
            if (loop && time >= timer.current) {
                setTime(0);
            }
            setStarted(true);
            setPlaybackOn(!playbackOn);
            return;
        }
        setStarted(!started);
        if (started) {
            previousTimeRef.current = null;
        }
    }

    function clearPath() {
        setStarted(false);
        setTripsData([]);
        setTime(0);

        // 💥 Tambahan penting: reset seluruh graph & status internal
        state.current.reset();        // sudah ada
        state.current.finished = false;
        state.current.algorithm = null;  // 💥 reset algoritma agar start() ganti instance baru

        waypoints.current = [];
        timer.current = 0;
        previousTimeRef.current = null;
        traceNode.current = null;
        traceNode2.current = null;
        setAnimationEnded(false);

        // 🔧 Reset waktu pencarian di sini
        searchStartTime.current = null;
        searchEndTime.current = null;

        setMetrics(prev => ({
            ...prev,
            searchTime: 0,
            distance: 0,
            visited: 0,
            memory: "0 B",
        }));
    }


    // Progress animation by one step
    function animateStep(newTime) {
        const updatedNodes = state.current.nextStep();
        const allNodes = state.current.nodes || (state.current.grid?.flat() ?? []);
        const processedNodes = allNodes.filter(node => node.processed);
        const processedCount = processedNodes.length;

        // Update metrik visited
        setMetrics(prev => {
            if (prev.visited !== processedCount) {
                return {
                    ...prev,
                    visited: processedCount
                };
            }
            return prev;
        });

        // Update animasi jalur
        for (const updatedNode of updatedNodes) {
            updateWaypoints(updatedNode, updatedNode.referer);
        }

        // Found end but waiting for animation to end
        if (state.current.finished && !animationEnded) {
            if (!traceNode.current) traceNode.current = state.current.endNode;
            const parentNode = traceNode.current.parent;

            // Hitung jarak total
            let totalDistance = 0;
            let trace = state.current.endNode;
            while (trace?.parent) {
                const dx = trace.longitude - trace.parent.longitude;
                const dy = trace.latitude - trace.parent.latitude;
                const segment = Math.sqrt(dx * dx + dy * dy);
                totalDistance += segment;
                trace = trace.parent;
            }

            const distanceInMeters = Math.round(totalDistance * 111320 - 2.5);

            // ✅ Hitung memori hanya sekali saat animasi selesai
            const memoryBytes = estimateMemory(processedNodes);  // hanya node yang dikunjungi
            const formattedMemory = formatMemory(memoryBytes);

            setMetrics(prev => ({
                ...prev,
                distance: distanceInMeters.toLocaleString(),
                memory: formattedMemory
            }));

            updateWaypoints(parentNode, traceNode.current, "route", Math.max(Math.log2(settings.speed), 1));
            traceNode.current = parentNode ?? traceNode.current;

            if (time >= timer.current && parentNode == null) {
                setAnimationEnded(true);
                searchEndTime.current = performance.now();
                const duration = (searchEndTime.current - searchStartTime.current) / 1000;

                setMetrics(prev => ({
                    ...prev,
                    searchTime: duration.toFixed(2)
                }));
            }
        }

        // Animation progress
        if (previousTimeRef.current != null && !animationEnded) {
            const deltaTime = newTime - previousTimeRef.current;
            setTime(prevTime => (prevTime + deltaTime * playbackDirection));
        }

        // Playback progress
        if (previousTimeRef.current != null && animationEnded && playbackOn) {
            const deltaTime = newTime - previousTimeRef.current;
            if (time >= timer.current && playbackDirection !== -1) {
                setPlaybackOn(false);
            }
            setTime(prevTime => (Math.max(Math.min(prevTime + deltaTime * 2 * playbackDirection, timer.current), 0)));
        }
    }
    function estimateMemory(nodes) {
        let total = 0;
        for (const node of nodes) {
            total += 64; // base node
            if (node.neighbors) total += node.neighbors.length * 16;
            if (node.edges) total += node.edges.length * 32;
            if (node.referer) total += 32;
            if (node.parent) total += 32;
            if (node.distanceFromStart !== undefined) total += 8;
            if (node.f !== undefined) total += 8;
            if (node.g !== undefined) total += 8;
            if (node.h !== undefined) total += 8;
        }
        return total;
    }

    function formatMemory(bytes) {
        if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(2) + " MB";
        if (bytes >= 1_000) return (bytes / 1_000).toFixed(2) + " KB";
        return bytes + " B";
    }



    // Animation callback
    function animate(newTime) {
        for (let i = 0; i < settings.speed; i++) {
            animateStep(newTime);
        }

        previousTimeRef.current = newTime;
        requestRef.current = requestAnimationFrame(animate);
    }

    // Add new node to the waypoitns property and increment timer
    function updateWaypoints(node, refererNode, color = "path", timeMultiplier = 1) {
        if (!node || !refererNode) return;
        const distance = Math.hypot(node.longitude - refererNode.longitude, node.latitude - refererNode.latitude);
        const timeAdd = distance * 50000 * timeMultiplier;

        waypoints.current = [...waypoints.current,
        {
            path: [[refererNode.longitude, refererNode.latitude], [node.longitude, node.latitude]],
            timestamps: [timer.current, timer.current + timeAdd],
            color,// timestamp: timer.current + timeAdd
        }
        ];

        timer.current += timeAdd;
        setTripsData(() => waypoints.current);
    }

    function changeLocation(location) {
        setViewState({ ...viewState, longitude: location.longitude, latitude: location.latitude, zoom: 13, transitionDuration: 1, transitionInterpolator: new FlyToInterpolator() });
    }

    function changeSettings(newSettings) {
        setSettings(newSettings);
        const items = { settings: newSettings, colors };
        localStorage.setItem("path_settings", JSON.stringify(items));
    }

    function changeColors(newColors) {
        setColors(newColors);
        const items = { settings, colors: newColors };
        localStorage.setItem("path_settings", JSON.stringify(items));
    }

    function changeAlgorithm(algorithm) {
        clearPath(); // reset animasi & visited

        // Paksa ganti algoritma & restart
        state.current.start(algorithm); // ⬅️ inilah kunci agar algoritma benar-benar diganti

        // Update setting di UI dan localStorage
        changeSettings({ ...settings, algorithm });
    }



    function changeRadius(radius) {
        changeSettings({ ...settings, radius });
        if (startNode) {
            mapClick({ coordinate: [startNode.lon, startNode.lat] }, {}, radius);
        }
    }

    useEffect(() => {
        if (!started) return;
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [started, time, animationEnded, playbackOn]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(res => {
            changeLocation(res.coords);
        });

        const settings = localStorage.getItem("path_settings");
        if (!settings) return;
        const items = JSON.parse(settings);

        setSettings(items.settings);
        setColors(items.colors);
    }, []);

    return (
        <>
            <div onContextMenu={(e) => { e.preventDefault(); }}>
                <DeckGL
                    initialViewState={viewState}
                    controller={{ doubleClickZoom: false, keyboard: false }}
                    onClick={mapClick}
                >
                    <PolygonLayer
                        id={"selection-radius"}
                        data={selectionRadius}
                        pickable={true}
                        stroked={true}
                        getPolygon={d => d.contour}
                        getFillColor={[0, 122, 255, 10]}
                        getLineColor={[0, 76, 204, 175]}
                        getLineWidth={3}
                        opacity={selectionRadiusOpacity}
                    />
                    <TripsLayer
                        id={"pathfinding-layer"}
                        data={tripsData}
                        opacity={1}
                        widthMinPixels={3}
                        widthMaxPixels={5}
                        fadeTrail={false}
                        currentTime={time}
                        getColor={d => colors[d.color]}
                        // getColor={(d) => {
                        //     if(d.color !== "path") return colors[d.color];
                        //     const color = colors[d.color];
                        //     const delta = Math.abs(time - d.timestamp);
                        //     return color.map(c => Math.max((c * 1.6) - delta * 0.1, c));
                        // }}
                        updateTriggers={{
                            getColor: [colors.path, colors.route]
                        }}
                    />
                    <ScatterplotLayer
                        id="start-end-points"
                        data={[
                            ...(startNode ? [{ coordinates: [startNode.lon, startNode.lat], color: colors.startNodeFill, lineColor: colors.startNodeBorder }] : []),
                            ...(endNode ? [{ coordinates: [endNode.lon, endNode.lat], color: colors.endNodeFill, lineColor: colors.endNodeBorder }] : []),
                        ]}
                        pickable={true}
                        opacity={2}
                        stroked={true}
                        filled={true}
                        radiusScale={1}
                        radiusMinPixels={7}
                        radiusMaxPixels={20}
                        lineWidthMinPixels={1}
                        lineWidthMaxPixels={3}
                        getPosition={d => d.coordinates}
                        getFillColor={d => d.color}
                        getLineColor={d => d.lineColor}
                    />
                    <MapGL
                        reuseMaps mapLib={maplibregl}
                        mapStyle={MAP_STYLE}
                        doubleClickZoom={false}
                    />
                </DeckGL>
            </div>
            <Interface
                ref={ui}
                canStart={startNode && endNode}
                started={started}
                animationEnded={animationEnded}
                playbackOn={playbackOn}
                time={time}
                startPathfinding={startPathfinding}
                toggleAnimation={toggleAnimation}
                clearPath={clearPath}
                timeChanged={setTime}
                changeLocation={changeLocation}
                maxTime={timer.current}
                settings={settings}
                setSettings={changeSettings}
                changeAlgorithm={changeAlgorithm}
                colors={colors}
                setColors={changeColors}
                loading={loading}
                cinematic={cinematic}
                setCinematic={setCinematic}
                placeEnd={placeEnd}
                setPlaceEnd={setPlaceEnd}
                changeRadius={changeRadius}
                metrics={metrics}
            />
        </>
    );
}

export default Map;