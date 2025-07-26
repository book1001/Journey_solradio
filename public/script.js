if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(registration => {
        console.log("Service Worker 등록 성공:", registration.scope);
      })
      .catch(error => {
        console.error("Service Worker 등록 실패:", error);
      });
  });
}


// =========================
document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = document.getElementById("searchInput").value;

  try {
    const res = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    if (res.status === 401) {
      alert("로그인되지 않았습니다. 먼저 Spotify 로그인을 해주세요.");
      return;
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error("Spotify 검색 실패: " + error);
    }

    const tracks = await res.json();

    if (!Array.isArray(tracks)) {
      throw new Error("Spotify returned invalid data");
    }

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";

    tracks.forEach(track => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("list");
      wrapper.innerHTML = `
        <p><strong>${track.name}</strong> by ${track.artists.map(a => a.name).join(", ")}</p>
        <button>+</button>
        <!-- <iframe src="https://open.spotify.com/embed/track/${track.id}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe> -->
      `;
      const button = wrapper.querySelector("button");
      button.addEventListener("click", async () => {
        await fetch("/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uri: track.uri })
        });
        alert(`"${track.name}"이 재생목록에 추가되었습니다.`);
        loadPlaylistTracks();
        playTrack(track.uri); // 🎵 바로 재생!
      });
      resultDiv.appendChild(wrapper);
    });

  } catch (err) {
    console.error("Search error:", err);
    alert("검색 중 오류가 발생했습니다: " + err.message);
  }
});
