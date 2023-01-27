import { useEffect, useState } from "react";

export type HistoryRecord = {
  title: string,
  id: string,
  lastVisit: number,
};

class History extends EventTarget {
  records: readonly HistoryRecord[] = JSON.parse(localStorage.getItem('history') || "[]");

  putRecord = (record: HistoryRecord) => {
    this.records = [record, ...this.records.filter(r => r.id !== record.id)].sort((a, b) => b.lastVisit - a.lastVisit)
    localStorage.setItem('history', JSON.stringify(this.records));
    this.dispatchEvent(new Event('change'));
  }
}

export function putHistoryRecord(record: HistoryRecord) {
  history.putRecord(record);
}

const history = new History();

export function useHistory(): readonly HistoryRecord[] {
  const [h, setH] = useState<readonly HistoryRecord[]>(history.records);
  useEffect(() => {
    function handler() {
      () => {
        setH(history.records);
      }      
    }
    history.addEventListener('change', handler)
    return () => {
      history.removeEventListener('change', handler);
    }
  }, [])
  return h;
}