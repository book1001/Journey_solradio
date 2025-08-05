// ==================================================================
// 캐시
// ==================================================================
const CACHE_NAME = "music-player-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/index.css",
  "/index.js",
  // 필요한 기타 정적 자원들
];

// 설치 시 캐시 저장
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 활성화 시 이전 캐시 제거
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME)
      .map(key => caches.delete(key)))
    )
  );
});

// 네트워크 요청 가로채기 (캐시 우선 전략)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});


// ==================================================================
// Playlist
// ==================================================================
function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}


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
    resultDiv.style.display = "block";
    resultDiv.innerHTML = ""; // 기존 내용 초기화

    // 모달 박스 생성
    const modal = document.createElement("div");
    modal.id = "result-modal";
    
    // 모달 배경 생성
    const modalBg = document.createElement("div");
    modalBg.id = "result-bg";
    modalBg.addEventListener("click", () => {
      resultDiv.style.display = "none";
    });

    // 닫기 버튼 생성
    const closeBtn = document.createElement("button");
    closeBtn.id = "close";
    // closeBtn.classList.add("material-symbols-outlined");
    closeBtn.textContent = "close";
    closeBtn.addEventListener("click", () => {
      resultDiv.style.display = "none";
    });

    modal.appendChild(closeBtn); // 모달 안에 버튼 넣기

    // 트랙 리스트 추가
    tracks.forEach(track => {
      const div = document.createElement("div");
      div.innerHTML = `
        <div class="track-info">
          <p><strong>${track.name}</strong></p>
          <p>${track.artists.map(a => a.name).join(", ")}</p>
        </div>
        <button class="addBtn"><span class="material-symbols-outlined">add</span></button>
        <button class="playBtn" style="display: none;">Play</button>
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
          loadPlaylistTracks();
          resultDiv.style.display = "none";
        } catch (e) {
          console.error("추가 오류:", e.message);
        }
      });

      playBtn.addEventListener("click", () => {
        if (typeof playTrack === "function") {
          playTrack(track.uri);
        }
      });

      modal.appendChild(div); // 트랙을 모달에 추가
    });

    resultDiv.appendChild(modal); // 모달을 result 안에 추가
    resultDiv.appendChild(modalBg);

    // 검색창 초기화
    document.getElementById("searchInput").value = "";

  } catch (e) {
    console.error("검색 중 오류:", e.message);
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
        <!-- <img src="${track.album.images[2]?.url || ''}" alt="album cover" /> -->
        <div class="track-info">
          <p>${track.name} | ${track.artists.map(a => a.name).join(", ")}</p>
          <button class="deleteBtn"><span class="material-symbols-outlined"></span></button>
        </div>
        <audio controls src="${track.preview_url || ''}"></audio>
      `;

      const deleteBtn = div.querySelector(".deleteBtn");
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        try {
          const res = await fetchWithRetry("/delete-track", {
            method: "POST",
            body: JSON.stringify({ uri: track.uri })
          });

          if (!res.ok) throw new Error("삭제 실패");
          loadPlaylistTracks(); // UI 새로고침
        } catch (err) {
          alert("삭제 중 오류 발생: " + err.message);
        }
      });

      div.addEventListener("click", () => {
        window.playTrackAtIndex(idx);
      });
      container.appendChild(div);
    });

  } catch(e) {
    // alert("재생목록 불러오기 실패: " + e.message);
  }
}


document.getElementById("searchBtn").addEventListener("click", searchTracks);

document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchTracks();
  }
});

document.getElementById("close").addEventListener("click", () => {
  const resultDiv = document.getElementById("result");
  resultDiv.style.display = "none";
});

// window.onload = () => {
//   loadPlaylistTracks();           // 기존 onload 함수 1
//   fetchTotalPages(slug).then(() => {
//     goToPage(1); // 초기 로딩
//   });
// };

// window.onload = () => {
//   loadPlaylistTracks();
//   fetchTotalPages(slug).then(() => {
//     console.log("🎯 초기 totalPages:", totalPages);
//     goToPage(totalPages); // totalPages 세팅 후 호출
//   });
// };

