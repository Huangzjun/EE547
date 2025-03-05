const axios = require('axios');
const { ApiError, EntityNotFoundError } = require('./error');

class SpotifyApi {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.apiBaseUrl = "https://api.spotify.com/v1";
    }

    static async getAccessToken(clientId, clientSecret) {
        try {
            const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            const response = await axios.post(
                'https://accounts.spotify.com/api/token',
                'grant_type=client_credentials',
                {
                    headers: {
                        Authorization: `Basic ${authString}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );
            return response.data.access_token;
        } catch (error) {
            throw new ApiError("Failed to get access token.");
        }
    }

    async fetchData(url, callback) {
        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });
            callback(null, response.data);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                callback(new EntityNotFoundError("Resource not found."), null);
            } else {
                callback(new ApiError("Spotify API request failed."), null);
            }
        }
    }

    getAlbum(albumId, callback) {
        this.fetchData(`${this.apiBaseUrl}/albums/${albumId}`, callback);
    }

    searchAlbums(query, callback) {
        this.fetchData(`${this.apiBaseUrl}/search?type=album&q=${encodeURIComponent(query)}`, callback);
    }

    getTrack(trackId, callback) {
        this.fetchData(`${this.apiBaseUrl}/tracks/${trackId}`, callback);
    }

    searchTracks(query, callback) {
        this.fetchData(`${this.apiBaseUrl}/search?type=track&q=${encodeURIComponent(query)}`, callback);
    }

    getArtist(artistId, callback) {
        this.fetchData(`${this.apiBaseUrl}/artists/${artistId}`, callback);
    }

    getArtistTopTracks(artistId, marketCode, callback) {
        this.fetchData(`${this.apiBaseUrl}/artists/${artistId}/top-tracks?market=${marketCode}`, callback);
    }

    getPlaylist(playlistId, callback) {
        this.fetchData(`${this.apiBaseUrl}/playlists/${playlistId}`, callback);
    }
}

module.exports = { SpotifyApi };
