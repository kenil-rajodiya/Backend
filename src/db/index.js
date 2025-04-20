import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try { 
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        const connection = await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("MongoDB connected successfully.");
        console.log(connection);
        

    } catch (error) {
        console.log("ERROR: " , error);
        process
    }
}


export default connectDB;