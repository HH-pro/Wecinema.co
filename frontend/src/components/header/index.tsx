import React, { useState, useRef, useEffect } from 'react';
import { MdMenu, MdMic, MdMicOff } from "react-icons/md";
import logo from "../../assets/wecinema.png";
import { FaUpload, FaVideo, FaFileAlt, FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
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
    
    const genreRef = useRef<HTMLDivElement>(null);
    const ratingRef = useRef<HTMLDivElement>(null);
    const uploadRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
                setIsGenreOpen(false);
            }
            if (ratingRef.current && !ratingRef.current.contains(event.target as Node)) {
                setIsRatingOpen(false);
            }
            if (uploadRef.current && !uploadRef.current.contains(event.target as Node)) {
                setUploadMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSearch = () => setIsExpanded(!isExpanded);
    
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            nav(`/search/${searchTerm.trim()}`);
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
        setIsGenreOpen(false);
        nav(`/category/${genre}`);
    };

    const handleRatingClick = (rating: string) => {
        setIsRatingOpen(false);
        nav(`/ratings/${rating}`);
    };

    return (
        <header className={`header ${darkMode ? 'dark-mode' : 'light-mode'}`}>
            <div className="header-content">
                {/* Left Section */}
                <div className="header-left">
                    <button 
                        className="menu-btn"
                        onClick={toggleSidebar || toggler}
                    >
                        <MdMenu size={22} />
                    </button>
                    
                    <div 
                        className="logo"
                        onClick={() => nav("/")}
                    >
                        <img src={logo} alt="WeCinema" className="logo-img" />
                        {!isMobile && <span className="logo-text">WeCinema</span>}
                    </div>
                </div>

                {/* Center - Search Bar (Desktop only) */}
                {!isMobile && (
                    <div className="search-section">
                        <form className="search-form" onSubmit={handleSearchSubmit}>
                            <div className="search-box">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search movies, shows..."
                                    className="search-input"
                                    value={searchTerm}
                                    onChange={handleSearchInputChange}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="clear-btn"
                                        onClick={() => setSearchTerm("")}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    className={`voice-btn ${isListening ? 'listening' : ''}`}
                                    onClick={handleVoiceSearch}
                                >
                                    {isListening ? <MdMicOff size={18} /> : <MdMic size={18} />}
                                </button>
                            </div>
                            <button type="submit" className="search-btn">
                                Search
                            </button>
                        </form>
                    </div>
                )}

                {/* Right Section - Controls */}
                <div className="header-right">
                    {/* Upload Button */}
                    <div className="dropdown-wrapper" ref={uploadRef}>
                        <button
                            className="action-btn upload-btn"
                            onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                        >
                            <FaUpload size={16} />
                        </button>

                        {uploadMenuOpen && (
                            <div className="dropdown upload-dropdown">
                                <button
                                    className="dropdown-option"
                                    onClick={() => {
                                        toggleUploadModal?.();
                                        setUploadMenuOpen(false);
                                    }}
                                >
                                    <FaVideo className="option-icon" />
                                    <span>Upload Video</span>
                                </button>
                                <button
                                    className="dropdown-option"
                                    onClick={() => {
                                        toggleUploadScriptModal?.();
                                        setUploadMenuOpen(false);
                                    }}
                                >
                                    <FaFileAlt className="option-icon" />
                                    <span>Upload Script</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Genre Dropdown */}
                    <div className="dropdown-wrapper" ref={genreRef}>
                        <button
                            className="action-btn genre-btn"
                            onClick={() => {
                                setIsGenreOpen(!isGenreOpen);
                                setIsRatingOpen(false);
                            }}
                        >
                            <span>Genre</span>
                            <FaChevronDown size={10} className={`arrow ${isGenreOpen ? 'open' : ''}`} />
                        </button>
                        
                        {isGenreOpen && categories && categories.length > 0 && (
                            <div className="dropdown genre-dropdown">
                                <div className="dropdown-header">
                                    <h3 className="dropdown-title">Genres</h3>
                                    <span className="count-badge">{categories.length}</span>
                                </div>
                                <div className="dropdown-list">
                                    {categories.map((genre, index) => (
                                        <button
                                            key={index}
                                            className="dropdown-option"
                                            onClick={() => handleGenreClick(genre)}
                                        >
                                            <span className="genre-dot"></span>
                                            <span className="option-text">{genre}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rating Dropdown */}
                    <div className="dropdown-wrapper" ref={ratingRef}>
                        <button
                            className="action-btn rating-btn"
                            onClick={() => {
                                setIsRatingOpen(!isRatingOpen);
                                setIsGenreOpen(false);
                            }}
                        >
                            <span>Rating</span>
                            <FaChevronDown size={10} className={`arrow ${isRatingOpen ? 'open' : ''}`} />
                        </button>
                        
                        {isRatingOpen && ratings && ratings.length > 0 && (
                            <div className="dropdown rating-dropdown">
                                <div className="dropdown-header">
                                    <h3 className="dropdown-title">Ratings</h3>
                                </div>
                                <div className="dropdown-list">
                                    {ratings.map((rating, index) => (
                                        <button
                                            key={index}
                                            className="dropdown-option rating-option"
                                            onClick={() => handleRatingClick(rating)}
                                        >
                                            <span className="rating-tag">{rating}</span>
                                            <span className="option-text">{rating}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Search Button */}
                {isMobile && (
                    <div className="mobile-search">
                        <button 
                            className="mobile-search-btn"
                            onClick={toggleSearch}
                        >
                            {isExpanded ? <X size={20} /> : <Search size={20} />}
                        </button>
                        
                        {isExpanded && (
                            <div className="mobile-search-panel">
                                <form className="mobile-search-form" onSubmit={handleSearchSubmit}>
                                    <div className="mobile-search-box">
                                        <Search size={18} className="mobile-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            className="mobile-search-input"
                                            value={searchTerm}
                                            onChange={handleSearchInputChange}
                                            autoFocus
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                className="mobile-clear-btn"
                                                onClick={() => setSearchTerm("")}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        type="button" 
                                        className="mobile-voice-btn"
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
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;