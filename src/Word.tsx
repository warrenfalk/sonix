import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import React from 'react';

type WordProps = {
  current: boolean;
  word: string;
  start: number;
  onCurrent: (rect: DOMRect, word: string) => void;
  onSeekTo: (time: number) => void;
};
export const Word = React.memo(function ({ current, onSeekTo, start, word, onCurrent }: WordProps) {
  const spb = /^\s*/.exec(word)?.[0] || '';
  const spe = /\s*$/.exec(word)?.[0] || '';
  const trimmed = word.trim();
  const span = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (current) {
      span.current && onCurrent(span.current.getBoundingClientRect(), word);
    }
  }, [current]);
  return (
    <span onClick={() => onSeekTo(start)}>
      {spb.length ? <span>{spb}</span> : null}
      <span
        ref={span}
        className={classNames("word", { current })}>
        {trimmed}
      </span>
      {spe.length ? <span>{spe}</span> : null}
    </span>
  );
});
