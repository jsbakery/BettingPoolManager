export function jfetch(...args) {
    return fetch(...args).then(res => res.json());
}

export function getMeta() {
    return jfetch('/data/meta.json');
}

export function getSavedBetsState(gameName) {
    return jfetch(`/data/savedBetsState(${gameName}).json`);
}
