import React, { useEffect, useState } from "react";
import { Gallery, Layout, Render, AnalyticsSection } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import LoadingBar from 'react-top-loading-bar';
import "../App.css";

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
  const [data, setData] = useState<any>([]);
  const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
  const nav = useNavigate();
  const [expand, setExpand] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  
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
  
  const fetchScripts = async () => {
    const result: any = await getRequest("video/author/scripts", setLoading);
    if (result) {
      setScripts(result.map((res: any) => res.script));
      setData(result);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const handleScriptMouseEnter = (index: number) => {
    setShowMoreIndex(index);
  };

  const handleScriptMouseLeave = () => {
    setShowMoreIndex(null);
  };

  return (
    <Layout expand={expand} setExpand={setExpand}>
      <LoadingBar color="#ffb300" progress={progress} height={3} />
      
      {/* Hero Section */}
      <div className="textured-background homepage-hero">
        <h1 className="main-heading">WECINEMA</h1>
        <p className="sub-heading">Your ultimate platform for cinematic storytelling</p>
      </div>

      {/* Analytics Section as Component */}
      <AnalyticsSection title="Analytics" />
      
      {/* Theme Bar */}
      <div className="theme-bar">
        {theme.map((val, index) => (
          <button
            key={index}
            onClick={() => nav(`/themes/${val.toLowerCase()}`)}
            className="theme-button"
          >
            {val}
          </button>
        ))}
      </div>

      {/* Gallery Sections */}
      <Gallery title="Action" category="Action" length={5} isFirst />
      <Gallery title="Comedy" length={5} category="Comedy" />
      <Gallery title="Adventure" length={5} category="Adventure" />
      <Gallery title="Horror" length={5} category="Horror" />
      <Gallery title="Drama" length={5} category="Drama" />
      
      {/* Scripts Section */}
      <div className="scripts-section">
        <div className="z-1 relative p-2 flex flex-wrap border-b border-blue-200 sm:mx-4 pb-4">
          {!loading && (
            <h2 className="text-l font-extrabold text-lg sm:text-xl">Latest Scripts</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {scripts?.map((script: string, index: number) => (
              <div
                key={index}
                className={`${showMoreIndex === index
                    ? "script-card-highlighted"
                    : "script-card"
                  } hide-scrollbar`}
                onMouseEnter={() => handleScriptMouseEnter(index)}
                onMouseLeave={handleScriptMouseLeave}
                onClick={() =>
                  nav(`/script/${data[index]._id}`, {
                    state: JSON.stringify(data[index]),
                  })
                }
              >
                <h2>{data[index].title}</h2>
                {showMoreIndex === index && (
                  <button
                    className="read-more-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/script/${data[index]._id}`, {
                        state: JSON.stringify(data[index]),
                      });
                    }}
                  >
                    Read More
                  </button>
                )}
                <Render htmlString={script} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Homepage;