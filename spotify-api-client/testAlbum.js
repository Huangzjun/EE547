const { SpotifyApi } = require('./spotifyApi');

(async () => {
    const accessToken = "BQAoMbFEoZiwn9SMJlWqSzT9MCTM88nkI_loQMZQgGrROYlRrWZE1toD8L9FKCpG2XTgqxtpNDa8dXd442-WdnkK_RtqOLoV7pRfp5cJCUULeNzalz777UDdcaVyTUINapFWXxLv33M";
    const spotifyApi = new SpotifyApi(accessToken);

    spotifyApi.getAlbum("1o0fk2vc2b0IzGX8QpKYrZ", (err, album) => {
        if (err) {
            console.error("Error:", err.message);
        } else {
            console.log("Album:", album);
        }
    });
})();
