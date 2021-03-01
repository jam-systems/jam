const verifiers = {
    twitter: require("./twitter.js")
}

const verifyIdentities = async (identities, publicKey) => {
    if(Array.isArray(identities))
    {
        for (const identity of identities) {
            if(!verifiers[identity.type]) {
                throw new Error(`No verifier for identity type ${identity.type}`);
            }
            await verifiers[identity.type](identity, publicKey);
        }
    } else {
        throw new Error("Identities object is not an array")
    }
}

module.exports = verifyIdentities;
