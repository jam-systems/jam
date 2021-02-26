import SparkMD5 from 'spark-md5';

export const avatarUrl = (info) => {
    if(info.avatar) {
        return info.avatar
    } else {
        const hash = info.emailHash || SparkMD5.hash(info.email || info.displayName || info.id)
        return `https://www.gravatar.com/avatar/${hash}?d=robohash&s=512`
    }
};
