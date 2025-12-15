import React, { useState, useEffect } from 'react';
import { MdMenu, MdMic, MdMicOff, MdAccountCircle } from "react-icons/md";
import logo from "../../assets/wecinema.png";
import { FaUpload, FaVideo, FaFileAlt, FaSearch, FaStar, FaHeart, FaHistory, FaUserCog } from "react-icons/fa";
import { IoLogOut, IoLogIn, IoPersonAdd } from "react-icons/io5";
import { useNavigate, useLocation } from "react-router-dom";
import { categories, ratings } from "../../App";
import './Header.css';
import { Search, X, Bell, TrendingUp } from "lucide-react";

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
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

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
            if (!target.closest('.nav-dropdown') && 
                !target.closest('.upload-dropdown') &&
                !target.closest('.user-dropdown') &&
                !target.closest('.notifications-dropdown')) {
                setGenreOpen(false);
                setRatingOpen(false);
                setUploadMenuOpen(false);
                setUserMenuOpen(false);
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleGenreDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGenreOpen(!genreOpen);
        setRatingOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
    };

    const toggleRatingDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRatingOpen(!ratingOpen);
        setGenreOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
    };

    const toggleUploadDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUploadMenuOpen(!uploadMenuOpen);
        setGenreOpen(false);
        setRatingOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
    };

    const toggleUserDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUserMenuOpen(!userMenuOpen);
        setGenreOpen(false);
        setRatingOpen(false);
        setUploadMenuOpen(false);
        setNotificationsOpen(false);
    };

    const toggleNotifications = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNotificationsOpen(!notificationsOpen);
        setGenreOpen(false);
        setRatingOpen(false);
        setUploadMenuOpen(false);
        setUserMenuOpen(false);
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

    const handleLogin = () => {
        nav('/login');
        setUserMenuOpen(false);
    };

    const handleSignup = () => {
        nav('/signup');
        setUserMenuOpen(false);
    };

    const handleProfile = () => {
        nav('/profile');
        setUserMenuOpen(false);
    };

    const handleLogout = () => {
        // Add logout logic here
        nav('/');
        setUserMenuOpen(false);
    };

    const isActive = (path: string) => location.pathname === path;

    // Mock notifications data
    const notifications = [
        { id: 1, text: "New movie added: Spider-Man", time: "5 min ago", read: false },
        { id: 2, text: "Your script was reviewed", time: "1 hour ago", read: true },
        { id: 3, text: "Trending: Avengers Endgame", time: "2 hours ago", read: true },
        { id: 4, text: "Weekly recommendations ready", time: "1 day ago", read: true },
    ];

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className={`main-header ${darkMode ? 'dark-theme' : 'light-theme'} ${isScrolled ? 'header-shadow' : ''}`}>
            <div className={`header-wrapper ${expand && !isMobile ? 'header-expanded' : ''}`}>
                <nav className="header-nav">
                    {/* Left Section: Logo and Menu */}
                    <div className="header-left-section">
                        <button
                            className="menu-toggle-btn"
                            onClick={toggleSidebar || toggler}
                            aria-label="Toggle menu"
                        >
                            <MdMenu size={28} />
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

                    {/* Center Section: Search (Desktop) */}
                    {!isMobile && (
                        <div className="search-container">
                            <form onSubmit={handleSearchSubmit} className="search-form">
                                <div className="search-input-wrapper">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="search"
                                        placeholder="Search movies, shows, actors..."
                                        className="search-field"
                                        value={searchTerm}
                                        onChange={handleSearchInputChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVoiceSearch}
                                        className={`voice-search-btn ${isListening ? 'listening-active' : ''}`}
                                        aria-label={isListening ? "Stop listening" : "Voice search"}
                                    >
                                        {isListening ? <MdMicOff size={20} /> : <MdMic size={20} />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Right Section: Navigation Items */}
                    <div className="header-right-section">
                        {/* Mobile Search Button */}
                        {isMobile && (
                            <button
                                onClick={toggleMobileSearch}
                                className="mobile-search-toggle"
                                aria-label="Search"
                            >
                                {isExpanded ? <X size={24} /> : <Search size={24} />}
                            </button>
                        )}

                        {/* Notifications */}
                        <div className="notifications-dropdown">
                            <button
                                onClick={toggleNotifications}
                                className={`notification-btn ${notificationsOpen ? 'notification-active' : ''}`}
                                aria-label="Notifications"
                            >
                                <Bell size={22} />
                                {unreadCount > 0 && (
                                    <span className="notification-badge">{unreadCount}</span>
                                )}
                            </button>
                            
                            {notificationsOpen && (
                                <div className="notification-panel">
                                    <div className="notification-header">
                                        <h3>Notifications</h3>
                                        <button className="mark-all-read">Mark all as read</button>
                                    </div>
                                    <div className="notification-list">
                                        {notifications.map(notification => (
                                            <div 
                                                key={notification.id} 
                                                className={`notification-item ${!notification.read ? 'notification-unread' : ''}`}
                                            >
                                                <div className="notification-content">
                                                    <p className="notification-text">{notification.text}</p>
                                                    <span className="notification-time">{notification.time}</span>
                                                </div>
                                                {!notification.read && <div className="unread-indicator"></div>}
                                            </div>
                                        ))}
                                    </div>
                                    <button className="view-all-notifications">View All Notifications</button>
                                </div>
                            )}
                        </div>

                        {/* Upload Dropdown */}
                        <div className="upload-dropdown">
                            <button
                                onClick={toggleUploadDropdown}
                                className={`upload-main-btn ${uploadMenuOpen ? 'upload-active' : ''}`}
                                aria-label="Upload options"
                            >
                                <FaUpload size={22} />
                                {!isMobile && <span className="btn-label">Upload</span>}
                            </button>
                            
                            {uploadMenuOpen && (
                                <div className="upload-options-panel">
                                    <div className="upload-header">
                                        <TrendingUp size={20} />
                                        <h3>Upload Content</h3>
                                    </div>
                                    <button
                                        onClick={handleUploadVideo}
                                        className={`upload-option-btn ${isActive('/upload') ? 'option-active' : ''}`}
                                    >
                                        <FaVideo className="option-icon" />
                                        <div className="option-details">
                                            <span className="option-title">Upload Video</span>
                                            <span className="option-desc">Share your video content</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={handleUploadScript}
                                        className={`upload-option-btn ${isActive('/uploadscripts') ? 'option-active' : ''}`}
                                    >
                                        <FaFileAlt className="option-icon" />
                                        <div className="option-details">
                                            <span className="option-title">Upload Script</span>
                                            <span className="option-desc">Share your scripts</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Genre Dropdown */}
                        <div className="nav-dropdown">
                            <button
                                onClick={toggleGenreDropdown}
                                className={`nav-main-btn ${genreOpen ? 'nav-active' : ''}`}
                            >
                                <span className="btn-text">Genres</span>
                                <span className={`dropdown-arrow ${genreOpen ? 'arrow-open' : ''}`}></span>
                            </button>
                            
                            {genreOpen && (
                                <div className="mega-dropdown">
                                    <div className="dropdown-header">
                                        <FaVideo className="dropdown-icon" />
                                        <div className="dropdown-title">
                                            <h3>Browse Genres</h3>
                                            <p>Explore movies by category</p>
                                        </div>
                                    </div>
                                    <div className="genre-grid">
                                        {categories.map((genre, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleGenreClick(genre)}
                                                className="genre-option"
                                            >
                                                <div className="genre-icon">
                                                    {idx % 3 === 0 ? '🎬' : idx % 3 === 1 ? '🎭' : '🌟'}
                                                </div>
                                                <span className="genre-name">{genre}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Rating Dropdown */}
                        <div className="nav-dropdown">
                            <button
                                onClick={toggleRatingDropdown}
                                className={`nav-main-btn ${ratingOpen ? 'nav-active' : ''}`}
                            >
                                <span className="btn-text">Ratings</span>
                                <span className={`dropdown-arrow ${ratingOpen ? 'arrow-open' : ''}`}></span>
                            </button>
                            
                            {ratingOpen && (
                                <div className="rating-dropdown">
                                    <div className="dropdown-header">
                                        <FaStar className="dropdown-icon" />
                                        <div className="dropdown-title">
                                            <h3>Top Rated Content</h3>
                                            <p>Filter by ratings</p>
                                        </div>
                                    </div>
                                    <div className="rating-list">
                                        {ratings.map((rating, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleRatingClick(rating)}
                                                className="rating-option"
                                            >
                                                <div className="rating-stars">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FaStar 
                                                            key={i} 
                                                            className={`star-icon ${i < parseInt(rating)/2 ? 'star-filled' : 'star-empty'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="rating-value">{rating}+</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Menu Dropdown */}
                        <div className="user-dropdown">
                            <button
                                onClick={toggleUserDropdown}
                                className={`user-profile-btn ${userMenuOpen ? 'profile-active' : ''}`}
                                aria-label="User menu"
                            >
                                <MdAccountCircle size={28} />
                                {!isMobile && (
                                    <div className="user-info">
                                        <span className="user-name">Guest User</span>
                                        <span className="user-status">View Profile</span>
                                    </div>
                                )}
                            </button>
                            
                            {userMenuOpen && (
                                <div className="user-menu-panel">
                                    <div className="user-header">
                                        <div className="user-avatar">
                                            <MdAccountCircle size={48} />
                                        </div>
                                        <div className="user-details">
                                            <h3 className="user-full-name">Guest User</h3>
                                            <p className="user-email">guest@wecinema.com</p>
                                            <button className="upgrade-btn">Upgrade to Pro</button>
                                        </div>
                                    </div>
                                    
                                    <div className="user-quick-stats">
                                        <div className="stat-item">
                                            <span className="stat-value">0</span>
                                            <span className="stat-label">Videos</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-value">0</span>
                                            <span className="stat-label">Scripts</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-value">0</span>
                                            <span className="stat-label">Likes</span>
                                        </div>
                                    </div>
                                    
                                    <div className="user-menu-list">
                                        <button onClick={handleProfile} className="menu-item">
                                            <MdAccountCircle className="menu-icon" />
                                            <span>My Profile</span>
                                        </button>
                                        <button onClick={handleUploadVideo} className="menu-item">
                                            <FaVideo className="menu-icon" />
                                            <span>My Videos</span>
                                        </button>
                                        <button onClick={handleUploadScript} className="menu-item">
                                            <FaFileAlt className="menu-icon" />
                                            <span>My Scripts</span>
                                        </button>
                                        <button className="menu-item">
                                            <FaHeart className="menu-icon" />
                                            <span>Watchlist</span>
                                        </button>
                                        <button className="menu-item">
                                            <FaHistory className="menu-icon" />
                                            <span>Watch History</span>
                                        </button>
                                        <button className="menu-item">
                                            <FaUserCog className="menu-icon" />
                                            <span>Settings</span>
                                        </button>
                                    </div>
                                    
                                    <div className="user-actions">
                                        <button onClick={handleLogin} className="action-btn login-btn">
                                            <IoLogIn className="action-icon" />
                                            <span>Login</span>
                                        </button>
                                        <button onClick={handleSignup} className="action-btn signup-btn">
                                            <IoPersonAdd className="action-icon" />
                                            <span>Sign Up</span>
                                        </button>
                                        <button onClick={handleLogout} className="action-btn logout-btn">
                                            <IoLogOut className="action-icon" />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Mobile Search Overlay */}
                {isExpanded && isMobile && (
                    <>
                        <div 
                            className="mobile-search-overlay"
                            onClick={() => setIsExpanded(false)}
                        />
                        <div className="mobile-search-panel">
                            <form onSubmit={handleSearchSubmit} className="mobile-search-form">
                                <div className="mobile-search-input-wrapper">
                                    <FaSearch className="mobile-search-icon" />
                                    <input
                                        type="search"
                                        placeholder="Search movies, shows, actors..."
                                        className="mobile-search-field"
                                        value={searchTerm}
                                        onChange={handleSearchInputChange}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVoiceSearch}
                                        className={`mobile-voice-btn ${isListening ? 'listening-active' : ''}`}
                                        aria-label={isListening ? "Stop listening" : "Voice search"}
                                    >
                                        {isListening ? <MdMicOff size={20} /> : <MdMic size={20} />}
                                    </button>
                                </div>
                                <div className="search-suggestions">
                                    <button type="button" className="suggestion-btn">
                                        <Search size={16} />
                                        <span>Avengers Endgame</span>
                                    </button>
                                    <button type="button" className="suggestion-btn">
                                        <Search size={16} />
                                        <span>Spider-Man: No Way Home</span>
                                    </button>
                                    <button type="button" className="suggestion-btn">
                                        <Search size={16} />
                                        <span>Stranger Things</span>
                                    </button>
                                </div>
                                <div className="mobile-search-actions">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(false)}
                                        className="cancel-search-btn"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="submit-search-btn"
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