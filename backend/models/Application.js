const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({

 job:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Job",
  required:true
 },

 applicant:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User",
  required:true
 },

 resume:String,

status:{
  type:String,
  enum:[
    "applied",
    "shortlisted",
    "accepted",
    "rejected"
  ],
  default:"applied"
}

},{ timestamps:true });

applicationSchema.index(
 { job:1, applicant:1 },
 { unique:true }
);

module.exports = mongoose.model(
 "Application",
 applicationSchema
);