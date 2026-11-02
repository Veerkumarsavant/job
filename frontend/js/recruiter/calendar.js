const token = localStorage.getItem("accessToken");

document.addEventListener("DOMContentLoaded", async () => {

  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",

    events: async function(fetchInfo, successCallback) {

      const res = await fetch("/api/interviews", {
        headers: { Authorization: "Bearer " + token }
      });

      const data = await res.json();

      const events = data.map(i => ({
        title: `${i.candidate.name} - ${i.job.title}`,
        start: i.date
      }));

      successCallback(events);
    },

    dateClick: function(info) {
      const selectedDate = info.dateStr;
      window.location.href =
        `/recruiter/interviews.html?date=${selectedDate}`;
    }

  });

  calendar.render();
});