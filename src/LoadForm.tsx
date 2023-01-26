import { useState } from 'react';
import React from 'react';

type LoadFormProps = {
  onGo: (id: string) => void;
};
export function LoadForm({ onGo }: LoadFormProps) {
  const [url, setUrl] = useState('');
  const match = /sonix.ai\/r\/([^/]+)/.exec(url);
  const id = match?.[1];
  return (
    <div className="load">
      <input
        type="text"
        style={id === undefined ? { color: 'red' } : {}}
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.currentTarget.value)} />
      <button onClick={() => onGo(id!)}>Go</button>
    </div>
  );
}
