import SparkMD5 from 'spark-md5';

export const avatarUrl = (info) => {
    if(info.avatar) {
        return info.avatar
    } else {
        return `/img/avatar-default.png`
    }
};
