const { SpotifyApi } = require('./spotifyApi');

(async () => {
    const accessToken = "BQAoMbFEoZiwn9SMJlWqSzT9MCTM88nkI_loQMZQgGrROYlRrWZE1toD8L9FKCpG2XTgqxtpNDa8dXd442-WdnkK_RtqOLoV7pRfp5cJCUULeNzalz777UDdcaVyTUINapFWXxLv33M";
    const spotifyApi = new SpotifyApi(accessToken);

    spotifyApi.getArtist("0TnOYISbd1XYRBk9myaseg", (err, artist) => {
        if (err) {
            console.error("Error:", err.message);
        } else {
            console.log("Artist:", artist);
        }
    });
})();
