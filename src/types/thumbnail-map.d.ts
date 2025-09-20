declare module '@/assets/thumbnail-map.json' {
  interface ThumbnailMap {
    [imagePath: string]: {
      tiny: string;
      small: string;
      medium: string;
    };
  }

  const thumbnailMap: ThumbnailMap;
  export default thumbnailMap;
}
