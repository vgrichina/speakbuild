import { LiveKitRoom } from '@livekit/react-native';
import React from 'react';

export const UltravoxRoom = ({ url, token, children }) => {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      options={{
        adaptiveStream: { pixelDensity: 'screen' },
      }}
      audio={true}
      video={false}
    >
      {children}
    </LiveKitRoom>
  );
};
