import React, { useState, useRef, useEffect } from 'react';
import { MdMenu, MdMic, MdMicOff, MdExpandMore, MdUpload } from "react-icons/md";
import logo from "../../assets/wecinema.png";
import { FaVideo, FaFileAlt } from "react-icons/fa";
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
    const navigate = useNavigate();
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isGenreMenuOpen, setIsGenreMenuOpen] = useState(false);
    const [isRatingMenuOpen, setIsRatingMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
    
    const genreMenuRef = useRef<HTMLDivElement>(null);
    const ratingMenuRef = useRef<HTMLDivElement>(null);
    const uploadMenuRef = useRef<HTMLDivElement>(null);
    const mobileSearchRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            if (genreMenuRef.current && !genreMenuRef.current.contains(target)) {
                setIsGenreMenuOpen(false);
            }
            
            if (ratingMenuRef.current && !ratingMenuRef.current.contains(target)) {
                setIsRatingMenuOpen(false);
            }
            
            if (uploadMenuRef.current && !uploadMenuRef.current.contains(target)) {
                setIsUploadMenuOpen(false);
            }
            
            if (mobileSearchRef.current && isSearchExpanded && 
                !mobileSearchRef.current.contains(target)) {
                setIsSearchExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside as any);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside as any);
        };
    }, [isSearchExpanded]);

    const toggleSearch = () => {
        setIsSearchExpanded(!isSearchExpanded);
        setIsGenreMenuOpen(false);
        setIsRatingMenuOpen(false);
        setIsUploadMenuOpen(false);
    };
    
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/search/${searchTerm.trim()}`);
            setIsSearchExpanded(false);
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
                navigate(`/search/${transcript}`);
                setIsSearchExpanded(false);
            };

            recognition.start();
        } else {
            alert("Speech recognition is not supported in this browser.");
        }
    };

    const handleGenreSelect = (genre: string) => {
        setIsGenreMenuOpen(false);
        navigate(`/category/${genre}`);
    };

    const handleRatingSelect = (rating: string) => {
        setIsRatingMenuOpen(false);
        navigate(`/ratings/${rating}`);
    };

    const handleUploadVideo = () => {
        if (toggleUploadModal) {
            toggleUploadModal();
        }
        setIsUploadMenuOpen(false);
    };

    const handleUploadScript = () => {
        if (toggleUploadScriptModal) {
            toggleUploadScriptModal();
        }
        setIsUploadMenuOpen(false);
    };

    const handleLogoClick = () => {
        navigate("/");
    };

    const toggleUploadMenu = () => {
        setIsUploadMenuOpen(!isUploadMenuOpen);
        setIsGenreMenuOpen(false);
        setIsRatingMenuOpen(false);
    };

    const toggleGenreMenu = () => {
        setIsGenreMenuOpen(!isGenreMenuOpen);
        setIsRatingMenuOpen(false);
        setIsUploadMenuOpen(false);
    };

    const toggleRatingMenu = () => {
        setIsRatingMenuOpen(!isRatingMenuOpen);
        setIsGenreMenuOpen(false);
        setIsUploadMenuOpen(false);
    };

    return (
        <header className={`header ${darkMode ? 'header--dark' : ''}`}>
            <div className="header__container">
                {/* Left Section - Logo & Menu */}
                <div className="header__left">
                    <button 
                        className="header__menu-btn"
                        onClick={toggleSidebar || toggler}
                        aria-label="Toggle menu"
                    >
                        <MdMenu size={22} />
                    </button>
                    
                    <div 
                        className="header__logo"
                        onClick={handleLogoClick}
                        role="button"
                        tabIndex={0}
                        aria-label="Go to homepage"
                        onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
                    >
                        <img src={logo} alt="WeCinema" className="header__logo-img" />
                        {!isMobile && <span className="header__logo-text">WeCinema</span>}
                    </div>
                </div>

                {/* Center - Search Bar (Desktop only) */}
                {!isMobile && (
                    <div className="header__search">
                        <form className="search-form" onSubmit={handleSearchSubmit}>
                            <div className="search-form__input-wrapper">
                                <Search size={18} className="search-form__icon" />
                                <input
                                    type="text"
                                    placeholder="Search movies, shows, actors..."
                                    className="search-form__input"
                                    value={searchTerm}
                                    onChange={handleSearchInputChange}
                                    aria-label="Search"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="search-form__clear-btn"
                                        onClick={() => setSearchTerm("")}
                                        aria-label="Clear search"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    className={`search-form__voice-btn ${isListening ? 'search-form__voice-btn--listening' : ''}`}
                                    onClick={handleVoiceSearch}
                                    aria-label="Voice search"
                                >
                                    {isListening ? <MdMicOff size={18} /> : <MdMic size={18} />}
                                </button>
                            </div>
                            <button type="submit" className="search-form__submit">
                                Search
                            </button>
                        </form>
                    </div>
                )}

                {/* Right Section - Action Controls */}
                <div className="header__right">
                    {/* Upload Menu */}
                    <div className="header__dropdown" ref={uploadMenuRef}>
                        <button
                            className="header__action-btn header__action-btn--upload"
                            onClick={toggleUploadMenu}
                            aria-expanded={isUploadMenuOpen}
                            aria-label="Upload options"
                            aria-haspopup="true"
                        >
                            <MdUpload size={18} />
                            {!isMobile && <span>Upload</span>}
                        </button>

                        {isUploadMenuOpen && (
<<<<<<< HEAD
                            <div className="dropdown-menu dropdown-menu--upload">
=======
                            <div className="dropdown-menu dropdown-menu--upload dropdown-menu--left">
>>>>>>> 70c98a51 (yes)
                                <button
                                    className="dropdown-menu__item"
                                    onClick={handleUploadVideo}
                                    aria-label="Upload video"
                                >
                                    <FaVideo className="dropdown-menu__icon" />
                                    <span>Upload Video</span>
                                </button>
                                <button
                                    className="dropdown-menu__item"
                                    onClick={handleUploadScript}
                                    aria-label="Upload script"
                                >
                                    <FaFileAlt className="dropdown-menu__icon" />
                                    <span>Upload Script</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Genre Menu */}
                    <div className="header__dropdown" ref={genreMenuRef}>
                        <button
                            className="header__action-btn"
                            onClick={toggleGenreMenu}
                            aria-expanded={isGenreMenuOpen}
                            aria-haspopup="true"
                            aria-label="Browse genres"
                        >
                            <span>Genre</span>
                            <MdExpandMore 
                                size={16} 
                                className={`header__dropdown-arrow ${isGenreMenuOpen ? 'header__dropdown-arrow--open' : ''}`} 
                            />
                        </button>
                        
                        {isGenreMenuOpen && (
<<<<<<< HEAD
                            <div className="dropdown-menu dropdown-menu--genre">
=======
                            <div className="dropdown-menu dropdown-menu--genre dropdown-menu--left">
>>>>>>> 70c98a51 (yes)
                                <div className="dropdown-menu__header">
                                    <h3 className="dropdown-menu__title">Browse Genres</h3>
                                    <span className="dropdown-menu__count">{categories?.length || 0}</span>
                                </div>
                                <div className="dropdown-menu__list">
                                    {categories && categories.length > 0 ? (
                                        categories.map((genre, index) => (
                                            <button
                                                key={`genre-${index}`}
                                                className="dropdown-menu__item"
                                                onClick={() => handleGenreSelect(genre)}
                                                aria-label={`Select ${genre} genre`}
                                            >
                                                <span className="dropdown-menu__genre-dot"></span>
                                                <span className="dropdown-menu__text">{genre}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="dropdown-menu__empty">
                                            No genres available
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rating Menu */}
                    <div className="header__dropdown" ref={ratingMenuRef}>
                        <button
                            className="header__action-btn"
                            onClick={toggleRatingMenu}
                            aria-expanded={isRatingMenuOpen}
                            aria-haspopup="true"
                            aria-label="Browse ratings"
                        >
                            <span>Rating</span>
                            <MdExpandMore 
                                size={16} 
                                className={`header__dropdown-arrow ${isRatingMenuOpen ? 'header__dropdown-arrow--open' : ''}`} 
                            />
                        </button>
                        
                        {isRatingMenuOpen && (
<<<<<<< HEAD
                            <div className="dropdown-menu dropdown-menu--rating">
=======
                            <div className="dropdown-menu dropdown-menu--rating dropdown-menu--left">
>>>>>>> 70c98a51 (yes)
                                <div className="dropdown-menu__header">
                                    <h3 className="dropdown-menu__title">Content Ratings</h3>
                                </div>
                                <div className="dropdown-menu__list">
                                    {ratings && ratings.length > 0 ? (
                                        ratings.map((rating, index) => (
                                            <button
                                                key={`rating-${index}`}
                                                className="dropdown-menu__item dropdown-menu__item--rating"
                                                onClick={() => handleRatingSelect(rating)}
                                                aria-label={`Select ${rating} rating`}
                                            >
                                                <span className="dropdown-menu__rating-tag">{rating}</span>
                                                <span className="dropdown-menu__text">{rating}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="dropdown-menu__empty">
                                            No ratings available
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Search */}
                {isMobile && (
                    <div className="header__mobile-search" ref={mobileSearchRef}>
                        <button 
                            className="header__mobile-search-toggle"
                            onClick={toggleSearch}
                            aria-label={isSearchExpanded ? "Close search" : "Open search"}
                            aria-expanded={isSearchExpanded}
                        >
                            {isSearchExpanded ? <X size={20} /> : <Search size={20} />}
                        </button>
                        
                        {isSearchExpanded && (
                            <div className="mobile-search-panel">
                                <form className="mobile-search-form" onSubmit={handleSearchSubmit}>
                                    <div className="mobile-search-form__input-wrapper">
                                        <Search size={18} className="mobile-search-form__icon" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            className="mobile-search-form__input"
                                            value={searchTerm}
                                            onChange={handleSearchInputChange}
                                            autoFocus={isSearchExpanded}
                                            aria-label="Search"
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                className="mobile-search-form__clear-btn"
                                                onClick={() => setSearchTerm("")}
                                                aria-label="Clear search"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        type="button" 
                                        className="mobile-search-form__voice-btn"
                                        onClick={handleVoiceSearch}
                                        aria-label="Voice search"
                                    >
                                        {isListening ? <MdMicOff size={20} /> : <MdMic size={20} />}
                                    </button>
                                    <button type="submit" className="mobile-search-form__submit">
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