// require('dotenv').config({path : './env'})

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import connectDB from "./db/index.js";






connectDB()
    .then(() => {
        app.on("error", (err) => {
            console.log("Server connection error : " ,err);
            
        })
        app.listen(process.env.PORT, () => {
           console.log(`Server is running on port ${process.env.PORT}`);
           
       }) 
    
})
    .catch((err) => {
    console.log("Error in connection to mongo db : " , err);
    
})











/*
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
const app = express();
; (async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (err) => {
            console.error("Server error:", err);
        })
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });


    }catch (err){
        console.error("Error connecting to MongoDB:", err);
    }
})()

*/