window.onload = () => {
  loadPlaylistTracks(); // 있다면 유지
  fetchTotalPages(slug).then(() => {
    console.log("🎯 초기 totalPages:", totalPages);
    goToPage(totalPages);  // 최신 페이지로 이동
  });
};

// Spotify SDK 초기화
window.onSpotifyWebPlaybackSDKReady = () => {
  const token = sessionStorage.getItem("access_token");
  if (!token) {
    // alert("로그인이 필요합니다. 먼저 /login 으로 로그인하세요.");
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
  let isAdvancing = false;

  player.addListener('ready', ({ device_id }) => {
    console.log("✅ Web Playback SDK 연결됨 (Device ID):", device_id);
    currentDeviceId = device_id;
  });

  if (!isAndroid()) {
    player.addListener('player_state_changed', (state) => {
      if (!state || !state.track_window?.current_track) return;

      const { paused, position, track_window } = state;
      const currentTrackUri = track_window.current_track.uri;

      console.log("🎧 상태 변경 감지:", currentTrackUri, "position:", position, "paused:", paused);
      highlightPlayingTrack(currentTrackUri);

      if (isAdvancing) return;

      const songEnded = paused && position === 0;
      if (songEnded && playlistUris.length > 0) {
        isAdvancing = true;
        currentTrackIndex = (currentTrackIndex + 1) % playlistUris.length;
        const nextTrack = playlistUris[currentTrackIndex];
        lastTrackUri = nextTrack;

        console.log("⏭ 다음 곡 재생:", nextTrack, "index:", currentTrackIndex);

        playTrack(nextTrack).then(() => {
          isAdvancing = false;
        }).catch(err => {
          console.error("다음 곡 재생 실패:", err);
          isAdvancing = false;
        });
      } else {
        lastTrackUri = currentTrackUri;
      }
    });
  }

  player.connect();

  async function playTrack(trackUri, offsetMs = 0) {
    const android = isAndroid();
    const body = {
      uris: [trackUri],
      position_ms: offsetMs
    };
    const url = android
      ? `https://api.spotify.com/v1/me/player/play`
      : `https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`;
    try {
      const res = await fetch(url, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("재생 실패: " + await res.text());
      console.log(`🎵 재생 시작: ${trackUri} (position_ms: ${offsetMs})`);
      highlightPlayingTrack(trackUri);
      if (android) startPollingPlayerState();
    } catch (err) {
      // alert("재생 중 오류: " + err.message);
    }
  }

  window.resumeTrack = async () => {
    const android = isAndroid();
    const body = {
      uris: playlistUris,
      offset: { position: currentTrackIndex },
      position_ms: pausedPositionMs,
    };
    const url = android
      ? "https://api.spotify.com/v1/me/player/play"
      : `https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`;
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("재생 실패: " + await res.text());
      console.log(`▶ 이어서 전체 재생: index=${currentTrackIndex}, position=${pausedPositionMs}`);
      if (android) startPollingPlayerState();
    } catch (err) {
      // alert("이어 재생 실패: " + err.message);
    }
  };

  window.playAllTracks = (uris) => {
    playlistUris = uris;
    currentTrackIndex = 0;
    if (isAndroid()) {
      stopPollingPlayerState();
      playPlaylistOnAndroid(playlistUris, currentTrackIndex);
    } else {
      playTrack(playlistUris[currentTrackIndex]);
    }
  };

  async function playPlaylistOnAndroid(uris, index = 0) {
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          uris: uris,
          offset: { position: index },
          position_ms: 0,
        }),
      });
      if (!res.ok) throw new Error("재생 실패: " + await res.text());
      console.log("▶️ Android용 전체 재생 시작됨");
      startPollingPlayerState();
    } catch (err) {
      // alert("Android 재생 중 오류: " + err.message);
    }
  }

  window.pauseTrack = async () => {
    const android = isAndroid();
    const url = android
      ? "https://api.spotify.com/v1/me/player/pause"
      : `https://api.spotify.com/v1/me/player/pause?device_id=${currentDeviceId}`;
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      pausedPositionMs = data.progress_ms || 0;
      await fetch(url, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
      });
      console.log("⏸ 일시 중지 @", pausedPositionMs);
    } catch (err) {
      // alert("일시 중지 실패: " + err.message);
    }
  };

  window.stopTrack = async () => {
    await window.pauseTrack();
    stopPollingPlayerState();
    playlistUris = [];
    currentTrackIndex = 0;
    console.log("⏹ 재생 중지");
  };

  window.playTrackAtIndex = (index) => {
    if (index < 0 || index >= playlistUris.length) {
      // alert("잘못된 곡 인덱스입니다.");
      return;
    }
    currentTrackIndex = index;
    if (isAndroid()) {
      playPlaylistOnAndroid(playlistUris, currentTrackIndex);
    } else {
      playTrack(playlistUris[currentTrackIndex]);
    }
  };
};


