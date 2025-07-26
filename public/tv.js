let slug = 'fcumona-4ui';
let page = 0; // Initialize the page number
let totalPages = 1; // Initialize total pages
let buttonsPerPage = 4;

window.onload = function() {
  renderTitle(slug);
  fetchTotalPages(slug).then(() => {
    btnPages();         // 페이지 버튼만 보여주고
    btnPageCounter();   // 이전/다음 버튼 설정만 함
    // renderChannel(slug, page); 1 페이지 내용은 로드하지 않음
  });
};

// =============================================================
// Slug Change
// =============================================================

document.getElementById('TV-slug').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const inputValue = e.target.value.trim();
    
    try {
      const urlParts = inputValue.split('/');
      const lastPart = urlParts.filter(part => part !== '').pop(); // 마지막 / 뒤의 slug
      if (lastPart) {
        slug = lastPart;
        page = 0; 
        renderTitle(slug);
        fetchTotalPages(slug).then(() => {
          btnPages();
          btnPageCounter();
        });

        // 사운드 재생
        const tvOnSound = new Audio('sound/tvon.mp3');
        tvOnSound.play().catch(error => {
          console.warn('Audio playback failed:', error);
        });

      }
    } catch (error) {
      console.error("Invalid URL format");
    }
  }
});



// =============================================================
// TV: btns
// =============================================================

document.getElementById('btn-N').addEventListener('click', function() {
  page++;
  renderChannel(slug, page);
  btnPages();
  btnPageCounter();
});

document.getElementById('btn-P').addEventListener('click', function() {
  page--;
  renderChannel(slug, page);
  btnPages();
  btnPageCounter();
});

function btnPageCounter() {
  document.getElementById('btn-P').disabled = (page === 0 || page === 1);
  document.getElementById('btn-N').disabled = (page === totalPages);
}

let isAutoFlipping = false; // 토글 상태 저장
let autoFlipTimeout = null;

function btnPages() {
  const paginationContainer = document.querySelector('.btn-pages');
  paginationContainer.innerHTML = '';

  // 항상 고정되는 play 버튼
  const playButton = document.createElement('button');
  playButton.id = 'play';
  playButton.textContent = '☀︎';

  playButton.addEventListener('click', function () {
    const lalaland = document.getElementById('lalaland');
    const blockTitle = document.querySelector('.Block_title');
    if (blockTitle) blockTitle.style.display = 'none';

    if (!isAutoFlipping) {
      isAutoFlipping = true;
      playButton.classList.add('playing');
      if (lalaland) lalaland.play();

      // ✅ 재귀적으로 페이지 넘기기
      function autoFlipOnce() {
        page++;
        if (page > totalPages) {
          page = 1;
        }

        // ✅ renderChannel이 끝난 뒤 .Block_video 유무 확인
        renderChannel(slug, page).then(() => {
          btnPages();
          btnPageCounter();

        let delay = 3000; // 기본값

        // .delay숫자 클래스를 가진 요소를 찾기
        const delayElement = document.querySelector('[class*="delay"]');
        let delayClass;

        if (delayElement) {
          const classList = Array.from(delayElement.classList);
          delayClass = classList.find(cls => /^delay\d+$/.test(cls));
        }

        if (delayClass) {
          delay = parseInt(delayClass.replace('delay', ''), 10);
        } else if (document.querySelector('.short')) {
          delay = 1500;
        } else if (document.querySelector('.default')) {
          delay = 3000;
        } else if (document.querySelector('.middle')) {
          delay = 6000;
        } else if (document.querySelector('.long')) {
          delay = 9000;
        } else if (document.querySelector('.longest')) {
          delay = 12000;
        }

        if (isAutoFlipping) {
          autoFlipTimeout = setTimeout(autoFlipOnce, delay);
        }

        });
      }
      autoFlipOnce(); // 시작

    } else {
      isAutoFlipping = false;
      playButton.classList.remove('playing');
      if (lalaland) lalaland.pause();

      if (autoFlipTimeout) {
        clearTimeout(autoFlipTimeout); // 자동 넘김 중단
        autoFlipTimeout = null;
      }
    }
  });

  paginationContainer.appendChild(playButton);

  // 페이지 숫자 버튼들
  const startPage = Math.max(1, page - Math.floor(buttonsPerPage / 2));
  const endPage = Math.min(totalPages, startPage + buttonsPerPage - 1);

  for (let i = startPage; i <= endPage; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.disabled = (i === page);
    button.addEventListener('click', function () {
      page = i;
      renderChannel(slug, page);
      btnPages();
      btnPageCounter();
    });
    paginationContainer.appendChild(button);
  }
}



