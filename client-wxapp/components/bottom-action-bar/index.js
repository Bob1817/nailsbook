Component({
  properties: {
    primaryLabel:{ type:String,value:'' }, secondaryLabel:{ type:String,value:'' },
    loading:{ type:Boolean,value:false }, disabled:{ type:Boolean,value:false },
    secondaryDisabled:{ type:Boolean,value:false }, fixed:{ type:Boolean,value:true }
  },
  data:{ height:0,keyboardVisible:false },
  observers:{ 'primaryLabel, secondaryLabel, fixed':function(){ this.measure(); } },
  lifetimes:{
    ready(){
      this._mounted=true;
      this._keyboard=event=>{ if (!this._mounted) return; this.setData({ keyboardVisible:event.height>0 }); if (!event.height) this.measure(); };
      if (wx.onKeyboardHeightChange) wx.onKeyboardHeightChange(this._keyboard);
      this.measure();
    },
    detached(){ this._mounted=false; if (wx.offKeyboardHeightChange && this._keyboard) wx.offKeyboardHeightChange(this._keyboard); }
  },
  pageLifetimes:{ resize(){ this.measure(); }, show(){ this.measure(); } },
  methods:{
    measure(){
      if (!this._mounted || !this.data.fixed || this.data.keyboardVisible) return;
      wx.nextTick(()=>{
        if (!this._mounted) return;
        this.createSelectorQuery().select('.bottom-actions').boundingClientRect(rect=>{
          if (this._mounted && rect && rect.height>0 && rect.height!==this.data.height) this.setData({height:rect.height});
        }).exec();
      });
    },
    onPrimary(){ if (!this.data.disabled && !this.data.loading) this.triggerEvent('primary'); },
    onSecondary(){ if (!this.data.secondaryDisabled && !this.data.loading) this.triggerEvent('secondary'); }
  }
});
