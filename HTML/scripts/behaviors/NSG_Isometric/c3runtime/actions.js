globalThis.C3.Behaviors.NSG_Isometric.Acts = {
    SetEnabled(newState_) {
        if (this.isEnabled === !!newState_) return;
        this.isEnabled = !!newState_;
        if (this.isEnabled) {
            this.injectObjectToTheList();
        } else {
            this.removeObjectFromTheList();
        }
    },

    SetType(newType_) {
        this.isStaticType = !!newType_;
    },

    SetImagePoint(newImagePoint_) {
        this.imagePoint = newImagePoint_;
        this.isoObj.validY = this.getValidY();
        // If there are two overlapping static objects then they won't refresh iso position next tick, we have to re-sort it (only if it's enabled of course).
        if (this.isEnabled === true && this.isStaticType === true) {
            this.removeObjectFromTheList();
            this.injectObjectToTheList();
        }
    },

    Refresh() {

        if (this.isEnabled === true) {
            this.removeObjectFromTheList();
            this.injectObjectToTheList();
        }
    }
};