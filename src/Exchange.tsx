import React, { useState } from 'react';
import { Word } from './Word';
import { TimeRange, formatTimestamp, rangesEqual } from './TranscriptScreen';

type ExchangeProps = {
  currentWord: TimeRange | undefined;
  ts: TimeRange;
  sn: string;
  ws: readonly [TimeRange, string][];
  onCurrent: (rect: DOMRect, word: string) => void;
  onSeekTo: (time: number) => void;
};
export const Exchange = React.memo(function ({ ts, sn, ws, currentWord, onCurrent, onSeekTo }: ExchangeProps) {
  const [selectable, setSelectable] = useState(false);
  return (
    <div className="exchange">
      <div className="meta">
        <div className="speakerName">{sn}</div>
        <div className="time">{formatTimestamp(ts[0])}</div>
      </div>
      <div className="content" style={{userSelect: selectable === false ? "none" : "text"}}>
        <p className="text">
          {ws.map(([range, word], i) => (
            <Word
              start={range[0]}
              onSeekTo={onSeekTo}
              key={i}
              current={rangesEqual(range, currentWord)}
              word={word}
              onCurrent={onCurrent}
              enableSelection={(value) => {
                setSelectable(value);
              }}
            />
          ))}
        </p>
      </div>
    </div>
  );
});
