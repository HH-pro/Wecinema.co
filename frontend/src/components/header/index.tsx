import React, { useState } from 'react';
import { MdMenu, MdMic, MdMicOff } from "react-icons/md";
import logo from "../../assets/wecinema.png";
import { FaUpload, FaVideo, FaFileAlt } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { categories, ratings } from "../../App";
import { Search, X } from "lucide-react";
import './Header.css';

interface HeaderProps {
    darkMode: boolean;
    toggler: () => void;
    toggleSidebar?: () => void;
    expand: boolean;
    isMobile: boolean;
    toggleUploadScriptModal?: () => void;
    toggleUploadModal?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    darkMode,
    toggler,
    toggleSidebar,
    expand,
    isMobile,
    toggleUploadScriptModal,
    toggleUploadModal,
}) => {
    const nav = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isGenreOpen, setIsGenreOpen] = useState(false);
    const [isRatingOpen, setIsRatingOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [uploadMenuOpen, setUploadMenuOpen] = useState(false);

    const toggleSearch = () => setIsExpanded(!isExpanded);
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            const capitalized = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
            nav(`/search/${capitalized.trim()}`);
        }
    };

    const handleVoiceSearch = () => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setSearchTerm(transcript);
                nav(`/search/${transcript}`);
            };

            recognition.start();
        } else {
            alert("Speech recognition is not supported in this browser.");
        }
    };

    const getActiveClass = (path: string) => {
        return window.location.pathname === path ? "active" : "";
    };

    return (
        <header className={`header-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
            <nav className="header-nav">
                {/* Logo and Menu Button */}
                <div className="header-left">
                    <button 
                        className="menu-button"
                        onClick={toggleSidebar ? toggleSidebar : toggler}
                        aria-label="Toggle menu"
                    >
                        <MdMenu size={24} />
                    </button>
                    
                    <div 
                        className="logo-container"
                        onClick={() => nav("/")}
                        role="button"
                        tabIndex={0}
                    >
                        <img 
                            src={logo} 
                            alt="WeCinema Logo" 
                            className="logo-image"
                        />
                        {!isMobile && (
                            <span className="logo-text">WeCinema</span>
                        )}
                    </div>
                </div>

                {/* Desktop Search Bar */}
                {!isMobile && (
                    <div className="search-container">
                        <form className="search-form" onSubmit={handleSearchSubmit}>
                            <div className="search-input-wrapper">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="search"
                                    placeholder="Search movies, shows, actors..."
                                    className="search-input"
                                    value={searchTerm}
                                    onChange={handleSearchInputChange}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="clear-search-button"
                                        onClick={() => setSearchTerm("")}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <button 
                                type="button" 
                                className={`voice-search-button ${isListening ? 'listening' : ''}`}
                                onClick={handleVoiceSearch}
                                aria-label="Voice search"
                            >
                                {isListening ? <MdMicOff size={20} /> : <MdMic size={20} />}
                            </button>
                            <button type="submit" className="search-submit-button">
                                Search
                            </button>
                        </form>
                    </div>
                )}

                {/* Navigation Controls */}
                <div className="header-controls">
                    {/* Upload Dropdown */}
                    <div className="dropdown-container">
                        <button
                            className="upload-button"
                            onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                            aria-label="Upload options"
                            aria-expanded={uploadMenuOpen}
                        >
                            <FaUpload size={18} />
                        </button>

                        {uploadMenuOpen && (
                            <div className="dropdown-menu upload-dropdown">
                                <button
                                    className={`dropdown-item ${getActiveClass("/upload")}`}
                                    onClick={() => {
                                        toggleUploadModal?.();
                                        setUploadMenuOpen(false);
                                    }}
                                >
                                    <FaVideo className="dropdown-icon" />
                                    <span>Upload Video</span>
                                </button>
                                <button
                                    className={`dropdown-item ${getActiveClass("/uploadscripts")}`}
                                    onClick={() => {
                                        toggleUploadScriptModal?.();
                                        setUploadMenuOpen(false);
                                    }}
                                >
                                    <FaFileAlt className="dropdown-icon" />
                                    <span>Upload Script</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Genre Dropdown */}
                    <div className="dropdown-container">
                        <button
                            className="nav-dropdown-button"
                            onClick={() => setIsGenreOpen(!isGenreOpen)}
                            aria-expanded={isGenreOpen}
                        >
                            <span>Genre</span>
                            <span className={`dropdown-arrow ${isGenreOpen ? 'open' : ''}`}></span>
                        </button>
                        
                        {isGenreOpen && (
                            <div className="dropdown-menu genre-dropdown">
                                {categories.map((genre, index) => (
                                    <Link
                                        key={index}
                                        to={`/category/${genre}`}
                                        className="dropdown-item"
                                        onClick={() => setIsGenreOpen(false)}
                                    >
                                        {genre}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Rating Dropdown */}
                    <div className="dropdown-container">
                        <button
                            className="nav-dropdown-button"
                            onClick={() => setIsRatingOpen(!isRatingOpen)}
                            aria-expanded={isRatingOpen}
                        >
                            <span>Rating</span>
                            <span className={`dropdown-arrow ${isRatingOpen ? 'open' : ''}`}></span>
                        </button>
                        
                        {isRatingOpen && (
                            <div className="dropdown-menu rating-dropdown">
                                {ratings.map((rating, index) => (
                                    <Link
                                        key={index}
                                        to={`/ratings/${rating}`}
                                        className="dropdown-item"
                                        onClick={() => setIsRatingOpen(false)}
                                    >
                                        {rating}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Floating Search Button */}
                {isMobile && (
                    <>
                        <button 
                            className="mobile-search-button"
                            onClick={toggleSearch}
                            aria-label="Search"
                        >
                            {isExpanded ? <X size={20} /> : <Search size={20} />}
                        </button>
                        
                        {isExpanded && (
                            <div className="mobile-search-expanded">
                                <form className="mobile-search-form" onSubmit={handleSearchSubmit}>
                                    <div className="mobile-search-input-wrapper">
                                        <Search size={18} className="mobile-search-icon" />
                                        <input
                                            type="search"
                                            placeholder="Search anything..."
                                            className="mobile-search-input"
                                            value={searchTerm}
                                            onChange={handleSearchInputChange}
                                            autoFocus
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                className="mobile-clear-button"
                                                onClick={() => setSearchTerm("")}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        type="button" 
                                        className="mobile-voice-button"
                                        onClick={handleVoiceSearch}
                                    >
                                        {isListening ? <MdMicOff size={20} /> : <MdMic size={20} />}
                                    </button>
                                    <button type="submit" className="mobile-search-submit">
                                        Go
                                    </button>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;