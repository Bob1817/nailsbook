Component({
  properties:{ label:{type:String,value:'地图位置'},value:{type:String,value:''},hint:{type:String,value:''},required:{type:Boolean,value:false},confirmed:{type:Boolean,value:false},loading:{type:Boolean,value:false},disabled:{type:Boolean,value:false} },
  methods:{ onChoose(){ if (!this.data.disabled && !this.data.loading) this.triggerEvent('choose'); } }
});
