document
  .getElementById("analyzeBtn")
  .addEventListener("click", analyzeResume);

async function analyzeResume() {

  const btn = document.getElementById("analyzeBtn");
  const resultSection = document.getElementById("analysisResult");

  btn.innerText = "Analyzing...";
  btn.disabled = true;

  try {
    const result = await api("/ai/improve/me");

    resultSection.classList.remove("hidden");

    /* SCORE */
    document.getElementById("scoreBar")
      .style.width = result.score + "%";

    document.getElementById("scoreText")
      .innerText = result.score + "%";

    /* STRENGTHS */
    document.getElementById("strengthList")
      .innerHTML = result.strengths
        .map(s => `<li>${s}</li>`)
        .join("");

    /* IMPROVEMENTS */
    document.getElementById("improvementList")
      .innerHTML = result.improvements
        .map(i => `<li>${i}</li>`)
        .join("");

    /* KEYWORDS */
    document.getElementById("keywordSection")
      .innerHTML = result.missingKeywords
        .map(k => `<span class="keyword-badge">${k}</span>`)
        .join("");

  } catch (error) {
    alert("Analysis failed.");
  }

  btn.innerText = "Analyze Resume";
  btn.disabled = false;
}