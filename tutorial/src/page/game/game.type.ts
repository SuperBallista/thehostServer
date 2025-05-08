export interface Survivor {
    name: string,
    status: 'alive' | 'zombie' | 'dead' | 'you',
    sameRegion: boolean,
  };
