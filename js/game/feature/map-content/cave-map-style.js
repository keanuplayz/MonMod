ig.module("game.feature.map-content.cave-map-style").requires("game.feature.map-content.map-style")
    .defines(function() {

        // add more to json as needed
        ig.MAP_STYLES = {
            ...ig.MAP_STYLES,
            "cave": {
                ...ig.MAP_STYLES["cave"],
                anticompressor: {
                    sheet: "media/map/shockwave-dng.png",
                    x: 240,
                    y: 400
                },
				tesla: {
                    sheet: "media/map/shockwave-dng.png",
                    x: 240,
                    y: 352
                },
                bouncer: {
                    sheet: "media/map/shockwave-dng-props.png",
                    x: 0,
                    y: 0
                },
                puzzle2: {
                    sheet: "media/entity/style/shockwave-dng-puzzle-2.png"
                },
                waveSwitch: {
                    sheet: "media/map/shockwave-dng.png",
                    x: 16,
                    y: 696
                },
                waveblock: {
                    sheet: "media/map/shockwave-dng.png",
                    x: 96,
                    y: 480
                },
                rotateBlocker: {
                    sheet: "media/map/arid-interior.png",
                    x: 208,
                    y: 656
                }
            }
        }
    });