import React, { useEffect, useRef, useState } from "react";
import Select from "react-dropdown-select";
import { FaTimes } from "react-icons/fa";
import ReactQuill from "react-quill";
import { postRequest } from "../../api";
import { Itoken, decodeToken } from "../../utilities/helperfFunction";
import moment from "moment";
import axios from "axios";
import '../header/drowpdown.css';

import { motion } from "framer-motion"; // Animation library
import emailjs from "emailjs-com";
import toast from "react-hot-toast";
import { X } from "lucide-react"; // Or use any icon you want
import { FaEnvelope, FaLock } from "react-icons/fa6";
interface IPopupProps {
	type: string | undefined;
	show?: boolean;
	authorized?: boolean;
	width?: string;
	background?: string;
	height?: string;
	className?: string;
}


const Popup: React.FC<IPopupProps> = React.memo(
	({ type, className, background, show }) => {
		const [token, setToken] = useState<string | null>(
			localStorage.getItem("token") || null
		);
		const [decodedToken, setDecodedToken] = useState<Itoken | null>(null);
		const [isShow, setShow] = useState<boolean>(false);
		const [selectedFile, setSelectedFile] = useState<any>(null);
		const [loading, setLoading] = useState<boolean>(false);
		const [username, setUsername] = useState<string>("");
		const [dob, setDob] = useState("");
		const [rating, setRating] = useState<string>("");
		const [email, setEmail] = useState("");
		const [title, setTitle] = useState("");
		const [description, setDescription] = useState("");
		const [password, setPassword] = useState<string>("");
		const [hasPaid, setHasPaid] = useState<boolean>(false);
		const fileInputRef: any = useRef(null);
		const [selectedItems, setSelectedItems] = useState<string[]>([]);
		const [selectItems, setSelectItems] = useState<string[]>([]);
		const [sellVideo, setSellVideo] = useState<boolean>(false); // Track if the user wants to sell the video
		const [successModal, setSuccessModal] = useState(false);
		const [errorModal, setErrorModal] = useState(false);
		
		
		const handleFileChange = (e: any) => {
			const file = e.target.files[0];
			setSelectedFile(file);
			console.log("Selected File:", selectedFile);
		};
		
		const handleProcedureContentChange = (content: any) => {
			setDescription(content);
		};
		
		const handleThumbnailClick = () => {
			fileInputRef?.current.click();
		};
		const showVerificationToast = () => {
			toast.custom((t) => (
			  <div
				className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 px-4 py-3 ${
				  t.visible ? "animate-enter" : "animate-leave"
				}`}
			  >
				<div className="flex-1 w-0">
				  <p className="text-sm font-semibold text-gray-900">
					📩 Verification Email Sent
				  </p>
				  <p className="mt-1 text-sm text-gray-500">
					Please check your inbox to verify your account.
				  </p>
				</div>
				<div className="ml-4 flex-shrink-0 flex items-start">
				  <button
					onClick={() => toast.dismiss(t.id)}
					className="text-gray-400 hover:text-gray-600 transition"
				  >
					<X className="h-5 w-5" />
				  </button>
				</div>
			  </div>
			));
		  };
		useEffect(() => {
			setShow(!!type);
			console.log("This is refreshing");
		}, [type]);
		
		useEffect(() => {
			// Decode token when the component mounts or when the token changes
			const decoded = decodeToken(token);
			setDecodedToken(decoded);
			
			// Check if user has paid
const checkUserPaymentStatus = async () => {
	if (!decoded || !decoded.userId) {
		// User is not logged in, skip payment check
		return;
	}

	try {
		const response = await axios.get(`https://wecinema.co/api/user/payment-status/${decoded.userId}`);
		setHasPaid(response.data.hasPaid);
	} catch (error) {
		console.error("Error checking payment status:", error);
	}
};

checkUserPaymentStatus();

			
			// Clean-up function
			return () => {
				// Clear the decoded token when the component unmounts
				setDecodedToken(null);
			};
		}, [token]);
		
		const handleLoginSubmit = async (e: any) => {
			e.preventDefault();
			try {
			  setLoading(true);
			  const payload = { email, password };
		  
			  const result: any = await postRequest("user/login", payload, setLoading);
		  
			  if (!result.isVerified) {
				setLoading(false);
				alert("Please verify your email before logging in.");
				return;
			  }
		  
			  console.log("Post success:", result);
			  setShow(false);
			  setToken(result.token);
			  localStorage.setItem("token", result.token);
			  localStorage.setItem("loggedIn", "true");
		  
			  setTimeout(() => {
				window.location.reload();
			  }, 1000);
			} catch (error: any) {
			  setLoading(false);
			  if (error?.response?.data?.error) {
				alert(error.response.data.error);
			  } else {
				console.error("Post error:", error);
			  }
			}
		  };
		  
		
		const handleLogoutSubmit = async (e: any) => {
			e.preventDefault();
			localStorage.removeItem("token");
			localStorage.removeItem("loggedIn");
			setTimeout(() => {
				window.location.reload();
			}, 500);
		};
		
		const handleRegisterSubmit = async (e: any) => {
			e.preventDefault();
			try {
			  setLoading(true);
		  
			  const payload = {
				email,
				password,
				username,
				dob: moment(dob, "DD-MM-YYYY").format("MMM DD, YYYY"),
			  };
		  
			  const result = await postRequest("user/register", payload, setLoading);
			  console.log("Register result:", result);
		  
			  const verificationLink = `https://wecinema.co/api/user/verify-email?email=${encodeURIComponent(email)}`;
		  
			  try {
				const emailResult = await emailjs.send(
				  "service_zqol7n4",
				  "template_mdpiipr",
				  {
					to_name: username,
					to_email: email,
					verification_link: verificationLink,
				  },
				  "1r7HTd-O6zTnCC-J-"
				);
		  
				console.log("EmailJS result:", emailResult);
		  
				// ✅ Show your custom modal here
				setSuccessModal(true); // show modal
				setTimeout(() => {
				  setSuccessModal(false); // auto close after 5 seconds (optional)
				  setShow(false); // close registration modal
				}, 5000);
			  } catch (emailError) {
				console.error("EmailJS error:", emailError);
				setErrorModal(true); // or show error message modal
			  }
		  
			} catch (error) {
			  setLoading(false);
			  console.error("Post error:", error);
			  setErrorModal(true);
			}
		  };
		  
		  
		const handleVideoUploadSubmit = async (e: any) => {
			e.preventDefault();
			if (decodedToken?.userId) {
				try {
					const formData = new FormData();
					setLoading(true);
					formData.append("file", selectedFile);
					formData.append("upload_preset", "zoahguuq");
					
					axios
						.post(
							"https://api.cloudinary.com/v1_1/folajimidev/video/upload",
							formData
						)
						.then(async (res: any) => {
							const payload = {
								title,
								description,
								genre: selectedItems.map((category: any) => category.value),
								theme: selectItems.map((category: any) => category.value),
								rating,
								file: res.data["secure_url"],
								author: decodedToken?.userId,
								hasPaid: hasPaid,  // Add hasPaid field to payload
								isForSale: sellVideo, // Include the sell flag
							};
							await postRequest("video/create", payload, setLoading);
							setShow(false);
						});
				} catch (error) {
					setLoading(false);
					console.error("Post error:", error);
				}
			} else {
				toast.error("You must log in first before uploading!");
			}
		};
		
		const handleScriptUploadSubmit = async (e: any) => {
			e.preventDefault();
			if (decodedToken?.userId) {
				try {
					setLoading(true);
					const payload = {
						title,
						script: description,
						genre: selectedItems.map((category: any) => category.value),
						theme: selectItems.map((category: any) => category.value),
						author: decodedToken?.userId,
					};
					await postRequest("video/scripts", payload, setLoading);
					setShow(false);
				} catch (error) {
					setLoading(false);
					console.error("Post error:", error);
				}
			} else {
				toast.error("You must log in first before uploading!");
			}
		};
		
		const CAT: any = [
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
		const CATS: any = [
			{ value: "Coming-of-age story", label: "Coming-of-age story" },
			{ value: "Good versus evil", label: "Good versus evil" },
			{ value: "Love", label: "Love" },
			{ value: "Redemption", label: "Redemption" },
			{ value: "Family", label: "Family" },
			{ value: "Death", label: "Death" },
			{ value: "Opperession", label: "Opperession" },
			{ value: "Survival", label: "Survival" },
			{ value: "Revenge", label: "Revenge" },
			{ value: "Justice", label: "Justice" },
			{ value: "War", label: "War" },
			{ value: "Bravery", label: "Bravery" },
			{ value: "Freedom", label: "Freedom" },
			{ value: "Friendship", label: "Friendship" },
			{ value: "Death", label: "Death" },
			{ value: "Isolation", label: "Isolation" },
			{ value: "Peace", label: "Peace" },
			{ value: "Perseverance", label: "Perseverance" },



		];

		const formats = [
			"header",
			"height",
			"bold",
			"italic",
			"underline",
			"strike",
			"blockquote",
			"list",
			"color",
			"bullet",
			"indent",
			"link",
			"image",
			"align",
			"size",
		];
		
		const modules = {
			toolbar: [
				[{ size: ["small", false, "large", "huge"] }],
				["bold", "italic", "underline", "strike", "blockquote"],
				[{ list: "ordered" }, { list: "bullet" }],
				["link", "image"],
				[
					{ list: "ordered" },
					{ list: "bullet" },
					{ indent: "-1" },
					{ indent: "+1" },
					{ align: [] },
				],
				[
					{
						color: [
							"#000000",
							"#e60000",
							"#ff9900",
							"#ffff00",
							"#008a00",
							"#0066cc",
							"#9933ff",
							"#ffffff",
							"#facccc",
							"#ffebcc",
							"#ffffcc",
							"#cce8cc",
							"#cce0f5",
							"#ebd6ff",
							"#bbbbbb",
							"#f06666",
							"#ffc266",
							"#ffff66",
							"#66b966",
							"#66a3e0",
							"#c285ff",
							"#888888",
							"#a10000",
							"#b26b00",
							"#b2b200",
							 "#006100",
							"#0047b2",
							"#6b24b2",
							"#444444",
							"#5c0000",
							"#663d00",
							"#666600",
							"#003700",
							"#002966",
							"#3d1466",
							"custom-color",
						],
					},
				],
			],
		};

		if (type === "script") {
			return (
				<div
					style={{ background }}
					className={`fixed sm:top-0 z-50 left-0 h-screen w-full flex justify-center items-center ${
						isShow && show ? "visible" : "invisible"
					} ${className}`}
				>
					<div
						className={`fixed top-0 left-0 h-full w-full  ${
							background ?? "bg-black "
						} bg-opacity-90 backdrop-filter backdrop-blur-15 flex items-center justify-center transition-opacity ease-in-out duration-300`}
					>
						<div
							className={`sm:w-2/6 modal min-h-2/6 w-5/6 bg-white rounded-md p-6
              transition-transform transform translate-y-0 ease-in-out relative cursor-pointer shadow-md
              }`}
						>
							<header className="flex gap-4 justify-between items-center">
								<h2>Upload Script</h2>
								<FaTimes onClick={() => setShow(false)} />
							</header>
							<form onSubmit={handleScriptUploadSubmit}>
								<input
									className="rounded-md px-4 py-2 w-full mt-3 border outline-none"
									placeholder="Title"
									type="text"
									value={title}
									onChange={(e: any) => setTitle(e.target.value)}
								/>

								<div
									className="rounded-md  w-full mt-3  outline-none"
									style={{ height: "204px" }}
								>
									<ReactQuill
										theme="snow"
										modules={modules}
										formats={formats}
										placeholder="write your script here...."
										onChange={handleProcedureContentChange}
										style={{ height: "109px", width: "100%" }}
										className="rounded-md"
									></ReactQuill>
								</div>
								<Select
									values={selectedItems}
									options={CAT}
									placeholder="Select gener(s)..."
									required
									multi
									className="rounded-md px-4 py- w-full mt- border outline-none"
									onChange={(values: any) => {
										setSelectedItems(values);
									}}
								/>
								  	<Select
									values={selectItems}
									options={CATS}
									placeholder="Select theme(s).."
									required
									multi
									className="rounded-md px-4 py-2 w-full mt-3 border outline-none"
									onChange={(values: any) => {
										setSelectItems(values);
									}}
								/>
									{hasPaid && (
									<div className="my-4">
										<label>
											<input
												type="checkbox"
												checked={sellVideo}
												onChange={(e) => setSellVideo(e.target.checked)}
											/>{" "}
											For Sale
										</label>
									</div>
								)}
								<button
									disabled={loading}
									className="rounded-md px-4 py-2 w-full my-3 bg-blue-500 text-white"
								>
									Upload
								</button>
							</form>
						</div>
					</div>
				</div>
			);
		}
	


if (type === "login") {
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center items-center ${
        isShow && show ? "visible" : "invisible"
      } ${className}`}
    >
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-white via-yellow-100 to-yellow-300 opacity-90 backdrop-blur-md transition-all duration-300" />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
         className="relative z-50 w-[90%] max-w-md sm:w-2/5 bg-white border border-yellow-300 rounded-2xl shadow-2xl p-8"
>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Sign in to <span className="text-yellow-500">Wecinema</span></h2>
          <FaTimes
            size={18}
            onClick={() => setShow(false)}
            className="cursor-pointer text-gray-600 hover:text-red-500 transition duration-200"
          />
        </div>

        {/* Form Body */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-center text-gray-700 text-lg mb-6">Welcome Back 👋</h3>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Email */}
            <div className="relative">
              <label className="block text-gray-700 text-sm mb-1">Email</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-3.5 text-yellow-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/60 text-gray-900 border border-yellow-200 focus:ring-2 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <label className="block text-gray-700 text-sm mb-1">Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-3.5 text-yellow-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/60 text-gray-900 border border-yellow-200 focus:ring-2 focus:ring-yellow-400 outline-none transition placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Sign-in Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className={`w-full py-3 mt-2 rounded-lg font-semibold text-white transition-all duration-300 text-lg shadow-md ${
                loading
                  ? "bg-yellow-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-600 hover:to-yellow-500"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="animate-spin border-2 border-t-transparent border-white rounded-full w-5 h-5"></span>
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </motion.button>

            {/* Links */}
            <div className="flex justify-between items-center text-sm mt-4 text-gray-600">
              <a href="#" className="hover:text-yellow-500 transition">Forgot password?</a>
              <a href="/hypemode" className="hover:text-yellow-500 transition">Hypemode?</a>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              New here? <a href="/signup" className="text-yellow-500 hover:underline">Create an account</a>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}


		if (type === "video") {
			return (
				<div
					style={{ background }}
					className={`fixed sm:top-0 z-50 left-0 sm:h-screen w-full flex justify-center items-center ${
						isShow && show ? "visible" : "invisible"
					} ${className}`}
				>
					<div
						className={`fixed top-0 left-0 h-full w-full ${
							background ?? "bg-black"
						} bg-opacity-90 backdrop-filter backdrop-blur-15 flex items-center justify-center transition-opacity ease-in-out duration-300`}
					>
						<div
							className={`sm:w-2/6 modal min-h-2/6 w-5/6 bg-white rounded-md p-6 transition-transform transform translate-y-0 ease-in-out relative cursor-pointer shadow-md`}
						>
							<header className="flex gap-4 justify-between items-center">
								<h2>Upload Video</h2>
								<FaTimes onClick={() => setShow(false)} />
							</header>
							<form onSubmit={handleVideoUploadSubmit}>
								{/* Video details form */}
								<input
									className="rounded-md px-4 py-2 w-full mt-3 border outline-none"
									placeholder="Title"
									type="text"
									value={title}
									onChange={(e: any) => setTitle(e.target.value)}
								/>
								<textarea
									className="rounded-md px-4 py-2 w-full mt-3 border outline-none"
									placeholder="Description..."
									rows={5}
									value={description}
									onChange={(e: any) => setDescription(e.target.value)}
								/>
								<Select
									values={selectedItems}
									options={CAT}
									placeholder="Select genre(s).."
									required
									multi
									className="rounded-md px-4 py-2 w-full mt-3 border outline-none"
									onChange={(values: any) => {
										setSelectedItems(values);
									}}
								/>
								<Select
									values={selectItems}
									options={CATS}
									placeholder="Select theme(s).."
									required
									multi
									className="rounded-md px-4 py-2 w-full mt-3 border outline-none"
									onChange={(values: any) => {
										setSelectItems(values);
									}}
								/>
								<div>
									<select
										id="rating"
										required
										value={rating}
										onChange={(e) => setRating(e.target.value)}
										className="rounded-md px-4 py-2 w-full mt-3 border outline-none"
									>
										<option value="">Select Rating</option>
										<option value="p">G</option>
										<option value="pg">PG</option>
										<option value="pg-13">PG-13</option>
										<option value="R">R</option>
										<option value="X">X</option>
									</select>
								</div>

								{/* Video upload */}
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										padding: "5px",
										border: "1px solid #ccc",
										borderRadius: "8px",
										maxWidth: "500px",
										margin: "auto",
										marginTop: "10px",
									}}
								>
									<div className="relative">
										<input
											type="file"
											accept="video/*"
											className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
											onChange={handleFileChange}
											ref={fileInputRef}
										/>
										<div
											className="bg-gray-100 p-4 rounded-md mt-5 cursor-pointer"
											onClick={handleThumbnailClick}
										>
											{selectedFile ? (
												<video
													src={URL.createObjectURL(selectedFile)}
													height={100}
													width={100}
													className="object-cover"
												/>
											) : (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-6 w-6 text-gray-500"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M3 7h18M3 12h18m-9 5h9"
													/>
												</svg>
											)}
										</div>
									</div>
								</div>

								{/* Conditionally render the sell button for Hype Mode users */}
								{hasPaid && (
									<div className="my-4">
										<label>
											<input
												type="checkbox"
												checked={sellVideo}
												onChange={(e) => setSellVideo(e.target.checked)}
											/>{" "}
											For Sale
										</label>
									</div>
								)}

								<button
									type="submit"
									disabled={loading}
									className="bg-blue-500 hover:bg-blue-600 text-white font-semibold mt-5 py-2 px-4 rounded-md"
								>
									{loading ? "Uploading..." : "Upload Video"}
								</button>
							</form>
						</div>
					</div>
				</div>
			);
		} 
	
		if (type === "register") {
			return (
				
				<div
					style={{ background }}
					className={`fixed sm:top-0 z-50 left-0 sm:h-screen w-full flex justify-center items-center ${
						isShow && show ? "visible" : "invisible"
					} ${className}`}
				>
					<div
						className={`fixed top-0 left-0 h-full w-full  ${
							background ?? "bg-black "
						} bg-opacity-90 backdrop-filter backdrop-blur-15 flex items-center justify-center transition-opacity ease-in-out duration-300`}
					>
						<div
							className={`sm:w-2/6 modal min-h-2/6 w-5/6 bg-white rounded-md p-6
              transition-transform transform translate-y-0 ease-in-out relative cursor-pointer shadow-md
              }`}
						>
						
						<motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }} // Instant close effect
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto mt-10 p-8 bg-white shadow-2xl rounded-2xl border border-gray-200"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-700">Sign up to Wecinema</h2>
        <FaTimes
          className="text-gray-500 cursor-pointer hover:text-red-500 transition-all duration-100"
          onClick={() => setShow(false)} // Close instantly
        />
      </div>

      {/* Form */}
      <form onSubmit={handleRegisterSubmit} className="space-y-5">
        <input
          className="rounded-lg px-4 py-3 w-full border border-gray-300 focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition-all duration-300"
          placeholder="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="rounded-lg px-4 py-3 w-full border border-gray-300 focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition-all duration-300"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-lg px-4 py-3 w-full border border-gray-300 focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition-all duration-300"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="rounded-lg px-4 py-3 w-full border border-gray-300 focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition-all duration-300"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className={`w-full mt-4 py-3 rounded-lg text-white font-semibold text-lg transition-all duration-300 ${
            loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Signing up..." : "Sign up"}
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-3">
          <a href="#" className="text-sm text-gray-500 hover:text-blue-500">
            Already have an account?
          </a>
          <a href="/hypemode" className="text-sm text-gray-500 hover:text-blue-500">
            Hypemode?
          </a>
        </div>
      </form>
	  {successModal && (
  <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-50 z-50">
    <div className="bg-white p-6 rounded shadow-lg text-center">
      <h2 className="text-green-600 text-xl font-semibold">✅ Registration Successful!</h2>
      <p className="mt-2">A verification email has been sent to <strong>{email}</strong>.</p>
    </div>
  </div>
)}

{errorModal && (
  <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-50 z-50">
    <div className="bg-white p-6 rounded shadow-lg text-center">
      <h2 className="text-red-600 text-xl font-semibold">❌ Something went wrong!</h2>
      <p className="mt-2">Please try again later.</p>
    </div>
  </div>
)}

    </motion.div>
						</div>
					</div>
				</div>
			);
		}
		if (type === "logout") {
			return (
				<div
					style={{ background }}
					className={`fixed sm:top-0 z-50 left-0 sm:h-screen w-full flex justify-center items-center ${
						isShow && show ? "visible" : "invisible"
					} ${className}`}
				>
					<div
						className={`fixed top-0 left-0 h-full w-full  ${
							background ?? "bg-black "
						} bg-opacity-90 backdrop-filter backdrop-blur-15 flex items-center justify-center transition-opacity ease-in-out duration-300`}
					>
						<div
							className={`sm:w-2/6 modal min-h-2/6 w-5/6 bg-white rounded-md p-6
              transition-transform transform translate-y-0 ease-in-out relative cursor-pointer shadow-md
              }`}
						>
							<header className="flex gap-4 justify-between items-center my-3">
								<h2>Are you sure you want to log Out?</h2>
							</header>
							<form onSubmit={handleLogoutSubmit} className="flex gap-2">
								<button
									type="button"
									className="rounded-md px-4 py-2 w-full my-3 bg-white 500"
									onClick={() => {
										setShow(false);
									}}
								>
									No
								</button>
								<button className="rounded-md px-4 py-2 w-full my-3 bg-blue-500 text-white">
									Yes
								</button>
							</form>
						</div>
					</div>
				</div>
			);
		}
		if (type === "") {
			return <div>Hello</div>;
		}
	}
);
Popup.defaultProps = {
	background: "linear-gradient(to right, #ffd700, #ffff00)",
	type: "",
};

export default Popup;
