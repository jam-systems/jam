const host = "__JAM_HOST__";

export const jamHost = () => host.replace(/_/g, '') === "JAMHOST" ? "beta.jam.systems" : host;
