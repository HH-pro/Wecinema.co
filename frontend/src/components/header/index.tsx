import React, { useState, useEffect } from 'react';
import { MdMenu, MdMic, MdMicOff } from "react-icons/md";
import logo from "../../assets/wecinema.png";
import search from "../../assets/search.png";
import close from "../../assets/close.png";
import { FaUpload, FaVideo, FaFileAlt, FaSearch } from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { categories, ratings } from "../../App";
import { Search, X } from "lucide-react";

interface HeaderProps {
    darkMode: boolean;
    toggler: () => void;
    toggleSidebar?: () => void; // 👈 for ViewPage only
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
    const [isOpen, setIsOpen] = useState(false);
    const [isOpened, setIsOpened] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [uploadMenu, setUploadMenu] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle scroll effect for header
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
            if (!target.closest('.dropdown') && !target.closest('.upload-dropdown')) {
                setIsOpen(false);
                setIsOpened(false);
                setUploadMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
        setIsOpened(false); // Close other dropdown
    };

    const toggleDropdowned = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpened(!isOpened);
        setIsOpen(false); // Close other dropdown
    };

    const toggleUploadMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUploadMenu(!uploadMenu);
        setIsOpen(false);
        setIsOpened(false);
    };

    const toggleSearch = () => setIsExpanded(!isExpanded);

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

    const getActiveClass = (path: string) => {
        return location.pathname === path ? "text-yellow-500 font-semibold" : "";
    };

    const handleGenreClick = (genre: string) => {
        nav(`/category/${genre}`);
        setIsOpen(false);
    };

    const handleRatingClick = (rating: string) => {
        nav(`/ratings/${rating}`);
        setIsOpened(false);
    };

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
            darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"
        } ${isScrolled ? 'shadow-lg border-b border-gray-200' : ''}`}>
            <div className={`mx-auto ${expand && !isMobile ? "px-4" : "px-4 md:px-8 lg:px-12"}`}>
                <nav className="flex items-center justify-between h-16">
                    {/* Left Section: Logo and Menu */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar ? toggleSidebar : toggler}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Toggle menu"
                        >
                            <MdMenu size={24} />
                        </button>
                        
                        <div 
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => nav("/")}
                        >
                            <img 
                                src={logo} 
                                alt="WeCinema Logo" 
                                className="w-10 h-10 md:w-12 md:h-12"
                            />
                            {!isMobile && (
                                <span className="text-xl md:text-2xl font-bold font-mono">
                                    WeCinema
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Center Section: Search Bar (Desktop) */}
                    {!isMobile && (
                        <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
                            <form 
                                onSubmit={handleSearchSubmit}
                                className="relative"
                            >
                                <div className="relative flex items-center">
                                    <input
                                        type="search"
                                        placeholder="Search movies, shows, actors..."
                                        className="w-full px-4 py-2 pl-10 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                        value={searchTerm}
                                        onChange={handleSearchInputChange}
                                    />
                                    <FaSearch 
                                        className="absolute left-3 text-gray-400"
                                        size={18}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVoiceSearch}
                                        className={`absolute right-2 p-1.5 rounded-full transition-colors ${
                                            isListening 
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/20' 
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                        aria-label={isListening ? "Stop listening" : "Voice search"}
                                    >
                                        {isListening ? <MdMicOff size={18} /> : <MdMic size={18} />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Right Section: Navigation Items */}
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Mobile Search Button */}
                        {isMobile && (
                            <button
                                onClick={toggleSearch}
                                className="p-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-colors shadow-md"
                                aria-label="Search"
                            >
                                {isExpanded ? <X size={20} /> : <Search size={20} />}
                            </button>
                        )}

                        {/* Upload Dropdown */}
                        <div className="relative upload-dropdown">
                            <button
                                onClick={toggleUploadMenu}
                                className="p-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-colors shadow-md"
                                aria-label="Upload options"
                                title="Upload"
                            >
                                <FaUpload size={18} />
                            </button>
                            
                            {uploadMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                                    <button
                                        onClick={() => {
                                            if (toggleUploadModal) toggleUploadModal();
                                            setUploadMenu(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                                    >
                                        <FaVideo className="text-blue-500" size={18} />
                                        <span className="text-gray-700 dark:text-gray-300">Upload Video</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (toggleUploadScriptModal) toggleUploadScriptModal();
                                            setUploadMenu(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FaFileAlt className="text-green-500" size={18} />
                                        <span className="text-gray-700 dark:text-gray-300">Upload Script</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Genre Dropdown */}
                        <div className="relative dropdown">
                            <button
                                onClick={toggleDropdown}
                                className="px-3 py-1.5 text-sm md:text-base rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-yellow-500 hover:text-white hover:border-yellow-500 transition-all duration-200"
                            >
                                Genre <span className={`arrow ${isOpen ? 'open' : ''}`}></span>
                            </button>
                            
                            {isOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
                                    {categories.map((genre, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleGenreClick(genre)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                        >
                                            <span className="text-gray-700 dark:text-gray-300">{genre}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Rating Dropdown */}
                        <div className="relative dropdown">
                            <button
                                onClick={toggleDropdowned}
                                className="px-3 py-1.5 text-sm md:text-base rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-yellow-500 hover:text-white hover:border-yellow-500 transition-all duration-200"
                            >
                                Rating <span className={`arrow ${isOpened ? 'open' : ''}`}></span>
                            </button>
                            
                            {isOpened && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                                    {ratings.map((rating, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleRatingClick(rating)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                        >
                                            <span className="text-gray-700 dark:text-gray-300">{rating}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Mobile Expanded Search */}
                {isExpanded && isMobile && (
                    <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700 p-4 z-40">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <div className="relative flex items-center">
                                <input
                                    type="search"
                                    placeholder="Search movies, shows, actors..."
                                    className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={handleSearchInputChange}
                                    autoFocus
                                />
                                <FaSearch 
                                    className="absolute left-3 text-gray-400"
                                    size={18}
                                />
                                <button
                                    type="button"
                                    onClick={handleVoiceSearch}
                                    className={`absolute right-2 p-1.5 rounded-full transition-colors ${
                                        isListening 
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/20' 
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                    aria-label={isListening ? "Stop listening" : "Voice search"}
                                >
                                    {isListening ? <MdMicOff size={18} /> : <MdMic size={18} />}
                                </button>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(false)}
                                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Overlay for mobile search */}
            {isExpanded && isMobile && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </header>
    );
};

export default Header;