// ==========================================================================================
let pollIntervalId = null;

function startPollingPlayerState() {
  stopPollingPlayerState(); // 중복 방지

  pollIntervalId = setInterval(async () => {
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player", {
        headers: {
          "Authorization": `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const currentTrackUri = data.item?.uri;
      const position = data.progress_ms;
      const duration = data.item?.duration_ms;
      const paused = data.is_playing === false;
      
      if (currentTrackUri && playlistUris.includes(currentTrackUri)) {
        const index = playlistUris.indexOf(currentTrackUri);
        if (index !== -1) {
          currentTrackIndex = index;
          highlightPlayingTrack(currentTrackUri); // ✅ 이 시점에 하이라이트
        }
      } else {
        console.warn("🔎 현재 트랙이 플레이리스트에 없습니다:", currentTrackUri);
      }

      // ✅ 현재 재생 중인 곡의 인덱스 추적
      const newIndex = playlistUris.indexOf(currentTrackUri);
      if (newIndex >= 0) {
        currentTrackIndex = newIndex;
      }

      // ✅ 다음 곡으로 자동 전환
      const songEnded = paused && position < 1000;
      if (songEnded && playlistUris.length > 0) {
        const nextIndex = (currentTrackIndex + 1) % playlistUris.length;
        console.log("⏭ Android 다음 곡으로:", playlistUris[nextIndex]);
        currentTrackIndex = nextIndex;
        await playPlaylistOnAndroid(playlistUris, nextIndex);
      }

    } catch (err) {
      console.warn("🎧 Android 상태 확인 실패:", err.message);
    }
  }, 2000);
}

function stopPollingPlayerState() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}


// ==========================================================================================

let isPlaying = false;
let playlistLoaded = false;

document.getElementById("playAllBtn").addEventListener("click", async () => {
  try {
    if (!playlistLoaded) {
      const res = await fetchWithRetry("/playlist-tracks");
      if (!res.ok) throw new Error("재생목록 불러오기 실패");

      const items = await res.json();
      const uris = items.map(item => item.track?.uri).filter(Boolean);
      if (!uris.length) {
        // alert("재생 가능한 곡이 없습니다.");
        return;
      }

      window.playAllTracks(uris); // 🔁 전체 재생 시작
      isPlaying = true;
      playlistLoaded = true;
      updatePlayAllButtonText();
      return;
    }

    if (isPlaying) {
      await window.pauseTrack();     // 🔁 일시정지
      isPlaying = false;
    } else {
      window.resumeTrack();          // 🔁 이어서 재생
      isPlaying = true;
    }

    updatePlayAllButtonText();

  } catch (e) {
    // alert("재생 실패: " + e.message);
  }
});

function updatePlayAllButtonText() {
  const icon = document.querySelector("#playAllBtn .material-symbols-outlined");
  if (icon) {
    icon.textContent = isPlaying ? "pause" : "play_arrow";
  }
}


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
          <!-- <img src="${track.album.images[2]?.url || ''}" alt="album cover" /> -->
          <div class="track-info">
            <p>${track.name} | ${track.artists.map(a => a.name).join(", ")}</p>
            <button class="deleteBtn"><span class="material-symbols-outlined"></span></button>
          </div>
        `;

        const deleteBtn = div.querySelector(".deleteBtn");
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();

          try {
            const res = await fetchWithRetry("/delete-track", {
              method: "POST",
              body: JSON.stringify({ uri: track.uri })
            });

            if (!res.ok) throw new Error("삭제 실패");
            loadPlaylistTracks(); // UI 새로고침
          } catch (err) {
            alert("삭제 중 오류 발생: " + err.message);
          }
        });

        div.addEventListener("click", () => {
          window.playTrackAtIndex(idx);
        });
        container.appendChild(div);
      });
    });
}

