import { useState } from "react";
import { FaDownload } from "react-icons/fa";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

export const getFFmpegFilter = (selectedFilter: string) => {
  switch (selectedFilter) {
    case "grayscale(100%)":
      return "format=gray";
    case "sepia(100%)":
      return "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131";
    case "blur(5px)":
      return "boxblur=5:5";
    case "brightness(1.5)":
      return "eq=brightness=0.5";
    case "contrast(150%)":
      return "eq=contrast=1.5";
    case "none":
    default:
      return null;
  }
};

interface VideoDownloaderProps {
  videoFile: string | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  filter: string;
  audioFile: string | null; // Add audioFile as a prop
}

const VideoDownloader: React.FC<VideoDownloaderProps> = ({
  videoFile,
  canvasRef,
  videoRef,
  filter,
  audioFile,
}) => {
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    if (!videoFile || !canvasRef.current || !videoRef.current) {
      alert("No video available for download.");
      return;
    }

    setConverting(true);
    setProgress(0);

    try {
      if (!ffmpeg.loaded) {
        console.log("Loading FFmpeg...");
        await ffmpeg.load();
        console.log("FFmpeg loaded successfully");
      }

      const inputName = "input.mp4";
      const outputName = "output.mp4";
      const textOverlayName = "text.png";
      const audioInputName = "audio.mp3";

      // Write input video file
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      console.log("Input video file written successfully");

      // Export canvas content as an image
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL("image/png");
      await ffmpeg.writeFile(textOverlayName, await fetchFile(imageData));
      console.log("Text overlay image written successfully");

      // Write audio file if it exists
      if (audioFile) {
        await ffmpeg.writeFile(audioInputName, await fetchFile(audioFile));
        console.log("Audio file written successfully");
      }

      const ffmpegFilter = getFFmpegFilter(filter);
      const filterComplex = ffmpegFilter
        ? `[0:v]${ffmpegFilter}[0v];[1:v]format=rgba[text];[0v][text]overlay=0:0`
        : `[1:v]format=rgba[text];[0:v][text]overlay=0:0`;

      const ffmpegCommand = [
        "-i", inputName,
        "-i", textOverlayName,
        ...(audioFile ? ["-i", audioInputName] : []), // Include audio file if it exists
        "-filter_complex", filterComplex,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        ...(audioFile ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"]), // Include audio if it exists
        outputName,
      ];

      console.log("FFmpeg Command:", ffmpegCommand.join(" "));

      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      ffmpeg.on("log", ({ message }) => {
        console.log("FFmpeg Log:", message);
      });

      await ffmpeg.exec(ffmpegCommand);

      const outputData = await ffmpeg.readFile(outputName);
      const videoBlob = new Blob([outputData], { type: "video/mp4" });
      const videoUrl = URL.createObjectURL(videoBlob);

      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(videoUrl);
    } catch (error) {
      console.error("FFmpeg processing error:", error);
      alert("Error during video conversion. Check console logs.");
    } finally {
      setConverting(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: converting ? "#ffb300" : "#444",
          border: "none",
          cursor: "pointer",
          transition: "background 0.3s",
        }}
        onClick={handleDownload}
        disabled={!videoFile || converting}
      >
        <FaDownload size={20} />
      </button>

      {converting && (
        <div style={{ width: "100px", background: "#444", borderRadius: "5px", overflow: "hidden" }}>
          <div
            style={{
              width: `${progress}%`,
              height: "10px",
              background: "#ffb300",
              transition: "width 0.3s",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VideoDownloader;