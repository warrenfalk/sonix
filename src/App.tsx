import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import './App.css'
import React from 'react';

type Transcript = {
  striked: readonly unknown[];
  transcript: readonly Exchange[];
}

type Exchange = {
  // the speaker's name
  sn: string;
  // the total span of this segment
  ts: readonly [number, number];
  // the individual word starts
  ws: readonly [number, string][];
}

type ExchangeWithRange = {
  // the speaker's name
  sn: string;
  // the total span of this segment
  ts: TimeRange;
  // the individual word starts
  ws: readonly [TimeRange, string][];
}

type TimeRange = readonly [number, number];

type Content = {
  id: string;
  transcript: Transcript;
  mp3Url: string;
  startPos: number;
};

//const exchanges: readonly Exchange[] = (json as unknown as Transcript).transcript;

function makeTimeIndex(list: readonly Exchange[]): ExchangeWithRange[] {
  return list.map(exchange => {
    const {ts, ws} = exchange;
    const withRange = ws.map((s, i) => [[s[0], (i === ws.length - 1) ? ts[1] : ws[i + 1][0]], s[1]] as [TimeRange, string]);
    return {...exchange, ws: withRange};
  });
}

function inRange(range: TimeRange, time: number) {
  return range[0] <= time && range[1] > time;
}

function rangesEqual(r1: TimeRange | undefined, r2: TimeRange | undefined) {
  if (r1 === undefined || r2 === undefined)
    return false;
  return r1[0] === r2[0] && r1[1] === r2[1];
}

let forceScroll = false;

const App = React.memo(function () {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [content, setContent] = useState<Content>();
  const exchanges = content?.transcript.transcript;
  const index = useMemo(() => exchanges && makeTimeIndex(exchanges), [exchanges])
  const [current, setCurrent] = useState<{exch: TimeRange | undefined, word: TimeRange | undefined}>();
  const appElement = useRef<HTMLDivElement>(null);
  const [scrollLock, setScrollLock] = useState(false);
  const onCurrent = useCallback((rect: DOMRect, word: string) => {
    const app = appElement.current;
    if (!app) {
      return;
    }
    const top = app.scrollTop;
    const bottom = top + app.clientHeight;
    const threshTop = app.clientHeight / 4;
    const threshBottom = threshTop * 3;
    if (!scrollLock && (rect.y > threshBottom || rect.y < threshTop)) {
      forceScroll = true;
      app.scrollTo({top: Math.max(0, top + rect.y - threshTop), behavior: 'smooth'});
      forceScroll = false;
    }
  }, [scrollLock]);
  useEffect(() => {
    try {
      if (!content) {
        const id = JSON.parse(localStorage.getItem('lastId') || "null");
        if (id) {
          loadContent(id).then(c => {
            setContent(c);
          })
        }
      }
    }
    catch (e) {
      console.error(e);
    }
  }, [content === undefined])
  useEffect(() => {
    const startPos = content?.startPos;
    if (startPos !== undefined && audio.current) {
      audio.current.currentTime = startPos;
    }
  }, [content])
  useEffect(() => {
    let handle: number;
    const onFrame = (time: number) => {
      const now = audio.current?.currentTime || 0;
      const exch = index?.find(e => inRange(e.ts, now));
      const word = exch?.ws.find(w => inRange(w[0], now));
      setCurrent(prev => {
        const nextVal = {exch: exch?.ts, word: word?.[0]};
        if (prev?.exch === nextVal.exch && prev?.word === nextVal.word)
          return prev;
        return nextVal;
      });
      handle = window.requestAnimationFrame(onFrame);
    }
    handle = window.requestAnimationFrame(onFrame)
    return () => {
      window.cancelAnimationFrame(handle);
    }
  }, [index, audio.current])
  const interval = useRef<number>();
  return (
    <div
      className="app"
      ref={appElement}
      onScroll={(e) => {
        if (forceScroll) {
          return;
        }
        setScrollLock(true);
      }}>
      <div className="player">
        <audio key={content?.mp3Url}
          ref={audio}
          onPlay={() => {
            setPlaying(true);
            interval.current = setInterval(() => {
              const time = audio.current?.currentTime;
              if (content && time) {
                localStorage.setItem(`lastPos.${content.id}`, JSON.stringify(time));
              }
            }, 1000);
          }}
          onPause={() => {
            setPlaying(false);
            clearInterval(interval.current);
          }}
          controls>
          <source src={content?.mp3Url} />
        </audio>
        <button
          className={classNames({active: scrollLock})}
          onClick={() => {setScrollLock(!scrollLock)}}>
          S
        </button>
      </div>

      <div className={classNames("transcript", {paused: !playing})}>
        {index?.map(({sn, ts, ws}) => (
          <Exchange
            key={`${ts[0]}.${sn}`}
            sn={sn}
            ts={ts}
            ws={ws}
            currentWord={rangesEqual(ts, current?.exch) ? current?.word : undefined}
            onCurrent={onCurrent}
            onSetTime={(time) => {
              audio.current!.currentTime = time;
            }}
          />
        ))}
      </div>
      
      <LoadForm onGo={(id) => {
        loadContent(id).then(c => {
          setContent(c);
        })
      }}/>
    </div>
  )
});

