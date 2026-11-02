const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {

 e.preventDefault();

 const name = document.getElementById("name").value.trim();
 const email = document.getElementById("email").value.trim();
 const password = document.getElementById("password").value.trim();

 try{

  const res = await fetch("http://localhost:5000/api/auth/register",{
   method:"POST",
   headers:{
    "Content-Type":"application/json"
   },
   body:JSON.stringify({name,email,password})
  });

  const data = await res.json();

  if(!res.ok){
   throw new Error(data.message);
  }

  localStorage.setItem("verifyEmail",email);

  window.location.href="/auth/verify-otp.html";

 }catch(err){
  alert(err.message);
 }

});
