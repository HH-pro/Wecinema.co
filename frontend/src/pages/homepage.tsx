import React, { useEffect, useState, useRef } from "react";
import { Gallery, Layout, Render } from "../components/"; // Replace with actual imports
import { getRequest } from "../api"; // Replace with actual API call
import { useNavigate } from "react-router-dom";
import TermsAndConditionsPopup from "../pages/TermsAndConditionsPopup"; 
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { Line } from "react-chartjs-2";
import "swiper/css";
import "swiper/css/pagination";
import LoadingBar from 'react-top-loading-bar';
import "../App.css"; // Import the chart-specific styles

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin // enable zoom/pan plugin for UX
);

export const theme = [
  "Love",
  "Redemption",
  "Family",
  "Oppression",
  "Corruption",
  "Survival",
  "Revenge",
  "Death",
  "Justice",
  "Perseverance",
  "War",
  "Bravery",
  "Freedom",
  "Friendship",
  "Hope",
  "Society",
  "Isolation",
  "Peace",
];

const Homepage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<any>([]);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);
  const [data, setData] = useState<any>([]);
  const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
  const nav = useNavigate();
  const [expand, setExpand] = useState(false); // Optional toggle
  const [progress, setProgress] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  // UX / control state & refs
  const chartRefs = useRef<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeChartIdx, setActiveChartIdx] = useState<number | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [showVideoPanel, setShowVideoPanel] = useState(false);

  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem("acceptedTerms");
    if (!hasAcceptedTerms) {
      setShowTermsPopup(true);
    }
  }, []);

  useEffect(() => {
    const load = setInterval(() => {
      setProgress(prevProgress => {
        if (prevProgress < 100) {
          return prevProgress + 10;
        }
        clearInterval(load);
        return 100;
      });
    }, 200);

    return () => clearInterval(load);
  }, []);

  const handleAcceptTerms = () => {
    localStorage.setItem("acceptedTerms", "true");
    setShowTermsPopup(false);
  };

  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowPopup(true);
      const timer = setTimeout(() => setShowPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchGenreChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 330);
        const fromDate = sevenDaysAgo.toISOString().split("T")[0];
        const toDate = today.toISOString().split("T")[0];

        const genreData: any = await getRequest(
          `/video/genres/graph?from=${fromDate}&to=${toDate}`,
          setLoading
        );

        if (isMounted && genreData && Object.keys(genreData).length > 0) {
          const labels = Object.keys(genreData[Object.keys(genreData)[0]]);
          const datasets = Object.keys(genreData).map((genre: string) => ({
            label: genre,
            data: labels.map((date: string) => genreData[genre][date]?.count || 0),
            borderColor: getRandomColor(),
            backgroundColor: getRandomColor(),
            lineTension: 0.4,
          }));

          setGenreChartData({ labels, datasets });
        }
      } catch (error) {
        console.error("Error fetching genre chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchThemeChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 330);
        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];

        const themeData: any = await getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading);

        if (isMounted && themeData && Object.keys(themeData).length > 0) {
          const labels = Object.keys(themeData[Object.keys(themeData)[0]]);
          const datasets = Object.keys(themeData).map((theme: string) => ({
            label: theme,
            data: labels.map((date: string) => themeData[theme][date]?.count || 0),
            borderColor: getRandomColor(),
            backgroundColor: getRandomColor(),
            lineTension: 0.4,
          }));

          setThemeChartData({ labels, datasets });
        }
      } catch (error) {
        console.error("Error fetching theme chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRatingChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 330);
        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];

        const ratingData: any = await getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading);

        if (isMounted && ratingData && Object.keys(ratingData).length > 0) {
          const labels = Object.keys(ratingData);
          const datasets = [
            {
              label: "Average Rating",
              data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
              borderColor: getRandomColor(),
              backgroundColor: getRandomColor(),
              lineTension: 0.4,
            },
            {
              label: "Total Ratings",
              data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
              borderColor: getRandomColor(),
              backgroundColor: getRandomColor(),
              lineTension: 0.4,
            },
          ];

          setRatingChartData({ labels, datasets });
        }
      } catch (error) {
        console.error("Error fetching rating chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchScripts = async () => {
      const result: any = await getRequest("video/author/scripts", setLoading);
      if (isMounted && result) {
        setScripts(result.map((res: any) => res.script));
        setData(result);
      }
    };

    fetchGenreChartData();
    fetchThemeChartData();
    fetchRatingChartData();
    fetchScripts();

    return () => {
      isMounted = false;
    };
  }, []);

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const chartTitles = ["Genres Popularity Over Time", "Themes Popularity Over Time", "Ratings Over Time"];

  const chartOptions = (title: string): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "white",
          font: { size: 8 },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: title,
        color: "white",
        font: { size: 12, weight: "bold" },
        padding: { top: 1, bottom: 10 },
      },
      tooltip: {
        enabled: true,
        bodyFont: { size: 10 },
        titleFont: { size: 10 },
        padding: 8,
      },
      // zoom/pan is controlled by chartjs-plugin-zoom
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: {
          enabled: true,
          mode: "x",
          threshold: 10,
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          color: "white",
          font: { size: 10 },
        },
        ticks: { color: "white", font: { size: 9 } },
      },
      x: {
        reverse: true,
        title: {
          display: true,
          text: "Time (Weeks)",
          color: "white",
          font: { size: 10 },
          padding: { bottom: 10 },
        },
        ticks: { color: "white", font: { size: 10 } },
      },
    },
    elements: {
      line: { tension: 0.4, borderWidth: 1 },
      point: { radius: 3, hoverRadius: 3 },
    },
  });

  // Export chart canvas to PNG
  const exportChartPNG = (idx: number) => {
    const chartRef = chartRefs.current[idx];
    const chartInstance = chartRef?.chartInstance ?? chartRef?.chart;
    const base64 = chartInstance?.toBase64Image?.();
    if (base64) {
      const a = document.createElement("a");
      a.href = base64;
      a.download = `chart-${idx + 1}.png`;
      a.click();
    }
  };

  // Start recording a chart canvas to WebM
  const startRecording = (idx: number) => {
    const chartRef = chartRefs.current[idx];
    const chartInstance = chartRef?.chartInstance ?? chartRef?.chart;
    const canvas: HTMLCanvasElement | undefined = chartInstance?.canvas;
    if (!canvas) return;
    const stream = (canvas as any).captureStream?.(30);
    if (!stream) return;
    const chunks: Blob[] = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chart-recording-${idx + 1}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording not supported:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const resetZoom = (idx: number) => {
    const chartRef = chartRefs.current[idx];
    const chartInstance = chartRef?.chartInstance ?? chartRef?.chart;
    chartInstance?.resetZoom?.();
  };

  // Fullscreen modal handlers
  const openFullscreen = (idx: number) => {
    setActiveChartIdx(idx);
    setFullscreenOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeFullscreen = () => {
    setFullscreenOpen(false);
    setActiveChartIdx(null);
    document.body.style.overflow = "";
  };

  // Video panel handlers (local file playback)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if