// =============================================================
// TV: play music + lyrics
// =============================================================

  const rawLyrics = [
    { time: "0:01", text: "(instrumental break)" },
    { time: "0:08", text: "Bab-bbapp-bbara" },
    
    { time: "0:15", text: "I think about that day" },
    { time: "0:17", text: "He left me in my room" },
    { time: "0:19", text: "closing the door" },
    { time: "0:20", text: "with the light" },
    { time: "0:21", text: "We were caught off guard" },
    { time: "0:23", text: "but he was sweet" },
    { time: "0:24", text: "and it was true" },
    { time: "0:25", text: "Still I did what I had to do" },
    { time: "0:29", text: "Cause I just knew" },

    { time: "0:31", text: "Summer Sunday nights" },
    { time: "0:33", text: "I’d sink into my bed" },
    { time: "0:34", text: "Right as they" },
    { time: "0:35", text: "dimmed out all the lights" },
    { time: "0:36", text: "A Technicolor" },
    { time: "0:38", text: "world made out of" },
    { time: "0:39", text: "music and machine" },
    { time: "0:40", text: "It called me to be" },
    { time: "0:41", text: "on that screen" },
    { time: "0:44", text: "And live inside each scene" },

    { time: "0:46", text: "Without even sun came up" },
    { time: "0:48", text: "Hopped a bus, here I came" },
    { time: "0:50", text: "Could be brave" },
    { time: "0:51", text: "or just insane" },
    { time: "0:52", text: "We'll have to see" },
    { time: "0:53", text: "Cause maybe in that" },
    { time: "0:54", text: "sleepy town" },
    { time: "0:55", text: "He'll sit one day," },
    { time: "0:56", text: "the lights are down" },
    { time: "0:57", text: "He'll see my face" },
    { time: "0:58", text: "and think of" },
    { time: "0:59", text: "how he used to know me" },

    { time: "1:01", text: "Behind these hills" },
    { time: "1:03", text: "I'm reaching for the heights" },
    { time: "1:05", text: "And chasing all the" },
    { time: "1:06", text: "lights that shine" },
    { time: "1:09", text: "And when they" },
    { time: "1:10", text: "let you down" },
    { time: "1:12", text: "(it's another day)" },
    { time: "1:13", text: "You'll get up off the ground" },
    { time: "1:15", text: "(it's another day)" },
    { time: "1:16", text: "Cause morning" },
    { time: "1:17", text: "rolls around" },
    { time: "1:19", text: "and it's another day of sun" },

    { time: "1:24", text: "I hear 'em everyday" },
    { time: "1:26", text: "The rhythms" },
    { time: "1:27", text: "in the canyons" },
    { time: "1:28", text: "that'll never fade away" },
    { time: "1:30", text: "The ballads in the barrooms" },
    { time: "1:31", text: "left by" },
    { time: "1:32", text: "those who came before" },
    { time: "1:33", text: "They say," },
    { time: "1:34", text: "You gotta want it more" },
    { time: "1:37", text: "So I bang on every door" },
    { time: "1:39", text: "And even when the answer's" },
    { time: "1:40", text: "No, or when" },
    { time: "1:41", text: "my money's running low" },
    { time: "1:43", text: "The dusty mic" },
    { time: "1:44", text: "and neon glow" },
    { time: "1:45", text: "Are all I need" },
    { time: "1:47", text: "And someday" },
    { time: "1:48", text: "as I sing a song" },
    { time: "1:49", text: "A small-town kid'll" },
    { time: "1:50", text: "come along" },
    { time: "1:51", text: "That'll be the thing" },
    { time: "1:52", text: "to push him on and go go" },

    { time: "1:55", text: "Behind these hills" },
    { time: "1:56", text: "I'm reaching for the heights" },
    { time: "1:58", text: "And chasing all the" },
    { time: "1:59", text: "lights that shine" },
    { time: "2:02", text: "And when they" },
    { time: "2:03", text: "let you down" },
    { time: "2:05", text: "(it's another day)" },
    { time: "2:06", text: "You'll get up off the ground" },
    { time: "2:08", text: "(it's another day)" },
    { time: "2:10", text: "Cause morning" },
    { time: "2:11", text: "rolls around" },
    { time: "2:12", text: "and it's another day of sun" },

    { time: "2:18", text: "(instrumental break)" },

    { time: "2:48", text: "And when they let you down" },
    { time: "2:52", text: "The morning rolls around" },
    { time: "2:55", text: "It's another day of sun" },

    { time: "3:04", text: "(sun, sun, sun)" },
    { time: "3:06", text: "It's another day of sun" },
    { time: "3:10", text: "Just another day of sun" },
    { time: "3:14", text: "It's another day of sun" },
    { time: "3:17", text: "The day has just begun" },
    { time: "3:23", text: "It's another day of sun" },

    { time: "3:25", text: " " },
    { time: "3:42", text: "It's another day of sun" },
    { time: "3:44", text: " " },
  ];

  function parseTime(time) {
    if (typeof time === 'number') return time;

    const parts = time.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  // 변환된 가사 배열
  const lyrics = rawLyrics.map(line => ({
    time: parseTime(line.time),
    text: line.text
  }));

  const lalaland = document.getElementById("lalaland");
  const lyricsContainer = document.getElementById("lyrics");
  const playButton = document.getElementById("play");

  let currentLine = 0;


  lalaland.addEventListener("timeupdate", () => {
    if (currentLine < lyrics.length && lalaland.currentTime >= lyrics[currentLine].time) {
      lyricsContainer.innerText = lyrics[currentLine].text;
      currentLine++;
    }
  });

  // ✅ 음악이 종료되면 자동 넘김 멈추기
  lalaland.addEventListener("ended", () => {
    isAutoFlipping = false;
    playButton.classList.remove("playing");
  });


  document.querySelector('.btn-pages').addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      const playInfo = document.getElementById('playInfo');
      const playInfoBg = document.getElementById('playInfoBg');
      if (playInfo) playInfo.style.opacity = '0';
      if (playInfoBg) playInfoBg.style.opacity = '0';
    }
  });



