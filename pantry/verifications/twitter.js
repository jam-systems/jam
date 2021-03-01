const nets = require("nets");
const { promisify } = require('util')


const verify = async (identity, publicKey) => {
    const twitter = identity.id;
    const tweet = identity.verificationInfo;

    // only store tweet if it is verifiable
    if (!tweet.startsWith("https://twitter.com/" + twitter.substring(1) + "/status/")) {
        throw new Error(`Tweet address ${tweet} cannot be used to verify identity ${twitter}`)
    }
    let tweetResponse = await promisify(nets)({
        url: tweet,
        method: "GET",
        headers: {
            "User-Agent": "WhatsApp/2"
        }
    });

    if (!tweetResponse.body.includes(publicKey)) {
        throw new Error(`Tweet at ${tweet} does not contain public key ${publicKey}`)
    }
}
