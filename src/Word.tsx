import { useEffect, useRef } from "react";
import classNames from "classnames";
import React from "react";

type WordProps = {
  current: boolean;
  word: string;
  start: number;
  onCurrent: (rect: DOMRect, word: string) => void;
  onSeekTo: (time: number) => void;
  enableSelection: (value: boolean) => void;
};
export const Word = React.memo(function ({
  current,
  onSeekTo,
  start,
  word,
  onCurrent,
  enableSelection,
}: WordProps) {
  const spb = /^\s*/.exec(word)?.[0] || "";
  const spe = /\s*$/.exec(word)?.[0] || "";
  const trimmed = word.trim();
  const span = useRef<HTMLSpanElement>(null);
  const disableSeek = useRef(false);
  useEffect(() => {
    if (current) {
      span.current && onCurrent(span.current.getBoundingClientRect(), word);
    }
  }, [current]);
  return (
    <span
      onClick={() => {
        if (!disableSeek.current) {
          onSeekTo(start);
        }
      }}>
      {spb.length ? <span>{spb}</span> : null}
      <span
        ref={span}
        className={classNames("word", { current })}
        onTouchStartCapture={(e) => {
          // if something was already selected, this will be a de-select
          // we don't want this to result in a seek, so the user can safely touch to deselect
          // without seeking
          if (getSelection()?.rangeCount) {
            disableSeek.current = true;
          }
          // always deselect anything that was already selected
          getSelection()?.removeAllRanges();
          // and enable selection so that if this is the start of a long press
          // it will result in selection
          enableSelection(true);
        }}
        onTouchEnd={() => {
          // if we disabled the seek, re-enable it, but not immediately because click still hasn't fired
          if (disableSeek.current) {
            setTimeout(() => {
              disableSeek.current = false;
            }, 50);
          }
          // turn selection back off so that one-click selection doesn't occur
          // (don't know about other scenarios, but if chrome's translation interface is enbled,
          //  single clicks will select text which interferes with the behavior)
          enableSelection(false);
        }}>
        {trimmed}
      </span>
      {spe.length ? <span>{spe}</span> : null}
    </span>
  );
});
