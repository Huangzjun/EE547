const { SpotifyApi } = require('./spotifyApi');

(async () => {
    const clientId = "cda3ae4d360a4743b54cad60d7f8fa2f";
    const clientSecret = "5e2208dcf0854cb9af22ceb074c0eff3";

    try {
        const accessToken = await SpotifyApi.getAccessToken(clientId, clientSecret);
        console.log("Access Token:", accessToken);
    } catch (error) {
        console.error("Error:", error.message);
    }
})();
