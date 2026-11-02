const app = document.getElementById("app");

async function loadPage(url) {
  try {

    const res = await fetch(url);
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const content = doc.body.innerHTML;

    app.innerHTML = content;

    window.history.pushState({}, "", url);

} catch (err) {
    console.error("Page load error", err);
}

function highlightNav(url){

document.querySelectorAll(".navbar a")
.forEach(link=>{

    link.classList.remove("active");

    if(url.includes(link.getAttribute("href"))){
    link.classList.add("active");
    }

});

}
}

function handleLinkClick(e) {

  const link = e.target.closest("a");

  if (!link) return;

  const href = link.getAttribute("href");

  if (!href || href.startsWith("http")) return;

  e.preventDefault();

  loadPage(href);
}

document.addEventListener("click", handleLinkClick);

window.addEventListener("popstate", () => {
  loadPage(location.pathname);
});

//loadPage("/pages/feed.html");