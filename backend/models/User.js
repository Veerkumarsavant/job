const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
 name:{
  type:String,
  required:true
 },

 email:{
  type:String,
  required:true,
  unique:true,
  lowercase:true,
  trim:true
 },

 password:{
  type:String,
  required:function(){
    return !this.googleId;
  }
 },

 googleId:{
  type:String,
  default:null
 },

 avatar:{
  type:String,
  default:"/images/default-avatar.png"
 },

 cover:String,
 headline:String,
 phone:String,
 address:String,
 resume:String,


 skills:[
  {
   name:String,
   endorsements:[
    {
     type:mongoose.Schema.Types.ObjectId,
     ref:"User"
    }
   ]
  }
 ],


 experience:[
  {
   title:String,
   company:String,
   duration:String,
   description:String
  }
 ],


 education:[
  {
   college:String,
   degree:String,
   result:String,
   year:String
  }
 ],


 projects:[
  {
   title:String,
   description:String,
   link:String
  }
 ],


 certificates:[
  {
   name:String,
   organization:String,
   year:String
  }
 ],


 followers:[
  {
   type:mongoose.Schema.Types.ObjectId,
   ref:"User"
  }
 ],

 following:[
  {
   type:mongoose.Schema.Types.ObjectId,
   ref:"User"
  }
 ],

 connections:[
  {
   type:mongoose.Schema.Types.ObjectId,
   ref:"User"
  }
 ],


 visitors:[
  {
   user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
   },
   date:{
    type:Date,
    default:Date.now
   }
  }
 ],


 role:{
  type:String,
  enum:["user","recruiter","admin"],
  default:"user"
 },
 
 companyName: { type: String, default: "" },
industry: { type: String, default: "" },
location: { type: String, default: "" },
website: { type: String, default: "" },
about: { type: String, default: "" },
logo: { type: String, default: "" },


 isVerified:{
  type:Boolean,
  default:false   
 },

 is2FAEnabled: {
    type: Boolean,
    default: false
},

twoFASecret: {
    type: String,
    default: undefined
},

 emailOTP:String,
 otpExpires:Date,
 resetPasswordToken:String,
 resetPasswordExpire:Date,
 refreshToken: {
    type: String,
    default: null
}

},{
 timestamps:true
});

const bcrypt = require("bcryptjs");

userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model("User", userSchema);