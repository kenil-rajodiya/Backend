import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/Apierror.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import uploadOnCloudinary from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "User is missing");
    }

    if (!query) {
        throw new ApiError(400, "Query is not provided");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const video = await Video.aggregate([
        {
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ],
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $sort: {
                [sortBy || "createdAt"]: sortType === "desc" ? -1 : 1
            }
        },
        {
            $skip: (Number(page) - 1) * Number(limit)
        },
        {
            $limit: Number(limit)
        },
        {
            $project: {
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                ownerDetails: 1,
                createdAt: 1,
                updatedAt: 1,
                likes: 1,
                views: 1
            }
        }

    ]);
    if (video.length <= 0) {
        throw new ApiError(404, "Videos not found with your query")
    }

    return res.status(200).json(
        new ApiResponse(200, video, "videos are fetched successfully.")
    );
})



const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!title || !description) {
        throw new ApiError(400, "title and description both field required")
    }

    const check = await Video.findOne({
        title: title,
        description: description
    })
    if (check) {
        throw new ApiError(400, "Video with this title and description is already exists so can't publish second time");
    }

    const videoLocalFilePath = req.files?.videoFile[0]?.path;
    const thumbnailLocalFilePath = req.files?.thumbnail[0]?.path;

    if (!videoLocalFilePath || !thumbnailLocalFilePath) {
        throw new ApiError(400, "Both video and thumbnai are required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalFilePath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

    if (!videoFile || !thumbnail) {
        throw new ApiError(400, "Error while uploading on cloudinary.")
    }



    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration,
        owner: req?.user?._id

    })

    if (!video) {
        throw new ApiError(400, "Video could not be created")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video published successfully")
        );



})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoId is incorrect")
    };

    const userId = req?.user?._id;
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400, "unauthorized request from video controller!")
    }
    // this is causing duplication of same bject id in watch history of logged in user
    // user.watchHistory.push(videoId);
    // await user.save({ validateBeforeSave: false })
    if (!user.watchHistory.includes(videoId)) {
        user.watchHistory.push(videoId);
        await user.save({ validateBeforeSave: false });
    }

    const id = new mongoose.Types.ObjectId(videoId);
    if (!id) {
        throw new ApiError(400, "video with this id doesn't exists")
    }


    // const video = await Video.findById(id);
    const video = await Video.aggregate([
        {
            $match: {
                _id: id
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",

                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req?.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                owner: {
                    $first: "$owner"
                }
            }
        }
    ])

    if (!video) {
        throw new ApiError(400, "video not found")
    }
    await Video.findByIdAndUpdate(videoId,
        { $inc: { views: 1 } },
        { new: true }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video fetched successfully!")
        )
        ;
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Videoid is not valid");
    }
    const { title, description } = req.body;
    if (!title || !description) {
        throw new ApiError(400, "Both title and description fields are require");
    }
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title,
                description: description
            }

        },
        { new: true }
    )

    if (!updatedVideo) {
        throw new ApiError(400, "Error while updating video details!")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedVideo, "video details updated successfully")
        )


})

// const deleteVideo = asyncHandler(async (req, res) => {
//     const { videoId } = req.params
//     //TODO: delete video
//     if (!isValidObjectId(videoId)) {
//         throw new ApiError(400, "video id is not valid!");
//     }

//     const deletedVideo = await Video.findByIdAndDelete(videoId);

//     if (!deletedVideo) {
//         throw new ApiError(400, "Error while deleting video!");
//     }
//     return res
//         .status(200)
//         .json(
//                 new ApiResponse(
//                     200,
//                     deletedVideo,
//                     "video deleted successfully"
//             )
//         )



// })


import { v2 as cloudinary } from 'cloudinary';
const extractPublicId = (url) => {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname; // e.g., /<folder>/v1234567890/filename.mp4
    const parts = pathname.split('/');
    const versionIndex = parts.findIndex(part => /^v\d+$/.test(part));
    const publicIdParts = parts.slice(versionIndex + 1);
    const publicIdWithExt = publicIdParts.join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension
    return publicId;
};

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    try {
        if (video.videoFile) {
            const videoPublicId = extractPublicId(video.videoFile);
            const videoDeletionResult = await cloudinary.uploader.destroy(videoPublicId, {
                resource_type: 'video',
                invalidate: true
            });
            console.log('Video deletion result:', videoDeletionResult);
        }

        if (video.thumbnail) {
            const thumbnailPublicId = extractPublicId(video.thumbnail);
            const thumbnailDeletionResult = await cloudinary.uploader.destroy(thumbnailPublicId, {
                resource_type: 'image',
                invalidate: true
            });
            console.log('Thumbnail deletion result:', thumbnailDeletionResult);
        }
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error.message);

    }


    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(
        new ApiResponse(200, null, "Video and associated assets deleted successfully")
    );
});



const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findByIdAndUpdate(

        videoId,
    [  {
            $set: {
                isPublished: {$not : "$isPublished"}
            }
      }
    ],
        {
            new : true
        }
    );
    if (!video) {
        throw new ApiError(400 , "Error while toggling ispubished status!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, video, "Successfully toggled isPublished status!"
            )
        );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}