// 현재 곡 강조하는 함수
// function highlightPlayingTrack(trackUri) {
//   const currentlyPlayingEl = document.querySelector(".playing");
//   const currentHighlightedUri = currentlyPlayingEl?.getAttribute("data-uri");

//   if (currentHighlightedUri === trackUri) return; // 🛑 이미 강조된 곡이면 무시

//   document.querySelectorAll("[data-uri]").forEach(el => {
//     el.classList.remove("playing");
//   });

//   const current = document.querySelector(`[data-uri="${trackUri}"]`);
//   if (current) current.classList.add("playing");
// }


function highlightPlayingTrack(trackUri) {
  // 기존 강조 제거
  document.querySelectorAll("[data-uri]").forEach(el => {
    el.classList.remove("playing");

    // 이전 #playing span 제거 (중복 방지)
    const existingIndicator = el.querySelector("#playing");
    if (existingIndicator) existingIndicator.remove();
  });

  // 현재 재생 중인 항목 강조
  const current = document.querySelector(`[data-uri="${trackUri}"]`);
  if (current) {
    current.classList.add("playing");

    //#playing 표시 추가
    // const playingSpan = document.createElement("span");
    // playingSpan.id = "playing";
    // playingSpan.classList.add("material-symbols-outlined");
    // playingSpan.textContent = "•";
    // current.querySelector(".track-info")?.appendChild(playingSpan);
  }
}

// =============================●=============================================================
// TV
// ==========================================================================================
// let slug = 'sol-ra-dio';
let slug = 'twa-memories';
let page = 1; // 실제 보여주는 콘텐츠 인덱스 (1부터 시작)
let totalPages = 1; // 전체 콘텐츠 수 = 페이지 수 (콘텐츠 1개당 1페이지)
let buttonsPerPage = 14;

let arenaPage = 1; // Are.na API의 page=1, 2, 3...
let cachedContents = []; // 현재 arenaPage에서 받아온 100개 콘텐츠 캐시

// 실시간 동기화를 위한 전역 상태
// let currentSlug = slug;
// let currentPage = page;



// =============================================================
// TV: btns
// =============================================================




function goToPage(newPage) {
  console.log('▶ goToPage 호출:', newPage);
  page = newPage;
  arenaPage = Math.floor((page - 1) / 100) + 1;
  playNoiseAudio();
  loadArenaPage(slug, arenaPage);
}

document.getElementById('btn-N').addEventListener('click', () => goToPage(page - 1));
document.getElementById('btn-P').addEventListener('click', () => goToPage(page + 1));

  
// =============================================================
// 페이지 버튼 및 상태
// =============================================================

function btnPageCounter() {
  document.getElementById('btn-P').disabled = (page === totalPages);
  document.getElementById('btn-N').disabled = (page === 1);
}


function btnPages() {
  const paginationContainer = document.querySelector('.btn-pages');
  if (!paginationContainer) {
    console.warn('❌ paginationContainer가 없습니다.');
    return;
  }

  console.log("🎯 totalPages in btnPages:", totalPages);
  console.log("🎯 current page:", page);

  // 기존 숫자 버튼 제거 (이전/다음 버튼 제외)
  const oldButtons = Array.from(paginationContainer.querySelectorAll('button'));
  oldButtons.forEach(btn => {
    if (!['btn-P', 'btn-N'].includes(btn.id)) {
      btn.remove();
    }
  });

  const nextBtn = document.getElementById('btn-N');

  // 현재 페이지가 속한 블록 단위로 버튼 범위 계산
  // (예: page=103이면 [103~89], page=88이면 [88~74])
  const blockIndex = Math.floor((totalPages - page) / buttonsPerPage);
  const endPage = totalPages - blockIndex * buttonsPerPage;
  const startPage = Math.max(1, endPage - buttonsPerPage + 1);

  // 역순으로 버튼 생성
  for (let i = endPage; i >= startPage; i--) {
    const button = document.createElement('button');
    button.textContent = i;
    button.disabled = (i === page);
    button.addEventListener('click', () => goToPage(i));
    paginationContainer.insertBefore(button, nextBtn);
  }
}



