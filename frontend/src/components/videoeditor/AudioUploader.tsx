import { useRef, useState } from "react";
import { FaMusic } from "react-icons/fa";

interface AudioUploaderProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ videoRef, onUpload }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(1);

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioFile(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    }
    onUpload(event);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const syncAudioWithVideo = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.ontimeupdate = () => {
        if (Math.abs(videoRef.current.currentTime - audioRef.current.currentTime) > 0.1) {
          audioRef.current.currentTime = videoRef.current.currentTime;
        }
      };
      videoRef.current.onplay = () => audioRef.current?.play();
      videoRef.current.onpause = () => audioRef.current?.pause();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <label
        onMouseEnter={(e) => (e.currentTarget.style.background = "#ffb300")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#444")}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#444", padding: "10px", borderRadius: "50%", width: "50px", height: "50px" }}
      >
        <FaMusic size={20} />
        <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: "none" }} />
      </label>
      {audioFile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <audio ref={audioRef} controls onLoadedMetadata={syncAudioWithVideo} style={{ width: "100%" }} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            style={{ width: "100px", marginTop: "5px" }}
          />
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
