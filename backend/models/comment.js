// models/Comment.js

const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
{
 user:{
  type: mongoose.Schema.Types.ObjectId,
  ref:"User",
  required:true
 },
 resume:{
  type: mongoose.Schema.Types.ObjectId,
  ref:"Resume",
  required:true
 },
 text:{
  type:String,
  required:true
 }
},
{ timestamps:true }
);

module.exports = mongoose.model("Comment",commentSchema);