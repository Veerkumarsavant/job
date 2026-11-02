async function uploadResume(){

 try{

  const fileInput = document.getElementById("resumeFile");

  if(!fileInput.files.length){
   alert("Please select a resume file first");
   return;
  }

  const formData = new FormData();

  formData.append("resume", fileInput.files[0]);

  const res = await fetch("/api/resume/upload",{

   method:"POST",

   headers:{
    Authorization:`Bearer ${localStorage.getItem("token")}`
   },

   body:formData

  });

  const data = await res.json();

  if(!res.ok){
   throw new Error(data.message || "Upload failed");
  }

  alert(data.message || "Resume uploaded successfully");

 }catch(err){

  console.error(err);
  alert("Resume upload failed");

 }

}