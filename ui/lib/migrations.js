import {StoredState} from "./local-storage";
import nacl from "tweetnacl";
import {set, update, pure} from "use-minimal-state";


export const importLegacyIdentity = () => {
    const identity = StoredState('identity', () => {
        const keypair = nacl.sign.keyPair();
        let publicKey = encode(keypair.publicKey);
        let secretKey = encode(keypair.secretKey);
        return {
            publicKey,
            secretKey,
            info: {
                id: publicKey,
            },
        };
    });

// MIGRATIONS
    if (!identity.publicKey && identity.keyPair.publicKey) {
        set(identity, 'publicKey', identity.keyPair.publicKey);
        set(identity, 'secretKey', identity.keyPair.secretKey);
    }
// nuked identity.info
    if (!identity.info) {
        set(identity, 'info', {id: identity.publicKey});
    }

// missing .id
    if (!identity.info.id) {
        identity.info.id = identity.publicKey;
        update(identity, 'info');
    }

// REMOVE WHEN ALL old twitter identities converted
    if (identity.info.twitter) {
        let twitterIdentity = {
            type: 'twitter',
            id: identity.info.twitter,
            verificationInfo: identity.info.tweet,
        };
        if (
            !identity.info.identities ||
            !identity.info.identities.length ||
            !identity.info.identities[0].id
        ) {
            set(identity, 'info', {
                ...identity.info,
                identities: [twitterIdentity],
            });
        }
        set(identity, 'info', {
            ...identity.info,
            twitter: undefined,
            tweet: undefined,
        });
    }

    return pure(identity);

}
