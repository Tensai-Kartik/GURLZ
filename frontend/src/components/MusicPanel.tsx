import './MusicPanel.css';

export default function MusicPanel() {
  const periodPlaylists = [
    {
      id: 'period-comfort',
      name: 'Period Comfort & Cramp Relief',
      description: 'Ultra-soothing acoustic & ambient tracks to unwind during your period',
      spotifyUrl: 'https://open.spotify.com/search/period%20comfort%20music',
      icon: '🌸',
      tag: 'Period Care',
    },
    {
      id: 'deep-sleep',
      name: 'Deep Sleep & Rain Soundscapes',
      description: 'Calming rain & delta wave frequencies for deep restorative sleep',
      spotifyUrl: 'https://open.spotify.com/search/deep%20sleep%20rain%20soundscape',
      icon: '💤',
      tag: 'Sleep',
    },
    {
      id: 'lofi-chill',
      name: 'Lo-Fi Chill & Warm Cozy Beats',
      description: 'Soft instrumental lo-fi beats perfect for relaxation and light journaling',
      spotifyUrl: 'https://open.spotify.com/search/lofi%20chill%20beats',
      icon: '🎧',
      tag: 'Relaxation',
    },
    {
      id: 'mood-boost',
      name: 'Hormonal Mood Boost & Serotonin',
      description: 'Uplifting indie pop & soft melodies to lift your spirits',
      spotifyUrl: 'https://open.spotify.com/search/mood%20booster%20serotonin',
      icon: '💖',
      tag: 'Mood Boost',
    },
  ];

  const musicPlatforms = [
    {
      name: 'Spotify',
      icon: '🟢',
      description: 'Stream free period wellness playlists, sleep soundscapes, and acoustic mixes.',
      url: 'https://open.spotify.com',
      btnText: 'Open Spotify',
      badgeColor: '#1ed760',
    },
    {
      name: 'Apple Music',
      icon: '🍎',
      description: 'Listen to Apple Music Chill, Acoustic Comfort, and Serotonin radio.',
      url: 'https://music.apple.com',
      btnText: 'Open Apple Music',
      badgeColor: '#fc3c44',
    },
    {
      name: 'YouTube Music',
      icon: '▶️',
      description: 'Stream 24/7 Lofi Girl beats, rain soundscapes, and mood boosters.',
      url: 'https://music.youtube.com',
      btnText: 'Open YouTube Music',
      badgeColor: '#ff0000',
    },
    {
      name: 'JioSaavn',
      icon: '🎵',
      description: 'Explore soft Indian acoustic unplugged, soothing flute, and yoga tunes.',
      url: 'https://www.jiosaavn.com',
      btnText: 'Open JioSaavn',
      badgeColor: '#2bc5b4',
    },
  ];

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="music-panel-container">
      {/* Header */}
      <div className="music-header glass-card">
        <h2>🎵 Soundscapes & Period Music Hub</h2>
        <p>Free open playlists for period cramp relief and deep relaxation, plus quick access to all major music streaming platforms.</p>
      </div>

      {/* SECTION 1: Main Curated Period Playlists */}
      <div className="music-section">
        <div className="section-title-row">
          <h3>🌸 Curated Period & Wellness Playlists</h3>
          <span className="section-badge">Free Open Playlists</span>
        </div>

        <div className="playlists-grid">
          {periodPlaylists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist-card glass-card"
              onClick={() => handleOpenUrl(playlist.spotifyUrl)}
            >
              <div className="playlist-card-top">
                <div className="playlist-icon">{playlist.icon}</div>
                <span className="playlist-tag">{playlist.tag}</span>
              </div>

              <div className="playlist-body">
                <h4 className="playlist-name">{playlist.name}</h4>
                <p className="playlist-desc">{playlist.description}</p>
              </div>

              <button className="spotify-main-btn">
                🟢 Listen on Spotify ↗
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Separate External Music Platform Redirects */}
      <div className="music-section">
        <div className="section-title-row">
          <h3>🎧 Streaming Music Platforms</h3>
          <span className="section-badge alt">External Redirects</span>
        </div>

        <div className="platforms-redirect-grid">
          {musicPlatforms.map((platform) => (
            <div key={platform.name} className="platform-card glass-card">
              <div className="platform-card-header">
                <span className="platform-brand-icon">{platform.icon}</span>
                <span
                  className="platform-pill-badge"
                  style={{ background: platform.badgeColor }}
                >
                  {platform.name}
                </span>
              </div>

              <div className="platform-card-body">
                <h4 className="platform-card-title">{platform.name}</h4>
                <p className="platform-card-desc">{platform.description}</p>
              </div>

              <button
                className="platform-redirect-btn"
                style={{ borderColor: platform.badgeColor }}
                onClick={() => handleOpenUrl(platform.url)}
              >
                <span>{platform.btnText}</span> ↗
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
