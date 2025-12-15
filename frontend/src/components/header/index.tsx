import React, { useState, useEffect } from 'react';
import { MdMenu, MdMic, MdMicOff } from "react-icons/md";
import logo from "../../assets/wecinema.png";
import { FaUpload, FaVideo, FaFileAlt, FaSearch } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { categories, ratings } from "../../App";
import './Header.css';
import { Search, X } from "lucide-react";

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
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [genreOpen, setGenreOpen] = useState(false);
    const [ratingOpen, setRatingOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.header-dropdown') && !target.closest('.header-upload-menu')) {
                setGenreOpen(false);
                setRatingOpen(false);
                setUploadMenuOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleGenreDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGenreOpen(!genreOpen);
        setRatingOpen(false);
    };

    const toggleRatingDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRatingOpen(!ratingOpen);
        setGenreOpen(false);
    };

    const toggleUploadDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUploadMenuOpen(!uploadMenuOpen);
        setGenreOpen(false);
        setRatingOpen(false);
    };

    const toggleMobileSearch = () => setIsExpanded(!isExpanded);

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            const capitalized = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
            nav(`/search/${capitalized.trim()}`);
            setIsExpanded(false);
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
                setIsExpanded(false);
            };

            recognition.start();
        } else {
            alert("Speech recognition is not supported in this browser.");
        }
    };

    const handleGenreClick = (genre: string) => {
        nav(`/category/${genre}`);
        setGenreOpen(false);
    };

    const handleRatingClick = (rating: string) => {
        nav(`/ratings/${rating}`);
        setRatingOpen(false);
    };

    const handleUploadVideo = () => {
        if (toggleUploadModal) {
            toggleUploadModal();
            setUploadMenuOpen(false);
        }
    };

    const handleUploadScript = () => {
        if (toggleUploadScriptModal) {
            toggleUploadScriptModal();
            setUploadMenuOpen(false);
        }
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <header className={`header-container ${darkMode ? 'header-dark' : 'header-light'} ${isScrolled ? 'header-scrolled' : ''}`}>
            <div className={`header-content ${expand && !isMobile ? 'header-content-expanded' : ''}`}>
                <nav className="header-nav">
                    {/* Left Section: Logo and Menu */}
                    <div className="header-left">
                        <button
                            className="header-menu-button"
                            onClick={toggleSidebar || toggler}
                            aria-label="Toggle menu"
                        >
                            <MdMenu size={24} />
                        </button>
                        
                        <div 
                            className="header-logo"
                            onClick={() => nav("/")}
                            role="button"
                            tabIndex={0}
                        >
                            <img 
                                src={logo} 
                                alt="WeCinema Logo" 
                                className="header-logo-image"
                            />
                            {!isMobile && (
                                <span className="header-logo-text">WeCinema</span>
                            )}
                        </div>
                    </div>

                    {/* Center Section: Search (Desktop) */}
                    {!isMobile && (
                        <div className="header-search-desktop">
                            <form onSubmit={handleSearchSubmit} className="header-search-form">
                                <div className="header-search-wrapper">
                                    <input
                                        type="search"
                                        placeholder="Search movies, shows, actors..."
                                        className="header-search-input"
                                        value={searchTerm}
                                        onChange={handleSearchInputChange}
                                    />
                                    <FaSearch className="header-search-icon" />
                                    <button
                                        type="button"
                                        onClick={handleVoiceSearch}
                                        className={`header-voice-button ${isListening ? 'header-voice-active' : ''}`}
                                        aria-label={isListening ? "Stop listening" : "Voice search"}
                                    >
                                        {isListening ? <MdMicOff size={18} /> : <MdMic size={18} />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Right Section: Navigation Items */}
                    <div className="header-right">
                        {/* Mobile Search Button */}
                        {isMobile && (
                            <button
                                onClick={toggleMobileSearch}
                                className="header-mobile-search-button"
                                aria-label="Search"
                            >
                                {isExpanded ? <X size={20} /> : <Search size={20} />}
                            </button>
                        )}

                        {/* Upload Dropdown */}
                        <div className="header-upload-menu">
                            <button
                                onClick={toggleUploadDropdown}
                                className="header-upload-button"
                                aria-label="Upload options"
                            >
                                <FaUpload size={18} />
                            </button>
                            
                            {uploadMenuOpen && (
                                <div className="header-upload-dropdown">
                                    <button
                                        onClick={handleUploadVideo}
                                        className={`header-upload-item ${isActive('/upload') ? 'header-upload-active' : ''}`}
                                    >
                                        <FaVideo className="header-upload-icon" />
                                        <span>Video</span>
                                    </button>
                                    <button
                                        onClick={handleUploadScript}
                                        className={`header-upload-item ${isActive('/uploadscripts') ? 'header-upload-active' : ''}`}
                                    >
                                        <FaFileAlt className="header-upload-icon" />
                                        <span>Script</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Genre Dropdown */}
                        <div className="header-dropdown">
                            <button
                                onClick={toggleGenreDropdown}
                                className="header-dropdown-button"
                            >
                                Genre <span className={`header-arrow ${genreOpen ? 'header-arrow-open' : ''}`}></span>
                            </button>
                            
                            {genreOpen && (
                                <div className="header-dropdown-menu">
                                    {categories.map((genre, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleGenreClick(genre)}
                                            className="header-dropdown-item"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Rating Dropdown */}
                        <div className="header-dropdown">
                            <button
                                onClick={toggleRatingDropdown}
                                className="header-dropdown-button"
                            >
                                Rating <span className={`header-arrow ${ratingOpen ? 'header-arrow-open' : ''}`}></span>
                            </button>
                            
                            {ratingOpen && (
                                <div className="header-dropdown-menu">
                                    {ratings.map((rating, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleRatingClick(rating)}
                                            className="header-dropdown-item"
                                        >
                                            {rating}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Mobile Search Overlay */}
                {isExpanded && isMobile && (
                    <>
                        <div 
                            className="header-mobile-overlay"
                            onClick={() => setIsExpanded(false)}
                        />
                        <div className="header-mobile-search">
                            <form onSubmit={handleSearchSubmit} className="header-mobile-search-form">
                                <div className="header-mobile-search-wrapper">
                                    <input
                                        type="search"
                                        placeholder="Search movies, shows, actors..."
                                        className="header-mobile-search-input"
                                        value={searchTerm}
                                        onChange={handleSearchInputChange}
                                        autoFocus
                                    />
                                    <FaSearch className="header-mobile-search-icon" />
                                    <button
                                        type="button"
                                        onClick={handleVoiceSearch}
                                        className={`header-mobile-voice-button ${isListening ? 'header-voice-active' : ''}`}
                                        aria-label={isListening ? "Stop listening" : "Voice search"}
                                    >
                                        {isListening ? <MdMicOff size={18} /> : <MdMic size={18} />}
                                    </button>
                                </div>
                                <div className="header-mobile-search-actions">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(false)}
                                        className="header-mobile-cancel"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="header-mobile-submit"
                                    >
                                        Search
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;