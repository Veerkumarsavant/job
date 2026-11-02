const API =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : `${window.location.origin}/api`;

window.API = API;
function getToken(){
 return localStorage.getItem("accessToken");
}
function authHeaders(){
 const token = getToken();

 return {
  "Content-Type":"application/json",
  "Authorization":`Bearer ${token}`
 };

}

function requireAuth(){
 const token = getToken();
 if(!token){
  window.location.href="/auth/login.html";
 }
}

window.getToken = getToken;
window.authHeaders = authHeaders;
window.requireAuth = requireAuth;