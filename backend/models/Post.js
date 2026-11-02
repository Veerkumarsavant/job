const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({

 user:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User",
  required:true
 },

 text:{
  type:String,
  required:true,
  trim:true
 },

 createdAt:{
  type:Date,
  default:Date.now
 }

});


const postSchema = new mongoose.Schema({

 author:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User",
  required:true,
  index:true
 },

 content:{
  type:String,
  trim:true
 },

 image:{
  type:String
 },

 hashtags:[
  {
   type:String,
   lowercase:true
  }
 ],

 likes:[
  {
   type:mongoose.Schema.Types.ObjectId,
   ref:"User"
  }
 ],

 comments:[commentSchema]

},{
 timestamps:true
});

postSchema.index({ createdAt:-1 });
postSchema.index({ author:1, createdAt:-1 });
postSchema.index({ hashtags:1 });

module.exports = mongoose.model("Post",postSchema);