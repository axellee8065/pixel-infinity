const C3 = globalThis.C3;


if (typeof IsometricList === "undefined") {
    var IsometricList = new Array(1000);
    var points = new Array(1000);
    for (var i = 0; i < 1000; i++) {
        IsometricList[i] = {
            prev: null,
            inst: null,
            next: null,
        };

    }

}
C3.Behaviors.NSG_Isometric.Instance = class IsometricInstance extends globalThis.ISDKBehaviorInstanceBase {
    constructor(behInst) {
        super(behInst);
        //this.inst = this._inst;
        this.isInit = false;
        //var uid = this.uid;
        var self = this;

        const properties = this._getInitProperties();
        if (properties) {
            this.isEnabled = properties[0] === 1;
            this.isStaticType = properties[1] === 1;
            this.imagePoint = +properties[2];
        }
        this.elevation = undefined;

        this.isoObj = {
            prev: null,
            inst: this,
            validY: 0,
            next: null
        };

        this.addEventListener("destroy", function () {
            //if (data_.instance._uid == uid) {
                self.removeObjectFromTheList();
            //}
        });
        this._setTicking(true);
    }

    _release() {
        this.removeObjectFromTheList();
        super._release();
    }

    _saveToJson() {
        return {
            // data to be saved for savegames
        };
    }

    _loadFromJson(o) {
        // load state for savegames
    }


    _tick() {
        //const dt = this._runtime.GetDt(this._inst);
        //const wi = this._inst.GetWorldInfo();

        // ... code to run every tick for this behavior ...
        if (this.elevation === undefined) {
            this.elevation = this.instance.zElevation;
        } else if (this.instance.zElevation !== this.elevation) {
            this.removeObjectFromTheList();
            this.elevation = this.instance.zElevation;
            this.injectObjectToTheList();
        }

        if (this.isInit === true) {
            if (this.isStaticType || this.isEnabled === false) return;
        }

        this.isoObj.validY = this.getValidY();

        if (this.previousY === this.isoObj.validY) return;

        var isDirectionUp = this.isoObj.validY < this.previousY;

        this.previousY = this.isoObj.validY;

        var currentObject = this.isoObj;
        var hasFoundTheSpot = false;
        var hasZChanged = false;

        if (isDirectionUp) {

            while (currentObject.prev !== null && currentObject.prev.inst !== null) {


                currentObject = currentObject.prev;
                //if(currentObject.inst.GetWorldInfo()._zElevation !== this.isoObj.inst.GetWorldInfo()._zElevation) continue;


                if (this.isoObj.validY > currentObject.validY) {
                    //console.log(this.isoObj.validY , currentObject.validY);
                    if (this.isoObj.prev === currentObject) return; // no need to reposition if nothing changed

                    if (this.isoObj.next !== null) {
                        this.isoObj.next.prev = this.isoObj.prev;
                    }
                    this.isoObj.prev.next = this.isoObj.next;

                    this.isoObj.prev = currentObject;
                    this.isoObj.next = currentObject.next;
                    currentObject.next.prev = this.isoObj;
                    currentObject.next = this.isoObj;
                    //console.log("1", currentObject.inst.GetUID());
                    this.ZMoveToObject2(0, this.isoObj.inst, currentObject.inst);// W
                    //this.isoObj.inst.type.plugin.acts.ZMoveToObject.call(this.isoObj.inst, 0, currentObject.inst); // 0 - put in front; 1 - put behind the object

                    hasFoundTheSpot = true;
                    hasZChanged = true;
                    break;
                }

            }

            if (hasFoundTheSpot === false && this.isoObj.prev !== null) // add to the end of the list since there was no right spot on the way
            {
                if (IsometricList[(this.elevation + 500)].next === this.isoObj) return;

                this.isoObj.prev.next = this.isoObj.next;

                if (this.isoObj.next !== null) {
                    this.isoObj.next.prev = this.isoObj.prev;
                }

                IsometricList[(this.elevation + 500)].next.prev = this.isoObj;
                this.isoObj.next = IsometricList[(this.elevation + 500)].next;
                this.isoObj.prev = IsometricList[(this.elevation + 500)];
                IsometricList[(this.elevation + 500)].next = this.isoObj;
                //console.log("2", currentObject.inst.GetUID());
                this.ZMoveToObject2(1, this.isoObj.inst, currentObject.inst);// 0 - put in front; 1 - put behind the object
                hasZChanged = true;

            }
        } else {
            while (currentObject.next !== null) {


                currentObject = currentObject.next;
                // if(currentObject.inst.GetWorldInfo()._zElevation !== this.isoObj.inst.GetWorldInfo()._zElevation) continue;


                if (this.isoObj.validY < currentObject.validY) {
                    if (this.isoObj.next === currentObject) return; // no need to reposition if nothing changed

                    this.isoObj.next.prev = this.isoObj.prev;
                    this.isoObj.prev.next = this.isoObj.next;

                    this.isoObj.next = currentObject;
                    //currentObject.prev.prev = this.isoObj.prev;
                    this.isoObj.prev = currentObject.prev;
                    currentObject.prev.next = this.isoObj;
                    currentObject.prev = this.isoObj;
                    //console.log("3", currentObject.inst.GetUID());
                    this.ZMoveToObject2(1, this.isoObj.inst, currentObject.inst);
                    //this.isoObj.inst.type.plugin.acts.ZMoveToObject.call(this.isoObj.inst, 1, currentObject.inst); // 0 - put in front; 1 - put behind the object

                    hasFoundTheSpot = true;
                    hasZChanged = true;
                    break;
                }

            }

            if (hasFoundTheSpot === false && this.isoObj.next !== null) // add to the end of the list since there was no right spot on the way
            {

                this.isoObj.prev.next = this.isoObj.next;
                this.isoObj.next.prev = this.isoObj.prev;

                currentObject.next = this.isoObj;
                this.isoObj.prev = currentObject;
                this.isoObj.next = null;
                //console.log("4", currentObject.inst.GetUID());
                this.ZMoveToObject2(0, this.isoObj.inst, currentObject.inst);
                hasZChanged = true;
                //this.isoObj.inst.type.plugin.acts.ZMoveToObject.call(this.isoObj.inst, 0, currentObject.inst); // 0 - put in front; 1 - put behind the object
            }
        }

        if (hasZChanged) {
            this._trigger(C3.Behaviors.NSG_Isometric.Cnds.OnZChange);
        }
        if (!this.isInit) {
            this.isInit = true;
            //console.log("InitDone");
            if (this.isEnabled) {
                this.injectObjectToTheList();
            }
        }
    }


    _getDebuggerProperties() {
        return [
            {
                title: "Isometric",
                properties: [
                    {
                        name: "Enabled",
                        value: this.isEnabled
                    },
                    {
                        name: "Is static",
                        value: this.isStaticType
                    },
                    {
                        name: "Image point",
                        value: this.imagePoint
                    },


                    //	{name: ".current-animation",  value: this._currentAnimation.GetName(),	onedit: v => this.CallAction(Acts.SetAnim, v, 0) },
                ]
            }];
    }

    /*onDestroy() {
        //console.log("destroy");
        this.removeObjectFromTheList();
    };*/

    removeObjectFromTheList() {
        //console.log("remove",this.isoObj);
        if (this.isoObj.prev !== null) {
            //("pre");
            this.isoObj.prev.next = this.isoObj.next;
        }

        if (this.isoObj.next !== null) {   //console.log("nex");
            this.isoObj.next.prev = this.isoObj.prev;
        }

        this.isoObj.next = null;
        this.isoObj.prev = null;
    };


    injectObjectToTheList() {

        this.isoObj.validY = this.getValidY();
        this.previousY = this.isoObj.validY;

        if (IsometricList[(this.elevation + 500)].next === null) {
            IsometricList[(this.elevation + 500)].next = this.isoObj;
            this.isoObj.prev = IsometricList[(this.elevation + 500)];
            return;
        }

        var currentObject = IsometricList[(this.elevation + 500)];
        var hasFoundTheSpot = false;

        do {
            //if (currentObject.inst._uid === currentObject.next.inst._uid)
            currentObject = currentObject.next;
            //if(currentObject.inst.GetWorldInfo()._zElevation !== this.isoObj.inst.GetWorldInfo()._zElevation) continue;

            //console.log(this.isoObj.validY , " <= " , currentObject.validY);
            if (this.isoObj.validY <= currentObject.validY) {
                this.isoObj.next = currentObject;
                this.isoObj.prev = currentObject.prev;
                if (currentObject.prev === null) {
                    break;
                }
                currentObject.prev.next = this.isoObj;
                currentObject.prev = this.isoObj;

                this.ZMoveToObject2(1, this.isoObj.inst, currentObject.inst); // 0 - put in front; 1 - put behind the object

                hasFoundTheSpot = true;
                //console.log("break");
                break;
            }

        } while (currentObject.next !== null);

        if (hasFoundTheSpot === false) // add to the end of the list since there was no right spot on the way
        {
            currentObject.next = this.isoObj;
            this.isoObj.prev = currentObject;

            this.ZMoveToObject2(0, this.isoObj.inst, currentObject.inst); // 0 - put in front; 1 - put behind the object
        }
        // console.log("inject");
    };

    getValidY() {
        if (this.imagePoint === 0) {
            return this.instance.y;
        } else {
            //console.log("this.imagePoint: ", this.imagePoint);
            var p = parseInt(this.imagePoint);
            //var data = this._inst.GetImagePoint("point");
            return this.instance.getImagePointY(p);
        }
        // this.getImagePoint(imgpt, true) /x
        // this.getImagePoint(imgpt, false) /y
    };

    ZMoveToObject2(where_, myObj, obj_) {
        // console.log(myObj);
        //  console.log(obj_);
        var isafter = (where_ === 0);

        if (!obj_) return;

        let my = myObj.instance;
        let other = obj_.instance;

        if (!other || other.uid === my.uid) return;


        //Not needed anymore, moveAdjacent changes layers too
        // First move to same layer as other object if different
        /*if (my.layer !== other.layer) {
            //myObj.layer.removeFromInstanceList(myObj, true);
            my.moveToLayer(other.layer);
            //myObj.GetWorldInfo()._layer = other.GetWorldInfo().GetLayer();

            //other.layer.appendToInstanceList(myObj, true);
        }*/

        // First move to same layer as other object if different
        my.moveAdjacentToInstance(other, isafter);
        //myObj.GetRuntime().UpdateRender();
        //myObj.GetRuntime().redraw = true;
    };


};