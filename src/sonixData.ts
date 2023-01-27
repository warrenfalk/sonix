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

export type TimeRange = readonly [number, number];

export type Content = {
  id: string;
  title: string;
  transcript: Transcript;
  mp3Url: string;
  startPos: number;
};

export async function fetchContent(id: string) {
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
  const c: Content = {id, title, transcript, mp3Url, startPos};
  return c;
}

export function parseSonixUrl(url: string) {
  const match = /sonix.ai\/r\/([^/]+)/.exec(url);
  const id = match?.[1];
  return id;
}
