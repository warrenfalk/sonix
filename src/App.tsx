import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css'
import React from 'react';
import { Content, loadContent, TranscriptScreen, Exchange, ExchangeWithRange, CurrentWord, TimeRange, inRange } from './TranscriptScreen';
import classNames from 'classnames';
import {MdPlayArrow, MdPause, MdLockOutline, MdLockOpen} from "react-icons/md"
import {IconContext} from 'react-icons';


function makeTimeIndex(list: readonly Exchange[]): ExchangeWithRange[] {
  return list.map(exchange => {
    const {ts, ws} = exchange;
    const withRange = ws.map((s, i) => [[s[0], (i === ws.length - 1) ? ts[1] : ws[i + 1][0]], s[1]] as [TimeRange, string]);
    return {...exchange, ws: withRange};
  });
}

const App = React.memo(function () {
  const [playing, setPlaying] = useState(false);
  const interval = useRef<number>();
  const audio = useRef<HTMLAudioElement>(null);
  
  const [content, setContent] = useState<Content>();
  const exchanges = content?.transcript.transcript;
  const transcript = useMemo(() => exchanges && makeTimeIndex(exchanges), [exchanges])
  const [current, setCurrent] = useState<CurrentWord>();
  const [scrollLock, setScrollLock] = useState(false);
  const id = content?.id;
  const savePos = useCallback((time: number) => {
    localStorage.setItem(`lastPos.${id}`, JSON.stringify(time))
  }, [id])
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
  const audioUrl = content?.mp3Url;
  const startPos = content?.startPos;
  return (
    <>
      <TranscriptScreen
        playing={playing}
        onSeekTo={onSeekTo}
        title={content?.title}
        scrollLock={scrollLock}
        setScrollLock={setScrollLock}
        transcript={transcript}
        current={current}
        setContent={setContent}
      />
      <div className="player">
        <IconContext.Provider value={{size: '1.5em'}}>
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
            }}>
            <source src={`${audioUrl}#t=${startPos || 0}`} />
          </audio>
          <button
            className={classNames({active: playing})}
            onClick={() => {playing ? audio.current?.pause() : audio.current?.play()}}>
            {playing ? <MdPause /> : <MdPlayArrow />}
          </button>
          <button
            className={classNames({ active: scrollLock })}
            onClick={() => { setScrollLock(!scrollLock); }}>
            {scrollLock ? <MdLockOutline /> : <MdLockOpen /> }
          </button>
        </IconContext.Provider>
      </div>
    </>
  )
})

export default App

