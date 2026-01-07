import React, { useEffect, useRef, useState } from "react";
import Select from "react-dropdown-select";
import { FaTimes, FaEnvelope, FaLock, FaUser, FaCalendarAlt, FaVideo, FaFileAlt } from "react-icons/fa";
import ReactQuill from "react-quill";
import { postRequest } from "../../api";
import { Itoken, decodeToken } from "../../utilities/helperfFunction";
import moment from "moment";
import axios from "axios";
import '../header/drowpdown.css';
import TermsAndConditionsPopup from "../../pages/TermsAndConditionsPopup"; 
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { X, CheckCircle, Mail, Loader2, AlertCircle, Upload, LogOut } from "lucide-react";

interface IPopupProps {
	type: string | undefined;
	show?: boolean;
	authorized?: boolean;
	width?: string;
	background?: string;
	height?: string;
	className?: string;
	onClose?: () => void;
}

// Verification Modal Component
const VerificationModal: React.FC<{
	email: string;
	username: string;
	onResend: () => Promise<void>;
	onClose: () => void;
	isResending?: boolean;
}> = ({ email, username, onResend, onClose, isResending }) => (
	<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
		<motion.div
			initial={{ opacity: 0, scale: 0.9, y: 20 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			transition={{ type: "spring", damping: 25, stiffness: 300 }}
			className="relative w-full max-w-md bg-gradient-to-b from-white to-yellow-50 border-2 border-yellow-200 rounded-2xl shadow-2xl overflow-hidden"
		>
			{/* Decorative header */}
			<div className="h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
			
			<div className="p-6 md:p-8">
				<div className="text-center mb-6">
					<div className="relative inline-block mb-4">
						<div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center shadow-lg">
							<Mail className="w-10 h-10 md:w-12 md:h-12 text-yellow-600" />
						</div>
						<div className="absolute -top-2 -right-2 w-8 h-8 md:w-10 md:h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
							<span className="text-white text-xs md:text-sm font-bold">!</span>
						</div>
					</div>
					
					<h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
					<p className="text-gray-600 text-sm md:text-base mb-6">
						Welcome to Wecinema, <span className="font-semibold text-yellow-600">{username}</span>!
					</p>
				</div>
				
				<div className="space-y-4 mb-6 md:mb-8">
					<div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
						<div className="flex items-start space-x-3">
							<CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-500 flex-shrink-0 mt-0.5" />
							<div className="text-left">
								<p className="font-medium text-gray-800 text-sm md:text-base">We've sent a verification email to:</p>
								<p className="text-yellow-700 font-bold text-base md:text-lg mt-1 break-all">{email}</p>
							</div>
						</div>
					</div>
					
					<div className="bg-white/60 border border-yellow-100 rounded-lg p-4">
						<h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm md:text-base">
							<AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
							Next Steps:
						</h4>
						<ol className="list-decimal list-inside space-y-2 text-xs md:text-sm text-gray-600">
							<li>Check your inbox (and spam folder)</li>
							<li>Click the verification link in the email</li>
							<li>Return here to log in</li>
						</ol>
					</div>
				</div>
				
				<div className="space-y-3">
					<button
						onClick={onResend}
						disabled={isResending}
						className={`w-full py-3 md:py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 ${
							isResending
								? 'bg-gray-400 cursor-not-allowed'
								: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
						}`}
					>
						{isResending ? (
							<>
								<Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
								<span className="text-sm md:text-base">Sending Email...</span>
							</>
						) : (
							<>
								<Mail className="w-4 h-4 md:w-5 md:h-5" />
								<span className="text-sm md:text-base">Resend Verification Email</span>
							</>
						)}
					</button>
					
					<button
						onClick={onClose}
						className="w-full py-2 md:py-3 text-gray-600 hover:text-gray-800 font-medium transition hover:bg-gray-100 rounded-xl text-sm md:text-base"
					>
						I'll verify later
					</button>
				</div>
				
				<p className="text-xs text-gray-500 text-center mt-4 md:mt-6">
					Verification links expire in 24 hours
				</p>
			</div>
		</motion.div>
	</div>
);

// Success Modal Component
const RegistrationSuccessModal: React.FC<{
	email: string;
	username: string;
	onClose: () => void;
}> = ({ email, username, onClose }) => (
	<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
		<motion.div
			initial={{ opacity: 0, scale: 0.9, y: 20 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			transition={{ type: "spring", damping: 25, stiffness: 300 }}
			className="relative w-full max-w-md bg-gradient-to-b from-white to-green-50 border-2 border-green-200 rounded-2xl shadow-2xl overflow-hidden"
		>
			<div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
			
			<div className="p-6 md:p-8 text-center">
				<div className="mb-6">
					<div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
						<CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-green-600" />
					</div>
					
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: "spring" }}
						className="mb-2"
					>
						<h2 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome Aboard! 🎉</h2>
					</motion.div>
					
					<p className="text-gray-600 text-sm md:text-base mb-6">
						Hey <span className="font-bold text-green-600">{username}</span>, you're almost there!
					</p>
				</div>
				
				<div className="space-y-4 mb-6 md:mb-8">
					<div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
						<p className="text-gray-700 text-sm md:text-base mb-2">
							We've sent a verification email to:
						</p>
						<p className="text-green-700 font-bold text-base md:text-lg break-all bg-white/60 py-2 px-3 md:px-4 rounded-lg">
							{email}
						</p>
					</div>
					
					<div className="bg-white/60 border border-green-100 rounded-lg p-4">
						<p className="text-gray-700 text-xs md:text-sm leading-relaxed">
							<strong className="text-green-600">Important:</strong> You must verify your email before you can log in. 
							Check your inbox and click the verification link to activate your account.
						</p>
					</div>
				</div>
				
				<button
					onClick={onClose}
					className="w-full py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] text-sm md:text-base"
				>
					Got it! 👍
				</button>
				
				<p className="text-xs text-gray-500 mt-4 md:mt-6">
					Didn't receive the email? Check your spam folder or try resending from the verification screen.
				</p>
			</div>
		</motion.div>
	</div>
);

const Popup: React.FC<IPopupProps> = React.memo(
	({ type, className, background, show, onClose }) => {
		// Authentication states
		const [token, setToken] = useState<string | null>(localStorage.getItem("token") || null);
		const [decodedToken, setDecodedToken] = useState<Itoken | null>(null);
		const [isShow, setShow] = useState<boolean>(false);
		const [loading, setLoading] = useState<boolean>(false);
		
		// Registration/Login states
		const [username, setUsername] = useState<string>("");
		const [dob, setDob] = useState("");
		const [email, setEmail] = useState("");
		const [password, setPassword] = useState<string>("");
		
		// Video upload states
		const [selectedFile, setSelectedFile] = useState<any>(null);
		const [rating, setRating] = useState<string>("");
		const [title, setTitle] = useState("");
		const [description, setDescription] = useState("");
		const [hasPaid, setHasPaid] = useState<boolean>(false);
		const [sellVideo, setSellVideo] = useState<boolean>(false);
		const [selectedItems, setSelectedItems] = useState<string[]>([]);
		const [selectItems, setSelectItems] = useState<string[]>([]);
		const fileInputRef: any = useRef(null);
		
		// Modal states
		const [showTermsPopup, setShowTermsPopup] = useState(false);
		const [verificationModal, setVerificationModal] = useState(false);
		const [successModal, setSuccessModal] = useState(false);
		const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
		const [pendingVerificationUsername, setPendingVerificationUsername] = useState("");
		const [isResending, setIsResending] = useState(false);
		const [formErrors, setFormErrors] = useState<Record<string, string>>({});

		// Initialize show state
		useEffect(() => {
			setShow(!!type);
		}, [type]);

		// Decode token and check payment status
		useEffect(() => {
			const decoded = decodeToken(token);
			setDecodedToken(decoded);
			
			if (decoded?.userId) {
				checkUserPaymentStatus(decoded.userId);
			}
		}, [token]);

		// Check if user has accepted terms
		useEffect(() => {
			const hasAcceptedTerms = localStorage.getItem("acceptedTerms");
			if (!hasAcceptedTerms && type === "register") {
				setShowTermsPopup(true);
			}
		}, [type]);

		// Validate email format
		const validateEmail = (email: string): boolean => {
			const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return re.test(email);
		};

		// Validate password strength
		const validatePassword = (password: string): string | null => {
			if (password.length < 6) {
				return "Password must be at least 6 characters long";
			}
			return null;
		};

		// Validate age from DOB
		const validateAge = (dob: string): string | null => {
			if (!dob) return "Date of birth is required";
			
			const birthDate = new Date(dob);
			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();
			const monthDiff = today.getMonth() - birthDate.getMonth();
			
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
				age--;
			}
			
			if (age < 13) {
				return "You must be at least 13 years old to register";
			}
			
			if (age > 120) {
				return "Please enter a valid date of birth";
			}
			
			return null;
		};

		// Check payment status
		const checkUserPaymentStatus = async (userId: string) => {
			try {
				const response = await axios.get(`https://wecinema.co/api/user/payment-status/${userId}`);
				setHasPaid(response.data.hasPaid);
			} catch (error) {
				console.error("Error checking payment status:", error);
			}
		};

		const handleLoginSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			setFormErrors({});
			setLoading(true);

			try {
				const payload = { 
					email: email.trim().toLowerCase(), 
					password: password.trim() 
				};

				console.log("Sending login request with payload:", payload);

				const result: any = await postRequest("user/login", payload, setLoading);

				console.log("Login response:", result);

				if (result.error && result.error.includes("verify your email")) {
					setPendingVerificationEmail(email);
					setPendingVerificationUsername(result.user?.username || email.split('@')[0]);
					setVerificationModal(true);
					
					toast.error("Please verify your email before logging in", {
						duration: 4000,
						position: "top-center",
						icon: '📧'
					});
					return;
				}

				if (result.token && result.user) {
					console.log("Login successful, storing token");
					
					setShow(false);
					setToken(result.token);
					
					localStorage.setItem("token", result.token);
					localStorage.setItem("loggedIn", "true");
					localStorage.setItem("user", JSON.stringify(result.user));

					toast.success("Login successful! 🎉", {
						duration: 3000,
						position: "top-center",
						icon: '🎬'
					});

					setTimeout(() => {
						window.location.reload();
					}, 1000);
				}
			} catch (error: any) {
				setLoading(false);
				
				console.error("Login error details:", {
					status: error.response?.status,
					data: error.response?.data,
					message: error.message
				});

				const errorMessage = error?.response?.data?.error || 
									error?.response?.data?.message || 
									"Login failed. Please try again.";
				
				if (error?.response?.status === 401) {
					if (error.response?.data?.isVerified === false) {
						// Email not verified
						setPendingVerificationEmail(email);
						setVerificationModal(true);
						
						toast.error("Please verify your email before logging in", {
							duration: 4000,
							position: "top-center",
							icon: '📧'
						});
					} else {
						// Invalid credentials
						toast.error("Invalid email or password", {
							duration: 4000,
							position: "top-center",
							icon: '🔒'
						});
					}
				} else {
					toast.error(errorMessage, {
						duration: 4000,
						position: "top-center",
					});
				}
			}
		};

		// Resend verification email
		const resendVerificationEmail = async () => {
			try {
				setIsResending(true);
				const response = await axios.post("https://wecinema.co/api/user/resend-verification", {
					email: pendingVerificationEmail,
				});
				
				toast.success("Verification email sent! 📧", {
					duration: 4000,
					position: "top-center",
					icon: '✅'
				});
				
				// Close modal after 2 seconds
				setTimeout(() => {
					setVerificationModal(false);
				}, 2000);
			} catch (error: any) {
				const errorMsg = error.response?.data?.error || "Failed to resend email";
				toast.error(errorMsg, {
					duration: 4000,
					position: "top-center",
				});
			} finally {
				setIsResending(false);
			}
		};

		// Handle registration
		const handleRegisterSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			setFormErrors({});
			
			// Validate form
			const errors: Record<string, string> = {};
			
			if (!username || username.trim().length < 3) {
				errors.username = "Username must be at least 3 characters";
			}
			
			if (!email.trim()) {
				errors.email = "Email is required";
			} else if (!validateEmail(email)) {
				errors.email = "Please enter a valid email address";
			}
			
			const passwordError = validatePassword(password);
			if (passwordError) {
				errors.password = passwordError;
			}
			
			const ageError = validateAge(dob);
			if (ageError) {
				errors.dob = ageError;
			}
			
			if (Object.keys(errors).length > 0) {
				setFormErrors(errors);
				toast.error("Please fix the errors in the form", {
					duration: 4000,
				});
				return;
			}

			try {
				setLoading(true);

				const payload = {
					email: email.trim().toLowerCase(),
					password: password.trim(),
					username: username.trim(),
					dob: moment(dob).format("MMM DD, YYYY"),
				};

				const result = await postRequest("user/register", payload, setLoading);
				
				if (result.message && result.message.includes("verification email sent")) {
					setPendingVerificationEmail(email);
					setPendingVerificationUsername(username);
					setSuccessModal(true);
					
					toast.success("Registration successful! Check your email to verify your account.", {
						duration: 5000,
						position: "top-center",
						icon: '🎉'
					});
				}

				setLoading(false);
				setShow(false);
			} catch (error: any) {
				setLoading(false);
				const errorMessage = error.response?.data?.error || "Registration failed. Please try again.";
				
				if (error.response?.status === 400 && errorMessage.includes("already exists")) {
					toast.error("An account with this email already exists", {
						duration: 4000,
						position: "top-center",
					});
				} else {
					toast.error(errorMessage, {
						duration: 4000,
						position: "top-center",
					});
				}
			}
		};

		// Handle logout
		const handleLogoutSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			localStorage.removeItem("token");
			localStorage.removeItem("loggedIn");
			localStorage.removeItem("user");
			
			toast.success("Logged out successfully", {
				duration: 2000,
				position: "top-center",
				icon: '👋'
			});
			
			setShow(false);
			if (onClose) onClose();
			
			setTimeout(() => {
				window.location.reload();
			}, 500);
		};

		// Handle terms acceptance
		const handleAcceptTerms = () => {
			localStorage.setItem("acceptedTerms", "true");
			setShowTermsPopup(false);
		};

		// Handle modal close
		const handleClose = () => {
			setShow(false);
			if (onClose) onClose();
		};

		// Video upload handlers
		const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				// Check file size (max 500MB)
				if (file.size > 500 * 1024 * 1024) {
					toast.error("File size must be less than 500MB");
					return;
				}
				
				// Check file type
				if (!file.type.startsWith('video/')) {
					toast.error("Please select a video file");
					return;
				}
				
				setSelectedFile(file);
			}
		};

		const handleThumbnailClick = () => {
			fileInputRef?.current.click();
		};

		const handleProcedureContentChange = (content: any) => {
			setDescription(content);
		};

		const handleVideoUploadSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			
			if (!decodedToken?.userId) {
				toast.error("You must log in first before uploading!", {
					duration: 4000,
				});
				return;
			}

			// Validation
			if (!title.trim()) {
				toast.error("Please enter a title for your video");
				return;
			}

			if (!selectedFile) {
				toast.error("Please select a video file");
				return;
			}

			try {
				const formData = new FormData();
				setLoading(true);
				formData.append("file", selectedFile);
				formData.append("upload_preset", "zoahguuq");
				
				const uploadResult = await axios.post(
					"https://api.cloudinary.com/v1_1/folajimidev/video/upload",
					formData
				);
				
				const payload = {
					title,
					description,
					genre: selectedItems.map((category: any) => category.value),
					theme: selectItems.map((category: any) => category.value),
					rating,
					file: uploadResult.data["secure_url"],
					author: decodedToken.userId,
					hasPaid,
					isForSale: sellVideo,
				};
				
				await postRequest("video/create", payload, setLoading);
				setShow(false);
				
				toast.success("Video uploaded successfully! 🎬", {
					duration: 3000,
					position: "top-center",
				});
			} catch (error) {
				setLoading(false);
				console.error("Upload error:", error);
				toast.error("Failed to upload video. Please try again.", {
					duration: 4000,
				});
			}
		};

		const handleScriptUploadSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			
			if (!decodedToken?.userId) {
				toast.error("You must log in first before uploading!", {
					duration: 4000,
				});
				return;
			}

			if (!title.trim()) {
				toast.error("Please enter a title for your script");
				return;
			}

			if (!description.trim() || description === '<p><br></p>') {
				toast.error("Please write your script content");
				return;
			}

			try {
				setLoading(true);
				const payload = {
					title,
					script: description,
					genre: selectedItems.map((category: any) => category.value),
					theme: selectItems.map((category: any) => category.value),
					author: decodedToken.userId,
				};
				
				await postRequest("video/scripts", payload, setLoading);
				setShow(false);
				
				toast.success("Script uploaded successfully! 📝", {
					duration: 3000,
					position: "top-center",
				});
			} catch (error) {
				setLoading(false);
				toast.error("Failed to upload script. Please try again.", {
					duration: 4000,
				});
			}
		};

		// Categories
		const CAT = [
			{ value: "Action", label: "Action" },
			{ value: "Adventure", label: "Adventure" },
			{ value: "Comedy", label: "Comedy" },
			{ value: "Documentary", label: "Documentary" },
			{ value: "Drama", label: "Drama" },
			{ value: "Horror", label: "Horror" },
			{ value: "Mystery", label: "Mystery" },
			{ value: "Romance", label: "Romance" },
			{ value: "Thriller", label: "Thriller" },
		];

		const CATS = [
			{ value: "Coming-of-age story", label: "Coming-of-age story" },
			{ value: "Good versus evil", label: "Good versus evil" },
			{ value: "Love", label: "Love" },
			{ value: "Redemption", label: "Redemption" },
			{ value: "Family", label: "Family" },
			{ value: "Death", label: "Death" },
			{ value: "Oppression", label: "Oppression" },
			{ value: "Survival", label: "Survival" },
			{ value: "Revenge", label: "Revenge" },
			{ value: "Justice", label: "Justice" },
			{ value: "War", label: "War" },
			{ value: "Bravery", label: "Bravery" },
			{ value: "Freedom", label: "Freedom" },
			{ value: "Friendship", label: "Friendship" },
			{ value: "Isolation", label: "Isolation" },
			{ value: "Peace", label: "Peace" },
			{ value: "Perseverance", label: "Perseverance" },
		];

		const formats = [
			"header", "height", "bold", "italic", "underline", "strike", "blockquote",
			"list", "color", "bullet", "indent", "link", "image", "align", "size",
		];

		const modules = {
			toolbar: [
				[{ size: ["small", false, "large", "huge"] }],
				["bold", "italic", "underline", "strike", "blockquote"],
				[{ list: "ordered" }, { list: "bullet" }],
				["link", "image"],
				[{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }, { align: [] }],
				[{
					color: [
						"#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc",
						"#9933ff", "#ffffff", "#facccc", "#ffebcc", "#ffffcc", "#cce8cc",
						"#cce0f5", "#ebd6ff", "#bbbbbb", "#f06666", "#ffc266", "#ffff66",
						"#66b966", "#66a3e0", "#c285ff", "#888888", "#a10000", "#b26b00",
						"#b2b200", "#006100", "#0047b2", "#6b24b2", "#444444", "#5c0000",
						"#663d00", "#666600", "#003700", "#002966", "#3d1466", "custom-color",
					],
				}],
			],
		};

		return (
			<AnimatePresence>
				{isShow && show && (
					<>
						<div className={`fixed inset-0 z-50 flex justify-center items-start overflow-y-auto py-4 ${className || ""}`}>
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="fixed inset-0 bg-gradient-to-br from-white via-yellow-100 to-yellow-300 opacity-90 backdrop-blur-md"
								onClick={handleClose}
							/>
							
							{type === "script" && (
								<div className="relative z-50 w-full flex justify-center items-start py-8 px-4">
									<motion.div
										initial={{ opacity: 0, scale: 0.95, y: 20 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: 20 }}
										transition={{ type: "spring", damping: 25, stiffness: 300 }}
										className="w-full max-w-2xl bg-white border-2 border-yellow-300 backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8 max-h-[90vh] overflow-y-auto"
									>
										<header className="flex justify-between items-center mb-4 md:mb-6">
											<div className="flex items-center gap-2 md:gap-3">
												<div className="p-2 bg-yellow-100 rounded-lg">
													<FaFileAlt className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
												</div>
												<h2 className="text-xl md:text-2xl font-bold text-gray-800">Upload Script</h2>
											</div>
											<button
												onClick={handleClose}
												className="cursor-pointer text-gray-600 hover:text-red-500 transition duration-200"
											>
												<FaTimes className="w-5 h-5 md:w-6 md:h-6" />
											</button>
										</header>

										<form onSubmit={handleScriptUploadSubmit} className="space-y-4 md:space-y-6">
											<div>
												<label className="block text-gray-700 text-sm font-medium mb-2">Title *</label>
												<input
													className="w-full px-3 md:px-4 py-2 md:py-3 rounded-xl border-2 border-yellow-200 bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm md:text-base"
													placeholder="Enter script title"
													type="text"
													value={title}
													onChange={(e) => setTitle(e.target.value)}
													required
												/>
											</div>

											<div>
												<label className="block text-gray-700 text-sm font-medium mb-2">Script Content *</label>
												<div className="rounded-xl border-2 border-yellow-200 bg-white/80 overflow-hidden">
													<ReactQuill
														theme="snow"
														modules={modules}
														formats={formats}
														placeholder="Write your script here..."
														onChange={handleProcedureContentChange}
														className="rounded-xl text-sm md:text-base"
														style={{ height: "150px", minHeight: "150px" }}
													/>
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
												<div>
													<label className="block text-gray-700 text-sm font-medium mb-2">Genre(s) *</label>
													<Select
														values={selectedItems}
														options={CAT}
														placeholder="Select genre(s)..."
														required
														multi
														className="rounded-xl border-2 border-yellow-200 bg-white/80 text-sm md:text-base"
														onChange={(values: any) => setSelectedItems(values)}
													/>
												</div>
												
												<div>
													<label className="block text-gray-700 text-sm font-medium mb-2">Theme(s)</label>
													<Select
														values={selectItems}
														options={CATS}
														placeholder="Select theme(s)..."
														multi
														className="rounded-xl border-2 border-yellow-200 bg-white/80 text-sm md:text-base"
														onChange={(values: any) => setSelectItems(values)}
													/>
												</div>
											</div>

											{hasPaid && (
												<div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-yellow-50 rounded-xl border border-yellow-200">
													<input
														type="checkbox"
														id="forSale"
														checked={sellVideo}
														onChange={(e) => setSellVideo(e.target.checked)}
														className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 rounded"
													/>
													<label htmlFor="forSale" className="text-gray-700 font-medium text-sm md:text-base">
														Make this script available for sale
													</label>
												</div>
											)}

											<button
												type="submit"
												disabled={loading}
												className={`w-full py-3 md:py-4 rounded-xl font-bold text-white transition-all duration-300 text-sm md:text-base ${
													loading
														? "bg-yellow-300 cursor-not-allowed"
														: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
												}`}
											>
												{loading ? (
													<div className="flex items-center justify-center gap-2 md:gap-3">
														<Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
														<span>Uploading Script...</span>
													</div>
												) : (
													<div className="flex items-center justify-center gap-2 md:gap-3">
														<Upload className="w-4 h-4 md:w-5 md:h-5" />
														<span>Upload Script</span>
													</div>
												)}
											</button>
										</form>
									</motion.div>
								</div>
							)}

							{type === "video" && (
								<div className="relative z-50 w-full flex justify-center items-start py-8 px-4">
									<motion.div
										initial={{ opacity: 0, scale: 0.95, y: 20 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: 20 }}
										transition={{ type: "spring", damping: 25, stiffness: 300 }}
										className="w-full max-w-2xl bg-white border-2 border-yellow-300 backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8 max-h-[90vh] overflow-y-auto"
									>
										<header className="flex justify-between items-center mb-4 md:mb-6">
											<div className="flex items-center gap-2 md:gap-3">
												<div className="p-2 bg-yellow-100 rounded-lg">
													<FaVideo className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
												</div>
												<h2 className="text-xl md:text-2xl font-bold text-gray-800">Upload Video</h2>
											</div>
											<button
												onClick={handleClose}
												className="cursor-pointer text-gray-600 hover:text-red-500 transition duration-200"
											>
												<FaTimes className="w-5 h-5 md:w-6 md:h-6" />
											</button>
										</header>

										<form onSubmit={handleVideoUploadSubmit} className="space-y-4 md:space-y-6">
											<div>
												<label className="block text-gray-700 text-sm font-medium mb-2">Title *</label>
												<input
													className="w-full px-3 md:px-4 py-2 md:py-3 rounded-xl border-2 border-yellow-200 bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm md:text-base"
													placeholder="Enter video title"
													type="text"
													value={title}
													onChange={(e) => setTitle(e.target.value)}
													required
												/>
											</div>

											<div>
												<label className="block text-gray-700 text-sm font-medium mb-2">Description</label>
												<textarea
													className="w-full px-3 md:px-4 py-2 md:py-3 rounded-xl border-2 border-yellow-200 bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition resize-none text-sm md:text-base"
													placeholder="Describe your video..."
													rows={3}
													value={description}
													onChange={(e) => setDescription(e.target.value)}
												/>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
												<div>
													<label className="block text-gray-700 text-sm font-medium mb-2">Genre(s) *</label>
													<Select
														values={selectedItems}
														options={CAT}
														placeholder="Select genre(s)..."
														required
														multi
														className="rounded-xl border-2 border-yellow-200 bg-white/80 text-sm md:text-base"
														onChange={(values: any) => setSelectedItems(values)}
													/>
												</div>
												
												<div>
													<label className="block text-gray-700 text-sm font-medium mb-2">Theme(s)</label>
													<Select
														values={selectItems}
														options={CATS}
														placeholder="Select theme(s)..."
														multi
														className="rounded-xl border-2 border-yellow-200 bg-white/80 text-sm md:text-base"
														onChange={(values: any) => setSelectItems(values)}
													/>
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
												<div>
													<label className="block text-gray-700 text-sm font-medium mb-2">Rating *</label>
													<select
														value={rating}
														onChange={(e) => setRating(e.target.value)}
														className="w-full px-3 md:px-4 py-2 md:py-3 rounded-xl border-2 border-yellow-200 bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm md:text-base"
														required
													>
														<option value="">Select Rating</option>
														<option value="G">G - General Audience</option>
														<option value="PG">PG - Parental Guidance</option>
														<option value="PG-13">PG-13 - Parents Strongly Cautioned</option>
														<option value="R">R - Restricted</option>
														<option value="X">X - Adults Only</option>
													</select>
												</div>

												<div>
													<label className="block text-gray-700 text-sm font-medium mb-2">Video File *</label>
													<div 
														className="border-2 border-dashed border-yellow-300 rounded-xl p-4 md:p-8 text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition"
														onClick={handleThumbnailClick}
													>
														<input
															type="file"
															accept="video/*"
															className="hidden"
															onChange={handleFileChange}
															ref={fileInputRef}
														/>
														
														{selectedFile ? (
															<div className="space-y-3 md:space-y-4">
																<video
																	src={URL.createObjectURL(selectedFile)}
																	className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg mx-auto"
																	controls
																/>
																<p className="text-green-600 font-medium text-sm md:text-base truncate">{selectedFile.name}</p>
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		setSelectedFile(null);
																	}}
																	className="text-xs md:text-sm text-red-500 hover:text-red-700"
																>
																	Remove file
																</button>
															</div>
														) : (
															<div className="space-y-2 md:space-y-3">
																<div className="w-12 h-12 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
																	<Upload className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
																</div>
																<div>
																	<p className="font-medium text-gray-700 text-sm md:text-base">Click to upload video</p>
																	<p className="text-xs md:text-sm text-gray-500 mt-1">MP4, MOV, AVI up to 500MB</p>
																</div>
															</div>
														)}
													</div>
												</div>
											</div>

											{hasPaid && (
												<div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-yellow-50 rounded-xl border border-yellow-200">
													<input
														type="checkbox"
														id="videoForSale"
														checked={sellVideo}
														onChange={(e) => setSellVideo(e.target.checked)}
														className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 rounded"
													/>
													<label htmlFor="videoForSale" className="text-gray-700 font-medium text-sm md:text-base">
														Make this video available for sale
													</label>
												</div>
											)}

											<button
												type="submit"
												disabled={loading || !selectedFile}
												className={`w-full py-3 md:py-4 rounded-xl font-bold text-white transition-all duration-300 text-sm md:text-base ${
													loading || !selectedFile
														? "bg-yellow-300 cursor-not-allowed"
														: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
												}`}
											>
												{loading ? (
													<div className="flex items-center justify-center gap-2 md:gap-3">
														<Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
														<span>Uploading Video...</span>
													</div>
												) : (
													<div className="flex items-center justify-center gap-2 md:gap-3">
														<Upload className="w-4 h-4 md:w-5 md:h-5" />
														<span>Upload Video</span>
													</div>
												)}
											</button>
										</form>
									</motion.div>
								</div>
							)}

							{type === "login" && (
								<div className="relative z-50 w-full flex justify-center items-start py-8 px-4">
									<motion.div
										initial={{ opacity: 0, scale: 0.95, y: 20 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: 20 }}
										transition={{ type: "spring", damping: 25, stiffness: 300 }}
										className="w-full max-w-md bg-gradient-to-b from-white to-yellow-50 border-2 border-yellow-300 backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8"
									>
										{/* Decorative header */}
										<div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
										
										<div className="flex justify-between items-center mb-4 md:mb-6">
											<div className="flex items-center gap-2 md:gap-3">
												<div className="p-1 md:p-2 bg-yellow-100 rounded-lg">
													<FaEnvelope className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
												</div>
												<h2 className="text-lg md:text-xl font-bold text-gray-800">
													Sign in to <span className="text-yellow-500">Wecinema</span>
												</h2>
											</div>
											<button
												onClick={handleClose}
												className="cursor-pointer text-gray-600 hover:text-red-500 transition duration-200"
											>
												<FaTimes className="w-4 h-4 md:w-5 md:h-5" />
											</button>
										</div>

										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.1 }}
										>
											<h3 className="text-center text-gray-700 text-sm md:text-base mb-4 md:mb-6">
												Welcome Back <span className="text-yellow-500 animate-pulse">👋</span>
											</h3>

											<form onSubmit={handleLoginSubmit} className="space-y-3 md:space-y-4">
												<div className="space-y-1">
													<label className="block text-gray-700 text-xs md:text-sm font-medium">Email Address *</label>
													<div className="relative">
														<FaEnvelope className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-yellow-500 w-3 h-3 md:w-4 md:h-4" />
														<input
															type="email"
															value={email}
															onChange={(e) => setEmail(e.target.value)}
															placeholder="you@example.com"
															className={`w-full pl-8 md:pl-10 pr-3 py-2 rounded-xl border-2 ${
																formErrors.email ? 'border-red-300' : 'border-yellow-200'
															} bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm`}
															required
														/>
													</div>
													{formErrors.email && (
														<p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.email}</p>
													)}
												</div>

												<div className="space-y-1">
													<label className="block text-gray-700 text-xs md:text-sm font-medium">Password *</label>
													<div className="relative">
														<FaLock className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-yellow-500 w-3 h-3 md:w-4 md:h-4" />
														<input
															type="password"
															value={password}
															onChange={(e) => setPassword(e.target.value)}
															placeholder="••••••••"
															className={`w-full pl-8 md:pl-10 pr-3 py-2 rounded-xl border-2 ${
																formErrors.password ? 'border-red-300' : 'border-yellow-200'
															} bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm`}
															required
														/>
													</div>
													{formErrors.password && (
														<p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.password}</p>
													)}
												</div>

												<div className="flex justify-between items-center text-xs">
													<button
														type="button"
														onClick={() => {
															toast.info("Forgot password feature coming soon!", {
																duration: 3000,
															});
														}}
														className="text-yellow-600 hover:text-yellow-800 font-medium transition"
													>
														Forgot password?
													</button>
													<a
														href="/hypemode"
														className="text-yellow-600 hover:text-yellow-800 font-medium transition"
													>
														Hypemode?
													</a>
												</div>

												<motion.button
													whileTap={{ scale: 0.98 }}
													disabled={loading}
													className={`w-full py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-lg text-sm md:text-base ${
														loading
															? "bg-yellow-300 cursor-not-allowed"
															: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 hover:shadow-xl active:scale-[0.98]"
													}`}
												>
													{loading ? (
														<div className="flex items-center justify-center gap-2">
															<Loader2 className="w-4 h-4 animate-spin" />
															<span>Signing in...</span>
														</div>
													) : (
														"Sign in"
													)}
												</motion.button>

												<div className="text-center text-xs text-gray-600 pt-3 border-t border-yellow-100">
													Don't have an account?{" "}
													<button
														type="button"
														onClick={() => {
															setShow(false);
															window.dispatchEvent(new CustomEvent('openPopup', { detail: { type: 'register' } }));
														}}
														className="text-yellow-600 hover:text-yellow-800 font-bold transition"
													>
														Create Account
													</button>
												</div>
											</form>
										</motion.div>
									</motion.div>
								</div>
							)}

							{type === "register" && (
								<div className="relative z-50 w-full flex justify-center items-start py-8 px-4">
									<motion.div
										initial={{ opacity: 0, scale: 0.95, y: 20 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: 20 }}
										transition={{ type: "spring", damping: 25, stiffness: 300 }}
										className="w-full max-w-md bg-gradient-to-b from-white to-yellow-50 border-2 border-yellow-300 backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8 max-h-[85vh] overflow-y-auto"
									>
										{/* Decorative header */}
										<div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
										
										<div className="flex justify-between items-center mb-4 md:mb-6">
											<div className="flex items-center gap-2 md:gap-3">
												<div className="p-1 md:p-2 bg-yellow-100 rounded-lg">
													<FaUser className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
												</div>
												<h2 className="text-lg md:text-xl font-bold text-gray-800">
													Join <span className="text-yellow-500">Wecinema</span>
												</h2>
											</div>
											<button
												onClick={handleClose}
												className="cursor-pointer text-gray-600 hover:text-red-500 transition duration-200"
											>
												<FaTimes className="w-4 h-4 md:w-5 md:h-5" />
											</button>
										</div>

										<form onSubmit={handleRegisterSubmit} className="space-y-3 md:space-y-4">
											<div className="space-y-1">
												<label className="block text-gray-700 text-xs md:text-sm font-medium">Username *</label>
												<div className="relative">
													<FaUser className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-yellow-500 w-3 h-3 md:w-4 md:h-4" />
													<input
														className={`w-full pl-8 md:pl-10 pr-3 py-2 rounded-xl border-2 ${
															formErrors.username ? 'border-red-300' : 'border-yellow-200'
														} bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm`}
														placeholder="Choose a username"
														type="text"
														value={username}
														onChange={(e) => setUsername(e.target.value)}
														required
														minLength={3}
													/>
												</div>
												{formErrors.username && (
													<p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.username}</p>
												)}
											</div>

											<div className="space-y-1">
												<label className="block text-gray-700 text-xs md:text-sm font-medium">Email Address *</label>
												<div className="relative">
													<FaEnvelope className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-yellow-500 w-3 h-3 md:w-4 md:h-4" />
													<input
														className={`w-full pl-8 md:pl-10 pr-3 py-2 rounded-xl border-2 ${
															formErrors.email ? 'border-red-300' : 'border-yellow-200'
														} bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm`}
														placeholder="you@example.com"
														type="email"
														value={email}
														onChange={(e) => setEmail(e.target.value)}
														required
													/>
												</div>
												{formErrors.email && (
													<p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.email}</p>
												)}
											</div>

											<div className="space-y-1">
												<label className="block text-gray-700 text-xs md:text-sm font-medium">Password *</label>
												<div className="relative">
													<FaLock className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-yellow-500 w-3 h-3 md:w-4 md:h-4" />
													<input
														className={`w-full pl-8 md:pl-10 pr-3 py-2 rounded-xl border-2 ${
															formErrors.password ? 'border-red-300' : 'border-yellow-200'
														} bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm`}
														placeholder="Create a password (min. 6 characters)"
														type="password"
														value={password}
														onChange={(e) => setPassword(e.target.value)}
														required
														minLength={6}
													/>
												</div>
												{formErrors.password && (
													<p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.password}</p>
												)}
												<p className="text-xs text-gray-500">Minimum 6 characters</p>
											</div>

											<div className="space-y-1">
												<label className="block text-gray-700 text-xs md:text-sm font-medium">Date of Birth *</label>
												<div className="relative">
													<FaCalendarAlt className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-yellow-500 w-3 h-3 md:w-4 md:h-4" />
													<input
														className={`w-full pl-8 md:pl-10 pr-3 py-2 rounded-xl border-2 ${
															formErrors.dob ? 'border-red-300' : 'border-yellow-200'
														} bg-white/80 text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition text-sm`}
														type="date"
														value={dob}
														onChange={(e) => setDob(e.target.value)}
														required
													/>
												</div>
												{formErrors.dob && (
													<p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.dob}</p>
												)}
												<p className="text-xs text-gray-500">You must be at least 13 years old</p>
											</div>

											<div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
												<input
													type="checkbox"
													id="terms"
													required
													className="w-4 h-4 text-yellow-500 rounded mt-1 flex-shrink-0"
												/>
												<label htmlFor="terms" className="text-xs text-gray-700">
													I agree to the{" "}
													<button
														type="button"
														onClick={() => setShowTermsPopup(true)}
														className="text-yellow-600 hover:text-yellow-800 font-medium underline"
													>
														Terms and Conditions
													</button>
												</label>
											</div>

											<motion.button
												whileTap={{ scale: 0.98 }}
												disabled={loading}
												className={`w-full py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-lg text-sm md:text-base ${
													loading
														? "bg-yellow-300 cursor-not-allowed"
														: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 hover:shadow-xl active:scale-[0.98]"
												}`}
											>
												{loading ? (
													<div className="flex items-center justify-center gap-2">
														<Loader2 className="w-4 h-4 animate-spin" />
														<span>Creating Account...</span>
													</div>
												) : (
													"Create Account"
												)}
											</motion.button>

											<div className="text-center text-xs text-gray-600 pt-3 border-t border-yellow-100">
												Already have an account?{" "}
												<button
													type="button"
													onClick={() => {
														setShow(false);
														window.dispatchEvent(new CustomEvent('openPopup', { detail: { type: 'login' } }));
													}}
													className="text-yellow-600 hover:text-yellow-800 font-bold transition"
												>
													Sign in
												</button>
											</div>
										</form>
									</motion.div>
								</div>
							)}

							{type === "logout" && (
								<div className="relative z-50 w-full flex justify-center items-start py-8 px-4">
									<motion.div
										initial={{ opacity: 0, scale: 0.95, y: 20 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: 20 }}
										transition={{ type: "spring", damping: 25, stiffness: 300 }}
										className="w-full max-w-md bg-gradient-to-b from-white to-red-50 border-2 border-red-200 backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8"
									>
										{/* Decorative header */}
										<div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-400 via-red-500 to-red-400" />
										
										<div className="text-center mb-4 md:mb-6">
											<div className="w-14 h-14 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
												<LogOut className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
											</div>
											<h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">Log Out?</h2>
											<p className="text-gray-600 text-xs md:text-sm">Are you sure you want to log out of your account?</p>
										</div>

										<form onSubmit={handleLogoutSubmit} className="space-y-2 md:space-y-3">
											<div className="grid grid-cols-2 gap-2 md:gap-3">
												<button
													type="button"
													onClick={handleClose}
													className="py-2 md:py-2.5 px-3 md:px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition active:scale-[0.98] text-sm"
												>
													Cancel
												</button>
												<button
													type="submit"
													className="py-2 md:py-2.5 px-3 md:px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition active:scale-[0.98] text-sm"
												>
													Log Out
												</button>
											</div>
										</form>

										<p className="text-center text-xs text-gray-500 mt-3 md:mt-4">
											You'll need to sign in again to access your account.
										</p>
									</motion.div>
								</div>
							)}
						</div>

						{verificationModal && (
							<VerificationModal
								email={pendingVerificationEmail}
								username={pendingVerificationUsername || email.split('@')[0]}
								onResend={resendVerificationEmail}
								onClose={() => setVerificationModal(false)}
								isResending={isResending}
							/>
						)}

						{successModal && (
							<RegistrationSuccessModal
								email={pendingVerificationEmail}
								username={pendingVerificationUsername}
								onClose={() => setSuccessModal(false)}
							/>
						)}

						{showTermsPopup && (
							<TermsAndConditionsPopup onAccept={handleAcceptTerms} />
						)}

						<Toaster />
					</>
				)}
			</AnimatePresence>
		);
	}
);

export default Popup;