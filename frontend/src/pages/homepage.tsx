import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Gallery, Layout, Render, AnalyticsSection } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import LoadingBar from "react-top-loading-bar";
import "../App.css";

// Constants
export const THEMES = [
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
] as const;

const GALLERY_SECTIONS = [
  { title: "Action", category: "Action", isFirst: true },
  { title: "Comedy", category: "Comedy", isFirst: false },
  { title: "Adventure", category: "Adventure", isFirst: false },
  { title: "Horror", category: "Horror", isFirst: false },
  { title: "Drama", category: "Drama", isFirst: false },
] as const;

const LOADING_INTERVAL = 200;
const PROGRESS_INCREMENT = 10;
const PROGRESS_MAX = 100;
const CONTENT_LENGTH = 5;

// Memoized Theme Button
const ThemeButton = memo(({ theme, onThemeClick }: { theme: string; onThemeClick: (theme: string) => void }) => (
  <button
    onClick={() => onThemeClick(theme.toLowerCase())}
    className="theme-button"
  >
    {theme}
  </button>
));

ThemeButton.displayName = "ThemeButton";

// Memoized Script Card
const ScriptCard = memo(
  ({
    script,
    data,
    isHighlighted,
    onMouseEnter,
    onMouseLeave,
    onClick,
    onReadMore,
  }: {
    script: string;
    data: any;
    isHighlighted: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: () => void;
    onReadMore: (e: React.MouseEvent) => void;
  }) => (
    <div
      className={`${
        isHighlighted ? "script-card-highlighted" : "script-card"
      } hide-scrollbar`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <h2>{data.title}</h2>
      {isHighlighted && (
        <button className="read-more-button" onClick={onReadMore}>
          Read More
        </button>
      )}
      <Render htmlString={script} />
    </div>
  )
);

ScriptCard.displayName = "ScriptCard";

const Homepage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<any>([]);
  const [data, setData] = useState<any>([]);
  const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
  const [expand, setExpand] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const nav = useNavigate();

  // Check terms acceptance on mount
  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem("acceptedTerms");
    if (!hasAcceptedTerms) {
      localStorage.setItem("acceptedTerms", "true");
    }
  }, []);

  const handleThemeClick = useCallback(
    (theme: string) => {
      nav(`/themes/${theme}`);
    },
    [nav]
  );

  const handleScriptMouseEnter = useCallback((index: number) => {
    setShowMoreIndex(index);
  }, []);

  const handleScriptMouseLeave = useCallback(() => {
    setShowMoreIndex(null);
  }, []);

  const handleScriptClick = useCallback(
    (scriptData: any) => {
      nav(`/script/${scriptData._id}`, {
        state: JSON.stringify(scriptData),
      });
    },
    [nav]
  );

  const handleReadMore = useCallback(
    (e: React.MouseEvent, scriptData: any) => {
      e.stopPropagation();
      handleScriptClick(scriptData);
    },
    [handleScriptClick]
  );

  // Memoize gallery sections
  const galleryElements = useMemo(
    () =>
      GALLERY_SECTIONS.map((section) => (
        <Gallery
          key={section.title}
          title={section.title}
          category={section.category}
          length={CONTENT_LENGTH}
          isFirst={section.isFirst}
        />
      )),
    []
  );

  // Memoize script cards
  const scriptCards = useMemo(
    () =>
      scripts.map((script: string, index: number) => (
        <ScriptCard
          key={`${data[index]?._id || index}`}
          script={script}
          data={data[index]}
          isHighlighted={showMoreIndex === index}
          onMouseEnter={() => handleScriptMouseEnter(index)}
          onMouseLeave={handleScriptMouseLeave}
          onClick={() => handleScriptClick(data[index])}
          onReadMore={(e) => handleReadMore(e, data[index])}
        />
      )),
    [scripts, data, showMoreIndex, handleScriptMouseEnter, handleScriptMouseLeave, handleScriptClick, handleReadMore]
  );

  return (
    <Layout>
      <LoadingBar color="#ffb300" progress={progress} height={3} />

      {/* Analytics Section */}
      <AnalyticsSection title="Analytics" />

      {/* Theme Navigation */}
      <div className="theme-bar">
        {THEMES.map((themeItem) => (
          <ThemeButton
            key={themeItem}
            theme={themeItem}
            onThemeClick={handleThemeClick}
          />
        ))}
      </div>

      {/* Gallery Sections */}
      {galleryElements}

      {/* Scripts Section */}
      <div className="scripts-section">
        <div className="z-1 relative p-2 flex flex-wrap border-b border-blue-200 sm:mx-4 pb-4">
          {!loading && (
            <h2 className="text-l font-extrabold text-lg sm:text-xl">
              Latest Scripts
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {scriptCards}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default memo(Homepage);