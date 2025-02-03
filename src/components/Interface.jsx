import { Button, IconButton, Typography, Snackbar, Alert, CircularProgress, Fade, Tooltip, Drawer, MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import { MuiColorInput } from "mui-color-input";
import { PlayArrow, Menu as HamburgerMenu, Pause, Replay, Route, AccessTime, Hub, Memory     } from "@mui/icons-material";
import Slider from "./Slider";
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { arrayToRgb, rgbToArray } from "../helpers";

const Interface = forwardRef(({ canStart, started, animationEnded, playbackOn, time, maxTime, settings, colors, loading, timeChanged, cinematic, placeEnd, changeRadius, changeAlgorithm, setPlaceEnd, setCinematic, setSettings, setColors, startPathfinding, toggleAnimation, clearPath, changeLocation }, ref) => {
    const [sidebar, setSidebar] = useState(false);
    const [snack, setSnack] = useState({
        open: false,
        message: "",
        type: "error",
    });
    const [activeStep, setActiveStep] = useState(0);
    const rightDown = useRef(false);
    const leftDown = useRef(false);

    // Expose showSnack to parent from ref
    useImperativeHandle(ref, () => ({
        showSnack(message, type = "error") {
            setSnack({ open: true, message, type });
        },
    }));
      
    // Start pathfinding or toggle playback
    function handlePlay() {
        if(!canStart) return;
        if(!started && time === 0) {
            startPathfinding();
            return;
        }
        toggleAnimation();
    }

    window.onkeydown = e => {
        if(e.code === "ArrowRight" && !rightDown.current && !leftDown.current && (!started || animationEnded)) {
            rightDown.current = true;
            toggleAnimation(false, 1);
        }
        else if(e.code === "ArrowLeft" && !leftDown.current && !rightDown.current && animationEnded) {
            leftDown.current = true;
            toggleAnimation(false, -1);
        }
    };

    window.onkeyup = e => {
        if(e.code === "Escape") setCinematic(false);
        else if(e.code === "Space") {
            e.preventDefault();
            handlePlay();
        }
        else if(e.code === "ArrowRight" && rightDown.current) {
            rightDown.current = false;
            toggleAnimation(false, 1);
        }
        else if(e.code === "ArrowLeft" && animationEnded && leftDown.current) {
            leftDown.current = false;
            toggleAnimation(false, 1);
        }
        else if(e.code === "KeyR" && (animationEnded || !started)) clearPath();
    };
    
    return (
        <>
            <div className={`nav-top ${cinematic ? "cinematic" : ""}`}>
                <Button 
                    disabled={!canStart} 
                    onClick={handlePlay} 
                    variant="contained" 
                    style={{ 
                        backgroundColor: "#404156", 
                        borderRadius: 4, 
                        padding: '8px 16px', 
                        display: 'flex', 
                        alignItems: 'center' 
                    }}
                >
                    {(!started || (animationEnded && !playbackOn)) ? (
                        <>
                            <PlayArrow style={{ color: "#fff", width: 26, height: 26, marginRight: 8 }} />
                            <span style={{ color: "#fff" }}>Mulai</span>
                        </>
                    ) : (
                        <>
                            <Pause style={{ color: "#fff", width: 26, height: 26, marginRight: 8 }} />
                            <span style={{ color: "#fff" }}>Jeda</span>
                        </>
                    )}
                </Button>


                <div className="side">
                    <Button 
                        disabled={!animationEnded && started} 
                        onClick={clearPath} 
                        style={{ 
                            color: "#fff", 
                            backgroundColor: "#404156", 
                            display: 'flex', 
                            alignItems: 'center' 
                        }} 
                        variant="contained"
                    >                    
                        <Replay style={{ marginLeft: 2, color: "#fff", width: 20, height: 20, marginRight: 8 }} />
                        Reset
                    </Button>                 
                </div>

            </div>

            <div className="nav-bottom">
                <div className="perform">
                    
                    <div className="shortestdistance">
                        <Typography variant="h6" style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                            <Route style={{ color: "#fff", width: 18, height: 18, marginRight: 1, paddingTop: 3 }} />
                            Rute Terpendek: 0 km
                        </Typography>
                    </div>
                    <div className="time">
                        <Typography variant="h6" style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                            <AccessTime style={{ color: "#fff", width: 18, height: 18, marginLeft: 15, paddingTop: 3 }} />
                            Waktu Pencarian: 0 Detik
                        </Typography>
                    </div>
                    <div className="time">
                        <Typography variant="h6" style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                            <Hub style={{ color: "#fff", width: 18, height: 18, marginLeft: 15, paddingTop: 3 }} />
                            Total Node Dikunjungi: 0
                        </Typography>
                    </div>
                    <div className="time">
                        <Typography variant="h6" style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                            <Memory style={{ color: "#fff", width: 18, height: 18, marginLeft: 15, paddingTop: 3 }} />
                            Memori Digunakan: 0 b
                        </Typography>
                    </div>

                </div>
            </div>

            <div className={`nav-right ${cinematic ? "cinematic" : ""}`}>
                <Tooltip title="Buka Menu">
                    <IconButton onClick={() => {setSidebar(true);}} style={{ backgroundColor: "#2A2B37", width: 36, height: 36 }} size="large">
                        <HamburgerMenu style={{ color: "#fff", width: 40, height: 40 }} fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </div>


            <div className="loader-container">
                <Fade
                    in={loading}
                    style={{
                        transitionDelay: loading ? "50ms" : "0ms",
                    }}
                    unmountOnExit
                >
                    <CircularProgress color="inherit" />
                </Fade>
            </div>

            <div className="mobile-controls">
                <Button onClick={() => {setPlaceEnd(!placeEnd);}} style={{ color: "#fff", backgroundColor: "#404156", paddingInline: 30, paddingBlock: 7 }} variant="contained">
                    {placeEnd ? "Letakan Titik Awal" : "Letakan Titik Tujuan"}
                </Button>
            </div>


            <Drawer
                className={`side-drawer ${cinematic ? "cinematic" : ""}`}
                anchor="left"
                open={sidebar}
                onClose={() => {setSidebar(false);}}
            >
                <div className="sidebar-container">

                   

                    <div className="side slider-container">
                        <Typography id="area-slider" >
                            Area radius: {settings.radius} Km
                        </Typography>
                        <Slider disabled={started && !animationEnded} min={2} max={20} step={1} value={settings.radius} onChangeCommited={() => { changeRadius(settings.radius); }} onChange={e => { setSettings({...settings, radius: Number(e.target.value)}); }} className="slider" aria-labelledby="area-slider" style={{ marginBottom: 1 }} 
                            marks={[
                                {
                                    value: 2,
                                    label: "2km"
                                },
                                {
                                    value: 20,
                                    label: "20km"
                                }
                            ]} 
                        />
                    </div>

                    <div className="side slider-container">
                        <Typography id="speed-slider" >
                            Kecepatan Animasi
                        </Typography>
                        <Slider min={1} max={30} value={settings.speed} onChange={e => { setSettings({...settings, speed: Number(e.target.value)}); }} className="slider" aria-labelledby="speed-slider" style={{ marginBottom: 1 }} />
                    </div>

                    <FormControl variant="filled">
                        <InputLabel style={{ fontSize: 18 }} id="algo-select">Pilih Algoritma</InputLabel>
                        <Select
                            labelId="algo-select"
                            value={settings.algorithm}
                            onChange={e => {changeAlgorithm(e.target.value);}}
                            required
                            style={{ backgroundColor: "#404156 ", color: "#fff", width: "100%", paddingLeft: 1, marginTop: 4 }}
                            inputProps={{MenuProps: {MenuListProps: {sx: {backgroundColor: "#404156"}}}}}
                            size="small"
                            disabled={!animationEnded && started}
                        >
                            <MenuItem value={"astar"}>Algoritma A*</MenuItem>
                            <MenuItem value={"dijkstra"}>Algopritma Dijkstra&apos;</MenuItem>
                            <MenuItem value={"greedy"}>Allgoritma Greedy </MenuItem>
                        </Select>
                    </FormControl>

                    <div className="styles-container">
                        <Typography style={{ color: "#A8AFB3", textTransform: "uppercase", fontSize: 14 }} >
                            Warna
                        </Typography>
                        
                        <div>
                            <Typography id="start-fill-label" >
                                Pilih Warna untuk node awal
                            </Typography>
                            <div className="color-container">
                                <MuiColorInput value={arrayToRgb(colors.startNodeFill)} onChange={v => {setColors({...colors, startNodeFill: rgbToArray(v)});}} aria-labelledby="start-fill-label" style={{ backgroundColor: "#404156" }} />
                      
                            </div>
                        </div>

                        <div>
                            <Typography id="end-fill-label" >
                                Pilih Warna untuk node akhir
                            </Typography>
                            <div className="color-container">
                                <MuiColorInput value={arrayToRgb(colors.endNodeFill)} onChange={v => {setColors({...colors, endNodeFill: rgbToArray(v)});}} aria-labelledby="end-fill-label" style={{ backgroundColor: "#404156" }} />
              
                            </div>
                        </div>

                        <div>
                            <Typography id="path-label" >
                                Pilih Warna untuk jalur
                            </Typography>
                            <div className="color-container">
                                <MuiColorInput value={arrayToRgb(colors.path)} onChange={v => {setColors({...colors, path: rgbToArray(v)});}} aria-labelledby="path-label" style={{ backgroundColor: "#404156" }} />
                
                            </div>
                        </div>

                        <div>
                            <Typography id="route-label" >
                                Pilih Warna untuk rute terdekat
                            </Typography>
                            <div className="color-container">
                                <MuiColorInput value={arrayToRgb(colors.route)} onChange={v => {setColors({...colors, route: rgbToArray(v)});}} aria-labelledby="route-label" style={{ backgroundColor: "#404156" }} />
                
                            </div>
                        </div>
                        <div>
                        <a 
                            href="https://info.flagcounter.com/q428" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flag-counter"
                            style={{ display: "inline-block" }}
                        >
                            <img 
                                src="https://s01.flagcounter.com/count2/q428/bg_FFFFFF/txt_000000/border_CCCCCC/columns_2/maxflags_10/viewers_Pengunjung/labels_0/pageviews_1/flags_0/percent_0/" 
                                alt="Flag Counter Statistik Pengunjung" 
                                style={{ border: "none" }} 
                            />
                        </a>

                        </div>
                    </div>
                </div>
            </Drawer>

            <a 
                href="https://Avinto.my.id" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="copyright" 
                style={{
                    position: "absolute", 
                    right: "0px", 
                    bottom: "0px", 
                    padding: "10px", 
                    textDecoration: "none", 
                    fontSize: "14px" // Ukuran font diperbesar agar terlihat
                }}
            >
                <img 
                    src="https://avinto.my.id/images/logo.png" 
                    alt="Avinto Logo" 
                    style={{ width: "140px" }} 
                />
            </a>

            
        </>
        
    );
});

Interface.displayName = "Interface";

export default Interface;
