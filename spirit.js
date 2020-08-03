const tier4ChargeTime = 2;
const spiritGainFactor = 0.015;
const spiritPenaltyFactor = 0.05;

export class Spirit {
    prestart() {

        sc.COMBAT_PARAM_MSG.SPIRIT_CHANGED = 10283832;
        sc.PLAYER_SP_COST[3] = 12;

        this.screenTarget();
        this.charge4();
        this.spiritChargeMenu();
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
                
                sc.gui.spiritChargeMenu = new sc.SpiritChargeMenu();

                ig.gui.addGuiElement(new sc.SpiritChangeHudGui());
                ig.gui.addGuiElement(sc.gui.spiritChargeMenu);
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

    charge4() {
        ig.ENTITY.Player.inject({
            getMaxChargeLevel(type) {
                const result = this.parent(type);
                const prefix = type.actionKey;
                if (result === 3
                    && this.model.getAction(sc.PLAYER_ACTION[prefix + "4"])) {
                        return 4;
                    }

                return result;
            },
            startCharge(type) {
                const result = this.parent(type);
                if (result
                    && this.charging.maxLevel === 3
                    && this.getMaxChargeLevel(type) === 4
                    && this.model.params.getSp() > sc.PLAYER_SP_COST[3]) {
                        this.charging.maxLevel = 4;
                        this.charging.cancelTime = 1 - tier4ChargeTime; //1s after tier 4 charged
                    }
                return result;
            },
            handleCharge(flags, input) {
                const maxLevel = this.charging.maxLevel;
                const time = this.charging.time + ig.system.actualTick;
                this.parent(flags, input);
                if (maxLevel === 4
                    && flags.applyCharge === 3
                    && time > tier4ChargeTime) {
                        flags.applyCharge = 4;
                    }
            },
            clearCharge(force) {
                const maxLevel = this.charging.maxLevel;
                const time = this.charging.time;
                if (!force && maxLevel === 4 && time > tier4ChargeTime) {
                    return;
                }
                return this.parent();
            }
        });
    }

    spiritChargeMenu() {
        sc.SpiritChargeMenu = ig.GuiElementBase.extend({
            background: null,
            init() {
                this.parent();

                this.hook.zIndex = 10000;
                this.hook.pauseGui = true;

                this.setSize(ig.system.width, ig.system.height);
                this.setPivot(ig.system.width / 2, ig.system.height / 2);

                this.background = new sc.SpiritBgGui();
                this.addChildGui(this.background);
            },
            show() {
                this.background.show(ig.game.playerEntity.model.currentElementMode);
            }
        });

        const cold_heat = {
            pos: {
                x: 0,
                y: 65,
            },
            size: {
                x: 31,
                y: 28,
            },
            offset: {
                x: 15,
                y: 8,
            }
        }
        const cold_shock = {
            pos: {
                x: 35,
                y: 67,
            },
            size: {
                x: 17,
                y: 25,
            },
            offset: {
                x: 8,
                y: 10,
            }
        }
        const shock_wave = {
            pos: {
                x: 5,
                y: 95,
            },
            size: {
                x: 22,
                y: 22,
            },
            offset: {
                x: 11,
                y: 11,
            }
        }
        const shock_heat = {
            pos: {
                x: 32,
                y: 94,
            },
            size: {
                x: 22,
                y: 24,
            },
            offset: {
                x: 11,
                y: 12,
            }
        }
        const wave_heat = {
            pos: {
                x: 2,
                y: 119,
            },
            size: {
                x: 28,
                y: 37,
            },
            offset: {
                x: 13,
                y: 23,
            }
        }
        const wave_cold = {
            pos: {
                x: 34,
                y: 124,
            },
            size: {
                x: 20,
                y: 26,
            },
            offset: {
                x: 10,
                y: 13,
            }
        }

        sc.SPIRIT_ICON = {
            [sc.ELEMENT.HEAT]: {
                [sc.ELEMENT.COLD]: cold_heat,
                [sc.ELEMENT.SHOCK]: shock_heat,
                [sc.ELEMENT.WAVE]: wave_heat,
            },
            [sc.ELEMENT.COLD]: {
                [sc.ELEMENT.HEAT]: cold_heat,
                [sc.ELEMENT.SHOCK]: cold_shock,
                [sc.ELEMENT.WAVE]: wave_cold,
            },
            [sc.ELEMENT.SHOCK]: {
                [sc.ELEMENT.HEAT]: shock_heat,
                [sc.ELEMENT.COLD]: cold_shock,
                [sc.ELEMENT.WAVE]: shock_wave,
            },
            [sc.ELEMENT.WAVE]: {
                [sc.ELEMENT.HEAT]: wave_heat,
                [sc.ELEMENT.COLD]: wave_cold,
                [sc.ELEMENT.SHOCK]: shock_wave,
            }
        }

        const position = Vec2.createC(0, 0);
        sc.SpiritBgGui = ig.GuiElementBase.extend({
            gfx: new ig.Image("media/gui/selector.png"),
            transitions: {
                DEFAULT: {
                    state: {},
                    time: 0.1,
                    timeFunction: KEY_SPLINES.EASE_IN_OUT
                },
                HIDDEN: {
                    state: {
                        alpha: 0,
                        scaleX: 0,
                        scaleY: 0,
                    },
                    time: 0.3,
                    timeFunction: KEY_SPLINES.EASE_IN_OUT
                },
            },
            arrows: [],
            selectedA: sc.ELEMENT.COLD,
            selectedB: sc.ELEMENT.HEAT,
            init() {
                this.parent();
                this.setSize(63, 63);
                this.setPivot(63 / 2, 63 / 2);

                for (let i = 1; i < 5; i++) {
                    const arrow = new sc.SpiritElementArrowGui(sc.SPIRIT_ARROW[i]);
                    this.arrows.push(arrow);
                    this.addChildGui(arrow);
                }

                this.doStateTransition("HIDDEN", true);
            },
            show(startElement) {
                this.selectedA = startElement;
                for (const arrow of this.arrows) {
                    arrow.reset();
                }
                this.arrows[startElement - 1].extend();
                
                this.selectedB = this.oppositeElement(startElement);
                this.arrows[this.selectedB - 1].extend();


                this.updatePos();
                this.doStateTransition("DEFAULT");
            },
            hide() {
                this.doStateTransition("HIDDEN");
            },
            select(selectElement) {
                if (selectElement === 0 || selectElement === this.selectedB) {
                    return;
                }

                this.arrows[this.selectedB - 1].retract();
                this.selectedB = selectElement;
                this.arrows[this.selectedB - 1].extend();
            },
            updateDrawables(renderer) {
                renderer.addGfx(this.gfx, 3, 3, 0, 0, 57, 57);

                this.drawIcon(renderer)
            },
            updatePos() {
                const player = ig.game.playerEntity;
                const hook = this.hook;
                if (player) {
                    const coll = player.coll;
                    ig.system.getScreenFromMapPos(position, Math.round(coll.pos.x + coll.size.x / 2), Math.round(coll.pos.y - coll.pos.z - coll.size.z / 2 + coll.size.y / 2));
                    hook.pos.x = position.x - hook.size.x / 2;
                    hook.pos.y = position.y - hook.size.y / 2;
                    hook.pos.x = Math.max(0, Math.min(ig.system.width - hook.size.x, hook.pos.x));
                    hook.pos.y = Math.max(0, Math.min(ig.system.height - hook.size.y, hook.pos.y));
                }
            },
            oppositeElement(element) {
                return element % 2 == 0 ? element - 1 : element + 1;
            },
            drawIcon(renderer, a, b) {
                const icon = sc.SPIRIT_ICON[this.selectedA][this.selectedB];
                if (!icon) {
                    return;
                }

                const pos = {
                    x: 31 - icon.offset.x,
                    y: 31 - icon.offset.y,
                }

                renderer.addGfx(this.gfx, pos.x, pos.y, icon.pos.x, icon.pos.y, icon.size.x, icon.size.y);
            }
        });

        sc.SPIRIT_ARROW = {
            [sc.ELEMENT.COLD]: {
                direction: {
                    x: 0,
                    y: -1,
                },
                pos: {
                    x: 57,
                    y: 31,
                },
                size: {
                    x: 31,
                    y: 17,
                },
                offset: {
                    x: 16,
                    y: 0,
                }
            },
            [sc.ELEMENT.HEAT]: {
                direction: {
                    x: 0,
                    y: 1,
                },
                pos: {
                    x: 57,
                    y: 48,
                },
                size: {
                    x: 31,
                    y: 17,
                },
                offset: {
                    x: 16,
                    y: 46,
                }
            },
            [sc.ELEMENT.WAVE]: {
                direction: {
                    x: -1,
                    y: 0,
                },
                pos: {
                    x: 74,
                    y: 0,
                },
                size: {
                    x: 17,
                    y: 31,
                },
                offset: {
                    x: 0,
                    y: 16,
                }
            },
            [sc.ELEMENT.SHOCK]: {
                direction: {
                    x: 1,
                    y: 0,
                },
                pos: {
                    x: 57,
                    y: 0,
                },
                size: {
                    x: 17,
                    y: 31,
                },
                offset: {
                    x: 46,
                    y: 16,
                }
            },
        }

        sc.SpiritElementArrowGui = ig.GuiElementBase.extend({
            gfx: new ig.Image("media/gui/selector.png"),
            transitions: {
                DEFAULT: {
                    state: {},
                    time: 0.3,
                    timeFunction: KEY_SPLINES.EASE_IN_OUT
                },
                EXTENDED: {
                    state: {
                        offsetX: 0,
                        offsetY: 0,
                    },
                    time: 0.1,
                    timeFunction: KEY_SPLINES.EASE_IN_OUT
                },
            },
            element: {},
            init(element) {
                this.parent();
                this.setSize(63, 63);
                this.setPivot(63 / 2, 63 / 2);

                this.element = element;
                const off = Vec2.mulF(element.direction, 3, Vec2.create());
                this.transitions.EXTENDED.state.offsetX = off.x;
                this.transitions.EXTENDED.state.offsetY = off.y;
            },
            updateDrawables(renderer) {
                renderer.addGfx(this.gfx, this.element.offset.x, this.element.offset.y, this.element.pos.x, this.element.pos.y, this.element.size.x, this.element.size.y);
            },
            extend() {
                this.doStateTransition("EXTENDED");
            },
            retract() {
                this.doStateTransition("DEFAULT");
            },
            reset() {
                this.doStateTransition("DEFAULT", true);
            }
        });

        ig.ENTITY.Player.inject({
            doCombatAction(action) {
                if (action.endsWith("SPECIAL4")) {
                    this.coll.time.animStatic = false
                    ig.slowMotion.add(0, 0, 'spiritSelect');
                    sc.gui.spiritChargeMenu.show();
                } else {
                    return this.parent(action);
                }
            }
        })

        //sc.gui.spiritChargeMenu
    }
}