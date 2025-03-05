const express = require("express");
const { SpotifyApi } = require("./spotifyApi");

const router = express.Router();
const accessToken = "BQAoMbFEoZiwn9SMJlWqSzT9MCTM88nkI_loQMZQgGrROYlRrWZE1toD8L9FKCpG2XTgqxtpNDa8dXd442-WdnkK_RtqOLoV7pRfp5cJCUULeNzalz777UDdcaVyTUINapFWXxLv33M";  
const spotifyApi = new SpotifyApi(accessToken);

router.get("/web", (req, res) => {
    res.render("index");
});
router.get("/web/search", (req, res) => {
    const { type, query } = req.query;

    if (!query) {
        return res.render("error", { message: "Search query cannot be empty", backLink: "/web" });
    }

    const searchMethods = {
        album: spotifyApi.searchAlbums,
        track: spotifyApi.searchTracks,
        artist: spotifyApi.getArtist,  
    };

    if (!searchMethods[type]) {
        return res.render("error", { message: "Invalid search type", backLink: "/web" });
    }

    searchMethods[type].call(spotifyApi, query, (err, results) => {
        if (err || !results) {
            return res.render("error", { message: "No results found", backLink: "/web" });
        }

        res.render("search", { type, query, results });
    });
});

router.get("/web/album", (req, res) => {
    const { id } = req.query;
    spotifyApi.getAlbum(id, (err, album) => {
        if (err) return res.render("error", { message: "Album not found", backLink: "/web" });
        res.render("album", { album });
    });
});

router.get("/web/track", (req, res) => {
    const { id } = req.query;
    spotifyApi.getTrack(id, (err, track) => {
        if (err) return res.render("error", { message: "Track not found", backLink: "/web" });
        res.render("track", { track });
    });
});

router.get("/web/artist", (req, res) => {
    const { id } = req.query;
    spotifyApi.getArtist(id, (err, artist) => {
        if (err) return res.render("error", { message: "Artist not found", backLink: "/web" });
        res.render("artist", { artist });
    });
});

module.exports = router;
