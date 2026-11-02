(function(){

 const params = new URLSearchParams(window.location.search);
 const token = params.get("token");

 if(!token){
  alert("Google login failed");
  window.location.href = "/auth/login.html";
  return;
 }


 localStorage.setItem("accessToken", token);


 fetch("/api/auth/me",{
  headers:{
   Authorization: `Bearer ${token}`
  }
 })
 .then(res=>res.json())
 .then(user=>{

  localStorage.setItem("user", JSON.stringify(user));


  window.location.href = "/pages/feed.html";

 })
 .catch(()=>{
  window.location.href = "/pages/feed.html";
 });

})();