const express = require("express");
const request = require("request");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "spotify-shared-secret",
  resave: false,
  saveUninitialized: true,
}));

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
const shared_playlist_id = process.env.SHARED_PLAYLIST_ID;

app.get("/login", (req, res) => {
  const scope = "streaming user-read-email user-read-private playlist-modify-public playlist-modify-private user-modify-playback-state";
  res.redirect(
    `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&scope=${scope}`
  );
});

app.get("/callback", (req, res) => {
  const code = req.query.code || null;

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (error || !body.access_token) {
      console.error("⚠️ Failed to get access token:", error || body);
      return res.status(500).send("Authentication failed");
    }

    // ✅ 서버 세션에 저장
    req.session.access_token = body.access_token;
    req.session.refresh_token = body.refresh_token;

    // ✅ 클라이언트 sessionStorage에도 저장
    res.send(`
      <script>
        sessionStorage.setItem("access_token", "${body.access_token}");
        window.location.href = "/";
      </script>
    `);
  });
});


app.get("/refresh-token", (req, res) => {
  const refresh_token = req.session.refresh_token;
  if (!refresh_token) return res.status(400).send("No refresh token");

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    headers: {
      Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    json: true,
  };

  request.post(authOptions, (err, response, body) => {
    if (err || !body.access_token) {
      console.error("🔁 Failed to refresh token:", err || body);
      return res.status(500).send("Could not refresh token");
    }

    // 기존 세션 갱신
    req.session.access_token = body.access_token;
    res.json({ access_token: body.access_token });
  });
});


app.post("/search", (req, res) => {
  const token = req.session.access_token;

  if (!token) {
    console.error("❌ No token found in session");
    return res.status(401).json({ error: "Unauthorized: Please login first" });
  }

  const query = req.body.query;
  request.get({
    url: `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
    headers: { Authorization: "Bearer " + token },
    json: true,
  }, (err, _, body) => {
    if (err || !body.tracks || !Array.isArray(body.tracks.items)) {
      console.error("❌ Invalid response from Spotify:", body);
      return res.status(500).json({ error: "Spotify search failed" });
    }

    res.json(body.tracks.items);
  });
});


app.post("/add", (req, res) => {
  const token = req.session.access_token;
  if (!token) return res.status(401).send("User not logged in");

  const trackUri = req.body.uri;
  request.post({
    url: `https://api.spotify.com/v1/playlists/${shared_playlist_id}/tracks`,
    headers: { Authorization: "Bearer " + token },
    body: { uris: [trackUri] },
    json: true,
  }, (err, _, body) => {
    if (err) return res.status(500).send(err);
    res.json(body);
  });
});


app.get("/create-playlist", (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) return res.status(401).send("Login first");

  request.get({
    url: "https://api.spotify.com/v1/me",
    headers: { Authorization: "Bearer " + access_token },
    json: true,
  }, (err, _, user) => {
    const userId = user.id;
    request.post({
      url: `https://api.spotify.com/v1/users/${userId}/playlists`,
      headers: { Authorization: "Bearer " + access_token },
      body: {
        name: "Sol–Ra.dio",
        public: true,
      },
      json: true,
    }, (err, _, playlist) => {
      playlist_id = playlist.id;
      res.json(playlist);
    });
  });
});

// 재생목록 트랙들 가져오기
app.get("/playlist-tracks", (req, res) => {
  const token = req.session.access_token;
  if (!token) {
    console.log("No access token in session");
    return res.status(401).send("Not logged in");
  }

  request.get({
    url: `https://api.spotify.com/v1/playlists/${shared_playlist_id}/tracks`,
    headers: { Authorization: "Bearer " + token },
    json: true,
  }, (err, response, body) => {
    if (err) {
      console.error("Spotify API request error:", err);
      return res.status(500).send("Failed to fetch playlist tracks");
    }
    if (response.statusCode !== 200) {
      console.error("Spotify API response status:", response.statusCode, body);
      return res.status(response.statusCode).send(body);
    }
    if (!body.items) {
      console.error("No items in Spotify response body", body);
      return res.status(500).send("No playlist items");
    }
    res.json(body.items);
  });
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Listening on http://localhost:${PORT}`);
});

// const PORT = 8888;
// app.listen(PORT, () => {
//   console.log(`Listening on http://localhost:${PORT}`);
// });
