import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { Layout } from "../components";
import { FaFileUpload, FaTrash, FaVolumeUp, FaVolumeMute, FaFont, FaPalette } from "react-icons/fa"; // Added FaPalette
import AudioUploader from "../components/videoeditor/AudioUploader";
import VideoDownloader from "../components/videoeditor/VideoDownloader";
import Filters from "../components/videoeditor/Filters";
import TrimVideo from "../components/videoeditor/TrimVideo";

const VideoEditor = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [filter, setFilter] = useState("none");
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [textColor, setTextColor] = useState("#ffffff"); // Default text color (white)
  const [showColorPicker, setShowColorPicker] = useState(false); // State to toggle color picker
  const canvasSize = { width: 1000, height: 500 };
  const [isMobile, setIsMobile] = useState(false);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  useEffect(() => {
    if (!isMobile) {
      const canvas = new fabric.Canvas(canvasRef.current, { selection: true });
      setFabricCanvas(canvas);
      return () => canvas.dispose();
    }
  }, [isMobile]);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(URL.createObjectURL(file));
    }
  };

  const adjustVolume = (event) => {
    if (videoRef.current) {
      videoRef.current.volume = event.target.value;
      setVolume(event.target.value);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const addText = () => {
    if (!fabricCanvas) return;
    const text = new fabric.IText("Editable Text", {
      left: 50,
      top: 50,
      fontSize: 20,
      fill: textColor, // Use the selected text color
      selectable: true,
      editingBorderColor: "blue",
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    text.enterEditing();
  };

  const removeText = () => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === "i-text") {
      fabricCanvas.remove(activeObject);
    }
  };

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1206);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (!isMobile) {
  


    
      return (
        <Layout expand={false} hasHeader={false}>
          <div className="video-editor" style={{ display: "flex", height: "100vh", background: "#1E1E1E" }}>
            {/* Video and canvas section */}
            <div style={{ flex: 3, display: "flex", justifyContent: "center", alignItems: "center", background: "#222" }}>
              <div style={{ position: "relative", width: canvasSize.width, height: canvasSize.height }}>
                <video ref={videoRef} controls width={canvasSize.width} height={canvasSize.height} src={videoFile} style={{ position: "absolute", top: 0, left: 0, zIndex: 1, borderRadius: "10px", filter: filter }} />
                <canvas id="fabricCanvas" ref={canvasRef} width={canvasSize.width} height={canvasSize.height} style={{ position: "absolute", top: 0, left: 0, zIndex: 2, borderRadius: "10px" }}></canvas>
              </div>
            </div>
    
            {/* Editor tools section */}
            <div style={{ padding: "10px", background: "#2C2C2C", color: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: "15px", borderLeft: "2px solid #444", borderRadius: "10px" }}>
              <h3 style={{ textAlign: "center", fontSize: "14px", marginBottom: "10px",marginTop: "20px", color: "#ffb300" }}>Editor Tools</h3>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={adjustVolume} style={{ width: "100px" }} />
              <button onClick={toggleMute}>{isMuted ? <FaVolumeMute /> : <FaVolumeUp />}</button>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#444", padding: "10px", borderRadius: "50%", width: "50px", height: "50px" }}>
                <FaFileUpload size={20} />
                <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: "none" }} />
              </label>
              <AudioUploader videoRef={videoRef} onUpload={(event) => setAudioFile(URL.createObjectURL(event.target.files[0]))} />
              <button onClick={addText} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#444", padding: "10px", borderRadius: "50%", width: "50px", height: "50px" }}>
                <FaFont size={20} />
              </button>
              <button onClick={removeText} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#444", padding: "10px", borderRadius: "50%", width: "50px", height: "50px" }}>
                <FaTrash size={20} />
              </button>
              {/* Color picker and other tools */}
              {/* <TrimVideo videoRef={videoRef} /> */}
              <VideoDownloader videoFile={videoFile} canvasRef={canvasRef} videoRef={videoRef} filter={filter} audioFile={audioFile} />
              <Filters setFilter={setFilter} />
            </div>
          </div>
        </Layout>
      );
    }

  return (
    <Layout expand={false} hasHeader={false}>
      <div style={{ textAlign: "center", padding: "50px", background: "#1E1E1E", color: "white", height: "100vh" }}>
        <h2>Video editing is available only on desktop.</h2>
        <p>Please use a desktop browser to access the editor.</p>
      </div>
    </Layout>
  );
};

export default VideoEditor;