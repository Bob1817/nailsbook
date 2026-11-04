Component({
  properties:{ address:{type:Object,value:{}},selectable:{type:Boolean,value:false},selected:{type:Boolean,value:false},manage:{type:Boolean,value:false},editAction:{type:Boolean,value:false},disabled:{type:Boolean,value:false} },
  methods:{
    emit(name){ if (!this.data.disabled) this.triggerEvent(name,{address:this.data.address}); },
    onSelect(){this.emit('select');},onEdit(){this.emit('edit');},onRemove(){this.emit('remove');},
    onDefault(){if (!this.data.address.isDefault) this.emit('defaultchange');}
  }
});
