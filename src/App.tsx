import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css'
import React from 'react';
import { Content, loadContent, TranscriptScreen, Exchange, ExchangeWithRange, CurrentWord, TimeRange } from './TranscriptScreen';


function makeTimeIndex(list: readonly Exchange[]): ExchangeWithRange[] {
  return list.map(exchange => {
    const {ts, ws} = exchange;
    const withRange = ws.map((s, i) => [[s[0], (i === ws.length - 1) ? ts[1] : ws[i + 1][0]], s[1]] as [TimeRange, string]);
    return {...exchange, ws: withRange};
  });
}

const App = React.memo(function () {
  const [content, setContent] = useState<Content>();
  const exchanges = content?.transcript.transcript;
  const transcript = useMemo(() => exchanges && makeTimeIndex(exchanges), [exchanges])
  const [current, setCurrent] = useState<CurrentWord>();
  const [scrollLock, setScrollLock] = useState(false);
  const id = content?.id;
  const savePos = useCallback((time: number) => {
    localStorage.setItem(`lastPos.${id}`, JSON.stringify(time))
  }, [id])
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
  return (
    <TranscriptScreen
      title={content?.title}
      scrollLock={scrollLock}
      setScrollLock={setScrollLock}
      startPos={content?.startPos}
      transcript={transcript}
      current={current}
      setCurrent={setCurrent}
      audioUrl={content?.mp3Url}
      savePos={savePos}
      setContent={setContent}
    />
  )
})

export default App
