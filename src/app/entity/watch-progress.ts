import { Episode } from './episode';
import { Bangumi } from './bangumi';

export class WatchProgress {
  id: string;
  bangumi_id: string;
  episode_id: string;
  userId: string;
  watchStatus: number;
  lastWatchPosition: number;
  lastWatchTime: string;
  percentage: number;

  episode?: Episode;
  bangumi?: Bangumi;

  static WISH = 1;
  static WATCHED = 2;
  static WATCHING = 3;
  static PAUSE = 4;
  static ABANDONED = 5;
}
