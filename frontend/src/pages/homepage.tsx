import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Gallery, Layout, AnalyticsSection } from "../components/";
import { useNavigate } from "react-router-dom";
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

const Homepage: React.FC = () => {
  const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
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
  const galleryElements = useMemo(
    () =>
      GALLERY_SECTIONS.map((section) => (
        <Gallery
          key={section.title}
          title={section.title}
          category={section.category}
          isFirst={section.isFirst}
        />
      )),
    []
  );

  return (
    <Layout>
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
          <h2 className="text-l font-extrabold text-lg sm:text-xl">
            Latest Scripts
          </h2>
        </div>
      </div>
    </Layout>
  );
};

export default memo(Homepage);