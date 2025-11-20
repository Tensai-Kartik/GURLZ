import './MusicPanel.css';

export default function MusicPanel() {
  const playlists = [
    {
      name: 'Period Comfort',
      description: 'Soothing tracks for your cycle',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4Wsb4d7NKfP',
      image: '🎵',
    },
    {
      name: 'Calm & Relax',
      description: 'Peaceful melodies',
      spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4Wsb4d7NKfP',
      image: '🎶',
    },
  ];

  const handlePlay = (playlist: any) => {
    window.open(playlist.spotifyUrl, '_blank');
  };

  return (
    <div className="music-panel">
      <h2 className="view-title">Music</h2>
      <div className="playlists-grid">
        {playlists.map((playlist, idx) => (
          <div key={idx} className="playlist-card" onClick={() => handlePlay(playlist)}>
            <div className="playlist-image">{playlist.image}</div>
            <div className="playlist-info">
              <div className="playlist-name">{playlist.name}</div>
              <div className="playlist-description">{playlist.description}</div>
            </div>
            <button className="playlist-play-button">▶️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