// =============================================================
// API: Basic
// =============================================================

function renderTitle(slug) {
  // Fetch the channel title from the Are.na API
  let url = `https://api.are.na/v2/channels/${slug}/collaborators`;

  fetch(url)
    .then(response => response.json())
    .then(data => document.title = data.channel_title);
}

function fetchTotalPages(slug) {
  let url = `https://api.are.na/v2/channels/${slug}`;
  return fetch(url)
    .then(response => response.json())
    .then(data => {
      let totalContents = data.length; // Get total contents
      let per = 1; // Number of contents per page
      totalPages = Math.ceil(totalContents / per); // Calculate total pages
    });
}



// =============================================================
// API: Content
// =============================================================

function renderChannel(slug, page) {
  // Add a loading message
  // let loading = `Loading...`;
  // document.body.innerHTML = loading;      

  // Fetch the channel data from the Are.na API
  let time = Date.now();
  let per = 1;
  let url = `https://api.are.na/v2/channels/${slug}/contents?t=${time}&direction=desc&sort=position&page=${page}&per=${per}`;


  return fetch(url, {cache: 'no-cache'})
    .then(response => response.json())
    .then(channel => {

      // Channel Info
      // document.body.innerHTML = `
      let elements = `${channel.contents.map(block => {
            // We are going to return HTML, mixed in with the data from the block.
            return `
              <div class="Block ${block.class}">

                ${(() => {
                  if (block.title && block.class !== 'Link' && block.class !== 'Channel') {
                    return `
                    <strong class="Block_title">${block.title}</strong>
                    `;
                  }

                  return ``;
                })()}


                ${(() => {
                  // Return a different bit of HTML, depending on what type of block it is
                  switch (block.class) {

                    // mp4, mp3
                    case "Attachment":
                      return `
                      <img class="Block_img" src="${block.image.large.url}"/>
                      <video class="Block_video" autoplay loop src="${block.attachment.url}"></video>
                      <img class="Block_img noise" src="img/noise.gif">
                      <p class="Block_description">${block.description}</p>
                      <audio autoplay src="sound/noise_short.mp3"></audio>
                      `;

                    // basic: text
                    case "Text":
                      return `
                      <img class="Block_img" src="img/noise.gif">
                      <div>
                        <p class="Block_text">${block.content}</p>
                      </div>
                      <p class="Block_description">${block.description}</p>
                      <audio autoplay src="sound/noise_short.mp3"></audio>
                      `;

                    // basic: image
                    case "Image":
                      return `
                      <img class="Block_img" src="${block.image.large.url}"/>
                      <img class="Block_img noise" src="img/noise.gif">
                      <p class="Block_description">${block.description}</p>
                      <audio autoplay src="sound/noise_short.mp3"></audio>
                      `;
                      
                    // iframe: Youtube  
                    case "Media":
                      return `
                      <div class="Block_loop">
                        <img class="Block_loop_img_cover" src="img/noise.gif">
                        <img class="Block_loop_img" style="transform: translate(0, -100%);" src="${block.image.large.url}">
                        <img class="Block_loop_img" src="${block.image.large.url}">
                        <img class="Block_loop_img" style="transform: translate(0, 100%);" src="${block.image.large.url}">
                        <p class="Block_description">${block.description}</p>
                        <audio autoplay loop src="sound/noise.mp3"></audio>
                      </div>
                      `;

                    // website
                    case "Link":
                      return `
                      <img class="Block_img" src="${block.image.large.url}"/>
                      <img class="Block_img noise" src="img/noise.gif">
                      <p class="Block_description">${block.description}</p>
                      <audio autoplay src="sound/noise_short.mp3"></audio>
                      `;
                      
                    case "Channel":
                      return `
                      `;
                  }
                })()}
              </div>
            `;
          }).join("")}`;
    
    let contents = document.getElementsByClassName("ARENA-container")[0];
    contents.innerHTML = elements; // Clear existing content and add new content

    // 🔇 mute 설정
    if (document.querySelector('.mute')) {
      const video = document.querySelector('.Block_video');
      if (video) {
        video.muted = true;
      }
    }

    // ⏩ speedUp 설정
    if (document.querySelector('.speedUp')) {
      const video = document.querySelector('.Block_video');
      if (video) {
        video.playbackRate = 1.2;
      }
    }
    
  })
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
//   "connected_by_username": "Chris Sherrón",
//   "connected_by_user_slug": "chris-sherron"


// =============================================================
// TV: Settings
// =============================================================

function SET_mono() {
  const videoElement = document.querySelector('.Block_video');
  const currentFilter = videoElement.style.filter;

  if (currentFilter === 'grayscale(100%)' || currentFilter === '') {
      videoElement.style.filter = 'grayscale(0%)';
  } else {
      videoElement.style.filter = 'grayscale(100%)';
  }
}