// =============================================================
// 콘텐츠 불러오기
// =============================================================

function loadArenaPage(slug, arenaPage) {
  const url = `https://api.are.na/v2/channels/${slug}/contents?page=${arenaPage}&per=100`;
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      cachedContents = data.contents;

      // 마지막 페이지 감지: 100개 미만이면 그게 마지막 페이지
      if (data.contents.length < 100) {
        const accurateTotalPages = (arenaPage - 1) * 100 + data.contents.length;
        if (accurateTotalPages !== totalPages) {
          totalPages = accurateTotalPages;
          console.log("🎯 정확한 totalPages 갱신됨:", totalPages);

          // 현재 totalPages에 맞춰 다시 이동
          goToPage(totalPages);
          return; // 중복 처리 방지
        }
      }

      renderChannel(slug, page);
      btnPages();
      btnPageCounter();
    });
}



// function fetchTotalPages(slug) {
//   const url = `https://api.are.na/v2/channels/${slug}`;
//   return fetch(url)
//     .then(res => res.json())
//     .then(data => {
//       // ✅ 가능한 필드 모두 체크
//       totalPages = data.length || data.contents_count;

//       if (!totalPages) {
//         console.warn("❌ totalPages를 계산할 수 없습니다. 응답 구조를 확인해주세요.", data);
//       } else {
//         console.log("✅ totalPages 계산됨:", totalPages);
//       }
//     })
//     .catch(err => {
//       console.error("❌ totalPages 계산 실패:", err);
//     });
// }

function fetchTotalPages(slug) {
  const url = `https://api.are.na/v2/channels/${slug}`;
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      totalPages = data.length || data.contents_count;
      console.log("✅ totalPages 계산됨:", totalPages);
    })
    .catch(err => {
      console.error("❌ totalPages 계산 실패:", err);
    });
}



// =============================================================
// API: Content
// =============================================================

function renderChannel(slug, page) {
  const localIndex = (page - 1) % 100;
  const block = cachedContents[localIndex];
  if (!block) return;

  const picNumber = String(page).padStart(3, "0");
  const asciiArtList = [
`=============================

,_('--,       
   (.--; ,--')_,
     | ;--.)
 .-. |.| .-.
  |/|/
=============================`,
`wwwwwwwwwwwwwwwwwwwwwwwwwwwww
       ____
___    {__)_)
{_)_}   {__>__}
{__<__}.  (_(_}.  
(_)_)   |\|    
  |\|/|    \| /|.  
 ,.\|/.,,   |//..  
wwwwwwwwwwwwwwwwwwwwwwwwwwwww`,
`=============================
 __   _
 _(  )_( )_
(_   __    _)
(_) (__)
=============================`,
  ];

  let html = '';

  switch (block.class) {
    case "Image":
    case "Attachment":
      html = `
        <div class="img_screen">
          <div class="img_print">
            <img class="Block_img noise" src="img_tv/noise_4.gif">
            <img class="Block_img dithered" src="${block.image.large.url}"/>
          </div>
        </div>
        <textarea id="note" rows="3">
${block.title || ""}

${block.description || ""}
${asciiArtList[Math.floor(Math.random() * asciiArtList.length)]}
Sol-Ra.dio            Pic.${picNumber}</textarea>
      `;
      break;

    case "Text":
      html = `<p class="Block_text">${block.content}</p>`;
      break;

    case "Media":
    case "Link":
      html = `
        <div class="Block_loop">
          <img class="Block_loop_img_cover" src="img/noise.gif">
          <img class="Block_loop_img" style="transform: translate(0, -100%);" src="${block.image.large.url}">
          <img class="Block_loop_img" src="${block.image.large.url}">
          <img class="Block_loop_img" style="transform: translate(0, 100%);" src="${block.image.large.url}">
        </div>
      `;
      break;
  }

  const contents = document.getElementsByClassName("ARENA-container")[0];
  contents.innerHTML = `<div class="Block ${block.class}">${html}</div>`;
  applyDithering();
}


