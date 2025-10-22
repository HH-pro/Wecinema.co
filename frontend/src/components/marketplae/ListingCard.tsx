import React, { useState, useEffect } from "react";
import { Listing } from "../../types/marketplace";
import {
  FiPlay,
  FiImage,
  FiTag,
  FiX,
} from "react-icons/fi";
import { decodeToken } from "../../utilities/helperfFunction";
import { toast } from "react-toastify";

interface ListingCardProps {
  listing: Listing;
  onMakeOffer: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onMakeOffer }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const token = localStorage.getItem("token") || null;

  useEffect(() => {
    if (token) {
      try {
        const decodedUser = decodeToken(token);
        setCurrentUser(decodedUser);
      } catch (error) {
        console.error("Error decoding token:", error);
        localStorage.removeItem("token");
      }
    }
  }, [token]);

  const isVideo = (url: string) =>
    url?.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i);

  const firstMedia =
    listing.mediaUrls && listing.mediaUrls.length > 0
      ? listing.mediaUrls[0]
      : null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);

  const getTypeLabel = (type: string) => {
    const labels = {
      for_sale: "For Sale",
      licensing: "Licensing",
      adaptation_rights: "Adaptation Rights",
      commission: "Commission",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleImageLoad = () => setImageLoaded(true);

  const handleMakeOfferClick = () => {
    if (!token || !currentUser) {
      toast.error("Please login to make an offer");
      return;
    }

    const userId = currentUser.id;
    const sellerId =
      listing.sellerId?.id ||
      listing.sellerId?._id ||
      listing.sellerId;

    if (userId === sellerId) {
      toast.error("You cannot make an offer on your own listing");
      return;
    }

    if (listing.status !== "active") {
      toast.error("This listing is not available for offers");
      return;
    }

    onMakeOffer(listing);
  };

  const isUserLoggedIn = token && currentUser;
  const userId = currentUser?.id || currentUser?._id;
  const sellerId = listing.sellerId?._id || listing.sellerId;
  const isOwnListing = userId === sellerId;
  const canMakeOffer =
    isUserLoggedIn && !isOwnListing && listing.status === "active";

  return (
    <>
      <div className="group relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden hover:-translate-y-1">
        {/* Media */}
        <div className="relative h-52 overflow-hidden bg-gray-100">
          {firstMedia ? (
            isVideo(firstMedia) ? (
              <div
                className="relative w-full h-full cursor-pointer"
                onClick={() => setShowVideoModal(true)}
              >
                <video
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                >
                  <source src={firstMedia} type="video/mp4" />
                </video>

                <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 backdrop-blur-sm">
                  <FiPlay size={10} /> <span>VIDEO</span>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full">
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                    <FiImage className="text-gray-400" size={24} />
                  </div>
                )}
                <img
                  src={firstMedia}
                  alt={listing.title}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    imageLoaded ? "opacity-100" : "opacity-0 scale-105"
                  } group-hover:scale-110`}
                  onLoad={handleImageLoad}
                />
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <FiImage className="text-gray-400" size={32} />
            </div>
          )}

          {/* Price Tag */}
          <div className="absolute bottom-3 left-3 bg-gradient-to-r from-red-600 to-orange-500 text-white px-3 py-1.5 rounded-xl font-semibold text-sm shadow-md">
            {formatPrice(listing.price)}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
              {listing.category}
            </span>
            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full">
              {getTypeLabel(listing.type)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2 line-clamp-2">
            {listing.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
            {listing.description}
          </p>

          {/* Offer Button */}
          <button
            onClick={handleMakeOfferClick}
            disabled={!canMakeOffer}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiTag className="inline mr-2" size={16} />
            Make an Offer
          </button>

          {/* Footer */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span>⭐ {listing.sellerId?.sellerRating || "New"}</span>
            <span>🕒 {new Date(listing.createdAt).toLocaleDateString()}</span>
            {listing.viewCount !== undefined && (
              <span>👁️ {listing.viewCount} views</span>
            )}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 bg-black/40 rounded-full p-2"
            >
              <FiX size={22} />
            </button>

            <video
              className="w-full h-full max-h-[80vh] object-contain"
              controls
              autoPlay
            >
              <source src={firstMedia} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </>
  );
};

export default ListingCard;
