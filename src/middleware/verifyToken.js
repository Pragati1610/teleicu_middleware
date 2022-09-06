import jose from "node-jose";
import jwktopem from "jwk-to-pem";
import jwt from "jsonwebtoken";
import axios from "axios";

async function getKeyStore() {
    console.log(process.env.CARE_API);
    const keyStore = await axios.get(
        `${process.env.CARE_API}/.well-known/openid-configuration`
    );
    return JSON.stringify(keyStore.data);
}

async function getPublicKey(jwks) {
    const ks = await getKeyStore();
    const keyStore = await jose.JWK.asKeyStore(ks);
    const publicKey = keyStore.toJSON();
    return publicKey;
}

function getToken(tokenWithBearer) {
    const bearerRequired = "Care_Bearer";
    const tokenBearer = tokenWithBearer.split(" ")[0];
    if (bearerRequired !== tokenBearer) {
        throw new Error("Bearer is not authorized");
    }
    return tokenWithBearer.split(" ")[1];
}

export const verify = async(req, res, next) => {
    try {
        const tokenWithBearer = req.get("Authorization");
        const token = getToken(tokenWithBearer);
        const data = await getPublicKey();
        const [firstKey] = data.keys;
        const publicKey = jwktopem(firstKey);
        req.claims = jwt.verify(token, publicKey);
        next();
    } catch (e) {
        const error = e.message;
        return res.status(403).send({
            message: "jwt expected / jwt is invalid",
            error,
        });
    }
};