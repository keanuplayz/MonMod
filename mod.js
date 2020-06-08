export default class MonMod {
    constructor(mod) {
        this.mod = mod;
    }

    async loadPatches() {
        const defaultTracks = this.loadFile("patches/defaultTracks.json");
        ig.merge(ig.BGM_DEFAULT_TRACKS, defaultTracks);
        const destructible = this.loadFile("patches/itemDestructible.json");
        ig.merge(sc.ITEM_DESTRUCT_TYPE, destructible);

        console.log("MonikaMod has successfully loaded.");
    }

    async loadFile(path) {
        const filePath = this.mod.baseDirectory + path;
        const req = await fetch(filePath);
        return await req.json();
    }
}