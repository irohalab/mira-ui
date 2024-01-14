import { Episode } from './episode';
import { Bangumi } from './bangumi';
import { VideoFile } from './video-file';

export class WatchProgress {
  id: string;
  bangumi_id: string;
  episode_id: string;
  user_id: string;
  watch_status: number;
  last_watch_position: number;
  last_watch_time: number;
  percentage: number;

  episode?: Episode;
  bangumi?: Bangumi;
  video_file?: VideoFile;

  static WISH = 1;
  static WATCHED = 2;
  static WATCHING = 3;
  static PAUSE = 4;
  static ABANDONED = 5;
}
