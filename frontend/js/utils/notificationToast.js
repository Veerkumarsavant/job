function showNotification(notification){

 const container =
 document.getElementById("notificationContainer");

 if(!container) return;

 const div = document.createElement("div");

 div.className = "notification-toast";

 div.innerHTML = `
  <strong>${notification.sender?.name || "Someone"}</strong>
  ${notification.message}
 `;

 container.appendChild(div);

 /* auto remove after 4 seconds */

 setTimeout(()=>{

  div.classList.add("hide");

  setTimeout(()=>{
   div.remove();
  },400);

 },4000);

}

window.showNotification = showNotification;