export default class MonMod {
    constructor(mod) {
        this.mod = mod;
    }

    async prestart() {
        await this.loadPatches();
    }

    async loadPatches() {
        const defaultTracks = await this.loadFile("patches/defaultTracks.json");
        ig.merge(ig.BGM_DEFAULT_TRACKS, defaultTracks);
        const destructible = await this.loadFile("patches/itemDestructible.json");
        ig.merge(sc.ITEM_DESTRUCT_TYPE, destructible);

        console.log("MonikaMod has successfully loaded.");
    }

    async loadFile(path) {
        const filePath = this.mod.baseDirectory.substring(7) + path;
        const req = await fetch(filePath);
        return await req.json();
    }
}