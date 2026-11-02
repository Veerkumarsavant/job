async function loadRanking(jobId) {
  const data = await api("/jobs/advanced-rank/" + jobId);

  const container = document.getElementById("ranking");

  container.innerHTML = "";

  data.forEach(c => {
    container.innerHTML += `
      <div>
        <b>${c.name}</b> - ${c.score}%
      </div>
    `;
  });
}