let slug = 'fcumona-4ui';
let page = 1; // Initialize the page number
let totalPages = 1; // Initialize total pages
let buttonsPerPage = 20;

window.onload = function() {
  renderTitle(slug);
  fetchTotalPages(slug).then(() => {
    renderChannel(slug, page);
    btnPages();
    btnPageCounter();
  });
}



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
  document.getElementById('btn-P').disabled = (page === 1);
  document.getElementById('btn-N').disabled = (page === totalPages);
}

function btnPages() {
  const paginationContainer = document.querySelector('.btn-pages');
  paginationContainer.innerHTML = ''; // Clear existing buttons

  const startPage = Math.max(1, page - Math.floor(buttonsPerPage / 2));
  const endPage = Math.min(totalPages, startPage + buttonsPerPage - 1);

  for (let i = startPage; i <= endPage; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.disabled = (i === page);
    button.addEventListener('click', function() {
      page = i;
      renderChannel(slug, page);
      btnPages();
      btnPageCounter();
    });
    paginationContainer.appendChild(button);
  }
}



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


  fetch(url, {cache: 'no-cache'})
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
                      <img class="Block_img" src="img/noise_mp34.gif">
                      <video class="Block_video" autoplay loop src="${block.attachment.url}"></video>
                      `;

                    // basic: text
                    case "Text":
                      return `
                      <p class="Block_text">${block.content}</p>
                      `;

                    // basic: image
                    case "Image":
                      return `
                      <img class="Block_img dithered" src="${block.image.large.url}"/>
                      <input type="text" value="${block.description}" style="font-size: 30px;">
                      <p class="Block_text">${block.content}</p>
                      `;
                      
                    // iframe: Youtube  
                    case "Media":
                      return `
                      <div class="Block_loop">
                        <img class="Block_loop_img_cover" src="img/noise.gif">
                        <img class="Block_loop_img" style="transform: translate(0, -100%);" src="${block.image.large.url}">
                        <img class="Block_loop_img" src="${block.image.large.url}">
                        <img class="Block_loop_img" style="transform: translate(0, 100%);" src="${block.image.large.url}">
                        <audio autoplay loop src="sound/noise.mp3"></audio>
                      </div>
                      `;

                    // website
                    case "Link":
                      return `
                      <div class="Block_loop">
                        <img class="Block_loop_img_cover" src="img/noise.gif">
                        <img class="Block_loop_img" style="transform: translate(0, -100%);" src="${block.image.large.url}">
                        <img class="Block_loop_img" src="${block.image.large.url}">
                        <img class="Block_loop_img" style="transform: translate(0, 100%);" src="${block.image.large.url}">
                        <audio autoplay loop src="sound/noise.mp3"></audio>
                      </div>
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
    applyDithering();
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