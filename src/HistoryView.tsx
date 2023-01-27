import { useHistory } from "./historyStore";

type HistoryViewProps = {
  onGo: (id: string) => void;
};
export function HistoryView({onGo}: HistoryViewProps) {
  const records = useHistory();
  return (
    <ul>
      {records.map(({title, id}) => <HistoryRecord key={id} title={title} id={id} onClick={onGo} />)}
    </ul>
  )
}

type HistoryRecordProps = {
  title: string,
  id: string,
  onClick: (id: string) => void,
}
function HistoryRecord({title, id, onClick}: HistoryRecordProps) {
  return (
    <li>
      <a href="#" onClick={() => onClick(id)}>{title}</a>
    </li>
  )
}