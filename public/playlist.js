async function fetchWithRetry(url, options = {}) {
  let token = sessionStorage.getItem("access_token");
  if (!token) throw new Error("로그인이 필요합니다.");

  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  let res = await fetch(url, options);

  // 토큰 만료시 자동 갱신 후 재시도
  if (res.status === 401) {
    const refreshRes = await fetch("/refresh-token");
    if (!refreshRes.ok) throw new Error("토큰 갱신 실패");

    const data = await refreshRes.json();
    sessionStorage.setItem("access_token", data.access_token);
    options.headers.Authorization = `Bearer ${data.access_token}`;

    res = await fetch(url, options); // 재시도
  }

  return res;
}


async function searchTracks() {
  const query = document.getElementById("searchInput").value;
  try {
    const res = await fetchWithRetry("/search", {
      method: "POST",
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("검색 실패: " + errorText);
    }

    const tracks = await res.json();
    if (!Array.isArray(tracks)) throw new Error("잘못된 데이터 형식");

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";

    tracks.forEach(track => {
      const div = document.createElement("div");
      div.innerHTML = `
        <img src="${track.album.images[2]?.url || ''}" alt="album cover" />
        <div class="track-info">
          <p><strong>${track.name}</strong></p>
          <p>${track.artists.map(a => a.name).join(", ")}</p>
        </div>
        <button class="addBtn">Add to Playlist</button>
        <button class="playBtn">Play</button>
      `;

      const addBtn = div.querySelector(".addBtn");
      const playBtn = div.querySelector(".playBtn");

      addBtn.addEventListener("click", async () => {
        try {
          const res = await fetchWithRetry("/add", {
            method: "POST",
            body: JSON.stringify({ uri: track.uri })
          });
          if (!res.ok) throw new Error("추가 실패");
          alert(`"${track.name}"이 재생목록에 추가되었습니다.`);
          loadPlaylistTracks();
        } catch(e) {
          alert("추가 중 오류 발생: " + e.message);
        }
      });

      playBtn.addEventListener("click", () => {
        if (typeof playTrack === "function") {
          playTrack(track.uri);
        } else {
          alert("플레이어가 아직 준비되지 않았습니다.");
        }
      });

      resultDiv.appendChild(div);
    });

  } catch (e) {
    alert("검색 중 오류 발생: " + e.message);
  }
}


async function loadPlaylistTracks() {
  try {
    const res = await fetchWithRetry("/playlist-tracks");

    if (!res.ok) throw new Error("재생목록 불러오기 실패");

    const items = await res.json();
    const container = document.getElementById("playlistContainer");
    container.innerHTML = "";

    items.forEach(({ track }, idx) => {
      const div = document.createElement("div");
      div.classList.add("track-item");
      div.setAttribute("data-uri", track.uri);
      div.innerHTML = `
        <img src="${track.album.images[2]?.url || ''}" alt="album cover" />
        <div class="track-info">
          <p><strong>${track.name}</strong></p>
          <p>${track.artists.map(a => a.name).join(", ")}</p>
        </div>
        <audio controls src="${track.preview_url || ''}"></audio>
      `;
      div.addEventListener("click", () => {
        window.playTrackAtIndex(idx);
      });
      container.appendChild(div);
    });

  } catch(e) {
    alert("재생목록 불러오기 실패: " + e.message);
  }
}



document.getElementById("searchBtn").addEventListener("click", searchTracks);

// 페이지 로드 시 재생목록 불러오기
window.onload = loadPlaylistTracks;

// 📁 public/playback.js


window.onSpotifyWebPlaybackSDKReady = () => {
  const token = sessionStorage.getItem("access_token");
  if (!token) {
    alert("로그인이 필요합니다. 먼저 /login 으로 로그인하세요.");
    return;
  }

  const player = new Spotify.Player({
    name: "Shared Party Web Player",
    getOAuthToken: cb => { cb(token); },
    volume: 0.8,
  });

  let currentDeviceId = null;
  let playlistUris = [];
  let currentTrackIndex = 0;
  let isPaused = true;
  let pausedPositionMs = 0;
  let lastTrackUri = null;

  player.addListener('ready', ({ device_id }) => {
    console.log("✅ Web Playback SDK 연결됨 (Device ID):", device_id);
    currentDeviceId = device_id;
  });

  player.addListener('player_state_changed', (state) => {
    if (!state || !state.track_window?.current_track) return;

    const { paused, position, duration, track_window } = state;
    const currentTrackUri = track_window.current_track.uri;

    highlightPlayingTrack(currentTrackUri);

    // ✅ 트랙이 거의 끝났으면 다음 트랙 재생
    if (!paused && position >= duration - 1000 && playlistUris.length > 0) {
      currentTrackIndex = (currentTrackIndex + 1) % playlistUris.length;
      playTrack(playlistUris[currentTrackIndex]);
    }
  });

  player.connect();

  async function playTrack(trackUri, offsetMs = 0) {
    if (!currentDeviceId) {
      alert("플레이어가 준비되지 않았습니다.");
      return;
    }

    try {
      const body = offsetMs > 0 
        ? { uris: [trackUri], position_ms: offsetMs }
        : { uris: [trackUri] };

      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error("재생 실패: " + err);
      }

      isPaused = false;
      pausedPositionMs = 0;
      console.log("🎵 재생 시작:", trackUri, "offset(ms):", offsetMs);

      highlightPlayingTrack(trackUri);
    } catch (err) {
      alert("재생 중 오류: " + err.message);
    }
  }

  window.playAllTracks = (uris) => {
    if (!Array.isArray(uris) || uris.length === 0) {
      alert("재생할 곡이 없습니다.");
      return;
    }
    playlistUris = uris;
    if (isPaused && pausedPositionMs > 0) {
      playTrack(playlistUris[currentTrackIndex], pausedPositionMs);
    } else {
      currentTrackIndex = 0;
      playTrack(playlistUris[currentTrackIndex]);
    }
  };

  window.pauseTrack = async () => {
    if (!currentDeviceId) {
      alert("플레이어가 준비되지 않았습니다.");
      return;
    }
    try {
      await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${currentDeviceId}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
      });
      isPaused = true;
      console.log("⏸ 일시 중지");
    } catch (err) {
      alert("일시 중지 실패: " + err.message);
    }
  };

  window.stopTrack = async () => {
    await window.pauseTrack();
    playlistUris = [];
    currentTrackIndex = 0;
    pausedPositionMs = 0;
    console.log("⏹ 재생 중지");
  };

  window.playTrackAtIndex = (index) => {
    if (index < 0 || index >= playlistUris.length) {
      alert("잘못된 곡 인덱스입니다.");
      return;
    }
    currentTrackIndex = index;
    pausedPositionMs = 0;
    playTrack(playlistUris[currentTrackIndex]);
  };
};


