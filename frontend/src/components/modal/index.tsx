import React, { useEffect, useRef, useState } from "react";
import Select from "react-dropdown-select";
import { FaTimes } from "react-icons/fa";
import ReactQuill from "react-quill";
import { postRequest } from "../../api";
import { Itoken, decodeToken } from "../../utilities/helperfFunction";
import moment from "moment";
import axios from "axios";
import '../header/drowpdown.css';

import { motion, AnimatePresence } from "framer-motion";
import emailjs from "emailjs-com";
import toast from "react-hot-toast";
import { X } from "lucide-react";

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

const Popup: React.FC<IPopupProps> = React.memo(
  ({ type, className, background, show, onClose }) => {
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
    const [sellVideo, setSellVideo] = useState<boolean>(false);
    const [successModal, setSuccessModal] = useState(false);
    const [errorModal, setErrorModal] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

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
      const decoded = decodeToken(token);
      setDecodedToken(decoded);

      const checkUserPaymentStatus = async () => {
        if (!decoded || !decoded.userId) {
          return;
        }

        try {
          const response = await axios.get(
            `https://wecinema.co/api/user/payment-status/${decoded.userId}`
          );
          setHasPaid(response.data.hasPaid);
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      };

      checkUserPaymentStatus();

      return () => {
        setDecodedToken(null);
      };
    }, [token]);

    // Close when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
          handleClose();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClose = () => {
      setShow(false);
      if (onClose) onClose();
    };

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

        const verificationLink = `https://wecinema.co/api/user/verify-email?email=${encodeURIComponent(
          email
        )}`;

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

          setSuccessModal(true);
          setTimeout(() => {
            setSuccessModal(false);
            setShow(false);
          }, 5000);
        } catch (emailError) {
          console.error("EmailJS error:", emailError);
          setErrorModal(true);
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
                hasPaid: hasPaid,
                isForSale: sellVideo,
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

    const renderPopupContent = () => {
      if (type === "script") {
        return (
          <div
            className={`sm:w-2/6 modal min-h-2/6 w-5/6 bg-white rounded-2xl p-6 relative shadow-2xl`}
          >
            <header className="flex gap-4 justify-between items-center">
              <h2 className="text-xl font-bold">Upload Script</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </header>
            <form onSubmit={handleScriptUploadSubmit}>
              <input
                className="rounded-lg px-4 py-2 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                placeholder="Title"
                type="text"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
              />

              <div className="rounded-lg w-full mt-3 outline-none" style={{ height: "204px" }}>
                <ReactQuill
                  theme="snow"
                  modules={modules}
                  formats={formats}
                  placeholder="write your script here...."
                  onChange={handleProcedureContentChange}
                  style={{ height: "109px", width: "100%" }}
                  className="rounded-lg"
                ></ReactQuill>
              </div>
              <Select
                values={selectedItems}
                options={CAT}
                placeholder="Select gener(s)..."
                required
                multi
                className="rounded-lg px-4 py-2 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
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
                className="rounded-lg px-4 py-2 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                onChange={(values: any) => {
                  setSelectItems(values);
                }}
              />
              {hasPaid && (
                <div className="my-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={sellVideo}
                    onChange={(e) => setSellVideo(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">For Sale</label>
                </div>
              )}
              <button
                disabled={loading}
                className={`w-full mt-4 py-3 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                  loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        );
      }

      if (type === "login") {
        return (
          <div
            ref={popupRef}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Sign in to Wecinema</h2>
                <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                    loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        // You would change the type to "register" here
                        // For example: setType("register")
                        handleClose();
                      }}
                      className="text-blue-600 font-medium hover:text-blue-500 transition-colors duration-200"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        );
      }

      if (type === "video") {
        return (
          <div
            className={`sm:w-2/6 modal min-h-2/6 w-5/6 bg-white rounded-2xl p-6 relative shadow-2xl`}
          >
            <header className="flex gap-4 justify-between items-center">
              <h2 className="text-xl font-bold">Upload Video</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </header>
            <form onSubmit={handleVideoUploadSubmit}>
              <input
                className="rounded-lg px-4 py-3 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                placeholder="Title"
                type="text"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
              />
              <textarea
                className="rounded-lg px-4 py-3 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
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
                className="rounded-lg px-4 py-2 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
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
                className="rounded-lg px-4 py-2 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
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
                  className="rounded-lg px-4 py-3 w-full mt-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                >
                  <option value="">Select Rating</option>
                  <option value="p">G</option>
                  <option value="pg">PG</option>
                  <option value="pg-13">PG-13</option>
                  <option value="R">R</option>
                  <option value="X">X</option>
                </select>
              </div>

              <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors duration-200">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
                <div onClick={handleThumbnailClick} className="space-y-2">
                  {selectedFile ? (
                    <video
                      src={URL.createObjectURL(selectedFile)}
                      className="w-full h-32 object-cover rounded-md"
                      controls
                    />
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">MP4, MOV, AVI up to 100MB</p>
                    </>
                  )}
                </div>
              </div>

              {hasPaid && (
                <div className="my-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={sellVideo}
                    onChange={(e) => setSellVideo(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">For Sale</label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-4 py-3 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                  loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Uploading..." : "Upload Video"}
              </button>
            </form>
          </div>
        );
      }

      if (type === "register") {
        return (
          <div
            ref={popupRef}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create your account</h2>
                <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                    placeholder="Choose a username"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 appearance-none"
                  />
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="font-medium text-gray-700">
                      I agree to the{" "}
                      <a href="#" className="text-blue-600 hover:text-blue-500">
                        Terms
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-blue-600 hover:text-blue-500">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                    loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    "Sign up"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      // You would change the type to "login" here
                      // For example: setType("login")
                      handleClose();
                    }}
                    className="text-blue-600 font-medium hover:text-blue-500 transition-colors duration-200"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        );
      }

      if (type === "logout") {
        return (
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <header className="flex gap-4 justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Are you sure you want to log out?</h2>
                <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </header>
              <form onSubmit={handleLogoutSubmit} className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <AnimatePresence>
        {isShow && show && (
          <div className="fixed inset-0 z-[1000] overflow-y-auto">
            {/* Transparent mirror background with blur and reflection effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md backdrop-contrast-75"
              style={{
                background: `
                  linear-gradient(
                    to bottom right,
                    rgba(255, 255, 255, 0.1),
                    rgba(255, 255, 255, 0.05)
                  ),
                  url('data:image/svg+xml;base64,PHY3N2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSJmIj48ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIxMCIvPjwvZmlsdGVyPjwvc3ZnPg==')
                `,
              }}
            />

            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative transform overflow-hidden rounded-2xl text-left align-middle shadow-xl transition-all w-full max-w-md"
              >
                {renderPopupContent()}
              </motion.div>
            </div>

            {/* Success and Error Modals */}
            <AnimatePresence>
              {successModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[1001] flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-black/50"></div>
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="relative bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto"
                  >
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <svg
                          className="h-6 w-6 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Registration Successful!
                      </h3>
                      <p className="text-sm text-gray-500">
                        A verification email has been sent to <strong>{email}</strong>.
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {errorModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[1001] flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-black/50"></div>
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="relative bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto"
                  >
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg
                          className="h-6 w-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Something went wrong!
                      </h3>
                      <p className="text-sm text-gray-500">
                        Please try again later.
                      </p>
                      <div className="mt-4">
                        <button
                          onClick={() => setErrorModal(false)}
                          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                        >
                          Got it
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

Popup.defaultProps = {
  background: "linear-gradient(to right, #ffd700, #ffff00)",
  type: "",
};

export default Popup;