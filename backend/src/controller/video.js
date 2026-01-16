const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// Import models
const Videos = require("../models/videos");
const Script = require("../models/script");
const History = require('../models/history');
const User = require("../models/user");
const UserLikedVideo = require("../models/UserLikedVideos");
const { authenticateMiddleware, isValidObjectId } = require("../utils");

// ==================== VIDEO CRUD ROUTES ====================

// Route for creating a video (Authenticated)
router.post("/create", authenticateMiddleware, async (req, res) => {
    try {
        const { title, description, genre, theme, rating, isForSale, file, slug, status, users, hasPaid } = req.body;
        
        // Use authenticated user's ID as author
        const author = req.user._id;
        
        // Create a new video
        const video = await Videos.create({
            title,
            description,
            genre,
            theme,
            rating,
            file,
            slug,
            users,
            status: status ?? true,
            author,
            hasPaid,
            isForSale,
        });
        
        res.status(201).json({ message: "Video created successfully", videoId: video._id });
    } catch (error) {
        console.error("Error creating video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route for getting all videos (Public)
router.get("/all", async (req, res) => {
    try {
        const videos = await Videos.find({ hidden: false }).populate("author", "username avatar followers followings");
        res.json(videos);
    } catch (error) {
        console.error("Error getting all videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route for getting all videos by a specific user (Public)
router.get("/all/:user", async (req, res) => {
    const userId = req.params.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
    }

    try {
        const videos = await Videos.find({ author: userId, hidden: false }).populate("author", "username avatar followers followings");
        res.json(videos);
    } catch (error) {
        console.error("Error getting all videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route for getting a specific video by ID or slug (Public)
router.get("/:id", async (req, res) => {
    try {
        const video = isValidObjectId(req.params.id)
            ? await Videos.findById({ _id: req.params.id, hidden: false }).populate("author", "username avatar followers followings")
            : await Videos.findOne({ slug: req.params.id, hidden: false }).populate("author", "username avatar followers followings");
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        res.json(video);
    } catch (error) {
        console.error("Error getting video by ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==================== LIKE/DISLIKE ROUTES (with UserLikedVideo tracking) ====================

// Like or Unlike a Video (with UserLikedVideo tracking)
router.post('/like/:videoId', authenticateMiddleware, async (req, res) => {
    const { action } = req.body;
    const videoId = req.params.videoId;
    const userId = req.user._id; // Get user from authenticated middleware

    try {
        const video = await Videos.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Extract genres, themes, and ratings
        const genres = Array.isArray(video.genre) ? video.genre : [video.genre];
        const themes = Array.isArray(video.theme) ? video.theme : [video.theme];
        const ratings = Array.isArray(video.rating) ? video.rating : [video.rating];

        if (action === "like") {
            // Update video likes array
            await Videos.findByIdAndUpdate(videoId, {
                $pull: { dislikes: userId },
                $addToSet: { likes: userId },
            });

            // Remove any existing dislike record
            await UserLikedVideo.findOneAndDelete({ userId, videoId, action: 'dislike' });
            
            // Create like record
            await UserLikedVideo.create({
                userId,
                videoId,
                action: 'like'
            });

            // Update genreCounts and themeCounts
            await Videos.updateMany(
                { $or: [{ genre: { $in: genres } }, { theme: { $in: themes } }] },
                {
                    $inc: {
                        ...genres.reduce((acc, genre) => {
                            acc[`genreCounts.${genre}`] = 1;
                            return acc;
                        }, {}),
                        ...themes.reduce((acc, theme) => {
                            acc[`themeCounts.${theme}`] = 1;
                            return acc;
                        }, {}),
                        ...ratings.reduce((acc, rating) => {
                            acc[`ratingCounts.${rating}`] = 1;
                            return acc;
                        }, {}),
                    },
                }
            );

        } else if (action === "unlike") {
            // Remove from likes array
            await Videos.findByIdAndUpdate(videoId, {
                $pull: { likes: userId }
            });

            // Remove like record
            await UserLikedVideo.findOneAndDelete({ userId, videoId, action: 'like' });

            // Update genreCounts and themeCounts (decrement)
            await Videos.updateMany(
                { $or: [{ genre: { $in: genres } }, { theme: { $in: themes } }] },
                {
                    $inc: {
                        ...genres.reduce((acc, genre) => {
                            acc[`genreCounts.${genre}`] = -1;
                            return acc;
                        }, {}),
                        ...themes.reduce((acc, theme) => {
                            acc[`themeCounts.${theme}`] = -1;
                            return acc;
                        }, {}),
                        ...ratings.reduce((acc, rating) => {
                            acc[`ratingCounts.${rating}`] = -1;
                            return acc;
                        }, {}),
                    },
                }
            );
        }

        res.status(200).json({ message: 'Action processed successfully' });
    } catch (error) {
        console.error("Error processing like/dislike:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Dislike or Undislike a Video (with UserLikedVideo tracking)
router.post('/dislike/:videoId', authenticateMiddleware, async (req, res) => {
    const { action } = req.body;
    const videoId = req.params.videoId;
    const userId = req.user._id;

    try {
        const video = await Videos.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Extract genres, themes, and ratings
        const genres = Array.isArray(video.genre) ? video.genre : [video.genre];
        const themes = Array.isArray(video.theme) ? video.theme : [video.theme];
        const ratings = Array.isArray(video.rating) ? video.rating : [video.rating];

        if (action === "dislike") {
            // Update video dislikes array
            await Videos.findByIdAndUpdate(videoId, {
                $pull: { likes: userId },
                $addToSet: { dislikes: userId },
            });

            // Remove any existing like record
            await UserLikedVideo.findOneAndDelete({ userId, videoId, action: 'like' });
            
            // Create dislike record
            await UserLikedVideo.create({
                userId,
                videoId,
                action: 'dislike'
            });

            // Update genreCounts and themeCounts (decrement for likes removed)
            await Videos.updateMany(
                { $or: [{ genre: { $in: genres } }, { theme: { $in: themes } }] },
                {
                    $inc: {
                        ...genres.reduce((acc, genre) => {
                            acc[`genreCounts.${genre}`] = -1;
                            return acc;
                        }, {}),
                        ...themes.reduce((acc, theme) => {
                            acc[`themeCounts.${theme}`] = -1;
                            return acc;
                        }, {}),
                        ...ratings.reduce((acc, rating) => {
                            acc[`ratingCounts.${rating}`] = -1;
                            return acc;
                        }, {}),
                    },
                }
            );

        } else if (action === "undislike") {
            // Remove from dislikes array
            await Videos.findByIdAndUpdate(videoId, {
                $pull: { dislikes: userId }
            });

            // Remove dislike record
            await UserLikedVideo.findOneAndDelete({ userId, videoId, action: 'dislike' });
        }

        res.status(200).json({ message: 'Action processed successfully' });
    } catch (error) {
        console.error("Error processing dislike:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==================== USER LIKED/INTERACTION HISTORY ROUTES ====================

// Get user's liked videos (Authenticated)
router.get('/user/liked', authenticateMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get liked videos from UserLikedVideo collection
        const likedVideos = await UserLikedVideo.find({ 
            userId, 
            action: 'like' 
        })
        .populate({
            path: 'videoId',
            match: { hidden: false },
            select: 'title thumbnail file views likes dislikes comments description createdAt',
            populate: {
                path: 'author',
                select: 'username avatar followers'
            }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        // Filter out null videos (hidden or deleted)
        const filteredLikedVideos = likedVideos.filter(item => item.videoId);
        
        // Get total count
        const totalCount = await UserLikedVideo.countDocuments({ 
            userId, 
            action: 'like' 
        });

        res.status(200).json({
            success: true,
            userId,
            totalLikedVideos: totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            likedVideos: filteredLikedVideos.map(item => ({
                ...item.videoId._doc,
                likedAt: item.createdAt
            }))
        });
    } catch (error) {
        console.error("Error fetching user's liked videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get user's disliked videos (Authenticated)
router.get('/user/disliked', authenticateMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get disliked videos from UserLikedVideo collection
        const dislikedVideos = await UserLikedVideo.find({ 
            userId, 
            action: 'dislike' 
        })
        .populate({
            path: 'videoId',
            match: { hidden: false },
            select: 'title thumbnail file views likes dislikes comments description createdAt',
            populate: {
                path: 'author',
                select: 'username avatar followers'
            }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        // Filter out null videos
        const filteredDislikedVideos = dislikedVideos.filter(item => item.videoId);
        
        // Get total count
        const totalCount = await UserLikedVideo.countDocuments({ 
            userId, 
            action: 'dislike' 
        });

        res.status(200).json({
            success: true,
            userId,
            totalDislikedVideos: totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            dislikedVideos: filteredDislikedVideos.map(item => ({
                ...item.videoId._doc,
                dislikedAt: item.createdAt
            }))
        });
    } catch (error) {
        console.error("Error fetching user's disliked videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get user's bookmarked videos (Authenticated)
router.get('/user/bookmarks', authenticateMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get bookmarked videos from UserLikedVideo collection
        const bookmarkedVideos = await UserLikedVideo.find({ 
            userId, 
            action: 'bookmark' 
        })
        .populate({
            path: 'videoId',
            match: { hidden: false },
            select: 'title thumbnail file views likes dislikes comments description createdAt',
            populate: {
                path: 'author',
                select: 'username avatar followers'
            }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        // Filter out null videos
        const filteredBookmarkedVideos = bookmarkedVideos.filter(item => item.videoId);
        
        // Get total count
        const totalCount = await UserLikedVideo.countDocuments({ 
            userId, 
            action: 'bookmark' 
        });

        res.status(200).json({
            success: true,
            userId,
            totalBookmarkedVideos: totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            bookmarkedVideos: filteredBookmarkedVideos.map(item => ({
                ...item.videoId._doc,
                bookmarkedAt: item.createdAt
            }))
        });
    } catch (error) {
        console.error("Error fetching user's bookmarked videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get user's complete interaction history (Authenticated)
router.get('/user/interactions', authenticateMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const skip = (page - 1) * limit;

        // Get all user interactions (likes, dislikes, bookmarks)
        const interactions = await UserLikedVideo.find({ userId })
            .populate({
                path: 'videoId',
                match: { hidden: false },
                select: 'title thumbnail file views likes dislikes comments description createdAt',
                populate: {
                    path: 'author',
                    select: 'username avatar followers'
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out null videos and format response
        const filteredInteractions = interactions
            .filter(item => item.videoId)
            .map(item => ({
                video: item.videoId,
                action: item.action,
                interactedAt: item.createdAt,
                interactionId: item._id
            }));

        // Get total count
        const totalCount = await UserLikedVideo.countDocuments({ userId });

        res.status(200).json({
            success: true,
            userId,
            totalInteractions: totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            interactions: filteredInteractions
        });
    } catch (error) {
        console.error("Error fetching user's interactions:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==================== BOOKMARK ROUTES ====================

// Add or remove bookmark (with UserLikedVideo tracking)
router.post('/:id/bookmark', authenticateMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { action = 'add' } = req.body; // 'add' or 'remove'

        const video = await Videos.findById(id);
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        if (action === 'add') {
            // Add to video bookmarks array
            await Videos.findByIdAndUpdate(id, {
                $addToSet: { bookmarks: userId }
            });

            // Create bookmark record
            await UserLikedVideo.create({
                userId,
                videoId: id,
                action: 'bookmark'
            });

            res.status(200).json({ 
                message: 'Video bookmarked successfully',
                bookmarked: true 
            });

        } else if (action === 'remove') {
            // Remove from video bookmarks array
            await Videos.findByIdAndUpdate(id, {
                $pull: { bookmarks: userId }
            });

            // Remove bookmark record
            await UserLikedVideo.findOneAndDelete({ 
                userId, 
                videoId: id, 
                action: 'bookmark' 
            });

            res.status(200).json({ 
                message: 'Bookmark removed successfully',
                bookmarked: false 
            });
        }
    } catch (error) {
        console.error('Error bookmarking video:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==================== COMMENT ROUTES ====================

// Route for commenting on a video (Authenticated)
router.post("/:id/comment", authenticateMiddleware, async (req, res) => {
	try {
		const { text } = req.body;
		const userId = req.user._id;
		const video = await Videos.findById(req.params.id);

		if (!video) {
			return res.status(404).json({ error: "Video not found" });
		}
		
		const user = await User.findById(userId);
		const newComment = {
			avatar: user.avatar,
			username: user.username,
			userId: userId,
			text,
			chatedAt: new Date(),
			replies: [],
		};

		video.comments.push(newComment);
		await video.save();

		res.status(201).json({ 
			message: "Comment added successfully",
			comment: newComment 
		});
	} catch (error) {
		console.error("Error commenting on video:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Route for replying to a comment (Authenticated)
router.post("/:id/comment/:commentId", authenticateMiddleware, async (req, res) => {
    try {
      const { text } = req.body;
      const userId = req.user._id;
  
      // Find the video
      const video = await Videos.findById(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
  
      // Find the comment
      const comment = video.comments.id(req.params.commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
  
      // Fetch user information
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Create reply
      const newReply = {
        avatar: user.avatar,
        username: user.username,
        userId: userId,
        text,
        createdAt: new Date(),
      };
  
      // Add reply
      if (!comment.replies) {
        comment.replies = [];
      }
      comment.replies.push(newReply);
  
      // Save video
      await video.save();
  
      res.status(201).json({ 
        message: "Reply added successfully",
        reply: newReply 
      });
    } catch (error) {
      console.error("Error replying to comment:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==================== VIEWS AND HISTORY ROUTES ====================

// Increment video views and record history (Authenticated)
router.put('/view/:videoId', authenticateMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const videoId = req.params.videoId;

        // Find the video
        const video = await Videos.findById(videoId);
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Increment views
        video.views += 1;
        await video.save();

        // Add history entry
        const newHistory = new History({
            userId,
            videoId,
            watchedAt: new Date()
        });

        await newHistory.save();

        res.status(200).json({
            message: 'Video views incremented and history recorded',
            views: video.views,
        });
    } catch (error) {
        console.error("Error processing video view and history:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get user's watch history (Authenticated)
router.get('/history', authenticateMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get watch history
        const history = await History.find({ userId })
            .populate({
                path: 'videoId',
                select: 'title thumbnail author views file description createdAt',
                match: { hidden: false },
                populate: {
                    path: 'author',
                    select: 'username avatar followers'
                }
            })
            .sort({ watchedAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out null videos
        const filteredHistory = history.filter(item => item.videoId);
        
        // Get total count
        const totalCount = await History.countDocuments({ userId });

        res.status(200).json({
            success: true,
            userId,
            totalWatchedVideos: totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            watchHistory: filteredHistory.map(item => ({
                video: item.videoId,
                watchedAt: item.watchedAt,
                historyId: item._id
            }))
        });
    } catch (error) {
        console.error("Error fetching user watch history:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==================== STATUS CHECK ROUTES ====================

// Check like/dislike status for current user (Authenticated)
router.get('/:videoId/like-status', authenticateMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userId = req.user._id;

    // Find the video
    const video = await Videos.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if user has liked or disliked
    const isLiked = video.likes.includes(userId);
    const isDisliked = video.dislikes.includes(userId);
    
    // Check if bookmarked
    const isBookmarked = video.bookmarks ? video.bookmarks.includes(userId) : false;

    // Also check from UserLikedVideo collection
    const interaction = await UserLikedVideo.findOne({ 
      userId, 
      videoId 
    });

    res.status(200).json({
      isLiked,
      isDisliked,
      isBookmarked,
      lastAction: interaction ? interaction.action : null,
      lastInteractionAt: interaction ? interaction.createdAt : null
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== ADMIN/VISIBILITY ROUTES ====================

// Route for publishing a video (Authenticated - Author only)
router.patch("/publish/:id", authenticateMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Videos.findById(id);
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        // Check if user is the author or admin
        if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized to publish this video" });
        }
        
        if (!video.hidden) {
            return res.status(400).json({ error: "Video is already visible" });
        }

        video.hidden = false;
        await video.save();
        
        res.status(200).json({ message: "Video published successfully", video });
    } catch (error) {
        console.error("Error publishing video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route for unpublishing a video (Authenticated - Author only)
router.patch("/unpublish/:id", authenticateMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Videos.findById(id);
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        // Check if user is the author or admin
        if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized to unpublish this video" });
        }
        
        video.hidden = true;
        await video.save();
        
        res.json({ message: "Video unpublished successfully", video });
    } catch (error) {
        console.error("Error unpublishing video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to hide a video (Authenticated - Author or Admin)
router.patch("/hide/:id", authenticateMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Videos.findById(id);
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        // Check authorization
        if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized to hide this video" });
        }

        video.hidden = true;
        await video.save();

        res.status(200).json({ message: "Video hidden successfully", video });
    } catch (error) {
        console.error("Error hiding video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to unhide a video (Authenticated - Author or Admin)
router.patch("/unhide/:id", authenticateMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Videos.findById(id);
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        // Check authorization
        if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized to unhide this video" });
        }

        video.hidden = false;
        await video.save();

        res.status(200).json({ message: "Video unhidden successfully", video });
    } catch (error) {
        console.error("Error unhiding video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==================== OTHER ROUTES ====================

// Route for getting videos by genre (Public)
router.get("/search/:genre", async (req, res) => {
	try {
		const genre = req.params.genre;
		const videos = await Videos.find({ 
            genre: genre, 
            hidden: false 
        }).populate("author", "username avatar followers followings");
		res.json(videos);
	} catch (error) {
		console.error("Error getting videos by genre:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Route for getting videos by theme (Public)
router.get("/themes/:theme", async (req, res) => {
    try {
        const theme = req.params.theme;
        const videos = await Videos.find({ 
            theme: theme, 
            hidden: false 
        }).populate("author", "username avatar followers followings");
        res.json(videos);
    } catch (error) {
        console.error("Error getting videos by theme:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route for getting videos by rating (Public)
router.get("/ratings/:rating", async (req, res) => {
    try {
        const rating = req.params.rating;
        const videos = await Videos.find({ 
            rating: rating, 
            hidden: false 
        }).populate("author", "username avatar followers followings");
        res.json(videos);
    } catch (error) {
        console.error("Error getting videos by rating:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Edit video (Authenticated - Author only)
router.put("/edit/:id", authenticateMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const { title, description, genre, file, thumbnail, slug } = req.body;

		const video = await Videos.findById(id);
		if (!video) {
			return res.status(404).json({ error: "Video not found" });
		}

		// Check authorization
		if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
			return res.status(403).json({ error: "Unauthorized to edit this video" });
		}

		// Update fields
		if (title) video.title = title;
		if (description) video.description = description;
		if (genre) video.genre = genre;
		if (file) video.file = file;
		if (thumbnail) video.thumbnail = thumbnail;
		if (slug) video.slug = slug;

		await video.save();

		res.status(200).json({ message: "Video updated successfully", video });
	} catch (error) {
		console.error("Error editing video:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Delete video (Authenticated - Author or Admin)
router.delete("/delete/:id", authenticateMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const video = await Videos.findById(id);
		
		if (!video) {
			return res.status(404).json({ error: "Video not found" });
		}

		// Check authorization
		if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
			return res.status(403).json({ error: "Unauthorized to delete this video" });
		}

		// Delete related user interactions
		await UserLikedVideo.deleteMany({ videoId: id });
		
		// Delete video
		await Videos.findByIdAndDelete(id);

		res.status(200).json({ message: "Video deleted successfully" });
	} catch (error) {
		console.error("Error deleting video:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ==================== SCRIPT ROUTES ====================

// Create script (Authenticated)
router.post("/scripts", authenticateMiddleware, async (req, res) => {
	try {
		const { title, genre, script, isForSale } = req.body;
		const author = req.user._id;
		
		const newScript = await Script.create({ 
			title, 
			genre, 
			script, 
			author,
			isForSale 
		});
		
		res.status(201).json({ 
			message: "Script created successfully",
			script: newScript 
		});
	} catch (error) {
		console.error("Error creating script:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Get all scripts (Public)
router.get("/author/scripts", async (req, res) => {
    try {
        const scripts = await Script.find().populate("author", "username avatar followers followings");
        res.status(200).json(scripts);
    } catch (error) {
        console.error("Error getting scripts:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get scripts by author (Public)
router.get("/authors/:authorId/scripts", async (req, res) => {
	try {
		const authorId = req.params.authorId;
		const scripts = await Script.find({ author: authorId }).populate("author", "username avatar");
		res.status(200).json(scripts);
	} catch (error) {
		console.error("Error getting scripts by author:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Delete script (Authenticated - Author only)
router.delete("/scripts/:scriptId", authenticateMiddleware, async (req, res) => {
	try {
		const { scriptId } = req.params;
		const script = await Script.findById(scriptId);

		if (!script) {
			return res.status(404).json({ error: "Script not found" });
		}

		// Check authorization
		if (script.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
			return res.status(403).json({ error: "Unauthorized to delete this script" });
		}

		await Script.findByIdAndDelete(scriptId);

		res.status(200).json({ message: "Script deleted successfully" });
	} catch (error) {
		console.error("Error deleting script:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Edit script (Authenticated - Author only)
router.put("/scripts/:id", authenticateMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const { title, genre, script } = req.body;

		const existingScript = await Script.findById(id);
		if (!existingScript) {
			return res.status(404).json({ error: "Script not found" });
		}

		// Check authorization
		if (existingScript.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
			return res.status(403).json({ error: "Unauthorized to edit this script" });
		}

		const updateFields = {};
		if (title) updateFields.title = title;
		if (genre) updateFields.genre = genre;
		if (script) updateFields.script = script;

		const updatedScript = await Script.findByIdAndUpdate(id, updateFields, {
			new: true,
		});

		res.status(200).json({ 
			message: "Script updated successfully",
			script: updatedScript 
		});
	} catch (error) {
		console.error("Error updating script:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;