// ================================================
// 실시간 자동 업데이트 추가 (30초마다)
// ================================================

// setInterval(() => {
//   fetchTotalPages(currentSlug).then(() => {
//     renderChannel(currentSlug, currentPage);
//     btnPages();
//     btnPageCounter();
//   });
// }, 5000); // 30,000ms = 30초

// document.getElementById('refresh').addEventListener('click', function() {
//   playNoiseAudio();
//   fetchTotalPages(slug).then(() => {
//     renderChannel(slug, page);
//     btnPages();
//     btnPageCounter();
//   });
// });

document.getElementById('refresh').addEventListener('click', function () {
  playNoiseAudio();

  // 최신 페이지 번호 계산 후 이동
  fetchTotalPages(slug).then(() => {
    goToPage(totalPages);
  });
});


// ================================================
// Noise 재생
// ================================================
function playNoiseAudio() {
  const audio = document.getElementById('noise-audio');
  if (audio) {
    audio.currentTime = 0; // 항상 처음부터 재생
    audio.play().catch(e => {
      // 사용자 상호작용 없을 때는 play()가 실패할 수 있음 → 무시해도 됨
      console.warn("Audio play failed:", e);
    });
  }
}

//   "id": 76969,
//   "title": "The Working Sheepdog ( Border Collies ) in training",
//   "updated_at": "2020-04-07T21:59:29.806Z",
//   "created_at": "2013-02-12T22:40:15.696Z",
//   "state": "available",
//   "comment_count": 0,
//   "generated_title": "The Working Sheepdog ( Border Collies ) in training",
//   "content_html": "",
//   "description_html": "<p>Border Collie Collies working sheepdog Sheep dogs in training Scotland</p>",
//   "visibility": "public",
//   "content": "",
//   "description": "Border Collie Collies working sheepdog Sheep dogs in training Scotland",
//   "source": {},
//   "image": {},
//   "embed": {},
//   "attachment": null,
//   "metadata": null,
//   "base_class": "Block",
//   "class": "Media",
//   "user": {},
//   "position": 1,
//   "selected": false,
//   "connection_id": 716562,
//   "connected_at": "2016-05-16T00:59:42.901Z",
//   "connected_by_user_id": 128,
//   "connected_by_username": "Chris Sherrón", // ${block.connected_by_username}
//   "connected_by_user_slug": "chris-sherron"



// =============================================================
// Dithering
// =============================================================
function floydSteinbergDither(image, callback) {
  const targetWidth = 450;
  const scale = targetWidth / image.width;
  const targetHeight = Math.floor(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;
  const gray = new Array(targetWidth * targetHeight);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const i = y * targetWidth + x;
      const old = gray[i];
      const newPixel = old < 128 ? 0 : 255;
      const error = old - newPixel;
      gray[i] = newPixel;

      if (x + 1 < targetWidth) gray[i + 1] += error * 7 / 16;
      if (x > 0 && y + 1 < targetHeight) gray[i + targetWidth - 1] += error * 3 / 16;
      if (y + 1 < targetHeight) gray[i + targetWidth] += error * 5 / 16;
      if (x + 1 < targetWidth && y + 1 < targetHeight) gray[i + targetWidth + 1] += error * 1 / 16;
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const v = gray[i / 4] < 128 ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  callback(canvas.toDataURL());
}

// 렌더링 이후 디더링 적용
function applyDithering() {
  const images = document.querySelectorAll('img.dithered');
  images.forEach(img => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = img.src;
    image.onload = () => {
      floydSteinbergDither(image, dataURL => {
        img.src = dataURL;
      });
    };
  });
}