async function loadContent(id: string) {
  const filesUrl = `https://sonix.ai/embed/${id}/file.json`
  const transcriptUrl = `https://sonix.ai/embed/${id}/transcript.json`
  const filesResponse = await fetch(filesUrl);
  const files = await filesResponse.json();
  const mp3Url = files.mp3Url;
  const transcriptResponse = await fetch(transcriptUrl);
  const transcript = await transcriptResponse.json();
  const startPos: number = JSON.parse(localStorage.getItem(`lastPos.${id}`) || "0");
  const c: Content = {id, transcript, mp3Url, startPos};
  localStorage.setItem('lastId', JSON.stringify(id));
  return c;
}

type LoadFormProps = {
  onGo: (id: string) => void
}
function LoadForm({onGo}: LoadFormProps) {
  const [url, setUrl] = useState('');
  const match = /sonix.ai\/r\/([^/]+)/.exec(url);
  const id = match?.[1];
  return (
    <div className="load">
      <input
        type="text"
        style={id === undefined ? {color: 'red'} : {}}
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.currentTarget.value)}
      />
      <button onClick={() => onGo(id!)}>Go</button>
    </div>
  )
}

type ExchangeProps = {
  currentWord: TimeRange | undefined;
  ts: TimeRange;
  sn: string;
  ws: readonly [TimeRange, string][];
  onCurrent: (rect: DOMRect, word: string) => void;
  onSetTime: (time: number) => void;
}
const Exchange = React.memo(function ({ts, sn, ws, currentWord, onCurrent, onSetTime}: ExchangeProps) {
  return (
    <div className="exchange">
      <div className="meta">
        <div className="speakerName">{sn}</div>
        <div className="time">{formatTimestamp(ts[0])}</div>
      </div>
      <div className="content">
        <p className="text">
          {ws.map(([range, word], i) => (
            <Word
              start={range[0]}
              onSetTime={onSetTime}
              key={i}
              current={rangesEqual(range, currentWord)}
              word={word}
              onCurrent={onCurrent}
            />
          ))}
        </p>
      </div>
    </div>
  )
})

type WordProps = {
  current: boolean,
  word: string,
  start: number,
  onCurrent: (rect: DOMRect, word: string) => void;
  onSetTime: (time: number) => void;
}
const Word = React.memo(function ({current, onSetTime, start, word, onCurrent}: WordProps) {
  const spb = /^\s*/.exec(word)?.[0] || '';
  const spe = /\s*$/.exec(word)?.[0] || '';
  const trimmed = word.trim();
  const span = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (current) {
      span.current && onCurrent(span.current.getBoundingClientRect(), word)
    }
  }, [current])
  return (
    <span onClick={() => onSetTime(start)}>
      {spb.length ? <span>{spb}</span> : null}
      <span
        ref={span}
        className={classNames("word", {current})}>
        {trimmed}
      </span>
      {spe.length ? <span>{spe}</span> : null}
    </span>
  )
})

function formatTimestamp(ts: number) {
  const totalSeconds = Math.floor(ts);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - totalHours * 60;
  const seconds = totalSeconds - totalMinutes * 60;
  return [totalHours, minutes, seconds].map(c => c.toString().padStart(2, '0')).join(':');
}

export default App
