import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import React from 'react';
import { LoadForm } from './LoadForm';
import {Exchange} from './Exchange';
import { HistoryView } from './HistoryView';

export type Transcript = {
  striked: readonly unknown[];
  transcript: readonly Exchange[];
}

export type Exchange = {
  // the speaker's name
  sn: string;
  // the total span of this segment
  ts: readonly [number, number];
  // the individual word starts
  ws: readonly [number, string][];
}

export type ExchangeWithRange = {
  // the speaker's name
  sn: string;
  // the total span of this segment
  ts: TimeRange;
  // the individual word starts
  ws: readonly [TimeRange, string][];
}

export type TimeRange = readonly [number, number];

export type Content = {
  id: string;
  title: string;
  transcript: Transcript;
  mp3Url: string;
  startPos: number;
};

export type CurrentWord = {
  exch: TimeRange | undefined;
  word: TimeRange | undefined;
}

type HistoricRecord = {
  id: string,
  title: string,
  lastVisit: number,
}

type TranscriptScreenProps = {
  title: string | undefined;
  scrollLock: boolean;
  setScrollLock: (v: boolean) => void;
  transcript: readonly ExchangeWithRange[] | undefined;
  current: CurrentWord | undefined;
  setCurrent: (cb: (c: CurrentWord | undefined) => CurrentWord | undefined) => void;
  audioUrl: string | undefined;
  startPos: number | undefined;
  savePos: (pos: number) => void;
  setContent: (content: Content) => void;
};
export const TranscriptScreen = React.memo(function ({ title, scrollLock, setScrollLock, startPos, current, setCurrent, audioUrl, transcript, savePos, setContent }: TranscriptScreenProps) {
  const [playing, setPlaying] = useState(false);
  const appElement = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const interval = useRef<number>();
  const lastScroll = useRef<number>(0);
  const onCurrent = useCallback((rect: DOMRect, word: string) => {
    const app = appElement.current;
    if (!app) {
      return;
    }
    const top = app.scrollTop;
    const threshTop = app.clientHeight / 4;
    const threshBottom = threshTop * 3;
    if (!scrollLock && (rect.y > threshBottom || rect.y < threshTop)) {
      const scrollTarget = Math.round(Math.max(0, top + rect.y - threshTop));
      console.log('scrolling to', scrollTarget)
      app.scrollTo({ top: scrollTarget, behavior: 'smooth' });
      // make it so that the scrolls for the next 200 ms are not considered to originate from the user
      lastScroll.current = new Date().getTime();
    }
  }, [scrollLock]);
  const onSeekTo = useCallback((time: number) => {
    audio.current!.currentTime = time;
  }, [])
  useEffect(() => {
    let handle: number;
    const onFrame = (time: number) => {
      // we lead it by 0.2 seconds to account for render delay
      const now = (audio.current?.currentTime || 0) + 0.2;
      const exch = transcript?.find(e => inRange(e.ts, now));
      const word = exch?.ws.find(w => inRange(w[0], now));
      setCurrent(prev => {
        const nextVal = { exch: exch?.ts, word: word?.[0] };
        if (prev?.exch === nextVal.exch && prev?.word === nextVal.word)
          return prev;
        return nextVal;
      });
      handle = window.requestAnimationFrame(onFrame);
    };
    handle = window.requestAnimationFrame(onFrame);
    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [transcript, audio.current]);

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
          console.log('scroll set by user');
          setScrollLock(true);
        }
      }}>
      <h2>{title}</h2>
      <div className="player">
        <audio
          key={audioUrl}
          ref={audio}
          onPlay={() => {
            setPlaying(true);
            interval.current = setInterval(() => {
              const time = audio.current?.currentTime;
              if (time) {
                savePos(time);
              }
            }, 1000);
          }}
          onPause={() => {
            setPlaying(false);
            clearInterval(interval.current);
          }}
          controls>
          <source src={`${audioUrl}#t=${startPos || 0}`} />
        </audio>
        <button
          className={classNames({ active: scrollLock })}
          onClick={() => { setScrollLock(!scrollLock); }}>
          S
        </button>
      </div>

      <TranscriptView
        playing={playing}
        transcript={transcript}
        current={current}
        onCurrent={onCurrent}
        onSeekTo={onSeekTo}
      />

      <LoadForm onGo={(id) => {
        loadContent(id).then(c => {
          setContent(c);
        });
      }} />

      <HistoryView onGo={(id) => {
        loadContent(id).then(c => {
          setContent(c);
        });
      }}/>
    </div>
  );
});


type TranscriptViewProps = {
  playing: boolean;
  transcript: readonly ExchangeWithRange[] | undefined;
  current: CurrentWord | undefined;
  onCurrent: (rect: DOMRect, word: string) => void;
  onSeekTo: (time: number) => void;
}
export const TranscriptView = React.memo(function ({playing, transcript, current, onCurrent, onSeekTo}: TranscriptViewProps) {
  return (
    <div className={classNames("transcript", { paused: !playing })}>
      {transcript?.map(({ sn, ts, ws }) => (
        <Exchange
          key={`${ts[0]}.${sn}`}
          sn={sn}
          ts={ts}
          ws={ws}
          currentWord={rangesEqual(ts, current?.exch) ? current?.word : undefined}
          onCurrent={onCurrent}
          onSeekTo={onSeekTo} />
      ))}
    </div>
  )
})

export function inRange(range: TimeRange, time: number) {
  return range[0] <= time && range[1] > time;
}

export function rangesEqual(r1: TimeRange | undefined, r2: TimeRange | undefined) {
  if (r1 === undefined || r2 === undefined)
    return false;
  return r1[0] === r2[0] && r1[1] === r2[1];
}

export async function loadContent(id: string) {
  const filesUrl = `https://sonix.ai/embed/${id}/file.json`
  const transcriptUrl = `https://sonix.ai/embed/${id}/transcript.json`
  const filesResponse = await fetch(filesUrl);
  const files = await filesResponse.json();
  const title = files.name;
  const mp3Url = files.mp3Url;
  const transcriptResponse = await fetch(transcriptUrl);
  const transcript = await transcriptResponse.json();
  const startPos: number = JSON.parse(localStorage.getItem(`lastPos.${id}`) || "0");
  localStorage.setItem('lastId', JSON.stringify(id));
  const history = JSON.parse(localStorage.getItem('history') || "[]") as readonly HistoricRecord[];
  const lastVisit = new Date().getTime();
  const thisTime: HistoricRecord = {id, title, lastVisit}
  const nextHistory = [thisTime, ...history.filter(h => h.id !== id)];
  localStorage.setItem('history', JSON.stringify(nextHistory));
  const c: Content = {id, title, transcript, mp3Url, startPos};
  return c;
}

export function formatTimestamp(ts: number) {
  const totalSeconds = Math.floor(ts);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - totalHours * 60;
  const seconds = totalSeconds - totalMinutes * 60;
  return [totalHours, minutes, seconds].map(c => c.toString().padStart(2, '0')).join(':');
}

