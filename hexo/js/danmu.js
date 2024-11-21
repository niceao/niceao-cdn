class EasyDanmaku {
    constructor(options) {
        // Initialize with user-specified parameters or defaults
        this.container = this.checkParams(options);
        this.pathname = options.page || null;
        this.wrapperStyle = options.wrapperStyle || null;
        this.line = options.line || 10;
        this.speed = options.speed || 5;
        this.runtime = options.runtime || 10;
        this.colourful = options.colourful || false;
        this.loop = options.loop || false;
        this.hover = options.hover || false;
        this.coefficient = options.coefficient || 1.38;

        // State variables
        this.originIndex = 0;
        this.originList = null;
        this.offsetValue = this.container.offsetHeight / this.line;
        this.vipIndex = 0;
        this.overflowArr = [];
        this.clearIng = false;
        this.cleartimer = null;

        // Initialize danmaku
        this.init();
        this.handleEvents(options);
    }

    // Set up custom events
    handleEvents(options) {
        this.onComplete = options.onComplete || null;
        this.onHover = options.onHover || null;
    }

    // Initialize the danmaku environment
    init() {
        this.runstatus = 1;
        this.aisle = [];
        this.container.style.overflow = "hidden";

        if (this.hover) this.handleMouseHover();

        if (Utils.getStyle(this.container, "position") !== "relative" &&
            Utils.getStyle(this.container, "position") !== "fixed") {
            this.container.style.position = "relative";
        }

        for (let i = 0; i < this.line; i++) {
            this.aisle.push({ normalRow: true, vipRow: true });
        }
    }

    // Validate and check the user input parameters
    checkParams(options) {
        if (!document.querySelector(options.el)) {
            throw `Could not find the ${options.el} element`;
        }
        if (options.wrapperStyle && typeof options.wrapperStyle !== "string") {
            throw "The wrapperStyle parameter must be a string";
        }
        if (options.line && typeof options.line !== "number") {
            throw "The line parameter must be a number";
        }
        if (options.speed && typeof options.speed !== "number") {
            throw "The speed parameter must be a number";
        }
        if (options.colourful && typeof options.colourful !== "boolean") {
            throw "The colourful parameter must be a boolean";
        }
        if (options.runtime && typeof options.runtime !== "number") {
            throw "The runtime parameter must be a number";
        }
        if (options.loop && typeof options.loop !== "boolean") {
            throw "The loop parameter must be a boolean";
        }
        if (options.coefficient && typeof options.coefficient !== "number") {
            throw "The coefficient parameter must be a number";
        }
        if (options.hover && typeof options.hover !== "boolean") {
            throw "The hover parameter must be a boolean";
        }
        if (options.onComplete && typeof options.onComplete !== "function") {
            throw "The onComplete parameter must be a function";
        }
        if (options.onHover && typeof options.onHover !== "function") {
            throw "The onHover parameter must be a function";
        }
        return document.querySelector(options.el);
    }

    // Send a single danmaku message
    send(content, customClass = null, callback = null) {
        if (this.runstatus === 0) {
            this.overflowArr.push({ content, normalClass: customClass });
            return;
        }

        if (content.length < 1) return;

        const danmaku = document.createElement("div");
        let rowIndex = 0;
        let animationSpeed = this.speed;
        let interval = null;
        let traveled = 0;

        danmaku.innerHTML = content;
        danmaku.style.display = "inline-block";
        danmaku.classList.add("default-style");

        if (customClass || this.wrapperStyle) {
            danmaku.classList.add(customClass || this.wrapperStyle);
        }

        const attemptPlacement = () => {
            rowIndex = Math.round(Math.random() * (this.line - 1));

            if (this.aisle[rowIndex].normalRow) {
                this.aisle[rowIndex].normalRow = false;
                this.container.appendChild(danmaku);

                animationSpeed += (danmaku.offsetWidth / danmaku.parentNode.offsetWidth) * 2;

                danmaku.style.cssText = `
                    text-align: center;
                    min-width: 130px;
                    will-change: transform;
                    position: absolute;
                    right: -${danmaku.offsetWidth + 130}px;
                    transition: transform ${animationSpeed}s linear;
                    transform: translateX(-${danmaku.parentNode.offsetWidth + danmaku.offsetWidth + 130}px);
                    top: ${rowIndex * this.offsetValue}px;
                    line-height: ${this.offsetValue}px;
                    ${this.colourful ? `color: #${(16777216 * Math.random() << 0).toString(16).padStart(6, '0')};` : ''}
                `;

                const step = (danmaku.parentNode.offsetWidth + danmaku.offsetWidth) / animationSpeed / 60;

                interval = setInterval(() => {
                    traveled += step;
                    if (traveled > danmaku.offsetWidth * this.coefficient) {
                        this.aisle[rowIndex].normalRow = true;
                        clearInterval(interval);
                    }
                }, 16.66);

                setTimeout(() => {
                    if (danmaku.getAttribute("relieveDel") !== "1") {
                        if (callback) callback({ runtime: animationSpeed, target: danmaku, width: danmaku.offsetWidth });
                        danmaku.remove();
                    }
                }, animationSpeed * 1000);
            } else {
                if (this.aisle.some(row => row.normalRow)) {
                    attemptPlacement();
                } else {
                    this.overflowArr.push({ content, normalClass: customClass });
                    if (!this.clearIng) this.clearOverflowDanmakuArray();
                }
            }
        };

        attemptPlacement();
    }

    // Batch-send multiple danmaku messages
    batchSend(messages, hasAvatar = false, customClass = null) {
        const delay = this.runtime || (1.23 * messages.length);
        this.originList = messages;
        this.hasAvatar = hasAvatar;
        this.normalClass = customClass;

        const interval = setInterval(() => {
            if (location.pathname !== this.pathname) {
                clearInterval(interval);
                return;
            }

            if (this.originIndex > messages.length - 1) {
                clearInterval(interval);
                this.originIndex = 0;
                if (this.onComplete) this.onComplete();
                if (this.loop) this.batchSend(this.originList, hasAvatar, customClass);
            } else {
                if (hasAvatar) {
                    const message = messages[this.originIndex];
                    this.send(
                        `${message.url ? `<a href="${message.url}">` : ''}
                            <img src="${message.avatar}">
                            <p>${message.content}</p>
                        ${message.url ? `</a>` : ''}`,
                        customClass || this.wrapperStyle
                    );
                } else {
                    this.send(messages[this.originIndex], customClass || this.wrapperStyle);
                }
                this.originIndex++;
            }
        }, (delay / messages.length) * 1000);
    }

    // Center a single danmaku message
    centeredSend(content, customClass, duration = 3000, callback = null) {
        const danmaku = document.createElement("div");
        let rowIndex = 0;

        danmaku.innerHTML = content;

        if (customClass || this.wrapperStyle) {
            danmaku.classList.add(customClass || this.wrapperStyle);
        }

        const attemptPlacement = () => {
            if (this.aisle[rowIndex].vipRow) {
                this.container.appendChild(danmaku);

                danmaku.style.cssText = `
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: ${rowIndex * this.offsetValue}px;
                `;

                this.aisle[rowIndex].vipRow = false;

                setTimeout(() => {
                    if (callback) callback({ duration, target: danmaku, width: danmaku.offsetWidth });
                    danmaku.remove();
                    this.aisle[rowIndex].vipRow = true;
                }, duration);
            } else {
                rowIndex++;
                if (rowIndex > this.line - 1) return;
                attemptPlacement();
            }
        };

        attemptPlacement();
    }

    // Resume danmaku playback
    play() {
        const danmakus = this.container.children;

        for (let i = 0; i < danmakus.length; i++) {
            this.controlDanmakurunStatus(danmakus[i], 1);
        }

        this.runstatus = 1;

        if (this.overflowArr.length !== 0) {
            this.clearOverflowDanmakuArray();
        }
    }

    // Pause danmaku playback
    pause() {
        const danmakus = this.container.children;

        for (let i = 0; i < danmakus.length; i++) {
            this.controlDanmakurunStatus(danmakus[i], 0);
        }

        this.runstatus = 0;
    }

    // Control animation status of a single danmaku
    controlDanmakurunStatus(danmaku, status) {
        const MATCH_POSITION_REGEX = /-(\S*),/;

        if (status === 1) {
            // Resume danmaku
            clearTimeout(danmaku.timer);
            const currentPosition = Utils.getStyle(danmaku, "transform").match(MATCH_POSITION_REGEX)[1];

            danmaku.style.transition = `transform ${this.speed}s linear`;
            danmaku.style.transform = `translateX(-${danmaku.parentNode.offsetWidth + parseInt(currentPosition) + danmaku.offsetWidth + 130}px)`;

            danmaku.timer = setTimeout(() => {
                danmaku.remove();
            }, this.speed * 1000);
        } else if (status === 0) {
            // Pause danmaku
            clearTimeout(danmaku.timer);
            const currentPosition = Utils.getStyle(danmaku, "transform").match(MATCH_POSITION_REGEX)[1];

            danmaku.style.transition = "transform 0s linear";
            danmaku.style.transform = `translateX(-${currentPosition}px)`;
            danmaku.setAttribute("relieveDel", "1");
        }
    }

    // Handle mouse hover interactions
    handleMouseHover() {
        Utils.eventDelegation(this.container, "default-style", "mouseover", (target) => {
            target.style.zIndex = 1000;
            this.controlDanmakurunStatus(target, 0);

            if (this.onHover) this.onHover(target);
        });

        Utils.eventDelegation(this.container, "default-style", "mouseout", (target) => {
            target.style.zIndex = 1;

            if (this.runstatus === 1) {
                this.controlDanmakurunStatus(target, 1);
            }
        });
    }

    // Clear the overflow array of pending danmakus
    clearOverflowDanmakuArray() {
        clearInterval(this.cleartimer);
        this.clearIng = true;

        let idleCounter = 0;

        this.cleartimer = setInterval(() => {
            if (this.overflowArr.length === 0) {
                idleCounter++;
                if (idleCounter > 20) {
                    clearInterval(this.cleartimer);
                    this.clearIng = false;
                }
            } else {
                const next = this.overflowArr.shift();
                this.send(next.content, next.normalClass || this.wrapperStyle);
            }
        }, 500);
    }
}

// Utility class for helper functions
class Utils {
    // Get a CSS style of an element
    static getStyle(element, styleName) {
        return window.getComputedStyle(element, null)[styleName];
    }

    // Delegate events to dynamically created elements
    static eventDelegation(container, targetClass, eventType, callback) {
        container.addEventListener(eventType, (event) => {
            try {
                if (event.target.className.includes(targetClass)) {
                    callback(event.target);
                } else if (event.target.parentNode.className.includes(targetClass)) {
                    callback(event.target.parentNode);
                }
            } catch (error) {
                console.error(error);
            }
        });
    }
}
