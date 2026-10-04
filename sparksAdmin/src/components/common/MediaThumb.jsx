import { useState } from 'react';

/**
 * Card media area: thumbnail image → first frame of the video → plain
 * background. Many reels/courses have no thumbnail, which used to leave an
 * empty dark box. `children` render on top (play button, badges).
 */
const MediaThumb = ({ thumbnail, videoUrl, height, background = '#090d16', children }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = thumbnail && !imgFailed;

  return (
    <div
      style={{
        height,
        backgroundColor: background,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showImg ? (
        <img
          src={thumbnail}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : videoUrl ? (
        // #t=1 makes the browser fetch just enough to paint a frame at 1s.
        <video
          src={`${videoUrl}#t=1`}
          preload="metadata"
          muted
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        />
      ) : null}
      {children}
    </div>
  );
};

export default MediaThumb;
