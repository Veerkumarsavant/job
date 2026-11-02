async function loadDashboard(){

 const res = await fetch("/api/recruiter/dashboard",{
  headers:{
   Authorization:`Bearer ${localStorage.getItem("token")}`
  }
 });

 const data = await res.json();

 const container = document.getElementById("applications");

 data.applications.forEach(app=>{

  const div=document.createElement("div");

  div.innerHTML=`
   <h4>${app.applicant.name}</h4>
   <p>${app.job.title}</p>
   <p>Status: ${app.status}</p>
  `;

  container.appendChild(div);

 });

}

loadDashboard();