import './MusicPanel.css';

export default function MusicPanel() {
  const playlists = [
    {
      name: 'Period Comfort & Cramp Relief',
      description: 'Ultra-soothing acoustic & ambient tracks to unwind during your period',
      spotifyUrl: 'https://open.spotify.com/genre/0JQ5DAqbMKFz6HBjeU41Z8',
      icon: '🌸',
      tag: 'Period Care',
    },
    {
      name: 'Deep Sleep & Rain Soundscapes',
      description: 'Calming rain & delta wave frequencies for deep restorative sleep',
      spotifyUrl: 'https://open.spotify.com/genre/0JQ5DAqbMKFCwBGxTHl9OL',
      icon: '💤',
      tag: 'Sleep',
    },
    {
      name: 'Lo-Fi Chill & Warm Cozy Beats',
      description: 'Soft instrumental lo-fi beats perfect for relaxation and light journaling',
      spotifyUrl: 'https://open.spotify.com/genre/0JQ5DAqbMKFCDnE8aU9A97',
      icon: '🎧',
      tag: 'Relaxation',
    },
    {
      name: 'Hormonal Mood Boost & Serotonin',
      description: 'Uplifting indie pop & soft melodies to lift your spirits',
      spotifyUrl: 'https://open.spotify.com/genre/0JQ5DAqbMKFz6HBjeU41Z8',
      icon: '💖',
      tag: 'Mood Boost',
    },
  ];

  const handleOpenSpotify = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="music-panel-container">
      <div className="music-header glass-card">
        <div className="spotify-badge">🟢 Spotify Curated</div>
        <h2>🎵 Calming Soundscapes & Music</h2>
        <p>Curated Spotify playlists for period comfort, deep relaxation, and mood boost.</p>
      </div>

      <div className="playlists-grid">
        {playlists.map((playlist, idx) => (
          <div key={idx} className="playlist-card glass-card" onClick={() => handleOpenSpotify(playlist.spotifyUrl)}>
            <div className="playlist-icon">{playlist.icon}</div>
            <div className="playlist-body">
              <span className="playlist-tag">{playlist.tag}</span>
              <h3 className="playlist-name">{playlist.name}</h3>
              <p className="playlist-desc">{playlist.description}</p>
            </div>
            <button className="spotify-open-btn">
              <span>Open Spotify</span> ↗
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
