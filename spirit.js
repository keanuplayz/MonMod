export class Spirit {
    prestart() {
        const spiritGainFactor = 0.1;
        const spiritPenaltyFactor = 0.1;

        sc.COMBAT_PARAM_MSG.SPIRIT_CHANGED = 10283832;

        this.spiritHudBarGui();
        this.spiritHudGui();

        sc.StatusUpperGui.inject({
            init() {
                this.parent();
                const spirit = new sc.SpiritHudGui();
                spirit.setPos(0, 19);
                this.addChildGui(spirit);
            }
        });

        sc.CombatParams.inject({
            currentSpirit: 0,
            addSpirit(amount) {
                this.currentSpirit = Math.min(this.currentSpirit + amount, 1);
                sc.Model.notifyObserver(this, sc.COMBAT_PARAM_MSG.SPIRIT_CHANGED, true)
            },
            reduceSpirit(amount) {
                this.currentSpirit = Math.max(this.currentSpirit - amount, 0);
                sc.Model.notifyObserver(this, sc.COMBAT_PARAM_MSG.SPIRIT_CHANGED, true)
            }
        });

        sc.AttackInfo.inject({
            spiritRepeatFactor: 1,
        });

        ig.ENTITY.Combatant.inject({
            onTargetHit: function(target, attackInfo, damageResult) {
                if (attackInfo.spFactor) {
                    const baseFactor = damageResult.baseOffensiveFactor * attackInfo.spFactor;
                    const defFactor = baseFactor * ((1 + damageResult.defensiveFactor) / 2);
                    const critFactor = damageResult.critical ? defFactor * 1.5 : defFactor;
                    const focus = this.params.getStat("focus");
                    const focusFactor = critFactor * (0.75 + Math.pow(focus / 400, 0.75));
                    const repeatFactor = focusFactor * attackInfo.spiritRepeatFactor;
                    attackInfo.spiritRepeatFactor = 0;
                    this.params.addSpirit(repeatFactor * spiritGainFactor);
                }

                if (target === ig.game.playerEntity) {
                    const baseFactor = damageResult.baseOffensiveFactor;
                    const defFactor = baseFactor * ((1 + damageResult.defensiveFactor) / 2);
                    const critFactor = damageResult.critical ? defFactor * 1.5 : defFactor;
                    const focus = this.params.getStat("focus");
                    const focusFactor = critFactor * (0.75 + Math.pow(focus / 400, 0.75));
                    const repeatFactor = focusFactor * attackInfo.spiritRepeatFactor;
                    attackInfo.spiritRepeatFactor = 0;
                    target.params.reduceSpirit(repeatFactor * spiritPenaltyFactor);
                }
            },
        });
    }

    spiritHudGui() {
        sc.SpiritHudGui = ig.GuiElementBase.extend({
            transitions: {
                DEFAULT: {
                    state: {},
                    time: 0.3,
                    timeFunction: KEY_SPLINES.LINEAR
                },
                HIDDEN: {
                    state: {
                        alpha: 0
                    },
                    time: 0.3,
                    timeFunction: KEY_SPLINES.LINEAR
                }
            },
            gfx: new ig.Image("media/gui/spirit.png"),
            spiritBar: null,
            timer: 0,
            maxTime: 0.5,
            cardWidth: 68,
            sprites: 8,
            init: function() {
                this.parent();
                this.setSize(this.cardWidth + 24, 16);
                this.setPivot(36, 16);
                this.spiritBar = new sc.SpiritHudBarGui(sc.model.player.params, 48, 7, 8);
                this.spiritBar.setPos(10, 1);
                this.addChildGui(this.spiritBar);
            },
            update: function() {
                if (!ig.game.paused && sc.model.player.params.currentSpirit === 1) {
                    this.timer = (this.timer + ig.system.actualTick) % this.maxTime;
                }
            },
            updateDrawables: function(renderer) {
                renderer.addGfx(this.gfx, 0, 0, 0, 0, this.cardWidth, this.hook.size.y);
                
                if (sc.model.player.params.currentSpirit === 1) {
                    const spriteBase = 18;
                    const spriteWidth = 38;
                    const spriteHeight = 15;

                    const index = this.timer.map(0, this.maxTime, 0, this.sprites).floor()
                    const spriteOffset = spriteBase + index * spriteHeight;

                    renderer.addGfx(this.gfx, this.cardWidth - spriteHeight, 0, 0, spriteOffset, spriteWidth, spriteHeight)
                }
            }
        });
    }

    spiritHudBarGui() {
        sc.SpiritHudBarGui = ig.GuiElementBase.extend({
            gfx: new ig.Image("media/gui/spirit.png"),
            params: null,
            width: 0,
            height: 0,
            init: function(params, width, height){
                this.parent();
                this.params = params;
                this.width = width || 48;
                this.height = height || 7;
            },
            updateDrawables: function(renderer) {
                const barOffset = 16;
        
                const currentSpirit = this.params.currentSpirit.limit(0,1);
                for(let i = 0; i < this.height; i++){
                    if(currentSpirit > 0){
                        renderer.addGfx(this.gfx, this.height - i - 1, i, 0, barOffset, currentSpirit * this.width, 1);
                    }
                }
            },
        });
    }
}