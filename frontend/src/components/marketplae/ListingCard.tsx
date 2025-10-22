import React, { useState, useEffect } from "react";
import { Listing } from "../../types/marketplace";
import { FiPlay, FiImage, FiTag, FiX } from "react-icons/fi";
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
      } catch {
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

  const handleMakeOfferClick = () => {
    if (!token || !currentUser) {
      toast.error("Please login to make an offer");
      return;
    }

    const userId = currentUser.id;
    const sellerId =
      listing.sellerId?.id || listing.sellerId?._id || listing.sellerId;

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
      <div className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Media Section */}
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
                  <FiPlay size={10} /> <span>Video</span>
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
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <FiImage className="text-gray-400" size={32} />
            </div>
          )}

          {/* Price Tag */}
          <div className="absolute bottom-3 left-3 bg-white text-green-600 px-3 py-1.5 rounded-xl font-bold text-sm shadow-md border border-green-200">
            {formatPrice(listing.price)}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg mb-2 line-clamp-2 leading-snug">
            {listing.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">
            {listing.description}
          </p>

          {/* Make Offer Button */}
          <button
            onClick={handleMakeOfferClick}
            disabled={!canMakeOffer}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FiTag size={16} />
            <span>Make Offer</span>
          </button>

          {/* Footer */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="capitalize">{listing.category}</span>
            <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
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
