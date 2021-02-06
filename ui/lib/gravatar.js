import SparkMD5 from 'spark-md5';

export const gravatarUrl = (info) => `https://www.gravatar.com/avatar/${SparkMD5.hash(info.email || info.displayName || info.id)}?d=robohash`;
