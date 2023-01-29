import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import React from "react";
import { LoadForm } from "./LoadForm";
import { Exchange } from "./Exchange";
import { HistoryView } from "./HistoryView";
import { putHistoryRecord, HistoryRecord } from "./historyStore";
import { Content, fetchContent, TimeRange } from "./sonixData";

export type ExchangeWithRange = {
  // the speaker's name
  sn: string;
  // the total span of this segment
  ts: TimeRange;
  // the individual word starts
  ws: readonly [TimeRange, string][];
};

export type CurrentWord = {
  exch: TimeRange | undefined;
  word: TimeRange | undefined;
};

type TranscriptScreenProps = {
  playing: boolean;
  onSeekTo: (time: number) => void;
  title: string | undefined;
  scrollLock: boolean;
  setScrollLock: (v: boolean) => void;
  transcript: readonly ExchangeWithRange[] | undefined;
  current: CurrentWord | undefined;
  loadContent: (id: string) => Promise<void>;
};
export const TranscriptScreen = React.memo(function ({
  playing,
  onSeekTo,
  title,
  scrollLock,
  setScrollLock,
  current,
  transcript,
  loadContent,
}: TranscriptScreenProps) {
  const appElement = useRef<HTMLDivElement>(null);
  const lastScroll = useRef<number>(0);
  const onCurrent = useCallback(
    (rect: DOMRect, word: string) => {
      const app = appElement.current;
      if (!app) {
        return;
      }
      const top = app.scrollTop;
      const threshTop = app.clientHeight / 4;
      const threshBottom = threshTop * 3;
      if (!scrollLock && (rect.y > threshBottom || rect.y < threshTop)) {
        const scrollTarget = Math.round(Math.max(0, top + rect.y - threshTop));
        console.log("scrolling to", scrollTarget);
        app.scrollTo({ top: scrollTarget, behavior: "smooth" });
        // make it so that the scrolls for the next 200 ms are not considered to originate from the user
        lastScroll.current = new Date().getTime();
      }
    },
    [scrollLock],
  );

  return (
    <div
      className="app"
      ref={appElement}
      onScroll={(e) => {
        // if there hasn't been a scroll for a while, then assume this is manual
        // if we ever scroll automatically, we set last scroll just before so that
        // all scroll events coming immediately after are not considered manual
        // although, this is hacky, this overcomes the shortcoming of the tools
        // browsers give for dealing with scrolling
        const sinceLast = e.timeStamp - lastScroll.current;
        const isManual = sinceLast > 200;
        lastScroll.current = e.timeStamp;

        if (!scrollLock && isManual) {
          console.log("scroll set by user");
          setScrollLock(true);
        }
      }}>
      <h2>{title}</h2>

      <TranscriptView
        playing={playing}
        transcript={transcript}
        current={current}
        onCurrent={onCurrent}
        onSeekTo={onSeekTo}
      />

      <LoadForm
        onGo={(id) => {
          loadContent(id);
        }}
      />

      <HistoryView
        onGo={(id) => {
          loadContent(id);
        }}
      />
    </div>
  );
});

type TranscriptViewProps = {
  playing: boolean;
  transcript: readonly ExchangeWithRange[] | undefined;
  current: CurrentWord | undefined;
  onCurrent: (rect: DOMRect, word: string) => void;
  onSeekTo: (time: number) => void;
};
export const TranscriptView = React.memo(function ({
  playing,
  transcript,
  current,
  onCurrent,
  onSeekTo,
}: TranscriptViewProps) {
  return (
    <div className={classNames("transcript", { paused: !playing })}>
      {transcript?.map(({ sn, ts, ws }) => (
        <Exchange
          key={`${ts[0]}.${sn}`}
          sn={sn}
          ts={ts}
          ws={ws}
          currentWord={
            rangesEqual(ts, current?.exch) ? current?.word : undefined
          }
          onCurrent={onCurrent}
          onSeekTo={onSeekTo}
        />
      ))}
    </div>
  );
});

export function inRange(range: TimeRange, time: number) {
  return range[0] <= time && range[1] > time;
}

export function rangesEqual(
  r1: TimeRange | undefined,
  r2: TimeRange | undefined,
) {
  if (r1 === undefined || r2 === undefined) return false;
  return r1[0] === r2[0] && r1[1] === r2[1];
}

export function formatTimestamp(ts: number) {
  const totalSeconds = Math.floor(ts);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - totalHours * 60;
  const seconds = totalSeconds - totalMinutes * 60;
  return [totalHours, minutes, seconds]
    .map((c) => c.toString().padStart(2, "0"))
    .join(":");
}
