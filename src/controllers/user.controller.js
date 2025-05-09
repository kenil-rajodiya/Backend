import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";



const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    const { fullName, email, username, password } = req.body;
    console.log("email: " , email);
    

    // validation - not empty
    // if (fullName === "") {
    //     throw new ApiError(400, "Fullname is required");
    // }

    if (
        [fullName, email, username, password].some(
            (field) => {
            field.trim() === ""
        })
    ) {
        throw new ApiError(400 , "All fields are required")
    }

    // check if user already exist : username , email

    const existedUser =  User.findOne({
        $or: [
            { username },
            {email}
        ]
    })

    if (existedUser) {
        throw new ApiError(409 , "User with email or username exists")
    }
    // check for images and avatar
    console.log(req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar file is required")
    }
    
    //upload them to cloudinary , check avtar
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if (!avatar) {
        throw new ApiError(400 , "Avatar file is required")
    }
    // create user object - create entry in db

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password, 
        username : username.toLowerCase()
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500 , "Something went wrong while registering user ")
    }




    // return response

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "user registered succesfully.")
    )


})

export { registerUser };