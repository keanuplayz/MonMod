export class Spirit {
    prestart() {
        const spiritGainFactor = 0.015;
        const spiritPenaltyFactor = 0.05;

        sc.COMBAT_PARAM_MSG.SPIRIT_CHANGED = 10283832;

        this.screenTarget();
        this.spiritChangeHudGui();
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

        sc.CrossCode.inject({
            init() {
                this.parent();
                ig.gui.addGuiElement(new sc.SpiritChangeHudGui);
            }
        })

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
            onTargetHit: function(target, attackInfo, damageResult, ...rest) {
                this.parent(target, attackInfo, damageResult, ...rest);
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
            lastSpirit: 0,
            timer: 0,
            maxTime: 0.5,
            cardWidth: 68,
            sprites: 8,
            init: function() {
                this.parent();
                this.setSize(this.cardWidth + 24, 16);
                this.setPivot(36, 16);
                this.spiritBar = new sc.SpiritHudBarGui(sc.model.player.params, 48, 7);
                this.spiritBar.setPos(10, 1);
                this.addChildGui(this.spiritBar);
                sc.Model.addObserver(sc.model.player.params, this)
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
            },
            modelChanged: function(model, message, data) {
                if (!sc.model.isCutscene() && message === sc.COMBAT_PARAM_MSG.SPIRIT_CHANGED) {
                    if (this.lastSpirit < 1 && model.currentSpirit === 1) {
                        const screenPos = this.getPos();
                        screenPos.x += this.hook.size.x / 2;
                        screenPos.y += this.hook.size.y / 2;

                        const effect = sc.combat.effects.combat.spawnOnTarget("spiritCharged", new ig.ScreenTarget(screenPos));
                        effect.setIgnoreSlowdown();
                    }

                    this.lastSpirit = model.currentSpirit;
                }
            },
            getPos: function() {
                const result = Vec2.create(this.hook.pos);
                for (let node = this.hook.parentHook; node && node !== ig.gui; node = node.parentHook) {
                    Vec2.add(result, node.pos);
                }
                return result;
            }
        });
    }

    spiritHudBarGui() {
        sc.SpiritHudBarGui = ig.GuiElementBase.extend({
            gfx: new ig.Image("media/gui/spirit.png"),
            params: null,
            width: 0,
            height: 0,
            timer: 0,
            maxTime: 1,
            init: function(params, width, height) {
                this.parent();
                this.params = params;
                this.width = width || 48;
                this.height = height || 7;
            },
            update: function() {
                if (!ig.game.paused) {
                    this.timer = (this.timer + ig.system.actualTick) % this.maxTime;
                }
            },
            updateDrawables: function(renderer) {
                const barOffset = 16;
                const colorOffset = this.timer.map(0, this.maxTime, this.width, 0).floor();

                const currentSpirit = this.params.currentSpirit.limit(0, 1);
                for (let i = 0; i < this.height; i++) {
                    if (currentSpirit > 0) {
                        renderer.addGfx(this.gfx, this.height - i - 1, i, colorOffset, barOffset, currentSpirit * this.width, 1);
                    }
                }
            },
        });
    }

    spiritChangeHudGui() {
        const screenPos = Vec2.createC(0, 0);

        sc.SpiritChangeHudGui = ig.GuiElementBase.extend({
            transitions: {
                DEFAULT: {
                    state: {},
                    time: 0.2,
                    timeFunction: KEY_SPLINES.EASE_OUT
                },
                BIG: {
                    state: {
                        scaleY: 2,
                        scaleX: 2
                    },
                    time: 0.1,
                    timeFunction: KEY_SPLINES.EASE_IN
                },
                HIDDEN: {
                    state: {
                        scaleY: 0,
                        scaleX: 1.5
                    },
                    time: 0.1,
                    timeFunction: KEY_SPLINES.EASE_IN
                }
            },
            gfx: new ig.Image("media/gui/spirit.png"),
            currentSpirit: 0,
            timer: 0,
            init: function() {
                this.parent();
                this.setSize(34, 7);
                this.setPivot(17, 3.5);
                this.zIndex = 10;
                this.doStateTransition("HIDDEN", true);
                sc.Model.addObserver(sc.model.player.params, this)
            },
            modelChanged: function(model, message, data) {
                if (sc.model.isCutscene()) {
                    this.hide();
                } else if (!ig.vars.get("playerVar.statusHidden")) {
                    if (message === sc.COMBAT_PARAM_MSG.SPIRIT_CHANGED) {
                        if (this.currentSpirit < 1 && model.currentSpirit === 1) {
                            this.timer = 1;
                            this.updatePos(true);
                            this.doStateTransition("BIG", true);
                            this.doStateTransition("DEFAULT")
                        } else if (model.currentSpirit < 1) {
                            this.timer = 0;
                            this.hide();
                        }

                        this.currentSpirit = model.currentSpirit;
                    }
                }
            },
            hide: function() {
                this.doStateTransition("HIDDEN");
            },
            update: function() {
                if (this.timer > 0) {
                    this.timer = this.timer - ig.system.actualTick;
                    if (this.timer <= 0) {
                        this.timer = 0;
                        this.hide()
                    }
                }
                this.updatePos(true)
            },
            updatePos: function() {
                const player = ig.game.playerEntity;
                if (player) {
                    const hook = this.hook;
                    const center = player.getCenter(screenPos);
                    ig.system.getScreenFromMapPos(screenPos, Math.round(center.x), Math.round(center.y - player.coll.pos.z + player.coll.size.y / 2));
                    this.hook.pos.x = screenPos.x - hook.size.x / 2;
                    this.hook.pos.y = screenPos.y - hook.size.y / 2
                }
            },
            updateDrawables: function(renderer) {
                renderer.addGfx(this.gfx, 0, 0, 38, 18, 34, 7);
            }
        });
    }

    screenTarget() {
        ig.ScreenTarget = ig.Class.extend({
            offset: {
                x: 0,
                y: 0
            },
            coll: {
                pos: {
                    x: 0,
                    y: 0,
                    z: 0
                }
            },
            init(offset) {
                if (offset) {
                    this.offset = Vec2.create(offset);
                }
            },
            addEntityAttached() {},
            removeEntityAttached() {},
            getAlignedPos() {
                return ig.system.getMapFromScreenPos(this.coll.pos, this.offset.x, this.offset.y);
            },
            getCenter() {
                return this.getAlignedPos();
            }
        })
    }
}