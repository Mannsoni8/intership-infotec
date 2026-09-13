export const getBucketStart = (timestamp: Date): Date => {
  const bucketStart = new Date(timestamp);

  bucketStart.setMinutes(0);
  bucketStart.setSeconds(0);
  bucketStart.setMilliseconds(0);

  return bucketStart;
};