// ==========================================================================================

document.getElementById("playAllBtn").addEventListener("click", async () => {
  try {
    const res = await fetchWithRetry("/playlist-tracks");

    if (!res.ok) throw new Error("재생목록 불러오기 실패");

    const items = await res.json();
    const uris = items.map(item => item.track?.uri).filter(Boolean);
    if (!uris.length) {
      alert("재생 가능한 곡이 없습니다.");
      return;
    }

    window.playAllTracks(uris);
  } catch (e) {
    alert("재생 실패: " + e.message);
  }
});


document.getElementById("pauseBtn").addEventListener("click", () => {
  window.pauseTrack();
});

document.getElementById("stopBtn").addEventListener("click", () => {
  window.stopTrack();
});

// 재생목록에서 특정 곡 클릭 시
function loadPlaylistTracks() {
  fetch("/playlist-tracks")
    .then(res => res.json())
    .then(items => {
      const container = document.getElementById("playlistContainer");
      container.innerHTML = "";
      items.forEach(({ track }, idx) => {
        const div = document.createElement("div");
        div.classList.add("track-item");
        div.setAttribute("data-uri", track.uri); 

        div.innerHTML = `
          <img src="${track.album.images[2]?.url || ''}" alt="album cover" />
          <div class="track-info">
            <p><strong>${track.name}</strong></p>
            <p>${track.artists.map(a => a.name).join(", ")}</p>
          </div>
        `;
        div.addEventListener("click", () => {
          window.playTrackAtIndex(idx);
        });
        container.appendChild(div);
      });
    });
}

// 현재 곡 강조하는 함수
function highlightPlayingTrack(trackUri) {
  document.querySelectorAll("[data-uri]").forEach(el => {
    el.classList.remove("playing");
  });
  const current = document.querySelector(`[data-uri="${trackUri}"]`);
  if (current) current.classList.add("playing");
} 

// 초기 로드 시
window.onload = () => {
  loadPlaylistTracks();
};
