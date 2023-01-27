import { useState } from 'react';
import { parseSonixUrl } from './sonixData';

type LoadFormProps = {
  onGo: (id: string) => void;
};
export function LoadForm({ onGo }: LoadFormProps) {
  const [url, setUrl] = useState('');
  const id = parseSonixUrl(url);
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

